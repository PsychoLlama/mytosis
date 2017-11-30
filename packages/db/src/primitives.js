// @flow
import { Primitive } from '@mytosis/types';

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
