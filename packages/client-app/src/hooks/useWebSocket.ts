import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TerminalMessage } from '../types/container';

export const useWebSocket = (
  containerId?: string, 
  websocketUrl?: string,
  onClientConnected?: () => void,
  onAppContainerConnected?: () => void,
  onTerminalReady?: () => void
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [appContainerConnected, setAppContainerConnected] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  
  useEffect(() => {
    if (!containerId || !websocketUrl) return;
    
    // Parse the websocket URL to extract base URL and namespace
    const wsUrl = websocketUrl.replace('ws://', 'http://');
    console.log('Connecting to WebSocket:', wsUrl);
    
    const newSocket = io(wsUrl, {
      forceNew: true,
      timeout: 5000,
    });
    
    newSocket.on('connect', () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      onClientConnected?.();
      
      // Join the container room
      console.log('Joining container room:', containerId);
      newSocket.emit('join-container', containerId);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setAppContainerConnected(false);
      setTerminalReady(false);
    });
    
    newSocket.on('app-container-connected', () => {
      setAppContainerConnected(true);
      onAppContainerConnected?.();
    });
    
    newSocket.on('terminal-output', (message: TerminalMessage) => {
      if (message.type === 'stdout' || message.type === 'stderr') {
        setTerminalOutput(prev => prev + message.data);
        
        // Mark terminal as ready after first output
        if (!terminalReady) {
          setTerminalReady(true);
          onTerminalReady?.();
        }
      }
    });
    
    // Listen for terminal ready signal
    newSocket.on('terminal-ready', () => {
      setTerminalReady(true);
      onTerminalReady?.();
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [containerId, websocketUrl, onClientConnected, onAppContainerConnected, onTerminalReady]);
  
  const sendCommand = (command: string) => {
    if (socket && isConnected) {
      socket.emit('terminal-input', { containerId, command });
    }
  };
  
  const sendFile = (path: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('send-file', { containerId, path, content });
    }
  };
  
  const sendZip = (zipBuffer: ArrayBuffer, extractPath: string) => {
    if (socket && isConnected) {
      socket.emit('send-zip', { containerId, zipBuffer, extractPath });
    }
  };
  
  return {
    socket,
    isConnected,
    appContainerConnected,
    terminalReady,
    terminalOutput,
    sendCommand,
    sendFile,
    sendZip,
    clearTerminal: () => setTerminalOutput('')
  };
};