import assert from 'node:assert/strict'

// Uncompressed minified ESM output, including the single Three.js runtime.
// The reviewed TypeScript renderer graph measures 739,446 bytes with esbuild 0.28.1.
const maximumClientBundleBytes = 750_000
export function assertClientBundleBudget(bundle: Uint8Array): void {
 assert(bundle.byteLength < maximumClientBundleBytes,
  `Client bundle is ${bundle.byteLength} bytes; limit is ${maximumClientBundleBytes} bytes`)
}
