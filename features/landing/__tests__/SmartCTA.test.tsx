import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SmartCTA } from "../SmartCTA";
import * as platformDetector from "../platformDetector";

// Mock the platform detector module
jest.mock("../platformDetector");

describe("SmartCTA Component", () => {
  const mockDetectPlatform =
    platformDetector.detectPlatform as jest.MockedFunction<
      typeof platformDetector.detectPlatform
    >;
  const mockCheckAppInstalled =
    platformDetector.checkAppInstalled as jest.MockedFunction<
      typeof platformDetector.checkAppInstalled
    >;
  const mockGetStoreUrl = platformDetector.getStoreUrl as jest.MockedFunction<
    typeof platformDetector.getStoreUrl
  >;
  const mockGetAppDeepLink =
    platformDetector.getAppDeepLink as jest.MockedFunction<
      typeof platformDetector.getAppDeepLink
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to web platform
    mockDetectPlatform.mockReturnValue("web");
    mockCheckAppInstalled.mockResolvedValue(false);
  });

  it("should show loading state initially for mobile platforms", () => {
    // Set to mobile platform to trigger app check
    mockDetectPlatform.mockReturnValue("ios");
    // Mock to delay the platform check
    mockCheckAppInstalled.mockImplementation(() => new Promise(() => {}));

    render(<SmartCTA />);
    expect(screen.getByText("확인 중...")).toBeInTheDocument();
  });

  describe("Web Platform", () => {
    it("should show web CTA for web platform", async () => {
      mockDetectPlatform.mockReturnValue("web");

      render(<SmartCTA />);

      await waitFor(() => {
        expect(screen.getByText("웹에서 시작하기")).toBeInTheDocument();
      });
    });

    it("should navigate to app on web platform click", async () => {
      mockDetectPlatform.mockReturnValue("web");
      delete (window as any).location;
      (window as any).location = { href: "" };

      render(<SmartCTA />);

      await waitFor(() => {
        const button = screen.getByText("웹에서 시작하기");
        fireEvent.click(button);
      });

      expect(window.location.href).toBe("/");
    });

    it("should navigate to custom path on web platform", async () => {
      mockDetectPlatform.mockReturnValue("web");
      delete (window as any).location;
      (window as any).location = { href: "" };

      render(<SmartCTA path="/repository" />);

      await waitFor(() => {
        const button = screen.getByText("웹에서 시작하기");
        fireEvent.click(button);
      });

      expect(window.location.href).toBe("/repository");
    });
  });

  describe("iOS Platform", () => {
    beforeEach(() => {
      mockDetectPlatform.mockReturnValue("ios");
    });

    it("should show App Store download CTA when app not installed", async () => {
      mockCheckAppInstalled.mockResolvedValue(false);

      render(<SmartCTA />);

      await waitFor(() => {
        expect(screen.getByText("App Store에서 다운로드")).toBeInTheDocument();
      });
    });

    it("should show open app CTA when app is installed", async () => {
      mockCheckAppInstalled.mockResolvedValue(true);

      render(<SmartCTA />);

      await waitFor(() => {
        expect(screen.getByText("앱에서 열기")).toBeInTheDocument();
      });
    });

    it("should redirect to App Store when app not installed", async () => {
      mockCheckAppInstalled.mockResolvedValue(false);
      mockGetStoreUrl.mockReturnValue("https://apps.apple.com/app/daystep");
      delete (window as any).location;
      (window as any).location = { href: "" };

      render(<SmartCTA />);

      await waitFor(() => {
        const button = screen.getByText("App Store에서 다운로드");
        fireEvent.click(button);
      });

      expect(window.location.href).toBe("https://apps.apple.com/app/daystep");
    });

    it("should open app with deep link when installed", async () => {
      mockCheckAppInstalled.mockResolvedValue(true);
      mockGetAppDeepLink.mockReturnValue("daystep://open/");
      delete (window as any).location;
      (window as any).location = { href: "" };

      render(<SmartCTA path="/" />);

      await waitFor(() => {
        const button = screen.getByText("앱에서 열기");
        fireEvent.click(button);
      });

      expect(mockGetAppDeepLink).toHaveBeenCalledWith("/");
      expect(window.location.href).toBe("daystep://open/");
    });
  });

  describe("Android Platform", () => {
    beforeEach(() => {
      mockDetectPlatform.mockReturnValue("android");
    });

    it("should show Google Play download CTA when app not installed", async () => {
      mockCheckAppInstalled.mockResolvedValue(false);

      render(<SmartCTA />);

      await waitFor(() => {
        expect(
          screen.getByText("Google Play에서 다운로드")
        ).toBeInTheDocument();
      });
    });

    it("should redirect to Google Play when app not installed", async () => {
      mockCheckAppInstalled.mockResolvedValue(false);
      mockGetStoreUrl.mockReturnValue(
        "https://play.google.com/store/apps/details?id=com.daystep.app"
      );
      delete (window as any).location;
      (window as any).location = { href: "" };

      render(<SmartCTA />);

      await waitFor(() => {
        const button = screen.getByText("Google Play에서 다운로드");
        fireEvent.click(button);
      });

      expect(window.location.href).toBe(
        "https://play.google.com/store/apps/details?id=com.daystep.app"
      );
    });
  });

  it("should apply custom className", async () => {
    render(<SmartCTA className="custom-class" />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  it("should handle errors gracefully", async () => {
    mockDetectPlatform.mockImplementation(() => {
      throw new Error("Platform detection failed");
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<SmartCTA />);

    await waitFor(() => {
      // Should still show web CTA as fallback
      expect(screen.getByText("웹에서 시작하기")).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error checking platform and app:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
