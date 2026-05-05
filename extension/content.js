
// PrivAware v2 - Resource Scanner
// Extracts ALL URLs loaded by the page: scripts, iframes, images, fetch requests
// This is what gives real risk scores - not just the homepage URL

(function() {
  const resources = [];

  // 1. All script tags
  document.querySelectorAll('script[src]').forEach(el => {
    resources.push({ type: 'script', url: el.src });
  });

  // 2. All iframes
  document.querySelectorAll('iframe[src]').forEach(el => {
    if (el.src && !el.src.startsWith('about:')) {
      resources.push({ type: 'iframe', url: el.src });
    }
  });

  // 3. All images (third party only)
  document.querySelectorAll('img[src]').forEach(el => {
    try {
      const imgHost = new URL(el.src).hostname;
      const pageHost = window.location.hostname;
      if (imgHost !== pageHost && el.src.startsWith('http')) {
        resources.push({ type: 'image', url: el.src });
      }
    } catch(e) {}
  });

  // 4. All link tags (stylesheets, preloads)
  document.querySelectorAll('link[href]').forEach(el => {
    try {
      const linkHost = new URL(el.href).hostname;
      const pageHost = window.location.hostname;
      if (linkHost !== pageHost) {
        resources.push({ type: 'link', url: el.href });
      }
    } catch(e) {}
  });

  // 5. Meta tags that embed third party content
  document.querySelectorAll('meta[content]').forEach(el => {
    const content = el.getAttribute('content') || '';
    if (content.startsWith('http')) {
      resources.push({ type: 'meta', url: content });
    }
  });

  // 6. Known tracker domains embedded in page source
  const KNOWN_TRACKERS = [
    'doubleclick.net', 'googlesyndication.com', 'google-analytics.com',
    'googletagmanager.com', 'facebook.net', 'connect.facebook.net',
    'scorecardresearch.com', 'quantserve.com', 'adnxs.com',
    'adsrvr.org', 'rubiconproject.com', 'pubmatic.com',
    'openx.net', 'criteo.com', 'taboola.com', 'outbrain.com',
    'hotjar.com', 'mixpanel.com', 'amplitude.com', 'segment.io',
    'mxpnl.com', 'newrelic.com', 'fullstory.com', 'logrocket.com',
    'fingerprintjs.com', 'threatmetrix.com', 'iovation.com',
    'twitter.com/i/urchin', 'platform.twitter.com', 'linkedin.com/analytics'
  ];

  const pageHTML = document.documentElement.innerHTML;
  const trackerHits = {};
  KNOWN_TRACKERS.forEach(tracker => {
    if (pageHTML.includes(tracker)) {
      trackerHits[tracker] = true;
    }
  });

  // 7. Look for privacy policy link on the page
  let privacyPolicyUrl = null;
  const links = document.querySelectorAll('a[href]');
  for (const link of links) {
    const text = link.textContent.toLowerCase();
    const href = link.href || '';
    if ((text.includes('privacy') || text.includes('privacy policy')) && href) {
      privacyPolicyUrl = href;
      break;
    }
  }

  // Send all data to popup via chrome.runtime
  chrome.runtime.sendMessage({
    type: 'PAGE_RESOURCES',
    data: {
      pageUrl: window.location.href,
      resources: resources.slice(0, 50), // max 50 resources
      trackerHits: Object.keys(trackerHits),
      privacyPolicyUrl: privacyPolicyUrl,
      resourceCount: resources.length
    }
  });

})();
