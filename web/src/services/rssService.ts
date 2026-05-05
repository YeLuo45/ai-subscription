/**
 * RSS/Atom Feed Generation Service
 * Generates standard RSS 2.0 and Atom 1.0 feeds from articles
 */

import type { RSSItem, FeedInfo } from '../types/publicList';

// XML escaping utility
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Format date to RFC 822 (RSS 2.0)
function formatRFC822(date: string | Date): string {
  const d = new Date(date);
  return d.toUTCString();
}

// Format date to ISO 8601 (Atom)
function formatISO8601(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString();
}

// Generate unique ID for item
function generateGuid(link: string, pubDate: string): string {
  return `urn:sha256:${btoa(link + pubDate).slice(0, 32)}`;
}

// ============================================================
// RSS 2.0 Generator
// ============================================================

export function generateRSS2(feedInfo: FeedInfo, items: RSSItem[]): string {
  const channelItems = items.map(item => {
    const categories = item.categories?.map(cat => `<category>${escapeXml(cat)}</category>`).join('\n        ') || '';
    const author = item.author ? `<author>${escapeXml(item.author)}</author>` : '';
    
    return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${formatRFC822(item.pubDate)}</pubDate>
      ${author}
      ${categories}
      <guid isPermaLink="false">${item.guid || generateGuid(item.link, item.pubDate)}</guid>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedInfo.title)}</title>
    <link>${escapeXml(feedInfo.url)}</link>
    <description>${escapeXml(feedInfo.description || '')}</description>
    <language>zh-CN</language>
    <lastBuildDate>${formatRFC822(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(feedInfo.url)}" rel="self" type="application/rss+xml"/>
    ${channelItems}
  </channel>
</rss>`;
}

// ============================================================
// Atom 1.0 Generator
// ============================================================

export function generateAtom1(feedInfo: FeedInfo, items: RSSItem[]): string {
  const selfUrl = feedInfo.url.endsWith('/') ? feedInfo.url + 'atom' : feedInfo.url + '/atom';
  
  const entryItems = items.map(item => {
    const categories = item.categories?.map(cat => 
      `<category term="${escapeXml(cat)}" />`
    ).join('\n      ') || '';
    const author = item.author ? `
      <author>
        <name>${escapeXml(item.author)}</name>
      </author>` : '';

    return `
    <entry>
      <title type="html">${escapeXml(item.title)}</title>
      <link href="${escapeXml(item.link)}" rel="alternate" type="text/html"/>
      <id>${item.guid || generateGuid(item.link, item.pubDate)}</id>
      <updated>${formatISO8601(item.pubDate)}</updated>
      <published>${formatISO8601(item.pubDate)}</published>${author}
      <summary type="html"><![CDATA[${item.description}]]></summary>
      ${categories}
    </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="html">${escapeXml(feedInfo.title)}</title>
  <subtitle type="text">${escapeXml(feedInfo.description || '')}</subtitle>
  <id>urn:uuid:${generateGuid(feedInfo.url, feedInfo.title)}</id>
  <updated>${formatISO8601(new Date())}</updated>
  <link href="${escapeXml(feedInfo.url)}" rel="alternate" type="text/html"/>
  <link href="${escapeXml(selfUrl)}" rel="self" type="application/atom+xml"/>
  <generator uri="https://github.com/ai-subscription">ai-subscription</generator>
  <language>zh-CN</language>
  ${entryItems}
</feed>`;
}

// ============================================================
// Blob URL Generation for Download
// ============================================================

export function generateRSS2Blob(feedInfo: FeedInfo, items: RSSItem[]): Blob {
  const xml = generateRSS2(feedInfo, items);
  return new Blob([xml], { type: 'application/xml; charset=utf-8' });
}

export function generateAtom1Blob(feedInfo: FeedInfo, items: RSSItem[]): Blob {
  const xml = generateAtom1(feedInfo, items);
  return new Blob([xml], { type: 'application/atom+xml; charset=utf-8' });
}

// ============================================================
// Download Helper
// ============================================================

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadRSS2(feedInfo: FeedInfo, items: RSSItem[]): void {
  const blob = generateRSS2Blob(feedInfo, items);
  downloadBlob(blob, `${feedInfo.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.rss`);
}

export function downloadAtom1(feedInfo: FeedInfo, items: RSSItem[]): void {
  const blob = generateAtom1Blob(feedInfo, items);
  downloadBlob(blob, `${feedInfo.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.atom`);
}

// ============================================================
// URL Generation for Sharing (Data URL / Blob URL)
// ============================================================

export function generateShareableURL(feedInfo: FeedInfo, items: RSSItem[], format: 'rss2' | 'atom' = 'rss2'): string {
  const blob = format === 'rss2' 
    ? generateRSS2Blob(feedInfo, items)
    : generateAtom1Blob(feedInfo, items);
  
  return URL.createObjectURL(blob);
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
