import { MessageWindowItem } from '../types/container';

interface MessageWindowProps {
  messages: MessageWindowItem[];
}

export default function MessageWindow({ messages }: MessageWindowProps) {
  return (
    <div className="flex flex-col h-full bg-gray-100 border border-gray-300 min-h-0">
      <div className="bg-gray-200 px-3 py-2 border-b border-gray-300 flex-shrink-0">
        <h3 className="text-sm font-semibold">Messages</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-sm">
              <span className="text-gray-400 text-xs">
                {message.timestamp.toLocaleTimeString()}
              </span>
              <span
                className={`ml-2 ${
                  message.type === 'error'
                    ? 'text-red-600'
                    : message.type === 'success'
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`}
              >
                {message.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}