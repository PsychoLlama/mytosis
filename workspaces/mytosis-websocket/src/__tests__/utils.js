/* eslint-env node */
/* global Blob */
import { isBinary } from '../utils';

describe('Mytosis websocket binary detection', () => {
  it('returns true for buffers', () => {
    const data = Buffer.from('some data');

    expect(isBinary(data)).toBe(true);
  });

  it('returns true for typed array', () => {
    const data = new Uint8Array([6, 4, 10]);

    expect(isBinary(data)).toBe(true);
  });

  it('returns false for plain objects', () => {
    const data = { hello: 'world' };

    expect(isBinary(data)).toBe(false);
  });

  it('returns false for binary-like json data', () => {
    const data = { buffer: [] };

    expect(isBinary(data)).toBe(false);
  });

  it('returns false for primitive data', () => {
    expect(isBinary(true)).toBe(false);
    expect(isBinary(null)).toBe(false);
    expect(isBinary(undefined)).toBe(false);
    expect(isBinary(0xf3456)).toBe(false);
    expect(isBinary('string')).toBe(false);
  });

  it('returns false for arrays', () => {
    const data = ['hey'];

    expect(isBinary(data)).toBe(false);
  });

  it('returns true for blobs', () => {
    const blob = new Blob();

    expect(isBinary(blob)).toBe(true);
  });
});
