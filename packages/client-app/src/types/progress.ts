export interface ConnectionProgress {
  containerCreated: boolean;
  websocketCreated: boolean;
  clientConnected: boolean;
  appContainerConnected: boolean;
  terminalReady: boolean;
}

export interface ProgressStep {
  id: keyof ConnectionProgress;
  label: string;
  description: string;
}