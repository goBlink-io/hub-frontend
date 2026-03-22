/**
 * Encrypted localStorage wrapper for sensitive data.
 * Uses Web Crypto API for AES-GCM encryption with random salt per encryption.
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_ITERATIONS = 100000;

/**
 * Derive encryption key from a password/seed using PBKDF2 with a random salt
 */
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM with random salt and IV.
 * Output format: salt (16 bytes) + iv (12 bytes) + ciphertext
 */
async function encrypt(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)) as Uint8Array<ArrayBuffer>;
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH)) as Uint8Array<ArrayBuffer>;
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Combine: salt + iv + ciphertext
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);
  return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decrypt data: parse salt (first 16 bytes), iv (next 12 bytes), then ciphertext
 */
async function decrypt(hexData: string, password: string): Promise<string> {
  const bytes = new Uint8Array(hexData.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const salt = new Uint8Array(bytes.buffer.slice(0, SALT_LENGTH)) as Uint8Array<ArrayBuffer>;
  const iv = new Uint8Array(bytes.buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)) as Uint8Array<ArrayBuffer>;
  const ciphertext = new Uint8Array(bytes.buffer.slice(SALT_LENGTH + IV_LENGTH)) as Uint8Array<ArrayBuffer>;

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Try to decrypt legacy format (JSON with {iv, data} and hardcoded salt)
 */
async function decryptLegacy(encryptedData: string, password: string): Promise<string> {
  const { iv, data } = JSON.parse(encryptedData);
  const encoder = new TextEncoder();
  const legacySalt = encoder.encode('goblink-storage-v1');
  const key = await deriveKey(password, legacySalt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Get encryption key for this browser session
 */
function getEncryptionPassword(): string {
  let password = sessionStorage.getItem('__enc_key');

  if (!password) {
    password = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    sessionStorage.setItem('__enc_key', password);
  }

  return password;
}

/**
 * Encrypted localStorage wrapper.
 * No plaintext fallback — encryption failure throws.
 */
export const secureStorage = {
  async setItem(key: string, value: any): Promise<void> {
    const password = getEncryptionPassword();
    const serialized = JSON.stringify(value);
    const encrypted = await encrypt(serialized, password);
    localStorage.setItem(key, encrypted);
  },

  async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const password = getEncryptionPassword();

      // Try new format (hex-encoded salt+iv+ciphertext)
      try {
        const decrypted = await decrypt(stored, password);
        return JSON.parse(decrypted);
      } catch {
        // Try legacy JSON format for migration
        try {
          const decrypted = await decryptLegacy(stored, password);
          return JSON.parse(decrypted);
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error('Failed to retrieve item:', error);
      return null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },
};

/**
 * @deprecated Base64-only encoding — NOT encryption. Use secureStorage for sensitive data.
 * Retained for backward compatibility with non-sensitive preferences.
 */
export const obfuscatedStorage = {
  setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const encoded = btoa(serialized);
      localStorage.setItem(key, encoded);
    } catch (error) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  getItem<T = any>(key: string): T | null {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;

      try {
        const decoded = atob(encoded);
        return JSON.parse(decoded);
      } catch {
        // Fallback to direct parse if not encoded
        return JSON.parse(encoded);
      }
    } catch (error) {
      return null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
};
