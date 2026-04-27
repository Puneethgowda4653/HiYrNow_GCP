/**
 * Node.js Polyfills
 * 
 * This file adds compatibility polyfills for modern Node.js versions.
 * Specifically, it addresses issues in Node v25+ where some legacy 
 * internal APIs like SlowBuffer have been removed or moved.
 */

const buffer = require('buffer');

// Polyfill SlowBuffer if it's missing (removed in Node v25)
// Legacy packages like 'buffer-equal-constant-time' depend on SlowBuffer.prototype.equal
if (typeof buffer.SlowBuffer === 'undefined') {
    // console.log('[Polyfill] SlowBuffer is undefined, aliasing to Buffer');
    buffer.SlowBuffer = buffer.Buffer;
}

// Ensure Buffer.prototype.equal exists if something expects it (safety measure)
if (typeof buffer.Buffer.prototype.equal === 'undefined') {
    buffer.Buffer.prototype.equal = function (other) {
        return buffer.Buffer.compare(this, other) === 0;
    };
}
