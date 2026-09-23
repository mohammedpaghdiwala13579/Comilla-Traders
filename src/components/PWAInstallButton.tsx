import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer' | 'banner' | 'floating';
  className?: string;
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
  onInstalled,
}) => {
  const pwaState = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    isInstalled,
    isInstallable,
    isIOS,
    isIframe,
    installStatus,
    triggerInstall,
  } = pwaState;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If already installed, show status / feedback
    if (isInstalled) {
      setIsModalOpen(true);
      return;
    }

    // If native prompt is available (Windows / Android / Chromium), trigger instant 1-click install!
    if (isInstallable && !isIframe) {
      const result = await triggerInstall();
      if (result === 'accepted') {
        onInstalled?.();
        return;
      }
    }

    // Otherwise, open the tailored guidance modal for iOS, iframes, or browser fallback
    setIsModalOpen(true);
  };

  // Header button variant (compact, polished)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold text-[9px] rounded-lg transition-all shadow-md shadow-indigo-900/30 uppercase tracking-wider cursor-pointer active:scale-95 ${className}`}
          title={isInstalled ? 'App is Installed' : 'Install PWA to Home Screen'}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-300 shrink-0" />
              <span>Installed ✓</span>
            </>
          ) : (
            <>
              <Download className="h-3 w-3 text-indigo-200 shrink-0 animate-bounce" />
              <span>Install PWA</span>
            </>
          )}
        </button>

        {installStatus && (
          <div className="fixed top-4 right-4 z-50 bg-indigo-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-indigo-500/40 animate-fade-in">
            {installStatus}
          </div>
        )}

        <PWAInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pwaState={pwaState}
        />
      </>
    );
  }

  // Drawer / Mobile button variant (full width, prominent)
  if (variant === 'drawer') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>App Installed ✓</span>
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4 text-white animate-pulse" />
              <span>Install to Home Screen</span>
            </>
          )}
        </button>

        <PWAInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pwaState={pwaState}
        />
      </>
    );
  }

  // Banner variant
  return (
    <>
      <div className={`p-3 bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 shadow-lg ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-indigo-400/40 bg-slate-950 shrink-0">
            <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Install Comilla Traders App</h4>
            <p className="text-[10px] text-indigo-300">Fast 1-click home screen access & offline mode</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstalled ? 'Installed' : 'Install'}</span>
        </button>
      </div>

      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pwaState={pwaState}
      />
    </>
  );
};
