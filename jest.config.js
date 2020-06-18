module.exports = {
  globals: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  verbose: true,
  setupFiles: [
    './jest.setup.js',
  ],
};
