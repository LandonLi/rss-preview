export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const path = urlObj.pathname;

  // Extract the target URL from /proxy/TARGET_URL
  const targetUrlStr = path.replace(/^\/proxy\//, '');

  if (!targetUrlStr) {
    return new Response('Missing target URL', { status: 400 });
  }

  try {
    // Reconstruct the URL if it was mangled by multiple slashes
    // (Pages might collapse slashes, so we may need to fix https:/ or similar)
    let finalUrl = targetUrlStr;
    if (finalUrl.startsWith('http:/') && !finalUrl.startsWith('http://')) {
        finalUrl = finalUrl.replace('http:/', 'http://');
    } else if (finalUrl.startsWith('https:/') && !finalUrl.startsWith('https://')) {
        finalUrl = finalUrl.replace('https:/', 'https://');
    }

    const response = await fetch(finalUrl, {
      method: request.method,
      headers: request.headers,
      redirect: 'follow'
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    return new Response('Proxy Error: ' + err.message, { status: 500 });
  }
}
