// Ed25519 signature verification using Web Crypto API (SubtleCrypto)
// No external npm packages required - uses native browser cryptography

/**
 * Ed25519 signature verification using Web Crypto API
 * 
 * Web Crypto API natively supports Ed25519 (since 2023 in major browsers)
 * Format: The signature is a 64-byte Ed25519 signature
 * Format: The public key is a 32-byte Ed25519 public key
 */

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

/**
 * Convert Base64url string to Uint8Array
 */
function base64urlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import an Ed25519 public key from a raw 32-byte format
 */
async function importPublicKey(publicKeyBytes: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    publicKeyBytes,
    {
      name: 'Ed25519',
      algorithm: 'Ed25519',
    },
    true,
    ['verify']
  );
}

/**
 * Verify an Ed25519 signature using Web Crypto API
 * 
 * @param signature - Base64url encoded 64-byte Ed25519 signature
 * @param message - The message that was signed (typically manifest JSON)
 * @param publicKeyBase64 - Base64url encoded 32-byte Ed25519 public key
 * @returns Promise<VerifyResult>
 */
export async function verifyEd25519Signature(
  signature: string,
  message: string,
  publicKeyBase64: string
): Promise<VerifyResult> {
  try {
    // Decode the signature and public key
    const signatureBytes = base64urlToBytes(signature);
    const publicKeyBytes = base64urlToBytes(publicKeyBase64);

    // Validate byte lengths
    if (signatureBytes.length !== 64) {
      return {
        valid: false,
        error: `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`
      };
    }
    if (publicKeyBytes.length !== 32) {
      return {
        valid: false,
        error: `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`
      };
    }

    // Import the public key
    const publicKey = await importPublicKey(publicKeyBytes);

    // Encode the message as UTF-8
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      {
        name: 'Ed25519',
      },
      publicKey,
      signatureBytes,
      messageBytes
    );

    return { valid: isValid };
  } catch (err) {
    return {
      valid: false,
      error: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Verify plugin manifest integrity
 * The message signed is typically the manifest JSON (excluding signature field)
 */
export async function verifyPluginManifest(
  manifestJson: string,
  signature: string,
  publicKey: string
): Promise<VerifyResult> {
  // Remove signature field from manifest before verification
  try {
    const manifest = JSON.parse(manifestJson);
    delete manifest.signature;
    const canonicalMessage = JSON.stringify(manifest);
    return await verifyEd25519Signature(signature, canonicalMessage, publicKey);
  } catch (err) {
    return {
      valid: false,
      error: `Failed to parse manifest: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Check if Web Crypto API supports Ed25519
 */
export function isEd25519Supported(): boolean {
  return crypto.subtle !== undefined && 
         typeof crypto.subtle.importKey === 'function' &&
         typeof crypto.subtle.verify === 'function';
}
