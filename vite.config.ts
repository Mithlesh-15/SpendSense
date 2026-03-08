import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.env.VITE_BASE_PATH?.trim() || '/';

/**
 * Copies all RunAnywhere wasm/runtime assets into dist/assets for production.
 */
function copyWasmPlugin(): Plugin {
  const llamaCppWasmDir = path.resolve(__dir, 'node_modules/@runanywhere/web-llamacpp/wasm');
  const onnxWasmDir = path.resolve(__dir, 'node_modules/@runanywhere/web-onnx/wasm');

  const copyRecursive = (sourceDir: string, outDir: string, rootLabel: string) => {
    if (!fs.existsSync(sourceDir)) {
      console.warn(`[copy-wasm] Missing source dir: ${sourceDir}`);
      return;
    }

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      const sourcePath = path.join(sourceDir, entry.name);
      const relativePath = path.relative(rootLabel, sourcePath);
      const targetPath = path.join(outDir, relativePath);

      if (entry.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        copyRecursive(sourcePath, outDir, rootLabel);
      } else {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(sourcePath, targetPath);
        const sizeMB = (fs.statSync(sourcePath).size / 1_000_000).toFixed(1);
        console.log(`[copy-wasm] Copied ${relativePath.replace(/\\/g, '/')} (${sizeMB} MB)`);
      }
    }
  };

  return {
    name: 'copy-wasm',
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dir, 'dist');
      const assetsDir = path.join(outDir, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      copyRecursive(llamaCppWasmDir, assetsDir, llamaCppWasmDir);
      copyRecursive(onnxWasmDir, assetsDir, onnxWasmDir);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), copyWasmPlugin()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  assetsInclude: ['**/*.wasm'],
  worker: { format: 'es' },
  optimizeDeps: {
    exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
  },
});
