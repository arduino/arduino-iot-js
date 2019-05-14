import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import uglify from 'rollup-plugin-uglify-es';

const env = process.env.NODE_ENV;
const config = {
  output: {
    name: 'CreatePlugin',
    format: 'umd',
  },
  plugins: [
    nodeResolve({
      mainFields: ['module', 'main'],
    }),
    // due to https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module
    commonjs({
      include: 'node_modules/**',
      namedExports: { './node_module/invariant.js': ['default'] },
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),
  ],
};

if (env === 'production') {
  config.plugins.push(uglify({
    compress: {
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      warnings: false,
    },
  }));
}

export default config;
