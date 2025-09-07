export interface AppContainer {
  id: string;
  status: 'creating' | 'running' | 'stopped' | 'terminated' | 'deleted';
  websocketUrl?: string;
}

export interface ContainerMessage {
  type: 'file' | 'zip' | 'command' | 'terminal-input';
  data: any;
  path?: string;
}

export interface TerminalMessage {
  type: 'stdout' | 'stderr' | 'stdin';
  data: string;
}

export interface MessageWindowItem {
  id: string;
  timestamp: Date;
  type: 'info' | 'error' | 'success';
  message: string;
}