import React from 'react';
import { AlertTriangle, XCircle, Coins } from 'lucide-react';
import { Button } from './Button';

interface AlertDialogProps {
  message: string;
  onClose: () => void;
  type?: 'alert' | 'token';
}

export function AlertDialog({ message, onClose, type = 'alert' }: AlertDialogProps) {
  const isToken = type === 'token';
  const colors = isToken ? {
    bg: 'from-yellow-500/5 to-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: 'text-yellow-400',
    button: 'bg-yellow-500 hover:bg-yellow-600'
  } : {
    bg: 'from-red-500/5 to-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    button: 'bg-red-500 hover:bg-red-600'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`animate-in fade-in slide-in-from-bottom-4 duration-300 bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl`}>
        <div className="flex items-start space-x-4 mb-6">
          <div className={`${isToken ? 'bg-yellow-500/10' : 'bg-red-500/10'} p-3 rounded-full`}>
            {isToken ? (
              <Coins className={`w-6 h-6 ${colors.icon}`} />
            ) : (
              <AlertTriangle className={`w-6 h-6 ${colors.icon}`} />
            )}
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-semibold ${colors.icon} mb-2`}>
              {isToken ? 'Tokens Received!' : 'New Alert'}
            </h3>
            <p className="text-gray-300">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <Button
          onClick={onClose}
          className={`w-full ${colors.button}`}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}