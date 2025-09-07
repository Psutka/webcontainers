import { io, Socket } from 'socket.io-client';
import { FileService } from './services/FileService';
import { TerminalService } from './services/TerminalService';
import { WebAppService } from './services/WebAppService';
import { FileMessage, ZipMessage, CommandMessage } from './types';

class AppContainer {
  private socket: Socket | null = null;
  private fileService: FileService;
  private terminalService: TerminalService;
  private webAppService: WebAppService;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.fileService = new FileService();
    this.terminalService = new TerminalService();
    this.webAppService = new WebAppService(3000);
    
    this.setupTerminalListeners();
    this.connectToGateway();
  }

  private setupTerminalListeners(): void {
    this.terminalService.on('stdout', (data: string) => {
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stdout',
          data: data
        });
      }
    });

    this.terminalService.on('stderr', (data: string) => {
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stderr',
          data: data
        });
      }
    });

    this.terminalService.on('error', (error: Error) => {
      console.error('Terminal error:', error);
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stderr',
          data: `Terminal error: ${error.message}\n`
        });
      }
    });

    this.terminalService.on('ready', () => {
      console.log('Terminal is ready, notifying gateway');
      if (this.socket) {
        this.socket.emit('terminal-ready', { containerId: this.containerId });
      }
    });
  }

  private connectToGateway(): void {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:9001';
    const wsUrl = `${gatewayUrl}/containers`;
    console.log(`Connecting to gateway at: ${wsUrl}`);
    
    this.socket = io(wsUrl, {
      forceNew: true,
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Container Gateway');
      this.socket!.emit('join-container', this.containerId);
      
      // Notify that app container is ready
      setTimeout(() => {
        console.log('Emitting app-container-ready event');
        this.socket!.emit('app-container-ready', { containerId: this.containerId });
      }, 1000);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Container Gateway');
    });

    this.socket.on('connect_error', (error) => {
      console.error('AppContainer WebSocket connection error:', error);
      setTimeout(() => this.connectToGateway(), 5000);
    });

    this.socket.on('file-received', async (data: FileMessage) => {
      try {
        await this.fileService.writeFile(data.path, data.content);
        console.log(`File saved: ${data.path}`);
      } catch (error) {
        console.error('Error saving file:', error);
      }
    });

    this.socket.on('zip-received', async (data: ZipMessage) => {
      try {
        await this.fileService.extractZip(data.zipBuffer, data.extractPath);
        console.log(`Zip extracted to: ${data.extractPath}`);
      } catch (error) {
        console.error('Error extracting zip:', error);
      }
    });

    this.socket.on('terminal-input', (data: CommandMessage) => {
      console.log(`Executing command: ${data.command}`);
      
      if (data.command.trim() === 'start-webapp') {
        this.startWebApp();
      } else if (data.command.trim() === 'stop-webapp') {
        this.stopWebApp();
      } else {
        this.terminalService.executeCommand(data.command);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setTimeout(() => this.connectToGateway(), 5000);
    });
  }

  private async startWebApp(): Promise<void> {
    try {
      if (!this.webAppService.isRunning()) {
        await this.webAppService.startWebApp('/app');
        console.log('Web app started successfully');
        
        if (this.socket) {
          this.socket.emit('terminal-output', {
            type: 'stdout',
            data: `Web app started on port ${this.webAppService.getPort()}\n`
          });
        }
      } else {
        console.log('Web app is already running');
        
        if (this.socket) {
          this.socket.emit('terminal-output', {
            type: 'stdout',
            data: 'Web app is already running\n'
          });
        }
      }
    } catch (error) {
      console.error('Error starting web app:', error);
      
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stderr',
          data: `Error starting web app: ${error}\n`
        });
      }
    }
  }

  private async stopWebApp(): Promise<void> {
    try {
      if (this.webAppService.isRunning()) {
        await this.webAppService.stopWebApp();
        console.log('Web app stopped');
        
        if (this.socket) {
          this.socket.emit('terminal-output', {
            type: 'stdout',
            data: 'Web app stopped\n'
          });
        }
      } else {
        console.log('Web app is not running');
        
        if (this.socket) {
          this.socket.emit('terminal-output', {
            type: 'stdout',
            data: 'Web app is not running\n'
          });
        }
      }
    } catch (error) {
      console.error('Error stopping web app:', error);
      
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stderr',
          data: `Error stopping web app: ${error}\n`
        });
      }
    }
  }
}

const containerId = process.env.CONTAINER_ID || 'default-container';
console.log(`Starting App Container with ID: ${containerId}`);

const appContainer = new AppContainer(containerId);

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});