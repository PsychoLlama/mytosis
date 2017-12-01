// @flow
import { Primitive, Derivation } from '@mytosis/types';

// I am a bad person.
const Uint8Proto = Object.getPrototypeOf(new Uint8Array(new ArrayBuffer(0)));
const TypedArray = Object.getPrototypeOf(Uint8Proto).constructor;

const identity = value => value;

export const string = new Primitive('string', {
  isValid: (value): boolean => typeof value === 'string',
  coerce: (value): string => {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  },
});

// Excludes NaN and ±Infinity.
export const number = new Primitive('number', {
  isValid: (value): boolean => typeof value === 'number' && isFinite(value),
  coerce: (value): number => {
    const result = Number(value);

    return isFinite(result) ? result : 0;
  },
});

export const boolean = new Primitive('boolean', {
  isValid: (value): boolean => value === true || value === false,
  coerce: (value): boolean => !!value,
});

// Represents typed arrays (binary values).
export const buffer = new Primitive('buffer', {
  coerce: buf => {
    if (buffer.isValid(buf)) {
      return buf;
    }

    return new ArrayBuffer(0);
  },

  isValid: (value): boolean =>
    value instanceof ArrayBuffer || value instanceof TypedArray,
});

export const pointer = new Derivation('pointer', string, {
  isValid: value => string.isValid(value),
  dehydrate: identity,
  hydrate: identity,
});
