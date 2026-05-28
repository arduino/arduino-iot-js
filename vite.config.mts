import { defineConfig } from 'vitest/config';
import dts from 'unplugin-dts/vite';
import { writeFileSync } from 'node:fs';

import pkg from './package.json';

export default defineConfig({
  build: {
    target: 'es2019',
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    lib: {
      entry: './src/index.ts',
    },
    rolldownOptions: {
      output: [
        {
          format: 'es',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
        },
        {
          format: 'cjs',
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
        },
      ],
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
      afterBuild: (emittedFiles) => {
        for (const [filePath, content] of emittedFiles) {
          if (filePath.endsWith('/index.d.ts')) {
            writeFileSync(filePath.replace(/\.d\.ts$/, '.d.cts'), content, 'utf8');
            break;
          }
        }
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.{ts,js}'],
  },
});
