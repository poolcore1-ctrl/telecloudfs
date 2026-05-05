export class SecurityService {
  private static ITERATIONS = 100000;

  static async deriveKeys(password: string, saltStr?: string) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
    const salt = saltStr ? new Uint8Array(atob(saltStr).split('').map(c => c.charCodeAt(0))) : crypto.getRandomValues(new Uint8Array(16));
    const encryptionKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' }, key, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const authBuf = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' }, key, 256);
    const authKey = btoa(String.fromCharCode(...new Uint8Array(authBuf)));
    return { encryptionKey, authKey, salt: btoa(String.fromCharCode(...salt)) };
  }

  static async encrypt(data: any, key: CryptoKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
    const combined = new Uint8Array(iv.length + enc.byteLength);
    combined.set(iv); combined.set(new Uint8Array(enc), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(b64: string, key: CryptoKey) {
    const data = new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12));
    return JSON.parse(new TextDecoder().decode(dec));
  }
}
