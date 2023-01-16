import pkg from './package.json';
import sizes from 'rollup-plugin-sizes'
import { terser } from "rollup-plugin-terser";
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2';
import external from 'rollup-plugin-peer-deps-external';

export default {
  input: "./src/index.lib.ts",
  output: [{
    file: pkg.main,
    format: 'cjs',
    sourcemap: true
  }],
  plugins: [
    external({
      includeDependencies: true,
    }),
    resolve(),
    typescript(),
    commonjs(),
    // terser(),
    sizes()
  ]
};
