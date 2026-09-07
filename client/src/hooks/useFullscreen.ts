import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFullscreenProps {
  enabled: boolean;
  onViolation?: (type: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'unauthorized_shortcut', details: string) => void;
}

export function useFullscreen({ enabled, onViolation }: UseFullscreenProps) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;
  const lastViolationTimeRef = useRef<number>(0);
  const lastViolationTypeRef = useRef<string>('');

  const triggerViolation = useCallback(
    (type: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'unauthorized_shortcut', details: string) => {
      if (!isEnabledRef.current || !onViolationRef.current) return;
      const now = Date.now();

      // Coalesce blur and tab_switch: if switching tabs, document.hidden is true or tab_switch fires within 1500ms
      if (type === 'window_blur') {
        if (document.hidden) return;
        if (lastViolationTypeRef.current === 'tab_switch' && now - lastViolationTimeRef.current < 1500) {
          return;
        }
      }
      if (type === 'tab_switch') {
        if (lastViolationTypeRef.current === 'window_blur' && now - lastViolationTimeRef.current < 1500) {
          return;
        }
      }
      // General sliding debounce for rapid repeated events of the same type
      if (type === lastViolationTypeRef.current && now - lastViolationTimeRef.current < 1500) {
        return;
      }

      lastViolationTimeRef.current = now;
      lastViolationTypeRef.current = type;
      onViolationRef.current(type, details);
    },
    []
  );

  // Detect if DOM Fullscreen API is supported (e.g. unsupported on iPhones/iOS Safari)
  const isNativeFullscreenSupported = typeof document !== 'undefined' && Boolean(
    document.documentElement && (
      'requestFullscreen' in document.documentElement ||
      'webkitRequestFullscreen' in document.documentElement ||
      'msRequestFullscreen' in document.documentElement
    )
  );

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    if (!isNativeFullscreenSupported) return true; // Graceful pseudo-fullscreen for unsupported mobile
    return Boolean(document.fullscreenElement);
  });

  const requestFullscreen = useCallback(async () => {
    if (!isNativeFullscreenSupported) {
      // Mobile device without Fullscreen API: grant pseudo-fullscreen safely
      setIsFullscreen(true);
      return;
    }

    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
        setIsFullscreen(Boolean(document.fullscreenElement));
      } else {
        setIsFullscreen(true);
      }

      // W3C Keyboard Lock API: Lock Escape key to prevent Chrome from exiting full screen on Esc
      // and suppress the standard "Press Esc to exit full screen" banner in supported Chromium browsers.
      if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock(['Escape']);
        } catch (lockErr) {
          // Allowed only after user gesture
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed or was rejected:', err);
      // If rejected on mobile/touch, fallback to granting pseudo-fullscreen
      setIsFullscreen(true);
    }
  }, [isNativeFullscreenSupported]);

  const exitFullscreen = useCallback(async () => {
    try {
      if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
        try {
          (navigator as any).keyboard.unlock();
        } catch (e) {}
      }
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Check initial state
    setIsFullscreen(isNativeFullscreenSupported ? Boolean(document.fullscreenElement) : true);

    const handleFullscreenChange = async () => {
      const active = isNativeFullscreenSupported ? Boolean(document.fullscreenElement) : true;
      setIsFullscreen(active);

      if (active) {
        // Lock Escape key when entering full screen
        if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
          try {
            await (navigator as any).keyboard.lock(['Escape']);
          } catch (e) {}
        }
      } else if (isEnabledRef.current && isNativeFullscreenSupported) {
        triggerViolation('fullscreen_exit', 'Participant pressed Escape or exited full-screen mode');
      }
    };

    const purgeClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText('');
        }
      } catch (e) {}
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isEnabledRef.current) {
        purgeClipboard();
        triggerViolation('tab_switch', 'Candidate switched tabs or minimized assessment window');
      }
    };

    const handleWindowBlur = () => {
      if (isEnabledRef.current) {
        purgeClipboard();
        triggerViolation('window_blur', 'Window lost focus (Alt+Tab or secondary monitor click)');
      }
    };

    // Strict OA Keyboard Lock: Block Esc, F12, Ctrl+Shift+I, Ctrl+U, Alt+Tab, etc.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnabledRef.current) return;

      // Intercept and prevent Escape key from exiting fullscreen
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('fullscreen_exit', 'Escape key pressed during live assessment');
        return false;
      }

      // F12 or DevTools
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('unauthorized_shortcut', `Attempted unauthorized developer tools access (${e.key})`);
        return false;
      }

      // Block Ctrl+C / Ctrl+V in non-editor spaces
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        const target = e.target as HTMLElement;
        const isMonaco = target?.closest('.monaco-editor') !== null || target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT';
        if (!isMonaco) {
          e.preventDefault();
          triggerViolation('unauthorized_shortcut', `Copy/Paste is disabled across test statements`);
        }
      }
    };

    // Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      if (!isEnabledRef.current) return;
      const target = e.target as HTMLElement;
      if (!target?.closest('.monaco-editor')) {
        e.preventDefault();
      }
    };

    // Disable Text Selection on Question Statements
    const handleSelectStart = (e: Event) => {
      if (!isEnabledRef.current) return;
      const target = e.target as HTMLElement;
      if (!target?.closest('.monaco-editor') && target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    // Prevent top scroll pull / overscroll
    const handleWheel = (e: WheelEvent) => {
      if (window.scrollY <= 0 && e.deltaY < 0) {
        e.preventDefault();
      }
    };

    // Prevent navigating away or opening new tabs via hyperlinks in question prompts
    const handleClick = (e: MouseEvent) => {
      if (!isEnabledRef.current) return;
      const target = e.target as HTMLElement;
      const anchor = target?.closest('a');
      if (anchor && anchor.href) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('click', handleClick, true);

    return () => {
      try {
        if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
          (navigator as any).keyboard.unlock();
        }
      } catch (e) {}
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled]);

  return {
    isFullscreen,
    requestFullscreen,
    exitFullscreen
  };
}
