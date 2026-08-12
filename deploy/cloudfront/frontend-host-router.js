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

  if (uri === '/' || !looksLikeFile) {
    request.uri = '/' + prefix + '/index.html';
    return request;
  }

  request.uri = '/' + prefix + uri;
  return request;
}
