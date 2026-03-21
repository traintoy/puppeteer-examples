/**
 * @name performance metrics
 *
 * @desc Navigates to a page and collects key performance metrics using the
 * Navigation Timing API and the Chrome DevTools Protocol. Reports First
 * Contentful Paint (FCP), DOM Content Loaded, total page-load time, number
 * of resources loaded, and total bytes transferred.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API}
 * @see {@link https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagemetrics}
 */

const puppeteer = require('puppeteer')

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Collect resource sizes via request interception
  let totalBytes = 0
  let resourceCount = 0

  await page.setRequestInterception(true)
  page.on('request', req => req.continue())
  page.on('response', async response => {
    try {
      const buffer = await response.buffer()
      totalBytes += buffer.length
      resourceCount++
    } catch (e) {
      // some responses (e.g. redirects) have no body — ignore them
    }
  })

  await page.goto('https://example.com', { waitUntil: 'networkidle0' })

  // Navigation Timing via the Performance API
  const timing = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  )

  const navStart = timing.navigationStart
  const domContentLoaded = timing.domContentLoadedEventEnd - navStart
  const pageLoad = timing.loadEventEnd - navStart

  // First Contentful Paint via PerformancePaintTiming
  const fcp = await page.evaluate(() => {
    const entry = performance.getEntriesByName('first-contentful-paint')[0]
    return entry ? Math.round(entry.startTime) : null
  })

  console.log('=== Performance Metrics for https://example.com ===')
  console.log(`First Contentful Paint : ${fcp !== null ? fcp + ' ms' : 'n/a'}`)
  console.log(`DOM Content Loaded     : ${domContentLoaded} ms`)
  console.log(`Page Load              : ${pageLoad} ms`)
  console.log(`Resources loaded       : ${resourceCount}`)
  console.log(`Total bytes transferred: ${(totalBytes / 1024).toFixed(1)} KB`)

  await browser.close()
})()
