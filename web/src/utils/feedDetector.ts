// Feed type detection, favicon extraction, and update frequency detection

export type FeedType = 'rss' | 'atom' | 'jsonfeed' | 'unknown';

export function detectFeedType(content: string): FeedType {
  const lower = content.toLowerCase();
  if (lower.includes('<rss')) return 'rss';
  if (lower.includes('<feed') && lower.includes('xmlns')) return 'atom';
  if (content.includes('{"version":')) return 'jsonfeed';
  if (lower.includes('<?xml') && lower.includes('<rss')) return 'rss';
  if (lower.includes('<?xml') && lower.includes('<feed')) return 'atom';
  return 'unknown';
}

export function extractFavicon(siteUrl: string, htmlContent?: string): string | null {
  // Try to extract from HTML
  if (htmlContent) {
    // Look for icon link tags
    const iconMatch = htmlContent.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (iconMatch) {
      try {
        return new URL(iconMatch[1], siteUrl).href;
      } catch {
        // Invalid URL, fall through
      }
    }
    // Try apple-touch-icon
    const appleMatch = htmlContent.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (appleMatch) {
      try {
        return new URL(appleMatch[1], siteUrl).href;
      } catch {
        // Invalid URL, fall through
      }
    }
  }
  
  // Fallback to favicon.ico
  try {
    const url = new URL(siteUrl);
    return `${url.protocol}//${url.host}/favicon.ico`;
  } catch {
    return null;
  }
}

export function extractSiteName(htmlContent: string, fallbackTitle?: string): string | null {
  // Try og:site_name
  const ogMatch = htmlContent.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1];
  
  // Try application-name
  const appMatch = htmlContent.match(/<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["']/i);
  if (appMatch) return appMatch[1];
  
  // Fallback to hostname from URL or title
  return fallbackTitle || null;
}

export function detectUpdateFrequency(articles: Array<{ pubDate?: string }>): number {
  if (articles.length < 2) return 60; // Default 1 hour
  
  // Sort by date
  const sorted = articles
    .filter(a => a.pubDate)
    .sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime());
  
  if (sorted.length < 2) return 60;
  
  // Calculate average time between articles
  let totalGap = 0;
  for (let i = 0; i < Math.min(sorted.length - 1, 10); i++) {
    const gap = new Date(sorted[i].pubDate!).getTime() - new Date(sorted[i + 1].pubDate!).getTime();
    totalGap += gap;
  }
  
  const avgGapMs = totalGap / (Math.min(sorted.length - 1, 10));
  const avgGapMinutes = avgGapMs / (1000 * 60);
  
  // Round to sensible intervals: 15, 30, 60, 120, 360, 720, 1440
  const intervals = [15, 30, 60, 120, 360, 720, 1440];
  for (const interval of intervals) {
    if (avgGapMinutes <= interval * 1.5) {
      return interval;
    }
  }
  return 1440;
}
