import path from 'path';
import type { UserConfig } from 'vite';
import dts from 'unplugin-dts/vite';

import pkg from './package.json';

const config: UserConfig = {
  build: {
    target: 'es2019',
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies),
        /^node:.*/,
      ],
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
};

export default config;
