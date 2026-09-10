const path = require('path');
const nextTranslate = require('next-translate-plugin');
const { version } = require('./package.json');

// Parses CHANGELOG.md into the module the "What's new" panel loads. Done here
// so it runs for `dev` and `build` alike; it hands back a digest of the notes
// the app shell can compare without fetching them.
const changelog = require('./scripts/generatechangelog');

module.exports = nextTranslate({
  output: 'standalone',
  experimental: {
    externalDir: true
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_CHANGELOG_ID: changelog.id
  },
  webpack: (
    config /*,
    {
     buildId, dev, isServer, defaultLoaders,  webpack
    }
    */
  ) => {
    config.resolve.alias['pdfjs-dist'] = path.join(
      __dirname,
      '../../node_modules/pdfjs-dist/legacy/build/pdf'
    );

    return config;
  },
  // base path cannot be set at runtime: https://github.com/vercel/next.js/discussions/41769
  basePath: process.env.BASE_PATH || '',
  productionBrowserSourceMaps: true
});
