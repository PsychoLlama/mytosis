// @flow
import Primitive from './Primitive';

/**
 * Coercion doesn't need to handle all JavaScript primitives,
 * just the mytosis ones.
 */

type JSPrimitive = string | boolean | number | null;

export const string = new Primitive('string', {
  isValid(value: mixed) {
    return typeof value === 'string';
  },

  coerce(value: JSPrimitive) {
    if (value === null) return '';
    return String(value);
  },
});

export const number = new Primitive('number', {
  isValid(value: mixed) {
    return typeof value === 'number' && isFinite(value);
  },

  // TODO: remove support for formats other than base 10.
  coerce(value: JSPrimitive) {
    const parsed = Number(value);
    return isFinite(parsed) ? parsed : 0;
  },
});

export const boolean = new Primitive('boolean', {
  isValid(value: mixed) {
    return typeof value === 'boolean';
  },

  coerce(value: JSPrimitive) {
    return Boolean(value);
  },
});
