'use client';

import { useState, useCallback } from 'react';
import { AppContainer, MessageWindowItem } from '../types/container';
import { ConnectionProgress } from '../types/progress';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageWindow from '../components/MessageWindow';
import TerminalWindow from '../components/TerminalWindow';
import PreviewWindow from '../components/PreviewWindow';
import ContainerControls from '../components/ContainerControls';
import ConnectionProgressBar from '../components/ConnectionProgress';

const CONTAINER_GW_URL = process.env.NEXT_PUBLIC_CONTAINER_GW_URL || 'http://localhost:9001';

export default function Home() {
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [messages, setMessages] = useState<MessageWindowItem[]>([]);
  const [progress, setProgress] = useState<ConnectionProgress>({
    containerCreated: false,
    websocketCreated: false,
    clientConnected: false,
    appContainerConnected: false,
    terminalReady: false
  });

  const addMessage = useCallback((type: MessageWindowItem['type'], message: string) => {
    const newMessage: MessageWindowItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      type,
      message
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleClientConnected = useCallback(() => {
    setProgress(prev => ({ ...prev, clientConnected: true }));
    addMessage('success', 'Client connected to WebSocket');
  }, [addMessage]);

  const handleAppContainerConnected = useCallback(() => {
    setProgress(prev => ({ ...prev, appContainerConnected: true }));
    addMessage('success', 'App container connected to WebSocket');
  }, [addMessage]);

  const handleTerminalReady = useCallback(() => {
    setProgress(prev => ({ ...prev, terminalReady: true }));
    addMessage('success', 'Terminal I/O is ready');
  }, [addMessage]);
  
  const { isConnected, terminalOutput, sendCommand, sendZip } = useWebSocket(
    container?.id,
    container?.websocketUrl,
    handleClientConnected,
    handleAppContainerConnected,
    handleTerminalReady
  );

  const createContainer = async () => {
    try {
      // Reset progress
      setProgress({
        containerCreated: false,
        websocketCreated: false,
        clientConnected: false,
        appContainerConnected: false,
        terminalReady: false
      });
      
      addMessage('info', 'Creating new container...');
      const response = await fetch(`${CONTAINER_GW_URL}/api/containers`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create container');
      }
      
      const newContainer: AppContainer = await response.json();
      
      // Mark container as created
      setProgress(prev => ({ ...prev, containerCreated: true }));
      addMessage('success', `Container created with ID: ${newContainer.id}`);
      
      // Mark websocket as ready (since it's provided in the response)
      setProgress(prev => ({ ...prev, websocketCreated: true }));
      addMessage('info', 'WebSocket endpoint ready');
      
      // Wait a moment for the container to fully initialize before setting the container
      // This ensures WebSocket connection happens after container is ready
      setTimeout(() => {
        setContainer(newContainer);
        addMessage('info', 'Attempting WebSocket connection...');
      }, 2000);
      
    } catch (error) {
      addMessage('error', `Failed to create container: ${error}`);
    }
  };

  const terminateContainer = async () => {
    if (!container) return;
    
    try {
      addMessage('info', 'Terminating container...');
      const response = await fetch(`${CONTAINER_GW_URL}/api/containers/${container.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to terminate container');
      }
      
      addMessage('success', 'Container terminated successfully');
      setContainer(null);
      
      // Reset progress
      setProgress({
        containerCreated: false,
        websocketCreated: false,
        clientConnected: false,
        appContainerConnected: false,
        terminalReady: false
      });
      
    } catch (error) {
      addMessage('error', `Failed to terminate container: ${error}`);
    }
  };

  const queryStatus = async () => {
    if (!container) return;
    
    try {
      const response = await fetch(`${CONTAINER_GW_URL}/api/containers/${container.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to query status');
      }
      
      const status = await response.json();
      setContainer(prev => prev ? { ...prev, status: status.status } : null);
      addMessage('info', `Container status: ${status.status}`);
    } catch (error) {
      addMessage('error', `Failed to query status: ${error}`);
    }
  };

  const handleSendZip = (file: File, extractPath: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      sendZip(arrayBuffer, extractPath);
      addMessage('info', `Sending zip file to ${extractPath}`);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-screen flex flex-col">
      <ContainerControls
        container={container}
        onCreateContainer={createContainer}
        onTerminateContainer={terminateContainer}
        onQueryStatus={queryStatus}
        onSendZip={handleSendZip}
      />
      
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 min-h-0 overflow-hidden">
        <MessageWindow messages={messages} />
        
        <TerminalWindow
          output={terminalOutput}
          onSendCommand={sendCommand}
          isConnected={isConnected}
        />
        
        <PreviewWindow
          previewUrl={container ? `http://localhost:3000` : undefined}
          containerId={container?.id}
        />
      </div>
      
      <ConnectionProgressBar progress={progress} />
    </div>
  );
}