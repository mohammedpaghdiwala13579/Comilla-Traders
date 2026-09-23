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
  isSafari: boolean;
  installStatus: string | null;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'ios' | 'unsupported' | 'already-installed'>;
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
  const isSafari = /safari/.test(userAgent) && !/chrome|crios|crmo|firefox|fxios/.test(userAgent);

  useEffect(() => {
    // Check if running in standalone mode (already installed app)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsInstalled(isStandalone);
    };

    checkStandalone();

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Capture appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallStatus('App Installed Successfully ✓');
      setTimeout(() => setInstallStatus(null), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unsupported' | 'already-installed'> => {
    if (isInstalled) {
      setInstallStatus('Already installed on your device');
      setTimeout(() => setInstallStatus(null), 3000);
      return 'already-installed';
    }

    // 1. One-click install if native prompt is available (Android, Windows, Edge, Chrome)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setInstallStatus('Installing Comilla Traders App...');
          setTimeout(() => setInstallStatus(null), 3500);
          return 'accepted';
        } else {
          setInstallStatus('Installation cancelled');
          setTimeout(() => setInstallStatus(null), 2500);
          return 'dismissed';
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }

    // 2. iOS Safari (WebKit does not support programmatic beforeinstallprompt)
    if (isIOS) {
      return 'ios';
    }

    return 'unsupported';
  }, [deferredPrompt, isInstalled, isIOS]);

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
    isSafari,
    installStatus,
    triggerInstall,
    clearStatus,
  };
}
