import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Cast process to any to avoid TS error about missing cwd() in the current environment types
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This is critical: it replaces 'process.env.API_KEY' in your source code
      // with the actual string value from the environment during the build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});