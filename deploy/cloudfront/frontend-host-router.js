/* eslint-disable @typescript-eslint/no-unused-vars */
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var host = headers.host && headers.host.value ? headers.host.value.toLowerCase() : '';
  var uri = request.uri || '/';
  var prefix = 'healing';

  if (host === 'admin.hopehub.in') {
    prefix = 'admin';
  } else if (host === 'earn.hopehub.in' || host === 'support.hopehub.in') {
    prefix = 'doctor';
  } else if (host === 'ops.hopehub.in') {
    prefix = 'operations';
  } else if (host === 'hopehub.in' || host === 'www.hopehub.in') {
    prefix = 'healing';
  }

  if (uri.indexOf('/' + prefix + '/') === 0) {
    return request;
  }

  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  var looksLikeFile = lastSegment.indexOf('.') !== -1;
  if (looksLikeFile) {
    request.uri = '/' + prefix + uri;
    return request;
  }

  // Hope Hub publishes prerendered HTML for its public, indexable pages. Serve
  // those files directly instead of returning the homepage HTML for every URL.
  // The explicit list also lets unknown public URLs return a genuine 404 rather
  // than a 200 response that search engines interpret as a soft 404.
  if (prefix === 'healing') {
    var normalizedUri = uri.length > 1 ? uri.replace(/\/+$/, '') : '/';
    var prerenderedRoutes = {
      '/': true,
      '/services': true,
      '/support': true,
      '/care-team': true,
      '/packages': true,
      '/events': true,
      '/resources': true,
      '/organization': true,
      '/community': true,
      '/telegram': true,
      '/telegram-group-admin': true,
      '/about': true,
      '/contact': true,
      '/faq': true,
      '/careers': true,
      '/listener-guidelines': true,
      '/listener-training': true,
      '/privacy': true,
      '/terms': true,
      '/refund-policy': true,
      '/payment-policy': true,
      '/shipping-policy': true,
      '/assessments': true,
      '/exercises': true,
      '/lifestyle-tips': true,
      '/articles': true,
      '/editorial-policy': true,
      '/donate': true,
      '/404': true,
      '/articles/understanding-stress-response': true,
      '/articles/stress-management-techniques': true,
      '/articles/navigating-breakup-recovery': true,
      '/articles/rebuilding-life-after-breakup': true,
      '/articles/understanding-grief-after-breakup': true,
      '/articles/understanding-depression-basics': true,
      '/articles/coping-strategies-depression': true,
      '/articles/depression-myths-facts': true,
      '/articles/understanding-anxiety-disorders': true,
      '/articles/managing-panic-attacks': true,
      '/articles/social-anxiety-tips': true,
      '/articles/self-care-basics-guide': true,
      '/articles/building-healthy-boundaries': true
    };

    if (prerenderedRoutes[normalizedUri]) {
      request.uri =
        normalizedUri === '/' ? '/healing/index.html' : '/healing' + normalizedUri + '/index.html';
      return request;
    }

    // These are authenticated or data-driven SPA routes. They still need the
    // browser shell, but they are intentionally excluded from the sitemap.
    var spaRoutes = [
      '/profile',
      '/feedback',
      '/psychologists',
      '/anxiety-test',
      '/depression-test',
      '/stress-test',
      '/breakup-test',
      '/sleep-test',
      '/relationship-test',
      '/burnout-test',
      '/wellbeing-test',
      '/mental-health-test',
      '/panic-test',
      '/social-anxiety-test',
      '/loneliness-test',
      '/self-esteem-test',
      '/anger-test',
      '/grief-test',
      '/my-support-plan',
      '/dashboard'
    ];
    var spaPrefixes = [
      '/services/',
      '/care-team/',
      '/psychologists/',
      '/p/',
      '/s/',
      '/packages/',
      '/events/',
      '/resources/',
      '/assessments/',
      '/live-session/',
      '/live-groups/'
    ];
    var isSpaRoute = spaRoutes.indexOf(normalizedUri) !== -1;
    for (var i = 0; !isSpaRoute && i < spaPrefixes.length; i += 1) {
      isSpaRoute = normalizedUri.indexOf(spaPrefixes[i]) === 0;
    }
    if (isSpaRoute) {
      request.uri = '/healing/index.html';
      return request;
    }

    var escapedUri = normalizedUri.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: {
        'content-type': { value: 'text/html; charset=utf-8' },
        'cache-control': { value: 'no-cache, no-store, must-revalidate' },
        'x-robots-tag': { value: 'noindex, nofollow' }
      },
      body:
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow"><title>Page Not Found - Hope Hub</title>' +
        '<style>body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a}' +
        'main{max-width:680px;margin:12vh auto;padding:32px;text-align:center}a{color:#047857;font-weight:700}</style>' +
        '</head><body><main><h1>Page not found</h1><p>The page <code>' +
        escapedUri +
        '</code> does not exist or has moved.</p><p><a href="/">Return to Hope Hub</a></p></main></body></html>'
    };
  }

  if (uri === '/' || !looksLikeFile) {
    request.uri = '/' + prefix + '/index.html';
    return request;
  }

  request.uri = '/' + prefix + uri;
  return request;
}
