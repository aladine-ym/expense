import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 120000;
const DIGEST = 'sha256';

/**
 * Derive an encryption key from a passphrase using PBKDF2.
 * @param {string} passphrase
 * @param {Buffer} [salt]
 * @returns {{ key: Buffer, salt: Buffer }}
 */
export function deriveKeyFromPassphrase(passphrase, salt = crypto.randomBytes(SALT_LENGTH)) {
    const key = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
    return { key, salt };
}

/**
 * Encrypt a JSON-serializable payload using AES-256-GCM.
 * @param {unknown} payload
 * @param {Buffer} key
 * @returns {{ ciphertext: string, iv: string, authTag: string }}
 */
export function encryptPayload(payload, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const data = Buffer.from(JSON.stringify(payload));
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

/**
 * Decrypt an encrypted payload previously produced by `encryptPayload`.
 * @param {{ ciphertext: string, iv: string, authTag: string }} encrypted
 * @param {Buffer} key
 * @returns {any}
 */
export function decryptPayload(encrypted, key) {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
        decipher.final()
    ]);
    return JSON.parse(decrypted.toString('utf8'));
}
