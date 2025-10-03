/**
 * Platform detection and app installation check utilities
 */

export type Platform = "ios" | "android" | "web";

/**
 * Detects the current platform based on user agent and browser features
 */
export function detectPlatform(): Platform {
  const userAgent = navigator.userAgent || navigator.vendor || "";

  // iOS detection
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return "ios";
  }

  // Android detection
  if (/android/i.test(userAgent)) {
    return "android";
  }

  // Default to web
  return "web";
}

/**
 * Checks if the native app is installed by attempting to open it
 * This uses a timeout-based approach to detect if the app opened
 */
export async function checkAppInstalled(): Promise<boolean> {
  const platform = detectPlatform();

  // Only check for mobile platforms
  if (platform === "web") {
    return false;
  }

  return new Promise((resolve) => {
    let appOpened = false;
    const checkDelay = 2500; // Time to wait before concluding app is not installed

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set up blur listener as fallback
    const handleBlur = () => {
      appOpened = true;
    };

    window.addEventListener("blur", handleBlur);

    // Try to open the app
    const startTime = Date.now();

    // Attempt to open app with custom scheme
    const testLink = document.createElement("a");
    testLink.href = "daystep://test";
    testLink.style.display = "none";
    document.body.appendChild(testLink);
    testLink.click();

    // Check after delay
    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.body.removeChild(testLink);

      // If the page lost focus or became hidden, app likely opened
      const timeDiff = Date.now() - startTime;
      if (appOpened || timeDiff > checkDelay + 500) {
        resolve(true);
      } else {
        resolve(false);
      }
    }, checkDelay);
  });
}

/**
 * Gets the appropriate store URL for the current platform
 */
export function getStoreUrl(platform: Platform): string | null {
  switch (platform) {
    case "ios":
      // TODO: Replace with actual App Store ID
      return "https://apps.apple.com/app/daystep/id123456789";
    case "android":
      // TODO: Replace with actual package name
      return "https://play.google.com/store/apps/details?id=com.daystep.app";
    default:
      return null;
  }
}

/**
 * Gets the deep link URL for opening the app
 */
export function getAppDeepLink(path?: string): string {
  const basePath = path || "";
  return `daystep://open${basePath}`;
}

/**
 * Attempts to open the app or redirect to store
 */
export async function openAppOrStore(path?: string): Promise<void> {
  const platform = detectPlatform();

  if (platform === "web") {
    // On web, just navigate to the path
    if (path) {
      window.location.href = path;
    }
    return;
  }

  const isInstalled = await checkAppInstalled();

  if (isInstalled) {
    // App is installed, open it
    window.location.href = getAppDeepLink(path);
  } else {
    // App not installed, redirect to store
    const storeUrl = getStoreUrl(platform);
    if (storeUrl) {
      window.location.href = storeUrl;
    }
  }
}
