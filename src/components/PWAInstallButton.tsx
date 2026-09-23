import React from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer';
  className?: string;
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
  onInstalled,
}) => {
  const { isInstalled, installStatus, triggerInstall } = usePWAInstall();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const outcome = await triggerInstall();
    if (outcome === 'accepted') {
      onInstalled?.();
    }
  };

  if (variant === 'drawer') {
    return (
      <div className="relative w-full">
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-98 ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Installed</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 text-white" />
              <span>Install</span>
            </>
          )}
        </button>

        {installStatus && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-slate-900/95 text-indigo-200 border border-indigo-500/40 text-[11px] px-3 py-1.5 rounded-lg shadow-xl pointer-events-none">
            {installStatus}
          </div>
        )}
      </div>
    );
  }

  // Header / Sidebar variant
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-md shadow-indigo-900/30 uppercase tracking-wider cursor-pointer active:scale-95 ${className}`}
        title={isInstalled ? 'App Installed' : 'Install'}
      >
        {isInstalled ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-emerald-300 shrink-0" />
            <span>Installed</span>
          </>
        ) : (
          <>
            <Download className="h-3 w-3 text-indigo-200 shrink-0" />
            <span>Install</span>
          </>
        )}
      </button>

      {installStatus && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-slate-900/95 text-indigo-200 border border-indigo-500/40 text-[10px] px-2.5 py-1 rounded-md shadow-xl pointer-events-none">
          {installStatus}
        </div>
      )}
    </div>
  );
};
