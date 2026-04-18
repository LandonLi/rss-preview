const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'if-modified-since',
  'if-none-match',
  'range',
  'user-agent'
];
const RSS_ACCEPT_HEADER = 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1';

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders()
    });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return jsonError('Method not allowed', 405, {
      Allow: 'GET, HEAD, OPTIONS'
    });
  }

  let targetUrl;
  try {
    targetUrl = extractTargetUrl(request.url);
  } catch (error) {
    return jsonError(error.message, 400);
  }

  if (!targetUrl) {
    return jsonError('Missing target URL', 400);
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: buildForwardHeaders(request.headers),
      redirect: 'follow'
    });

    const responseHeaders = new Headers(response.headers);
    applyCorsHeaders(responseHeaders);
    responseHeaders.set('X-Proxy-Target', targetUrl);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return jsonError(`Proxy Error: ${error.message}`, 502);
  }
}

function extractTargetUrl(requestUrlString) {
  const requestUrl = new URL(requestUrlString);
  const directPrefix = `${requestUrl.origin}/proxy/`;

  let rawTarget = '';
  if (requestUrlString.startsWith(directPrefix)) {
    rawTarget = requestUrlString.slice(directPrefix.length);
  } else if (requestUrl.pathname === '/proxy') {
    rawTarget = requestUrl.searchParams.get('url') || '';
  }

  rawTarget = rawTarget.trim();
  if (!rawTarget) {
    return null;
  }

  const decodedTarget = safelyDecodeTarget(rawTarget);
  const normalizedTarget = normalizeProtocol(decodedTarget);
  const targetUrl = new URL(normalizedTarget);

  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    throw new Error('Only http(s) targets are supported');
  }

  return targetUrl.toString();
}

function safelyDecodeTarget(value) {
  if (!/%[0-9A-Fa-f]{2}/.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeProtocol(value) {
  if (value.startsWith('http:/') && !value.startsWith('http://')) {
    return value.replace('http:/', 'http://');
  }

  if (value.startsWith('https:/') && !value.startsWith('https://')) {
    return value.replace('https:/', 'https://');
  }

  return value;
}

function buildForwardHeaders(incomingHeaders) {
  const headers = new Headers();

  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const value = incomingHeaders.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  if (!headers.has('accept')) {
    headers.set('accept', RSS_ACCEPT_HEADER);
  }

  return headers;
}

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };
}

function applyCorsHeaders(headers) {
  const corsHeaders = buildCorsHeaders();
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
}

function jsonError(message, status, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(),
      ...extraHeaders
    }
  });
}
