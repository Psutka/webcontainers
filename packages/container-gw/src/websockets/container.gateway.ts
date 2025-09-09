import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ContainersService } from '../containers/containers.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/containers'
})
export class ContainerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ContainerGateway.name);
  
  // Track container states
  private containerStates = new Map<string, {
    appContainerConnected: boolean;
    terminalReady: boolean;
  }>();

  // Track which containers each client is associated with
  private clientContainers = new Map<string, Set<string>>();

  constructor(private readonly containersService: ContainersService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Get containers associated with this client
    const containers = this.clientContainers.get(client.id);
    if (containers && containers.size > 0) {
      this.logger.log(`Cleaning up ${containers.size} containers for disconnected client ${client.id}`);
      
      // Check each container for cleanup after client leaves
      for (const containerId of containers) {
        await this.checkAndCleanupContainer(containerId);
      }
    }
    
    // Remove client from tracking
    this.clientContainers.delete(client.id);
  }

  @SubscribeMessage('join-container')
  handleJoinContainer(
    @MessageBody() containerId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(containerId);
    this.logger.log(`Client ${client.id} joined container ${containerId}`);
    
    // Track that this client is associated with this container
    if (!this.clientContainers.has(client.id)) {
      this.clientContainers.set(client.id, new Set<string>());
    }
    this.clientContainers.get(client.id)!.add(containerId);
    
    // Send current container state to the newly joined client
    const containerState = this.containerStates.get(containerId);
    if (containerState) {
      if (containerState.appContainerConnected) {
        client.emit('app-container-connected');
        this.logger.log(`Sent app-container-connected to new client ${client.id} for container ${containerId}`);
      }
      if (containerState.terminalReady) {
        client.emit('terminal-ready');
        this.logger.log(`Sent terminal-ready to new client ${client.id} for container ${containerId}`);
      }
    }
    
    // Notify other clients in the room that a new client joined
    client.to(containerId).emit('client-joined', { clientId: client.id });
  }

  @SubscribeMessage('app-container-ready')
  handleAppContainerReady(
    @MessageBody() data: { containerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`App container ready for ${data.containerId}`);
    
    // Update container state
    const containerState = this.containerStates.get(data.containerId) || { appContainerConnected: false, terminalReady: false };
    containerState.appContainerConnected = true;
    this.containerStates.set(data.containerId, containerState);
    
    // Notify all clients in the container room
    this.server.to(data.containerId).emit('app-container-connected');
  }

  @SubscribeMessage('terminal-ready')
  handleTerminalReady(
    @MessageBody() data: { containerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Terminal ready for ${data.containerId}`);
    
    // Update container state
    const containerState = this.containerStates.get(data.containerId) || { appContainerConnected: false, terminalReady: false };
    containerState.terminalReady = true;
    this.containerStates.set(data.containerId, containerState);
    
    // Notify all clients in the container room
    this.server.to(data.containerId).emit('terminal-ready');
  }

  @SubscribeMessage('terminal-input')
  async handleTerminalInput(
    @MessageBody() data: { containerId: string; command: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const output = await this.containersService.executeCommand(
        data.containerId,
        data.command,
      );
      
      this.server.to(data.containerId).emit('terminal-output', {
        type: 'stdout',
        data: output,
      });
    } catch (error) {
      this.server.to(data.containerId).emit('terminal-output', {
        type: 'stderr',
        data: `Error: ${error.message}\n`,
      });
    }
  }

  @SubscribeMessage('send-file')
  handleSendFile(
    @MessageBody() data: { containerId: string; path: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`File sent to container ${data.containerId}: ${data.path}`);
    
    this.server.to(data.containerId).emit('file-received', {
      path: data.path,
      content: data.content,
    });
  }

  @SubscribeMessage('send-zip')
  handleSendZip(
    @MessageBody() data: { containerId: string; zipBuffer: Uint8Array | ArrayBuffer; extractPath: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`[DEBUG] Received send-zip event from client ${client.id}`);
    this.logger.log(`[DEBUG] Container ID: ${data.containerId}, Extract Path: ${data.extractPath}`);
    this.logger.log(`[DEBUG] Zip buffer type: ${data.zipBuffer?.constructor.name}`);
    this.logger.log(`[DEBUG] Zip buffer size: ${data.zipBuffer ? (data.zipBuffer.byteLength || (data.zipBuffer as Uint8Array).length) : 'undefined'} bytes`);
    
    if (!data.containerId) {
      this.logger.error(`[DEBUG] No containerId provided in send-zip event`);
      return;
    }
    
    if (!data.zipBuffer) {
      this.logger.error(`[DEBUG] No zipBuffer provided in send-zip event`);
      return;
    }
    
    // Convert Uint8Array back to ArrayBuffer if needed
    let arrayBuffer: ArrayBuffer;
    if (data.zipBuffer instanceof Uint8Array) {
      this.logger.log(`[DEBUG] Converting Uint8Array to ArrayBuffer`);
      arrayBuffer = data.zipBuffer.buffer.slice(data.zipBuffer.byteOffset, data.zipBuffer.byteOffset + data.zipBuffer.byteLength) as ArrayBuffer;
    } else {
      arrayBuffer = data.zipBuffer as ArrayBuffer;
    }
    
    this.logger.log(`Zip file sent to container ${data.containerId} for extraction to ${data.extractPath}`);
    
    this.server.to(data.containerId).emit('zip-received', {
      zipBuffer: arrayBuffer,
      extractPath: data.extractPath,
    });
  }

  @SubscribeMessage('leave-container')
  handleLeaveContainer(
    @MessageBody() containerId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(containerId);
    this.logger.log(`Client ${client.id} left container ${containerId}`);
    
    // Remove container from client tracking
    const clientContainers = this.clientContainers.get(client.id);
    if (clientContainers) {
      clientContainers.delete(containerId);
      if (clientContainers.size === 0) {
        this.clientContainers.delete(client.id);
      }
    }
    
    // Check if container should be cleaned up
    this.checkAndCleanupContainer(containerId);
  }

  private async checkAndCleanupContainer(containerId: string) {
    try {
      // Check how many clients are still in this container's room
      const room = this.server.sockets.adapter.rooms.get(containerId);
      const remainingClients = room ? room.size : 0;
      
      this.logger.log(`Container ${containerId} has ${remainingClients} remaining clients`);
      
      // If no clients are connected to this container, clean it up
      if (remainingClients === 0) {
        this.logger.log(`No remaining clients for container ${containerId}, terminating...`);
        
        // Clean up container state
        this.containerStates.delete(containerId);
        
        // Terminate the actual container
        await this.containersService.terminateContainer(containerId);
        
        this.logger.log(`Container ${containerId} terminated successfully`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup container ${containerId}: ${error.message}`);
    }
  }
}