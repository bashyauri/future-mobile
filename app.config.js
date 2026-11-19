const {
  withAndroidManifest,
  withGradleProperties,
  AndroidConfig,
} = require("@expo/config-plugins");

const buildProfile = process.env.EAS_BUILD_PROFILE ?? "development";
const isDevelopment = buildProfile === "development";
const isPreview = buildProfile === "preview";

const appName = isDevelopment
  ? "Future Academy Dev"
  : isPreview
    ? "Future Academy Preview"
    : "Future Academy";

const androidPackage = isDevelopment
  ? "com.bashyauri.mobile.dev"
  : isPreview
    ? "com.bashyauri.mobile.preview"
    : "com.bashyauri.mobile";

/**
 * Expo Config Plugin to ensure R8 code minification and resource shrinking
 * are enabled in release builds, satisfying Play Store DEX optimization requirements.
 */
const withR8Optimization = (config) => {
  return withGradleProperties(config, (gradleConfig) => {
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      gradleConfig.modResults,
      "android.enableMinifyInReleaseBuilds",
      "true"
    );
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      gradleConfig.modResults,
      "android.enableShrinkResourcesInReleaseBuilds",
      "true"
    );
    return gradleConfig;
  });
};

/**
 * Expo Config Plugin to mark hardware features (like Wi-Fi) as optional.
 * Prevents Google Play Store from restricting app availability on devices
 * without dedicated Wi-Fi hardware (e.g. Chromebooks, Tablets, Desktops, XR).
 */
const withOptionalHardwareFeatures = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!manifest["uses-feature"]) {
      manifest["uses-feature"] = [];
    }

    const featuresToMakeOptional = [
      "android.hardware.wifi",
      "android.hardware.camera",
      "android.hardware.camera.autofocus",
      "android.hardware.telephony",
    ];

    for (const featureName of featuresToMakeOptional) {
      const existing = manifest["uses-feature"].find(
        (item) => item.$ && item.$["android:name"] === featureName
      );

      if (existing) {
        existing.$["android:required"] = "false";
      } else {
        manifest["uses-feature"].push({
          $: {
            "android:name": featureName,
            "android:required": "false",
          },
        });
      }
    }

    return modConfig;
  });
};

module.exports = {
  expo: {
    name: appName,
    slug: "mobile",
    version: "2.1.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "automatic",
    updates: {
      url: "https://u.expo.dev/a380bf24-ea8d-4d49-8f5c-0ffee7606e76",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      icon: "./assets/images/icon.png",
      bundleIdentifier: isDevelopment
        ? "com.bashyauri.mobile.dev"
        : isPreview
          ? "com.bashyauri.mobile.preview"
          : "com.bashyauri.mobile",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0B132B",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      package: androidPackage,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0B132B",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 160,
          },
        },
      ],
      "expo-secure-store",
      "expo-sqlite",
      "expo-web-browser",
      withR8Optimization,
      withOptionalHardwareFeatures,
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "a380bf24-ea8d-4d49-8f5c-0ffee7606e76",
      },
      buildProfile,
    },
  },
};
