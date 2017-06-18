/* global Blob */

// Creates a convenient `assert` function.
export const asserter = (app) => (expr, msg) => {
  if (!expr) {
    throw new Error(`${app}: ${msg}`);
  }
};

// The client can be used in Node and the browser.
const binaryNotSupported = typeof ArrayBuffer === 'undefined';
const hasBlobSupport = typeof Blob === 'function';

/**
 * Detects whether data is a binary type.
 * @private
 * @param  {Mixed} data - JSON or binary data.
 * @return {Boolean} - If it's binary.
 */
export const isBinary = (data) => {
  if (binaryNotSupported || !data) {
    return false;
  }

  // Node's Buffer instance and the Uint* arrays
  // all expose a .buffer ArrayBuffer.
  if (data.buffer instanceof ArrayBuffer) {
    return true;
  }

  // File subclasses Blob.
  if (hasBlobSupport) {
    return data instanceof Blob;
  }

  return false;
};
