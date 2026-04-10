import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf-qr': ['jspdf', 'qrcode', 'qrcode.react'],
          'vendor-map': ['leaflet', 'open-location-code'],
        },
      },
    },
  },
});
