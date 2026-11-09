import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zobaerio.freevoice',
  appName: 'FreeVoice',
  webDir: 'out',
  server: {
    // The Android wrapper loads the deployed secure web app.
    // Set FREEVOICE_WEB_URL in GitHub Actions before building the APK.
    url: process.env.FREEVOICE_WEB_URL || 'https://freevoice.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
