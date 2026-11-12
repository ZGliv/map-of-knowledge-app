/**
 * The iOS app (prototype). Same conventions as Parl.ai's shell.
 *
 *   bundled (default)  the built `dist/` ships inside the app; works offline.
 *   local              CAP_APP_MODE=local points the shell at the dev server (CAP_SERVER_URL,
 *                      default http://127.0.0.1:5222) for live reload in the Simulator.
 *   remote             CAP_APP_MODE=remote loads the hosted site (REMOTE_URL). The TestFlight build
 *                      uses this, so every Vercel deploy reaches the phone on its next launch with no
 *                      new upload, and /api/guide works because the hosted site serves it.
 *
 * The personal guide calls /api/guide, which only the hosted site serves; in the bundled app it
 * reports itself offline, as it does anywhere the API is unreachable.
 * `appId` is editable until the first App Store Connect upload.
 *
 * Plain JS, not .ts: the Capacitor CLI compiles a .ts config with the TypeScript JS API, which
 * TypeScript 7 (this repo's compiler) no longer ships. The CLI require()s this ES module, so the
 * config is exported under the name 'module.exports' (Node's hook for what require() returns).
 */
const appMode = process.env.CAP_APP_MODE ?? 'bundled';
const BACKGROUND = '#070a14';
const REMOTE_URL = 'https://map-of-knowledge.vercel.app';

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'ai.mapofknowledge.app',
  appName: 'Map of Knowledge',
  webDir: 'dist',
  loggingBehavior: appMode === 'local' ? 'debug' : 'none',
  ...(appMode === 'local' ? { server: { url: process.env.CAP_SERVER_URL ?? 'http://127.0.0.1:5222', cleartext: true } } : {}),
  ...(appMode === 'remote' ? { server: { url: REMOTE_URL } } : {}),
  backgroundColor: BACKGROUND,
  ios: {
    // The web app owns the insets (viewport-fit=cover + env(safe-area-inset-*)).
    contentInset: 'never',
    backgroundColor: BACKGROUND,
    // Explore's videos and reels play inline with sound without a tap: Capacitor has no option for
    // that, so the app's bridge (ios/App/App/BridgeViewController.swift) pins it on the web view.
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: BACKGROUND,
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK', // light text and icons over the dark map
      overlaysWebView: true,
      backgroundColor: BACKGROUND,
    },
  },
};

export { config as 'module.exports' };
