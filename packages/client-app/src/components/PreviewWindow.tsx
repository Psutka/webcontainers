import { useState } from 'react';

interface PreviewWindowProps {
  previewUrl?: string;
  containerId?: string;
}

export default function PreviewWindow({ previewUrl, containerId }: PreviewWindowProps) {
  const [currentUrl, setCurrentUrl] = useState(previewUrl || '');

  const handleUrlChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    setCurrentUrl(url);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-300 min-h-0">
      <div className="bg-gray-200 px-3 py-2 border-b border-gray-300 flex-shrink-0">
        <h3 className="text-sm font-semibold mb-2">Preview</h3>
        <form onSubmit={handleUrlChange} className="flex gap-2">
          <input
            type="url"
            name="url"
            defaultValue={currentUrl}
            placeholder={containerId ? `http://localhost:3000` : 'Enter URL...'}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go
          </button>
        </form>
      </div>
      <div className="flex-1 min-h-0">
        {currentUrl ? (
          <iframe
            src={currentUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No preview URL set</p>
          </div>
        )}
      </div>
    </div>
  );
}