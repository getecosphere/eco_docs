import { defineConfig } from 'vite';

// `vite preview` serves the built static site (outDir `dist`) in production.
// Eco's configure.sh injects the estate's public hostname into `preview.allowedHosts`
// so the preview server accepts Host headers for eco.stuff8.com.
export default defineConfig({
  preview: {}
});
