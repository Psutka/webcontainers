import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as Docker from 'dockerode';
import { AppContainer } from '../common/interfaces';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContainersService {
  private readonly logger = new Logger(ContainersService.name);
  private readonly docker = new Docker();
  private containers = new Map<string, AppContainer>();

  async createContainer(): Promise<AppContainer> {
    const id = uuidv4();
    this.logger.log(`Creating container with ID: ${id}`);

    try {
      // Try to pull the image first
      try {
        this.logger.log('Pulling node:alpine image...');
        await this.docker.pull('node:alpine');
        this.logger.log('Image pulled successfully');
      } catch (pullError) {
        this.logger.warn(`Failed to pull image: ${pullError.message}. Trying to use existing image...`);
      }

      const container = await this.docker.createContainer({
        Image: 'node:alpine',
        Cmd: ['sh', '-c', 'apk add --no-cache npm && npm install -g npm@latest && node -e "console.log(\\"Container ready\\"); require(\\"child_process\\").spawn(\\"tail\\", [\\"-f\\", \\"/dev/null\\"], {stdio: \\"inherit\\"})"'],
        WorkingDir: '/app',
        OpenStdin: true,
        StdinOnce: false,
        Tty: true,
        ExposedPorts: {
          '3000/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '3000/tcp': [{ HostPort: '0' }]
          },
          NetworkMode: 'bridge'
        },
        Env: [
          `CONTAINER_ID=${id}`,
          `GATEWAY_URL=http://host.docker.internal:${process.env.PORT || 9001}`,
          `NODE_ENV=development`
        ]
      });

      await container.start();
      const containerInfo = await container.inspect();

      // Copy and start the AppContainer service inside the container
      await this.setupAppContainer(container, id);
      
      const appContainer: AppContainer = {
        id,
        containerId: container.id,
        status: 'running',
        websocketUrl: `http://localhost:${process.env.PORT || 9001}/containers`,
        port: parseInt(containerInfo.NetworkSettings.Ports['3000/tcp']?.[0]?.HostPort || '3000')
      };

      this.containers.set(id, appContainer);
      this.logger.log(`Container created successfully: ${id}`);
      
      return appContainer;
    } catch (error) {
      this.logger.error(`Failed to create container: ${error.message}`);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  async terminateContainer(id: string): Promise<boolean> {
    this.logger.log(`Terminating container: ${id}`);
    const appContainer = this.containers.get(id);
    
    if (!appContainer) {
      throw new Error(`Container ${id} not found`);
    }

    try {
      const container = this.docker.getContainer(appContainer.containerId);
      await container.stop();
      await container.remove();
      
      appContainer.status = 'deleted';
      this.containers.delete(id);
      
      this.logger.log(`Container terminated successfully: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to terminate container: ${error.message}`);
      throw new Error(`Failed to terminate container: ${error.message}`);
    }
  }

  async getContainerStatus(id: string): Promise<AppContainer> {
    const appContainer = this.containers.get(id);
    
    if (!appContainer) {
      throw new Error(`Container ${id} not found`);
    }

    try {
      const container = this.docker.getContainer(appContainer.containerId);
      const info = await container.inspect();
      
      const status = info.State.Running ? 'running' : 'stopped';
      appContainer.status = status;
      
      return appContainer;
    } catch (error) {
      this.logger.error(`Failed to get container status: ${error.message}`);
      appContainer.status = 'deleted';
      return appContainer;
    }
  }

  getContainer(id: string): AppContainer | undefined {
    return this.containers.get(id);
  }

  getAllContainers(): AppContainer[] {
    return Array.from(this.containers.values());
  }

  async executeCommand(containerId: string, command: string): Promise<string> {
    const appContainer = this.containers.get(containerId);
    if (!appContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      const container = this.docker.getContainer(appContainer.containerId);
      const exec = await container.exec({
        Cmd: ['sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      });

      const stream = await exec.start({ Detach: false, Tty: false });
      
      return new Promise((resolve, reject) => {
        let output = '';
        
        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString();
        });
        
        stream.on('end', () => {
          resolve(output);
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to execute command: ${error.message}`);
      throw error;
    }
  }

  private async setupAppContainer(dockerContainer: Docker.Container, containerId: string): Promise<void> {
    try {
      this.logger.log(`Setting up AppContainer service for ${containerId}`);

      // Read the AppContainer script
      const scriptPath = path.join(__dirname, '../../src/scripts/setup-container.js');
      const { appContainerCode } = require(scriptPath);

      // Install socket.io-client and other dependencies in the container first
      this.logger.log('Installing dependencies...');
      const installCmd = await dockerContainer.exec({
        Cmd: ['sh', '-c', 'cd /app && npm init -y && npm install socket.io-client fs-extra unzipper'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const installStream = await installCmd.start({ Detach: false });
      await this.waitForExec(installStream);
      this.logger.log('Dependencies installed successfully');

      // Create the AppContainer script file inside the container
      const createFileCmd = await dockerContainer.exec({
        Cmd: ['sh', '-c', `cat > /app/app-container.js << 'EOF'\n${appContainerCode}\nEOF`],
        AttachStdout: true,
        AttachStderr: true,
      });

      const createFileStream = await createFileCmd.start({ Detach: false });
      await this.waitForExec(createFileStream);

      // Wait a moment for everything to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start the AppContainer service in the background with debugging
      this.logger.log('Starting AppContainer service...');
      const startCmd = await dockerContainer.exec({
        Cmd: ['sh', '-c', 'cd /app && nohup node app-container.js > app-container.log 2>&1 & echo "AppContainer started"'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const startStream = await startCmd.start({ Detach: false });
      await this.waitForExec(startStream);

      // Give it a moment to start connecting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if it's running and log output
      const checkCmd = await dockerContainer.exec({
        Cmd: ['sh', '-c', 'ps aux | grep app-container || echo "Process not found"; cat /app/app-container.log || echo "No log file"'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const checkStream = await checkCmd.start({ Detach: false });
      await this.waitForExec(checkStream);

      this.logger.log(`AppContainer service started for ${containerId}`);
    } catch (error) {
      this.logger.error(`Failed to setup AppContainer service: ${error.message}`);
    }
  }

  private async waitForExec(stream: NodeJS.ReadableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      let output = '';
      
      stream.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        output += data;
        this.logger.debug(data);
      });
      
      stream.on('end', () => {
        this.logger.debug('Exec completed:', output);
        resolve();
      });
      
      stream.on('error', (error: any) => {
        this.logger.error('Exec error:', error);
        reject(error);
      });
    });
  }
}