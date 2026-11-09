'use client';

import { useEffect, useState } from 'react';

const MOBILE_USER_AGENT_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const useIsMobileCameraDevice = (): boolean => {
  const [isMobileCamera, setIsMobileCamera] = useState(false);

  useEffect(() => {
    const checkDevice = (): void => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        setIsMobileCamera(false);
        return;
      }

      const hasCoarsePointer =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
      const hasTouchPoints = (navigator.maxTouchPoints ?? 0) > 0;
      const isMobileUa = MOBILE_USER_AGENT_REGEX.test(navigator.userAgent ?? '');
      const isCompactViewport = window.innerWidth <= 1024;

      setIsMobileCamera(
        isMobileUa || (hasCoarsePointer && hasTouchPoints && isCompactViewport)
      );
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  return isMobileCamera;
};
