import { ConnectionProgress, ProgressStep } from '../types/progress';

interface ConnectionProgressProps {
  progress: ConnectionProgress;
}

const progressSteps: ProgressStep[] = [
  {
    id: 'containerCreated',
    label: 'Container Created',
    description: 'Docker container has been created'
  },
  {
    id: 'websocketCreated',
    label: 'WebSocket Ready',
    description: 'WebSocket endpoint is available'
  },
  {
    id: 'clientConnected',
    label: 'Client Connected',
    description: 'Client app connected to WebSocket'
  },
  {
    id: 'appContainerConnected',
    label: 'App Container Connected',
    description: 'App container joined WebSocket channel'
  },
  {
    id: 'terminalReady',
    label: 'Terminal Ready',
    description: 'Terminal I/O is fully operational'
  }
];

export default function ConnectionProgressBar({ progress }: ConnectionProgressProps) {
  const completedSteps = progressSteps.filter(step => progress[step.id]).length;
  const progressPercentage = (completedSteps / progressSteps.length) * 100;

  return (
    <div className="bg-white border-t border-gray-300 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Connection Progress</h3>
        <span className="text-xs text-gray-500">
          {completedSteps} of {progressSteps.length} steps completed
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* Progress Steps */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        {progressSteps.map((step, index) => {
          const isCompleted = progress[step.id];
          const isActive = !isCompleted && index === completedSteps;
          
          return (
            <div 
              key={step.id}
              className={`text-center p-2 rounded ${
                isCompleted 
                  ? 'bg-green-100 text-green-800' 
                  : isActive 
                    ? 'bg-yellow-100 text-yellow-800 animate-pulse' 
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                {isCompleted ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isActive ? (
                  <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                )}
              </div>
              <div className="font-medium">{step.label}</div>
              <div className="text-xs opacity-75 mt-1">{step.description}</div>
            </div>
          );
        })}
      </div>
      
      {/* Status Message */}
      <div className="mt-3 text-center">
        {completedSteps === 0 && (
          <p className="text-sm text-gray-600">Create a container to begin</p>
        )}
        {completedSteps > 0 && completedSteps < progressSteps.length && (
          <p className="text-sm text-blue-600">
            Setting up connection... ({progressSteps[completedSteps].label})
          </p>
        )}
        {completedSteps === progressSteps.length && (
          <p className="text-sm text-green-600 font-medium">
            🎉 All systems connected! Terminal is ready for use.
          </p>
        )}
      </div>
    </div>
  );
}