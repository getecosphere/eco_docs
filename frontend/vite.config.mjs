import { defineConfig } from 'vite';

// `vite preview` serves the built static site (outDir `dist`) in production.
// Ecosphere's configure.sh injects the estate's public hostname into `preview.allowedHosts`
// so the preview server accepts Host headers for docs.getecosphere.com.
export default defineConfig({
  preview: {}
});
