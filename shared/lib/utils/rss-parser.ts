/**
 * RSS Parser Utility
 * Fetches and parses RSS/Atom feeds
 */

export interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
}

export interface RSSFeed {
  title: string;
  description?: string;
  items: RSSItem[];
}

export async function parseRSS(url: string): Promise<RSSFeed> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }

  const xmlText = await response.text();
  return parseXML(xmlText);
}

function parseXML(xml: string): RSSFeed {
  // Simple regex-based RSS/Atom parser
  const getTagContent = (pattern: RegExp): string | undefined => {
    const match = xml.match(pattern);
    return match ? match[1] : undefined;
  };

  const title = getTagContent(/<channel>\s*<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    || getTagContent(/<feed>\s*<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    || 'Unknown Feed';

  const description = getTagContent(/<channel>\s*<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

  // Extract items - support both RSS <item> and Atom <entry>
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  const items: RSSItem[] = [];
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const itemContent = match[1];
    const itemTitle = getTagContent(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const itemLink = getTagContent(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
      || getTagContent(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
    const itemDesc = getTagContent(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
      || getTagContent(/<summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const itemPubDate = getTagContent(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i)
      || getTagContent(/<published>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/published>/i);

    if (itemTitle || itemLink) {
      items.push({
        title: itemTitle || 'No title',
        link: itemLink || '',
        description: itemDesc,
        pubDate: itemPubDate,
      });
    }
  }

  return { title, description, items };
}
