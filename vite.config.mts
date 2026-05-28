import path from 'path';
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
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rolldownOptions: {
      output: {  
        preserveModules: true,  
        preserveModulesRoot: "src",  
        entryFileNames: "[name].js"  
      },  
      treeshake: true,
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
});
