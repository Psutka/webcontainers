export interface AppContainer {
  id: string;
  containerId: string;
  status: 'creating' | 'running' | 'stopped' | 'terminated' | 'deleted';
  websocketUrl?: string;
  port?: number;
}

export interface CreateContainerResponse {
  id: string;
  status: string;
  websocketUrl: string;
}

export interface ContainerStatusResponse {
  id: string;
  status: string;
}

export interface TerminateContainerResponse {
  success: boolean;
  message: string;
}