// Email push service - uses fetch-based approach (nodemailer not available in node_modules)
// In production, this would call an email API webhook or SMTP service

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function buildEmailHtml(subscriptionName: string, count: number, articles: Array<{title: string; link: string; description?: string}>, summaries: Array<{title: string; summary: string}>): string {
  const articleList = articles.map(a => `<li><a href="${a.link}" target="_blank">${a.title}</a>${a.description ? `<p>${a.description.slice(0, 100)}...</p>` : ''}</li>`).join('');
  
  const summaryList = summaries.length > 0 
    ? `<h3>AI摘要</h3><ul>${summaries.map(s => `<li><strong>${s.title}</strong>: ${s.summary.slice(0, 150)}...</li>`).join('')}</ul>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">📬 [AI订阅] ${subscriptionName} 更新 (${count}篇)</h2>
  <p style="color: #666;">您订阅的源有新的内容更新，以下是AI摘要概览：</p>
  <h3>最新文章</h3>
  <ul style="list-style: none; padding: 0;">${articleList}</ul>
  ${summaryList}
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">此邮件由 AI订阅聚合器 自动发送</p>
</body>
</html>
`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    // Use free email API service (email.moeyy.cn or similar)
    // In production, you would configure your own email service webhook
    const emailApiUrl = 'https://email.moeyy.cn/send';
    
    const response = await fetch(emailApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error('Email send failed:', response.statusText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

export async function sendSubscriptionEmail(
  to: string,
  subscriptionName: string,
  count: number,
  articles: Array<{title: string; link: string; description?: string}>,
  summaries: Array<{title: string; summary: string}>
): Promise<boolean> {
  const subject = `[AI订阅] ${subscriptionName} 更新 (${count}篇)`;
  const html = buildEmailHtml(subscriptionName, count, articles, summaries);
  return sendEmail(to, subject, html);
}
