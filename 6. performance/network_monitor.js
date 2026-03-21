/**
 * @name network monitor
 *
 * @desc Intercepts every network request made during a page load and prints a
 * structured summary: method, status code, resource type, URL, and response
 * size. A totals line shows the number of requests and total bytes received.
 * Useful for auditing third-party calls, spotting large assets, or debugging
 * unexpected traffic.
 *
 * @see {@link https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetrequestinterceptionvalue}
 */

const puppeteer = require('puppeteer')

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  const requests = []

  await page.setRequestInterception(true)

  page.on('request', req => {
    requests.push({
      method: req.method(),
      url: req.url(),
      resourceType: req.resourceType(),
      status: null,
      bytes: 0
    })
    req.continue()
  })

  page.on('response', async response => {
    const url = response.url()
    const entry = requests.find(r => r.url === url && r.status === null)
    if (!entry) return
    entry.status = response.status()
    try {
      const buffer = await response.buffer()
      entry.bytes = buffer.length
    } catch (e) {
      // redirects and aborted requests carry no body
    }
  })

  await page.goto('https://example.com', { waitUntil: 'networkidle0' })

  console.log('\n=== Network Monitor — https://example.com ===\n')
  console.log(
    'METHOD'.padEnd(8),
    'STATUS'.padEnd(8),
    'TYPE'.padEnd(14),
    'SIZE(KB)'.padEnd(10),
    'URL'
  )
  console.log('-'.repeat(100))

  let totalBytes = 0
  for (const req of requests) {
    const kb = (req.bytes / 1024).toFixed(1)
    totalBytes += req.bytes
    console.log(
      req.method.padEnd(8),
      String(req.status === null ? '-' : req.status).padEnd(8),
      req.resourceType.padEnd(14),
      `${kb} KB`.padEnd(10),
      req.url.length > 60 ? req.url.slice(0, 57) + '...' : req.url
    )
  }

  console.log('-'.repeat(100))
  console.log(`\nTotal requests : ${requests.length}`)
  console.log(`Total received : ${(totalBytes / 1024).toFixed(1)} KB`)

  await browser.close()
})()
