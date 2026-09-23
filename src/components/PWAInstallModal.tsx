import React from 'react';
import {
  Download,
  Share2,
  PlusSquare,
  Smartphone,
  Monitor,
  CheckCircle2,
  ExternalLink,
  X,
  Compass,
  ArrowDown
} from 'lucide-react';
import { PWAInstallState } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  pwaState: PWAInstallState;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  pwaState,
}) => {
  if (!isOpen) return null;

  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isWindows,
    isIframe,
    triggerInstall,
  } = pwaState;

  const handleInstallClick = async () => {
    const res = await triggerInstall();
    if (res === 'accepted') {
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-indigo-400/40 shadow-lg shadow-indigo-500/10 shrink-0 bg-slate-950 p-0.5">
            <img
              src="/pwa-192x192.png"
              alt="Comilla Traders Logo"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-white tracking-wide">
                Comilla Traders Portal
              </h3>
            </div>
            <p className="text-xs text-indigo-300">
              Operations & Inventory Control PWA
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                Offline Ready
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-sky-950/70 border border-sky-500/40 text-sky-300">
                Fast Standalone App
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic platform installation content */}
        {isInstalled ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="font-semibold text-emerald-200 text-sm">
              App is Installed!
            </p>
            <p className="text-xs text-slate-300">
              Comilla Traders is already installed on this device. You can launch it directly from your home screen or desktop.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition"
            >
              Close
            </button>
          </div>
        ) : isIOS ? (
          /* iOS Step-by-Step Installation */
          <div className="space-y-4">
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Install on iPhone / iPad (Safari)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                iOS requires two simple taps in Safari to add the app directly to your home screen:
              </p>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                  <div className="w-7 h-7 rounded-md bg-indigo-600/30 flex items-center justify-center shrink-0 text-indigo-300">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Step 1: </span>
                    Tap the <strong className="text-indigo-300">Share</strong> button at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                  <div className="w-7 h-7 rounded-md bg-indigo-600/30 flex items-center justify-center shrink-0 text-indigo-300">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Step 2: </span>
                    Scroll down and tap <strong className="text-indigo-300">Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                  <div className="w-7 h-7 rounded-md bg-emerald-600/30 flex items-center justify-center shrink-0 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Step 3: </span>
                    Tap <strong className="text-emerald-300">Add</strong> at top right to complete installation.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition cursor-pointer"
            >
              Got it!
            </button>
          </div>
        ) : (
          /* Windows / Android / Chromium 1-Click Install */
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                  {isWindows ? (
                    <Monitor className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  Target: {isWindows ? 'Windows Desktop' : isAndroid ? 'Android Phone/Tablet' : 'Browser App'}
                </span>
                <span className="text-[10px] text-slate-400">1-Click Install</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Install as a standalone desktop or mobile application. Launches in full-screen without browser URL bars and works offline.
              </p>

              {isIframe && (
                <div className="p-2.5 bg-indigo-950/60 border border-indigo-500/40 rounded-lg text-xs text-indigo-200 space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Embedded Preview Detected</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    For browsers that restrict prompts inside iframes, launch directly in a full tab to trigger the instant install prompt:
                  </p>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Clean Tab to Install</span>
                  </a>
                </div>
              )}
            </div>

            {/* Direct 1-Click Button */}
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Install to Home Screen / Desktop</span>
            </button>

            {!isInstallable && !isIframe && (
              <p className="text-[11px] text-center text-slate-400">
                You can also click the install icon <strong>(⊕)</strong> in your browser address bar or menu <strong>(⋮ ➔ Install App)</strong>.
              </p>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span>Comilla Traders Maritime Logistics</span>
          <span>v1.2 PWA Standalone</span>
        </div>
      </div>
    </div>
  );
};
