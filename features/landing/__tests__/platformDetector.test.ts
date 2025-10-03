import {
  detectPlatform,
  checkAppInstalled,
  getStoreUrl,
  getAppDeepLink,
  openAppOrStore,
} from "../platformDetector";

describe("Platform Detector", () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
    });
  });

  describe("detectPlatform", () => {
    it("should detect iOS platform", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        writable: true,
      });

      expect(detectPlatform()).toBe("ios");
    });

    it("should detect Android platform", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
        writable: true,
      });

      expect(detectPlatform()).toBe("android");
    });

    it("should default to web platform", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        writable: true,
      });

      expect(detectPlatform()).toBe("web");
    });
  });

  describe("getStoreUrl", () => {
    it("should return iOS App Store URL", () => {
      const url = getStoreUrl("ios");
      expect(url).toContain("apps.apple.com");
    });

    it("should return Android Play Store URL", () => {
      const url = getStoreUrl("android");
      expect(url).toContain("play.google.com");
    });

    it("should return null for web platform", () => {
      expect(getStoreUrl("web")).toBeNull();
    });
  });

  describe("getAppDeepLink", () => {
    it("should generate deep link without path", () => {
      expect(getAppDeepLink()).toBe("daystep://open");
    });

    it("should generate deep link with path", () => {
      expect(getAppDeepLink("/")).toBe("daystep://open/");
    });
  });

  describe("checkAppInstalled", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return false for web platform", async () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        writable: true,
      });

      const result = await checkAppInstalled();
      expect(result).toBe(false);
    });

    it("should detect app not installed when page stays visible", async () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        writable: true,
      });

      const promise = checkAppInstalled();

      // Fast forward time
      jest.advanceTimersByTime(3000);

      const result = await promise;
      expect(result).toBe(false);
    });
  });
});
