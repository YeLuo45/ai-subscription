/**
 * Workflow Service - Webhook Receiver
 * Handles incoming webhooks with HMAC-SHA256 signature verification
 */

import type { Workflow } from '../workflow/types';
import { WorkflowEngine } from '../workflow/engine';

// ============================================================
// HMAC Verification
// ============================================================

async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return true; // No secret configured, skip verification
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Support different signature formats
    const providedSignature = signature.replace(/^sha256=/, '');
    return providedSignature === expectedSignature;
  } catch (err) {
    console.error('[WebhookReceiver] Signature verification failed:', err);
    return false;
  }
}

// ============================================================
// Webhook Handler
// ============================================================

export async function handleWebhook(
  endpoint: string,
  payload: unknown,
  signature?: string
): Promise<{ success: boolean; triggeredWorkflows: string[]; error?: string }> {
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Find workflows with matching webhook endpoint
  const engine = WorkflowEngine.getInstance();
  const workflows = engine.getWorkflows();
  const matchedWorkflows: Workflow[] = [];
  
  for (const wf of workflows) {
    if (!wf.enabled) continue;
    
    for (const trigger of wf.triggers) {
      if (trigger.type === 'webhook-received' && trigger.endpoint === endpoint) {
        // Verify signature if secret is configured
        if (trigger.secret) {
          if (!signature) {
            console.warn(`[WebhookReceiver] No signature provided for workflow ${wf.id}`);
            continue;
          }
          
          const isValid = await verifySignature(payloadStr, signature, trigger.secret);
          if (!isValid) {
            console.warn(`[WebhookReceiver] Invalid signature for workflow ${wf.id}`);
            continue;
          }
        }
        
        matchedWorkflows.push(wf);
        break;
      }
    }
  }
  
  if (matchedWorkflows.length === 0) {
    return { success: false, triggeredWorkflows: [], error: 'No matching workflow found' };
  }
  
  // Trigger all matched workflows
  const triggeredIds: string[] = [];
  const errors: string[] = [];
  
  for (const wf of matchedWorkflows) {
    try {
      const result = await engine.triggerWebhook(wf.id, payload);
      if (result.success) {
        triggeredIds.push(wf.id);
      } else {
        errors.push(`${wf.name}: ${result.error}`);
      }
    } catch (err) {
      errors.push(`${wf.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  console.log(`[WebhookReceiver] Triggered ${triggeredIds.length} workflows for endpoint ${endpoint}`);
  
  return {
    success: triggeredIds.length > 0,
    triggeredWorkflows: triggeredIds,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

// ============================================================
// Register Webhook Endpoint (for external systems)
// ============================================================

export function registerWebhookEndpoint(endpoint: string, handler: (payload: unknown, signature?: string) => Promise<void>): void {
  // This would be called by the app to register a handler for a webhook endpoint
  // For example, in a service worker or API route
  console.log(`[WebhookReceiver] Registered endpoint: ${endpoint}`);
}

// Export for use in the app
export { handleWebhook as default };