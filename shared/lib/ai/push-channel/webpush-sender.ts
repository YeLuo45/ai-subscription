/**
 * WebPush Sender
 * Send push notifications via Web Push API (VAPID)
 */

import type { WebPushConfig } from './types';

// Convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function sendWebPush(
  content: { title: string; summary: string; tags: string[] },
  config: WebPushConfig,
  subscription: PushSubscription
): Promise<void> {
  const vapidPublicKey = config.publicKey;
  const vapidPrivateKey = config.privateKey;
  const subject = config.subject;

  const payload = JSON.stringify({
    title: content.title,
    body: content.summary,
    tags: content.tags,
    icon: '/icon.png',
  });

  // Get the push subscription's keys
  const subscriptionKeys = subscription.toJSON();

  // In a real implementation, you would:
  // 1. Generate a VAPID JWT
  // 2. Encrypt the payload using the subscription's p256dh key
  // 3. Send to the push service (e.g., Mozilla Push Service, FCM, etc.)
  
  // For now, use the browser's native push manager if available
  if ('PushManager' in window && subscription) {
    // The subscription already has the endpoint - just resend to it
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '86400',
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!response.ok && response.status !== 201 && response.status !== 200) {
      throw new Error(`WebPush error: ${response.status}`);
    }
    return;
  }

  throw new Error('WebPush not available. Please ensure the user has granted notification permissions.');
}

export async function subscribeToWebPush(
  config: WebPushConfig,
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<PushSubscription> {
  const applicationServerKey = urlBase64ToUint8Array(config.publicKey);
  
  const subscription = await serviceWorkerRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  return subscription;
}

export async function getExistingSubscription(
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    return subscription;
  } catch {
    return null;
  }
}

export async function testWebPushConfig(config: WebPushConfig): Promise<boolean> {
  try {
    // Validate VAPID keys format (base64url)
    const keyRegex = /^[A-Za-z0-9_-]+$/;
    if (!keyRegex.test(config.publicKey) || !keyRegex.test(config.privateKey)) {
      return false;
    }
    // Check key lengths (typically 65 bytes for public key)
    const publicKeyBytes = urlBase64ToUint8Array(config.publicKey);
    if (publicKeyBytes.length !== 65) {
      console.warn('WebPush public key should be 65 bytes');
    }
    if (!config.subject || !config.subject.startsWith('mailto:') && !config.subject.startsWith('http')) {
      console.warn('WebPush subject should be a mailto: or https: URL');
    }
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }
  return Notification.requestPermission();
}
