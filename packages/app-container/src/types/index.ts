export interface FileMessage {
  path: string;
  content: string;
}

export interface ZipMessage {
  zipBuffer: ArrayBuffer;
  extractPath: string;
}

export interface CommandMessage {
  command: string;
}

export interface TerminalMessage {
  type: 'stdout' | 'stderr' | 'stdin';
  data: string;
}