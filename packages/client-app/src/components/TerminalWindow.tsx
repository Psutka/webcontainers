import { useState, useRef, useEffect } from 'react';

interface TerminalWindowProps {
  output: string;
  onSendCommand: (command: string) => void;
  isConnected: boolean;
}

export default function TerminalWindow({ output, onSendCommand, isConnected }: TerminalWindowProps) {
  const [input, setInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isConnected) {
      onSendCommand(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-xs min-h-0">
      <div className="bg-gray-800 px-3 py-2 border-b border-gray-600 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">
          Terminal {isConnected ? '(Connected)' : '(Disconnected)'}
        </h3>
      </div>
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 whitespace-pre-wrap min-h-0 text-xs"
      >
        {output || 'Waiting for connection...'}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-600 p-3 flex-shrink-0">
        <div className="flex">
          <span className="text-green-400 mr-2 text-xs">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isConnected}
            className="flex-1 bg-transparent outline-none text-green-400 disabled:opacity-50 text-xs"
            placeholder={isConnected ? "Enter command..." : "Not connected"}
            autoComplete="off"
          />
        </div>
      </form>
    </div>
  );
}