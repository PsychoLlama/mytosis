// @flow
import { string, number, boolean } from '../primitives';
import Primitive from '../Primitive';

describe('Primitive builtins', () => {
  describe('string', () => {
    it('exists', () => {
      expect(string).toEqual(expect.any(Primitive));
    });

    it('validates strings', () => {
      expect(string.isValid(5)).toBe(false);
      expect(string.isValid(-5)).toBe(false);
      expect(string.isValid(600.1)).toBe(false);
      expect(string.isValid(NaN)).toBe(false);
      expect(string.isValid(Infinity)).toBe(false);
      expect(string.isValid(null)).toBe(false);
      expect(string.isValid(undefined)).toBe(false);
      expect(string.isValid(Symbol())).toBe(false);
      expect(string.isValid(Math)).toBe(false);
      expect(string.isValid(false)).toBe(false);
      expect(string.isValid(true)).toBe(false);
      expect(string.isValid(() => {})).toBe(false);

      expect(string.isValid('')).toBe(true);
      expect(string.isValid('with content')).toBe(true);
      expect(string.isValid('\0\0\0')).toBe(true);
    });

    // Coercion doesn't support all values, only the primitives
    // allowed by mytosis.
    it('coerces values from other primitives', () => {
      expect(string.coerce(5)).toBe('5');
      expect(string.coerce(-5)).toBe('-5');
      expect(string.coerce(-5.123)).toBe('-5.123');

      expect(string.coerce(true)).toBe('true');
      expect(string.coerce(false)).toBe('false');

      expect(string.coerce(null)).toBe('');
    });

    it('returns the input when coercing a string', () => {
      expect(string.coerce('value')).toBe('value');
      expect(string.coerce('')).toBe('');
    });
  });

  describe('number', () => {
    it('exists', () => {
      expect(number).toEqual(expect.any(Primitive));
    });

    // TODO: figure out whether to reject >= MAX_SAFE_INTEGER.
    it('indicates whether the value is valid', () => {
      expect(number.isValid(null)).toBe(false);
      expect(number.isValid(undefined)).toBe(false);
      expect(number.isValid(Symbol())).toBe(false);
      expect(number.isValid(Math)).toBe(false);
      expect(number.isValid(false)).toBe(false);
      expect(number.isValid(true)).toBe(false);
      expect(number.isValid(() => {})).toBe(false);
      expect(number.isValid('')).toBe(false);
      expect(number.isValid('with content')).toBe(false);
      expect(number.isValid('\0\0\0')).toBe(false);

      expect(number.isValid(NaN)).toBe(false);
      expect(number.isValid(Infinity)).toBe(false);
      expect(number.isValid(-Infinity)).toBe(false);

      expect(number.isValid(5)).toBe(true);
      expect(number.isValid(-5)).toBe(true);
      expect(number.isValid(600.123)).toBe(true);
    });

    it('can coerce strings to numbers', () => {
      expect(number.coerce('15')).toBe(15);
      expect(number.coerce('-38.2')).toBe(-38.2);
      expect(number.coerce('+30')).toBe(30);
    });

    it('parses invalid strings to 0', () => {
      expect(number.coerce('nan')).toBe(0);
      expect(number.coerce('bacon')).toBe(0);
      expect(number.coerce('str-5')).toBe(0);
      expect(number.coerce('Infinity')).toBe(0);
      expect(number.coerce('-Infinity')).toBe(0);
    });

    it('coerces booleans', () => {
      expect(number.coerce(true)).toBe(1);
      expect(number.coerce(false)).toBe(0);
    });

    it('coerces null', () => {
      expect(number.coerce(null)).toBe(0);
    });

    it('returns the input for other numbers', () => {
      expect(number.coerce(5)).toBe(5);
      expect(number.coerce(-5)).toBe(-5);
      expect(number.coerce(Number.MAX_SAFE_INTEGER - 1)).toBe(
        Number.MAX_SAFE_INTEGER - 1
      );
    });
  });

  describe('boolean', () => {
    it('exists', () => {
      expect(boolean).toEqual(expect.any(Primitive));
    });

    it('indicates whether the value is valid', () => {
      expect(boolean.isValid(null)).toBe(false);
      expect(boolean.isValid(undefined)).toBe(false);
      expect(boolean.isValid(Symbol())).toBe(false);
      expect(boolean.isValid(Math)).toBe(false);
      expect(boolean.isValid(() => {})).toBe(false);
      expect(boolean.isValid('')).toBe(false);
      expect(boolean.isValid('with content')).toBe(false);
      expect(boolean.isValid('\0\0\0')).toBe(false);
      expect(boolean.isValid(NaN)).toBe(false);
      expect(boolean.isValid(Infinity)).toBe(false);
      expect(boolean.isValid(-Infinity)).toBe(false);
      expect(boolean.isValid(5)).toBe(false);
      expect(boolean.isValid(-5)).toBe(false);
      expect(boolean.isValid(600.123)).toBe(false);

      expect(boolean.isValid(false)).toBe(true);
      expect(boolean.isValid(true)).toBe(true);
    });

    it('coerces values', () => {
      expect(boolean.coerce(0)).toBe(false);
      expect(boolean.coerce(-1)).toBe(true);
      expect(boolean.coerce(1)).toBe(true);

      expect(boolean.coerce('')).toBe(false);
      expect(boolean.coerce('\0')).toBe(true);
      expect(boolean.coerce('content')).toBe(true);

      expect(boolean.coerce(true)).toBe(true);
      expect(boolean.coerce(false)).toBe(false);

      expect(boolean.coerce(null)).toBe(false);
    });
  });
});
