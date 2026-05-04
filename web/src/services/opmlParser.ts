import type { Subscription } from '../types';

export function parseOPML(xmlString: string): Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Use browser's DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  
  const outlines = doc.querySelectorAll('outline[type="rss"], outline[type="atom"]');
  const subscriptions: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  outlines.forEach(outline => {
    const url = outline.getAttribute('xmlUrl');
    if (!url) return;
    
    const name = outline.getAttribute('text') || outline.getAttribute('title') || url;
    const type = outline.getAttribute('type') === 'atom' ? 'atom' : 'rss';
    
    subscriptions.push({
      name,
      url,
      type,
      category: 'Imported',
      enabled: true,
      aiSummaryEnabled: true,
      fetchIntervalMinutes: 60,
    });
  });
  
  return subscriptions;
}
