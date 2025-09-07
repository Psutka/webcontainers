import { useState } from 'react';
import { AppContainer } from '../types/container';

interface ContainerControlsProps {
  container: AppContainer | null;
  onCreateContainer: () => void;
  onTerminateContainer: () => void;
  onQueryStatus: () => void;
  onSendZip: (file: File, extractPath: string) => void;
}

export default function ContainerControls({
  container,
  onCreateContainer,
  onTerminateContainer,
  onQueryStatus,
  onSendZip
}: ContainerControlsProps) {
  const [extractPath, setExtractPath] = useState('/app');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/zip') {
      onSendZip(file, extractPath);
    }
  };

  return (
    <div className="bg-white border border-gray-300 p-4">
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={onCreateContainer}
          disabled={!!container}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Container
        </button>
        
        <button
          onClick={onTerminateContainer}
          disabled={!container || container.status === 'terminated'}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Terminate Container
        </button>
        
        <button
          onClick={onQueryStatus}
          disabled={!container}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Query Status
        </button>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={extractPath}
            onChange={(e) => setExtractPath(e.target.value)}
            placeholder="Extract path"
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <input
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            disabled={!container || container.status !== 'running'}
            className="text-sm disabled:opacity-50"
          />
        </div>
        
        {container && (
          <div className="text-sm text-gray-600">
            Status: <span className="font-semibold">{container.status}</span>
            {container.id && <span> | ID: {container.id}</span>}
          </div>
        )}
      </div>
    </div>
  );
}