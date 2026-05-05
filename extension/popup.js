const API_URL = 'https://V3d4nt7-privaware-api.hf.space';

// Tracker category map for display
const TRACKER_CATEGORIES = {
  'doubleclick.net': 'Ads',
  'googlesyndication.com': 'Ads',
  'adnxs.com': 'Ads',
  'rubiconproject.com': 'Ads',
  'pubmatic.com': 'Ads',
  'criteo.com': 'Ads',
  'taboola.com': 'Ads',
  'outbrain.com': 'Ads',
  'adsrvr.org': 'Ads',
  'openx.net': 'Ads',
  'google-analytics.com': 'Analytics',
  'googletagmanager.com': 'Analytics',
  'hotjar.com': 'Analytics',
  'mixpanel.com': 'Analytics',
  'amplitude.com': 'Analytics',
  'segment.io': 'Analytics',
  'newrelic.com': 'Analytics',
  'fullstory.com': 'Analytics',
  'logrocket.com': 'Analytics',
  'facebook.net': 'Social',
  'connect.facebook.net': 'Social',
  'platform.twitter.com': 'Social',
  'linkedin.com/analytics': 'Social',
  'fingerprintjs.com': 'Fingerprint',
  'threatmetrix.com': 'Fingerprint',
  'iovation.com': 'Fingerprint',
  'scorecardresearch.com': 'Analytics',
  'quantserve.com': 'Analytics',
  'mxpnl.com': 'Analytics',
};

// Domains that are legitimate infrastructure — never send to phishing model
const SAFE_INFRASTRUCTURE = [
  'doubleclick.net', 'googlesyndication.com', 'google-analytics.com',
  'googletagmanager.com', 'googleapis.com', 'gstatic.com', 'google.com',
  'facebook.net', 'connect.facebook.net', 'twitter.com', 'linkedin.com',
  'youtube.com', 'ytimg.com', 'cloudflare.com', 'cloudflare.net',
  'akamai.net', 'akamaized.net', 'fastly.net', 'amazonaws.com',
  'cdn.', 'static.', 'assets.', 'fonts.', 'ajax.', 'jquery',
  'bootstrapcdn.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
  'newrelic.com', 'nr-data.net', 'hotjar.com', 'mixpanel.com',
  'scorecard', 'quantserve', 'chartbeat', 'parsely.com',
  'jwpcdn.com', 'jwplatform.com', 'brightcove.com',
  'wp.com', 'wordpress.com', 'gravatar.com',
  'apple.com', 'microsoft.com', 'azureedge.net',
];

function isSafeInfrastructure(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SAFE_INFRASTRUCTURE.some(d => host.includes(d));
  } catch(e) {
    return true; // if URL is malformed, skip it
  }
}

function getRiskColor(score) {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
}

function getRiskLabel(score) {
  if (score >= 70) return 'High Risk';
  if (score >= 40) return 'Moderate Risk';
  return 'Low Risk';
}

function getBadgeClass(label) {
  if (!label) return 'badge-risky';
  const l = label.toUpperCase();
  if (l === 'PHISHING' || l === 'DECEPTIVE') return 'badge-danger';
  if (l === 'RISKY') return 'badge-risky';
  return 'badge-safe';
}

function updateRing(score) {
  const circle = document.getElementById('score-circle');
  const circumference = 207;
  const offset = circumference - (score / 100) * circumference;
  circle.style.strokeDashoffset = offset;
  circle.style.stroke = getRiskColor(score);
}

function saveToHistory(data) {
  chrome.storage.local.get(['scanHistory'], (result) => {
    const history = result.scanHistory || [];
    history.unshift(data);
    if (history.length > 10) history.pop();
    chrome.storage.local.set({ scanHistory: history });
  });
}

// FIXED RISK FORMULA
// Weights: phishing 35%, trackers 30%, policy 25%, https 10%
function calculateRiskScore(phishingResult, trackerHits, policyResult, isHttps) {
  // Phishing component (35%)
  let phishingScore = phishingResult.is_phishing
    ? phishingResult.confidence
    : (100 - phishingResult.confidence);
  phishingScore = Math.min(phishingScore, 100);

  // Tracker component (30%)
  const trackerCount = trackerHits.length;
  const adCount = trackerHits.filter(t => TRACKER_CATEGORIES[t] === 'Ads').length;
  const fpCount = trackerHits.filter(t => TRACKER_CATEGORIES[t] === 'Fingerprint').length;
  let trackerScore = Math.min(
    (trackerCount * 8) + (adCount * 5) + (fpCount * 15),
    100
  );

  // Policy component (25%)
  let policyScore = 50;
  if (policyResult) {
    const policyMap = { 'DECEPTIVE': 90, 'RISKY': 55, 'SAFE': 10 };
    policyScore = policyMap[policyResult.label] || 50;
  }

  // HTTPS component (10%)
  const httpsScore = isHttps ? 0 : 80;

  const combined = (
    (phishingScore * 0.35) +
    (trackerScore  * 0.30) +
    (policyScore   * 0.25) +
    (httpsScore    * 0.10)
  );

  return Math.round(Math.min(combined, 100));
}

let pageResourceData = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PAGE_RESOURCES') {
    pageResourceData = message.data;
  }
});

async function scanPage(url) {
  document.getElementById('loading-state').style.display = 'flex';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('current-url').textContent = url;

  const isHttps = url.startsWith('https://');

  try {
    // Scan the main page URL
    const urlResult = await fetch(`${API_URL}/scan-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    }).then(r => r.json());

    // Scan page resources — skip known safe infrastructure
    let worstResourceScore = urlResult.risk_score;
    let resourcesScanned = 0;

    if (pageResourceData && pageResourceData.resources.length > 0) {
      const suspiciousResources = pageResourceData.resources
        .filter(r => {
          if (!r.url || r.url.length < 20) return false;
          // Skip known safe CDN / ad / analytics infrastructure
          if (isSafeInfrastructure(r.url)) return false;
          // Skip same-origin resources
          try {
            const resHost  = new URL(r.url).hostname;
            const pageHost = new URL(url).hostname.replace('www.', '');
            if (resHost.includes(pageHost) || pageHost.includes(resHost)) return false;
          } catch(e) { return false; }
          return true;
        })
        .slice(0, 5);

      for (const resource of suspiciousResources) {
        try {
          const res = await fetch(`${API_URL}/scan-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: resource.url })
          }).then(r => r.json());
          if (res.risk_score > worstResourceScore) {
            worstResourceScore = res.risk_score;
          }
          resourcesScanned++;
        } catch(e) {}
      }
    }

    // Tracker data
    const trackerHits = pageResourceData ? pageResourceData.trackerHits : [];

    // Scan privacy policy if found
    let policyResult = null;
    const privacyUrl = pageResourceData ? pageResourceData.privacyPolicyUrl : null;
    if (privacyUrl) {
      try {
        policyResult = await fetch(`${API_URL}/scan-policy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `Privacy policy from: ${privacyUrl}` })
        }).then(r => r.json());
      } catch(e) {}
    }

    // Only flag phishing if the MAIN URL itself is phishing
    // not just a resource — avoids false positives on legit sites
    const phishingForFormula = {
      is_phishing: urlResult.is_phishing,
      confidence: urlResult.confidence
    };
    const combinedScore = calculateRiskScore(phishingForFormula, trackerHits, policyResult, isHttps);

    // === UPDATE UI ===
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    document.getElementById('score-number').textContent = combinedScore;
    document.getElementById('score-number').style.color = getRiskColor(combinedScore);
    document.getElementById('risk-label').textContent = getRiskLabel(combinedScore);
    document.getElementById('risk-label').style.color = getRiskColor(combinedScore);

    const resourceInfo = resourcesScanned > 0
      ? `${resourcesScanned} resources scanned`
      : 'page URL scanned';
    document.getElementById('risk-detail').textContent =
      `${trackerHits.length} trackers · ${urlResult.label} · ${resourceInfo}`;

    updateRing(combinedScore);

    // Phishing card
    const phishBadge = document.getElementById('phishing-badge');
    phishBadge.textContent = urlResult.label;
    phishBadge.className = `model-badge ${getBadgeClass(urlResult.label)}`;
    document.getElementById('phishing-bar').style.width = `${Math.min(urlResult.confidence, 100)}%`;
    document.getElementById('phishing-bar').style.background = getRiskColor(urlResult.risk_score);
    document.getElementById('phishing-meta').textContent =
      `· DistilBERT`;

    // Policy card
    const policyBadge = document.getElementById('policy-badge');
    if (policyResult) {
      policyBadge.textContent = policyResult.label;
      policyBadge.className = `model-badge ${getBadgeClass(policyResult.label)}`;
      document.getElementById('policy-bar').style.width = `${policyResult.confidence}%`;
      document.getElementById('policy-meta').textContent =
        `· DistilBERT`;
    } else {
      policyBadge.textContent = privacyUrl ? 'SCANNING' : 'NO POLICY FOUND';
      policyBadge.className = 'model-badge badge-neutral';
      document.getElementById('policy-meta').textContent = 'No privacy policy link detected';
    }

    // Tracker tags
    const tagsContainer = document.getElementById('tracker-tags');
    tagsContainer.innerHTML = '';
    const catColors = {
      'Ads': 'tag-ads',
      'Analytics': 'tag-analytics',
      'Fingerprint': 'tag-finger',
      'Social': 'tag-social'
    };
    const catCounts = {};
    trackerHits.forEach(t => {
      const cat = TRACKER_CATEGORIES[t] || 'Other';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    if (Object.keys(catCounts).length === 0) {
      tagsContainer.innerHTML = '<span class="tag tag-social">No trackers found ✓</span>';
    } else {
      for (const [cat, count] of Object.entries(catCounts)) {
        const tag = document.createElement('span');
        tag.className = `tag ${catColors[cat] || 'tag-analytics'}`;
        tag.textContent = `${cat} ×${count}`;
        tagsContainer.appendChild(tag);
      }
    }

    // AI explanation — only flag phishing if main URL is phishing
    let explanation = '';
    if (urlResult.is_phishing) {
      explanation = `⚠️ Phishing patterns detected with third party app sharing/trackers. Do not enter any credentials on this site.`;
    } else if (combinedScore >= 70) {
      explanation = `This site has ${trackerHits.length} active trackers and heavy data collection. Your browsing behavior is being profiled.`;
    } else if (combinedScore >= 40) {
      explanation = `Moderate privacy risk. ${trackerHits.length > 0 ? trackerHits.length + ' trackers detected.' : ''} ${policyResult && policyResult.label === 'RISKY' ? 'Policy has concerning clauses.' : ''}`;
    } else {
      explanation = `This site appears relatively safe. ${isHttps ? 'Connection is encrypted (HTTPS).' : ''} ${trackerHits.length === 0 ? 'No trackers found.' : ''}`;
    }
    document.getElementById('explanation-text').textContent = explanation;
    document.getElementById('scan-time').textContent = `Scanned at ${new Date().toLocaleTimeString()}`;

    saveToHistory({
      url,
      score: combinedScore,
      label: urlResult.label,
      trackers: trackerHits.length,
      time: new Date().toISOString()
    });

  } catch (err) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('error-state').textContent = `Scan failed: ${err.message}`;
    console.error('PrivAware error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      document.getElementById('loading-state').style.display = 'none';
      document.getElementById('error-state').style.display = 'block';
      document.getElementById('error-state').textContent = 'Cannot scan browser internal pages.';
      return;
    }
    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, files: ['content.js'] },
      () => {
        setTimeout(() => scanPage(url), 500);
      }
    );
  });

  document.getElementById('rescan-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      pageResourceData = null;
      chrome.scripting.executeScript(
        { target: { tabId: tabs[0].id }, files: ['content.js'] },
        () => setTimeout(() => scanPage(tabs[0]?.url || ''), 500)
      );
    });
  });
});
