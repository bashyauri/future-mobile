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

module.exports = {
  expo: {
    name: appName,
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
      bundleIdentifier: isDevelopment
        ? "com.bashyauri.mobile.dev"
        : isPreview
          ? "com.bashyauri.mobile.preview"
          : "com.bashyauri.mobile",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
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
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
      "expo-secure-store",
      "expo-sqlite",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
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
