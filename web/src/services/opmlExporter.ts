import type { Subscription } from '../types';

export function exportOPML(subscriptions: Subscription[]): string {
  const outlines = subscriptions
    .filter(s => s.enabled)
    .map(s => `    <outline text="${escapeXml(s.name)}" title="${escapeXml(s.name)}" type="${s.type}" xmlUrl="${escapeXml(s.url)}"/>`)
    .join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>AI订阅助手 - 订阅源</title>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
