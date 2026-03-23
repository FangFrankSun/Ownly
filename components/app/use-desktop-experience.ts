import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const COMPACT_DESKTOP_BREAKPOINT = 1140;

function detectIOSWeb() {
  if (Platform.OS !== 'web') {
    return false;
  }
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent ?? '';
  const navPlatform = navigator.platform ?? '';
  const touchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;

  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return true;
  }

  // iPadOS can report itself as Mac in desktop-class browsing mode.
  if (navPlatform === 'MacIntel' && touchPoints > 1) {
    return true;
  }

  return false;
}

export function useDesktopExperience() {
  const { width } = useWindowDimensions();
  const isIOSWeb = useMemo(() => detectIOSWeb(), []);
  const isDesktopExperience = Platform.OS === 'macos' || (Platform.OS === 'web' && !isIOSWeb);
  const isCompactDesktop = isDesktopExperience && width < COMPACT_DESKTOP_BREAKPOINT;

  return {
    isCompactDesktop,
    isDesktopExperience,
    isIOSWeb,
    width,
  };
}

