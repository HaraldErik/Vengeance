import { logger } from "@revenge-mod/utils";
import { findByProps } from "@revenge-mod/metro";
import { instead } from "@revenge-mod/patcher";

// Track the active patch so it can be cleanly reverted
let unpatchGateway: () => void;

export default {
  onLoad: () => {
    try {
      // 1. Locate the internal module responsible for tracking or generating connection properties
      const DeviceInfoModule = findByProps("getSuperProperties", "getAnalyticsContext");

      if (!DeviceInfoModule) {
        logger.error("DesktopPresence: Could not locate DeviceInfoModule.");
        return;
      }

      // 2. Intercept the property generator method to substitute platform markers
      unpatchGateway = instead(
        "getSuperProperties",
        DeviceInfoModule,
        (args, originalFunction) => {
          // Retrieve the original structure to preserve non-platform tracking tokens
          const properties = originalFunction(...args);

          // Inject Desktop identifiers
          properties.$os = "windows";            // Can also be "linux" or "macos"
          properties.$browser = "Discord Client"; // Forces Discord to handle it as the desktop application
          properties.$device = "";                // Clear out mobile device hardware tags

          return properties;
        }
      );

      logger.info("DesktopPresence: Successfully spoofing desktop environment.");
    } catch (error) {
      logger.error("DesktopPresence initialization failed:", error);
    }
  },

  onUnload: () => {
    // Clean up the hook when the plugin is toggled off to avoid state pollution
    if (typeof unpatchGateway === "function") {
      unpatchGateway();
      logger.info("DesktopPresence: Restored default mobile status identification.");
    }
  }
};
