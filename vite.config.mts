import { defineConfig } from 'vitest/config';
import dts from 'unplugin-dts/vite';

import pkg from './package.json';

export default defineConfig({
  build: {
    target: 'es2019',
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rolldownOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
      treeshake: true,
      external: (id) => {
        // Build regex pattern for all dependencies and their subexport
        const deps = Object.keys(pkg.dependencies).map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = new RegExp(`^(${deps.join('|')})(/|$)`);
        return pattern.test(id);
      },
    },
  },
  plugins: [
    dts({
      entryRoot: 'src',
      insertTypesEntry: true,
    }),
  ],
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.{ts,js}'],
  },
});
