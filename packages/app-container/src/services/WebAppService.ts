import express from 'express';
import { Server } from 'http';
import * as fs from 'fs-extra';
import * as path from 'path';

export class WebAppService {
  private server: Server | null = null;
  private app: express.Application;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
  }

  async startWebApp(projectPath: string = '/app'): Promise<void> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        
        if (packageJson.scripts && packageJson.scripts.start) {
          console.log('Starting web app using npm start...');
          
          this.app.use(express.static(path.join(projectPath, 'public')));
          this.app.use(express.static(path.join(projectPath, 'dist')));
          this.app.use(express.static(path.join(projectPath, 'build')));
          
          this.app.get('*', (req, res) => {
            const indexPath = path.join(projectPath, 'index.html');
            if (fs.existsSync(indexPath)) {
              res.sendFile(indexPath);
            } else {
              res.status(404).send('Web app not built or configured');
            }
          });
          
          this.server = this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`Web app running on port ${this.port}`);
          });
          
          return;
        }
      }
      
      this.app.use(express.static(projectPath));
      
      this.app.get('*', (req, res) => {
        res.status(404).send('No web app configured. Please build your application first.');
      });
      
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`Static file server running on port ${this.port}`);
      });
      
    } catch (error) {
      console.error('Error starting web app:', error);
      throw error;
    }
  }

  async stopWebApp(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('Web app stopped');
          this.server = null;
          resolve();
        });
      });
    }
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getPort(): number {
    return this.port;
  }
}