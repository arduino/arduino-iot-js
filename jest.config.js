module.exports = {
  globals: {
    token: process.env.TOKEN,
  },
  verbose: true,
  setupFiles: [
    './jest.setup.js',
  ],
};
