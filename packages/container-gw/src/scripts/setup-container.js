// Script to set up AppContainer service inside Docker container
const fs = require('fs');
const path = require('path');

// This script will be copied into the container and executed
const appContainerCode = `
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { dirname } = require('path');

class TerminalService extends EventEmitter {
  constructor() {
    super();
    this.shell = null;
    this.isReady = false;
    this.initializeShell();
  }

  initializeShell() {
    this.shell = spawn('sh', ['-i'], {
      cwd: '/app',
      env: { ...process.env, PS1: '$ ' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.shell.stdout.on('data', (data) => {
      this.emit('stdout', data.toString());
    });

    this.shell.stderr.on('data', (data) => {
      this.emit('stderr', data.toString());
    });

    this.shell.on('error', (error) => {
      this.emit('error', error);
    });

    this.shell.on('exit', (code) => {
      console.log('Shell exited with code:', code);
      this.isReady = false;
      setTimeout(() => this.initializeShell(), 1000);
    });

    this.isReady = true;
    console.log('Terminal shell initialized');
    
    setTimeout(() => {
      this.emit('ready');
    }, 500);
  }

  executeCommand(command) {
    if (!this.shell || !this.isReady || !this.shell.stdin) {
      console.error('Shell not ready');
      return false;
    }

    try {
      this.shell.stdin.write(command + '\\n');
      return true;
    } catch (error) {
      console.error('Error executing command:', error);
      return false;
    }
  }
}

class AppContainer {
  constructor(containerId) {
    this.containerId = containerId;
    this.socket = null;
    this.terminalService = new TerminalService();
    
    this.setupTerminalListeners();
    this.connectToGateway();
  }

  setupTerminalListeners() {
    this.terminalService.on('stdout', (data) => {
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stdout',
          data: data
        });
      }
    });

    this.terminalService.on('stderr', (data) => {
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stderr',
          data: data
        });
      }
    });

    this.terminalService.on('error', (error) => {
      console.error('Terminal error:', error);
      if (this.socket) {
        this.socket.emit('terminal-output', {
          type: 'stderr',
          data: 'Terminal error: ' + error.message + '\\n'
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

  connectToGateway() {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://host.docker.internal:9001';
    const wsUrl = gatewayUrl + '/containers';
    console.log('Environment variables:', process.env);
    console.log('Container ID:', this.containerId);
    console.log('Gateway URL from env:', process.env.GATEWAY_URL);
    console.log('Final WebSocket URL:', wsUrl);
    
    // Test network connectivity first
    console.log('Testing network connectivity...');
    
    // Try different URLs if host.docker.internal doesn't work
    const urlsToTry = [
      wsUrl,
      'http://172.17.0.1:9001/containers',
      'http://host.docker.internal:9001/containers',
      'http://localhost:9001/containers'
    ];
    
    this.tryConnection(urlsToTry, 0);
  }

  tryConnection(urls, index) {
    if (index >= urls.length) {
      console.error('All connection attempts failed');
      setTimeout(() => this.connectToGateway(), 10000);
      return;
    }
    
    const currentUrl = urls[index];
    console.log('Trying to connect to:', currentUrl);
    
    this.socket = io(currentUrl, {
      forceNew: true,
      timeout: 5000,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Successfully connected to Container Gateway at:', currentUrl);
      this.socket.emit('join-container', this.containerId);
      
      setTimeout(() => {
        console.log('Emitting app-container-ready event');
        this.socket.emit('app-container-ready', { containerId: this.containerId });
      }, 1000);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Container Gateway');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection failed for:', currentUrl, 'Error:', error.message);
      this.socket.disconnect();
      
      // Try next URL
      setTimeout(() => {
        this.tryConnection(urls, index + 1);
      }, 1000);
    });

    this.socket.on('terminal-input', (data) => {
      console.log('Executing command:', data.command);
      this.terminalService.executeCommand(data.command);
    });

    this.socket.on('send-file', (data) => {
      try {
        const fullPath = data.path.startsWith('/') ? data.path : '/app/' + data.path;
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, data.content, 'utf8');
        console.log('File written successfully:', fullPath);
      } catch (error) {
        console.error('Error writing file:', error);
      }
    });
  }
}

const containerId = process.env.CONTAINER_ID || 'default-container';
console.log('Starting App Container with ID:', containerId);

const appContainer = new AppContainer(containerId);

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
`;

// Export the code so it can be used by the containers service
module.exports = { appContainerCode };