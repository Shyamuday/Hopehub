/* eslint-disable @typescript-eslint/no-unused-vars */
function querySuffix(request) {
  var query = request.querystring || {};
  var pairs = [];
  var keys = Object.keys(query);
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    var item = query[key];
    var values = item.multiValue || [item];
    for (var j = 0; j < values.length; j += 1) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(values[j].value || ''));
    }
  }
  return pairs.length ? '?' + pairs.join('&') : '';
}

function permanentRedirect(request, path, targetHost) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://' + (targetHost || 'hopehub.in') + path + querySuffix(request) },
      'cache-control': { value: 'public, max-age=3600' }
    }
  };
}

function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var host = headers.host && headers.host.value ? headers.host.value.toLowerCase() : '';
  var uri = request.uri || '/';
  var prefix = 'healing';

  // Consolidate every public URL on the non-www HTTPS origin.
  if (host === 'www.hopehub.in') {
    return permanentRedirect(request, uri);
  }

  if (host === 'admin.hopehub.in') {
    prefix = 'admin';
  } else if (host === 'care.hopehub.in') {
    prefix = 'patient';
  } else if (
    host === 'earn.hopehub.in' ||
    host === 'support.hopehub.in' ||
    host === 'doctor.hopehub.in'
  ) {
    prefix = 'doctor';
  } else if (host === 'ops.hopehub.in') {
    prefix = 'operations';
  } else if (host === 'hopehub.in') {
    prefix = 'healing';
  }

  // Do not apply this storage-key escape hatch on care.hopehub.in: legitimate
  // private application routes also begin with `/patient/`.
  if (prefix !== 'patient' && uri.indexOf('/' + prefix + '/') === 0) {
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

    // Retire duplicate public paths with a strong canonical signal.
    if (normalizedUri === '/psychologists') {
      return permanentRedirect(request, '/care-team');
    }
    if (normalizedUri.indexOf('/psychologists/') === 0) {
      return permanentRedirect(request, '/care-team/' + normalizedUri.substring(15));
    }
    if (normalizedUri.indexOf('/resources/articles/') === 0) {
      return permanentRedirect(request, '/articles/' + normalizedUri.substring(20));
    }

    // Canonical public URLs do not use a trailing slash (except the homepage).
    if (uri.length > 1 && uri !== normalizedUri) {
      return permanentRedirect(request, normalizedUri);
    }

    var prerenderedRoutes = {
      '/': true,
      '/services': true,
      '/support': true,
      '/care-team': true,
      '/packages': true,
      '/events': true,
      '/resources': true,
      '/recorded-sessions': true,
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
      '/anxiety-test': true,
      '/depression-test': true,
      '/stress-test': true,
      '/breakup-test': true,
      '/sleep-test': true,
      '/relationship-test': true,
      '/burnout-test': true,
      '/wellbeing-test': true,
      '/mental-health-test': true,
      '/panic-test': true,
      '/social-anxiety-test': true,
      '/loneliness-test': true,
      '/self-esteem-test': true,
      '/anger-test': true,
      '/grief-test': true,
      '/concerns/anxiety': true,
      '/concerns/depression': true,
      '/concerns/stress': true,
      '/concerns/relationship': true,
      '/concerns/sleep': true,
      '/concerns/breakup': true,
      '/concerns/burnout': true,
      '/concerns/panic': true,
      '/concerns/social-anxiety': true,
      '/concerns/loneliness': true,
      '/concerns/self-esteem': true,
      '/concerns/anger': true,
      '/concerns/grief': true,
      '/concerns/wellbeing': true,
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
    var spaRoutes = ['/profile', '/feedback', '/my-support-plan', '/dashboard'];
    var spaPrefixes = [
      '/services/',
      '/care-team/',
      '/p/',
      '/s/',
      '/packages/',
      '/events/',
      '/resources/',
      '/recorded-sessions/',
      '/assessments/',
      '/live-session/',
      '/live-groups/'
    ];
    var isSpaRoute = spaRoutes.indexOf(normalizedUri) !== -1;
    for (var i = 0; !isSpaRoute && i < spaPrefixes.length; i += 1) {
      isSpaRoute = normalizedUri.indexOf(spaPrefixes[i]) === 0;
    }
    if (isSpaRoute) {
      request.uri = '/healing/private-shell.html';
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

  // The patient site also publishes prerendered HTML for every stable public
  // landing page. Private account and live-consultation URLs keep using the SPA
  // shell and carry noindex metadata inside the application.
  if (prefix === 'patient') {
    var patientUri = uri.length > 1 ? uri.replace(/\/+$/, '') : '/';

    var patientRedirects = {
      '/hair-fall': '/treatments/hair-fall',
      '/skin-care': '/treatments/skin-care',
      '/privacy-terms': '/legal'
    };
    if (patientRedirects[patientUri]) {
      return permanentRedirect(request, patientRedirects[patientUri], 'care.hopehub.in');
    }

    // Canonical patient URLs do not use a trailing slash (except the homepage).
    if (uri.length > 1 && uri !== patientUri) {
      return permanentRedirect(request, patientUri, 'care.hopehub.in');
    }

    var patientPublicRoutes = {
      '/': true,
      '/about': true,
      '/treatments': true,
      '/talk-to-doctor': true,
      '/our-doctors': true,
      '/blog': true,
      '/testimonials': true,
      '/careers': true,
      '/chronic-care': true,
      '/faq': true,
      '/why-successful': true,
      '/contact': true,
      '/editorial-policy': true,
      '/legal': true,
      '/privacy-policy': true,
      '/terms-and-conditions': true,
      '/cancellation-and-refund-policy': true,
      '/return-and-exchange-policy': true,
      '/shipping-policy': true,
      '/payment-policy': true,
      '/safety': true
    };
    // CloudFront Functions cannot check whether an S3 object exists. Keep an
    // explicit allowlist so an unknown dynamic slug becomes a real 404 instead
    // of falling through to another app's index page as a soft 404.
    var patientDynamicPublicRoutes = {
      '/treatments/hair-fall': true,
      '/treatments/skin-care': true,
      '/treatments/chronic-care': true,
      '/treatments/diabetes-mellitus': true,
      '/treatments/hypertension': true,
      '/treatments/chronic-kidney-disease': true,
      '/treatments/gallstone': true,
      '/treatments/liver-cirrhosis': true,
      '/treatments/piles': true,
      '/treatments/kidney-stone': true,
      '/treatments/mental-health': true,
      '/treatments/sexual-health': true,
      '/treatments/respiratory-disease': true,
      '/treatments/musculoskeletal-disease': true,
      '/treatments/cardiovascular-disease': true
    };
    var isPatientPublicRoute =
      patientPublicRoutes[patientUri] === true || patientDynamicPublicRoutes[patientUri] === true;
    if (isPatientPublicRoute) {
      request.uri =
        patientUri === '/' ? '/patient/index.html' : '/patient' + patientUri + '/index.html';
      return request;
    }

    var patientSpaRoutes = ['/login', '/get-app'];
    var patientSpaPrefixes = ['/auth/', '/patient/'];
    var isPatientSpaRoute = patientSpaRoutes.indexOf(patientUri) !== -1;
    for (var s = 0; !isPatientSpaRoute && s < patientSpaPrefixes.length; s += 1) {
      isPatientSpaRoute = patientUri.indexOf(patientSpaPrefixes[s]) === 0;
    }
    if (isPatientSpaRoute) {
      request.uri = '/patient/private-shell.html';
      return request;
    }

    var escapedPatientUri = patientUri.replace(/&/g, '&amp;').replace(/</g, '&lt;');
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
        '<meta name="robots" content="noindex,nofollow"><title>Page Not Found - HopeHub Care</title>' +
        '<style>body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a}' +
        'main{max-width:680px;margin:12vh auto;padding:32px;text-align:center}a{color:#047857;font-weight:700}</style>' +
        '</head><body><main><h1>Page not found</h1><p>The page <code>' +
        escapedPatientUri +
        '</code> does not exist or has moved.</p><p><a href="/">Return to HopeHub Care</a></p></main></body></html>'
    };
  }

  if (uri === '/' || !looksLikeFile) {
    request.uri = '/' + prefix + '/index.html';
    return request;
  }

  request.uri = '/' + prefix + uri;
  return request;
}
