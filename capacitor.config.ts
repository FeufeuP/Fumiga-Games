import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.formigueiro.jogo',
  appName: 'Formigueiro',
  webDir: 'dist',
  android: {
    androidScheme: 'https',
  },
};

export default config;
