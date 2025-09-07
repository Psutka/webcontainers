import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class TerminalService extends EventEmitter {
  private shell: ChildProcess | null = null;
  private isReady = false;

  constructor() {
    super();
    this.initializeShell();
  }

  private initializeShell(): void {
    this.shell = spawn('sh', ['-i'], {
      cwd: '/app',
      env: { ...process.env, PS1: '$ ' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (this.shell.stdout) {
      this.shell.stdout.on('data', (data: Buffer) => {
        this.emit('stdout', data.toString());
      });
    }

    if (this.shell.stderr) {
      this.shell.stderr.on('data', (data: Buffer) => {
        this.emit('stderr', data.toString());
      });
    }

    this.shell.on('error', (error) => {
      this.emit('error', error);
    });

    this.shell.on('exit', (code) => {
      console.log(`Shell exited with code: ${code}`);
      this.isReady = false;
      setTimeout(() => this.initializeShell(), 1000);
    });

    this.isReady = true;
    console.log('Terminal shell initialized');
    
    // Emit ready event after a short delay
    setTimeout(() => {
      this.emit('ready');
    }, 500);
  }

  executeCommand(command: string): boolean {
    if (!this.shell || !this.isReady || !this.shell.stdin) {
      console.error('Shell not ready');
      return false;
    }

    try {
      this.shell.stdin.write(`${command}\n`);
      return true;
    } catch (error) {
      console.error('Error executing command:', error);
      return false;
    }
  }

  destroy(): void {
    if (this.shell) {
      this.shell.kill();
      this.shell = null;
      this.isReady = false;
    }
  }
}