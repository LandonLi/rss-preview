import Parser from 'rss-parser';

export async function onRequest(context) {
  const { request } = context;
  const urlParams = new URL(request.url).searchParams;
  const rssUrl = urlParams.get('url');

  if (!rssUrl) {
    return new Response(JSON.stringify({ error: 'Missing RSS URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const parser = new Parser({
    customFields: {
      item: [
        ['itunes:image', 'itunesImage'],
        ['itunes:duration', 'itunesDuration'],
        ['itunes:summary', 'itunesSummary'],
        ['itunes:subtitle', 'itunesSubtitle'],
        ['content:encoded', 'contentEncoded']
      ],
      feed: [
        ['itunes:image', 'itunesImage'],
        ['itunes:author', 'itunesAuthor'],
        ['itunes:category', 'itunesCategory']
      ]
    }
  });

  try {
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }
    const xmlText = await response.text();
    const feed = await parser.parseString(xmlText);

    return new Response(JSON.stringify(feed), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
