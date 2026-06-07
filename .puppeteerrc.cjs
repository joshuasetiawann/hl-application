/**
 * Puppeteer configuration.
 *
 * `skipDownload` prevents Puppeteer from downloading its bundled Chromium
 * (~150 MB) during `npm install`. Puppeteer is ONLY used by the optional
 * `npm run screenshots` developer script — it is not needed to run, build,
 * or use the application. Skipping the download makes installs fast and
 * reliable on slow / metered networks (and avoids the partial-download
 * failures seen previously).
 *
 * If you DO want to run `npm run screenshots`, either:
 *   1. Comment out `skipDownload` below and reinstall, or
 *   2. Point Puppeteer at an existing browser:
 *      PUPPETEER_EXECUTABLE_PATH=/path/to/chrome npm run screenshots
 */
module.exports = {
  skipDownload: true,
};
