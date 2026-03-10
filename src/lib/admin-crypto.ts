/**
 * Encrypt / decrypt a plaintext string using AES-256-GCM with a key
 * derived from a shared passphrase via PBKDF2.
 *
 * Used to protect the CMS password in transit when calling admin
 * edge functions.  The shared passphrase is the Supabase anon key,
 * which is available on both the client and the edge function runtime.
 *
 * Blob format (base64):  salt(16) ‖ iv(12) ‖ ciphertext+tag
 */

const ITERATIONS = 250_000;
const SALT_LEN = 16;
const IV_LEN = 12;
const enc = new TextEncoder();

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

function toBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Encrypt a plaintext payload.
 * Returns a base64-encoded blob: salt ‖ iv ‖ ciphertext+tag.
 */
export async function encryptPayload(
  plaintext: string,
  passphrase: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext),
    ),
  );
  const blob = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.length);
  blob.set(salt, 0);
  blob.set(iv, SALT_LEN);
  blob.set(ciphertext, SALT_LEN + IV_LEN);
  return toBase64(blob);
}

/**
 * Decrypt a base64 blob produced by `encryptPayload`.
 * Throws if the passphrase is wrong or data is corrupt.
 */
export async function decryptPayload(
  blob: string,
  passphrase: string,
): Promise<string> {
  const data = fromBase64(blob);
  const salt = data.slice(0, SALT_LEN);
  const iv = data.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = data.slice(SALT_LEN + IV_LEN);
  const key = await deriveKey(passphrase, salt, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}
