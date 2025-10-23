// Lightweight nanoid implementation for client-side usage.
// Based on https://github.com/ai/nanoid (simplified)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';
const alphabetLength = alphabet.length;

/**
 * Generate a random id string of the given length.
 * @param {number} [size=12]
 * @returns {string}
 */
export function nanoid(size = 12) {
    const arr = new Uint8Array(size);
    crypto.getRandomValues(arr);
    let id = '';
    arr.forEach((value) => {
        id += alphabet[value % alphabetLength];
    });
    return id;
}

export default nanoid;
