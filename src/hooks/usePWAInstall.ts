import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isIframe: boolean;
  installStatus: string | null;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'ios' | 'fallback' | 'already-installed'>;
  clearStatus: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  // Platform detection
  const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(userAgent);
  const isWindows = /windows/.test(userAgent);

  useEffect(() => {
    // Check if app is already running in standalone mode
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Capture standard PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallStatus('Installed ✓');
      setTimeout(() => setInstallStatus(null), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'fallback' | 'already-installed'> => {
    if (isInstalled) {
      setInstallStatus('Already installed ✓');
      setTimeout(() => setInstallStatus(null), 2500);
      return 'already-installed';
    }

    // Direct 1-click install for Android, Windows, Chrome, Edge
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setInstallStatus('Installed ✓');
          setTimeout(() => setInstallStatus(null), 3000);
          return 'accepted';
        } else {
          setInstallStatus('Cancelled');
          setTimeout(() => setInstallStatus(null), 2000);
          return 'dismissed';
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }

    // iOS Safari
    if (isIOS) {
      setInstallStatus("Tap Safari Share ➔ Add to Home Screen");
      setTimeout(() => setInstallStatus(null), 3500);
      return 'ios';
    }

    // If embedded or prompt not yet fired
    if (isIframe) {
      setInstallStatus("Open in browser to install directly");
      setTimeout(() => setInstallStatus(null), 3500);
      return 'fallback';
    }

    if (isWindows) {
      setInstallStatus("Click (⊕) in browser address bar to install");
    } else if (isAndroid) {
      setInstallStatus("Tap Menu (⋮) ➔ Install app");
    } else {
      setInstallStatus("Tap Menu (⋮) ➔ Install app");
    }
    setTimeout(() => setInstallStatus(null), 3500);
    return 'fallback';
  }, [deferredPrompt, isInstalled, isIOS, isIframe, isWindows, isAndroid]);

  const clearStatus = useCallback(() => {
    setInstallStatus(null);
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isWindows,
    isIframe,
    installStatus,
    triggerInstall,
    clearStatus,
  };
}
