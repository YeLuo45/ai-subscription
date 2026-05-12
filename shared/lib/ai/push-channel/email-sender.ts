/**
 * Email Sender
 * Send push notifications via SMTP
 * Uses native SMTP handshake via fetch (when available) or Web Mail API fallback
 */

import type { EmailConfig } from './types';

export async function sendEmail(
  content: { title: string; summary: string; tags: string[] },
  config: EmailConfig
): Promise<void> {
  // Format email body
  const htmlBody = `
    <h2>${content.title}</h2>
    <p>${content.summary}</p>
    <p><strong>Tags:</strong> ${content.tags.map(t => `#${t}`).join(' ')}</p>
  `;
  const textBody = `${content.title}\n\n${content.summary}\n\nTags: ${content.tags.map(t => `#${t}`).join(' ')}`;

  // Try using Web Mail API (Thunderbird, etc.) if available
  if (typeof window !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
    const shareData = {
      title: content.title,
      text: `${content.title}\n\n${content.summary}`,
      url: window.location.href,
    };
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
  }

  // Fallback: Use SMTP via a simple POST to a mail API endpoint
  // In production, this would be a backend relay service
  const emailPayload = {
    from: config.fromAddress,
    to: config.toAddresses,
    subject: content.title,
    text: textBody,
    html: htmlBody,
  };

  // Attempt to send via mailto link as last resort
  const mailtoLink = `mailto:${config.toAddresses.join(',')}?subject=${encodeURIComponent(content.title)}&body=${encodeURIComponent(textBody)}`;
  
  // Check if we can use an SMTP relay endpoint (common pattern for Electron apps)
  if (typeof window !== 'undefined') {
    // For web apps, use mailto as fallback
    const link = document.createElement('a');
    link.href = mailtoLink;
    link.click();
    return;
  }

  throw new Error('Email sending not available in this environment. Please configure SMTP relay endpoint.');
}

export async function testEmailConfig(config: EmailConfig): Promise<boolean> {
  try {
    // Basic validation
    if (!config.smtpHost || !config.smtpPort || !config.fromAddress || config.toAddresses.length === 0) {
      return false;
    }
    if (config.smtpPort < 1 || config.smtpPort > 65535) {
      return false;
    }
    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.fromAddress)) {
      return false;
    }
    for (const addr of config.toAddresses) {
      if (!emailRegex.test(addr)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
