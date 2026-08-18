import type { CapacitorConfig } from '@capacitor/cli';
import { FLAVORS, toFlavorId } from './src/flavors/registry';

// APP_FLAVOR selects a standalone prep app (set by scripts/flavor-ios.mjs /
// build-flavor.mjs); unset resolves to `main` — the full Fly GACA shell.
const flavor = FLAVORS[toFlavorId(process.env.APP_FLAVOR) ?? 'main'];

const config: CapacitorConfig = {
  appId: flavor.appId,
  appName: flavor.appName,
  // Vite builds the web payload into dist/; `cap sync` copies it into the
  // native shells. iOS is the primary platform (android/ is a scaffold).
  webDir: 'dist',
  backgroundColor: '#0A0E12',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0A0E12',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#0A0E12',
  },
  plugins: {
    // Splash is hidden manually by initNative() once the shell is ready, so the
    // first paint isn't a white flash. Dark Falcon background, no spinner.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0A0E12',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    // Resize the WebView (not just the content) when the keyboard appears.
    Keyboard: {
      resize: 'native',
    },
    // Native Apple/Google sign-in is wired through the native-bridge adapter;
    // the @capacitor-firebase/authentication plugin is added in the native shell.
  },
};

export default config;
