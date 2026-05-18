const crypto = require('crypto');

// Constant-time string comparison. Returns false if either operand is
// missing or lengths differ — crypto.timingSafeEqual throws on length
// mismatch, which itself leaks a bit. Pad both sides to the longer
// length so the comparison itself is constant-time across mismatches.
const timingSafeEqualStr = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) {
        // Still do a comparison of equal length so we don't short-circuit.
        const max = Math.max(ab.length, bb.length);
        crypto.timingSafeEqual(Buffer.alloc(max), Buffer.alloc(max));
        return false;
    }
    return crypto.timingSafeEqual(ab, bb);
};

module.exports = { timingSafeEqualStr };
