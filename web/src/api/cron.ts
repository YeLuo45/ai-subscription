// Cron endpoint for scheduled fetch trigger
// GET /api/cron/notify?secret=XXX

const CRON_SECRET = import.meta.env.VITE_CRON_SECRET || 'dev-secret';

export async function handleCronNotify(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (secret !== CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In a full deployment, this would:
  // 1. Read all enabled subscriptions
  // 2. Fetch new content for each
  // 3. Save to database
  // 4. Trigger push notifications
  //
  // For now, return acknowledgment and let the browser-side scheduler handle it
  // when the user opens the app
  
  return Response.json({
    triggered: true,
    message: 'Cron acknowledged. User should open app for fetch.',
    timestamp: new Date().toISOString(),
  });
}

// Export for use in Vite server routes
export function getCronSecret(): string {
  return CRON_SECRET;
}
