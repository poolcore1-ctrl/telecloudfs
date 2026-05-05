/**
 * Security Service for Zero-Knowledge Vault Encryption
 */
export class SecurityService {
    private static ITERATIONS = 100000;

    static async deriveKeys(password: string, saltStr?: string) {
        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveKey", "deriveBits"]
        );

        const salt = saltStr ? 
            new Uint8Array(atob(saltStr).split("").map(c => c.charCodeAt(0))) : 
            crypto.getRandomValues(new Uint8Array(16));

        // Derive Encryption Key
        const encryptionKey = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: this.ITERATIONS, hash: "SHA-256" },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // Derive Auth Key (to send to worker for verification)
        const authKeyBuffer = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt, iterations: this.ITERATIONS, hash: "SHA-256" },
            passwordKey,
            256
        );
        const authKey = btoa(String.fromCharCode(...new Uint8Array(authKeyBuffer)));

        return { 
            encryptionKey, 
            authKey, 
            salt: btoa(String.fromCharCode(...salt)) 
        };
    }

    static async encrypt(data: any, key: CryptoKey) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            encoder.encode(JSON.stringify(data))
        );

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        return btoa(String.fromCharCode(...combined));
    }

    static async decrypt(base64Payload: string, key: CryptoKey) {
        const data = new Uint8Array(atob(base64Payload).split("").map(c => c.charCodeAt(0)));
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBuffer));
    }
}
