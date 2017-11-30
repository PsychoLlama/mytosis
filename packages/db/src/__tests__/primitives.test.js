// @flow
import { Primitive } from '@mytosis/types';

import { string, number, boolean } from '../primitives';

describe('string', () => {
  it('exists', () => {
    expect(string).toEqual(expect.any(Primitive));
    expect(string.name).toBe('string');
  });

  it('indicates strings are valid', () => {
    expect(string.isValid('contents')).toBe(true);
    expect(string.isValid('With Space')).toBe(true);
    expect(string.isValid('')).toBe(true);
    expect(string.isValid('🚀🦄⭐️')).toBe(true);
    expect(string.isValid('Z̧̡̖̹̳̥͂́̉̆͘͢͞͡ă̳̰̮̤͈̩̘̒̀̇̽̓͊̐̃͟͜ͅḽ̟̹̱̟̩̝̩̋̽̇͐͝͞͡g̳͍̱̬͎̹͗̌͗͌͂̊̓̽͟ͅo̧̱̺̻̮͖͋͆͋̌͆̏͂̇͟')).toBe(true);
    expect(string.isValid('!@#$%^&*()_+=-`~<>,./?"\'[]{}')).toBe(true);
  });

  it('indicates when values are invalid', () => {
    expect(string.isValid(5)).toBe(false);
    expect(string.isValid(-500)).toBe(false);
    expect(string.isValid(NaN)).toBe(false);
    expect(string.isValid(-Infinity)).toBe(false);
    expect(string.isValid(true)).toBe(false);
    expect(string.isValid(false)).toBe(false);
    expect(string.isValid({ obj: 'lol' })).toBe(false);
    expect(string.isValid([1, 2, 3])).toBe(false);
    expect(string.isValid(new ArrayBuffer(8))).toBe(false);
    expect(string.isValid(Symbol('Why would this happen'))).toBe(false);
  });

  // Best effort at lossless transforms.
  describe('coerce()', () => {
    it('returns a string', () => {
      expect(string.coerce(5)).toEqual(expect.any(String));
    });

    it('returns the same value if already a string', () => {
      expect(string.coerce('yolo')).toBe('yolo');
      expect(string.coerce('')).toBe('');
      expect(string.coerce('180')).toBe('180');
    });

    it('coerces numbers', () => {
      expect(string.coerce(15)).toBe('15');
      expect(string.coerce(-15)).toBe('-15');
      expect(string.coerce(-0)).toBe('0');
      expect(string.coerce(Infinity)).toBe('Infinity');
      expect(string.coerce(-Infinity)).toBe('-Infinity');

      // As tempting as it is to make an exception, this is
      // the least surprising behavior.
      expect(string.coerce(NaN)).toBe('NaN');
    });

    it('coerces booleans', () => {
      expect(string.coerce(true)).toBe('true');
      expect(string.coerce(false)).toBe('false');
    });

    it('allows values to provide specific coercion instructions', () => {
      const stringable: any = {
        toString: () => '#yolo',
      };

      expect(string.coerce(stringable)).toBe('#yolo');
    });

    it('coerces unexpected values', () => {
      expect(string.coerce(undefined)).toBe('');
      expect(string.coerce(null)).toBe('');
    });
  });
});

describe('number', () => {
  it('exists', () => {
    expect(number).toEqual(expect.any(Primitive));
    expect(number.name).toBe('number');
  });

  it('declares numbers as valid', () => {
    expect(number.isValid(0)).toBe(true);
    expect(number.isValid(-10000)).toBe(true);
    expect(number.isValid(345689)).toBe(true);
  });

  it('marks invalid values', () => {
    expect(number.isValid('')).toBe(false);
    expect(number.isValid('contents')).toBe(false);
    expect(number.isValid(false)).toBe(false);
    expect(number.isValid(true)).toBe(false);
    expect(number.isValid(Symbol('number'))).toBe(false);
    expect(number.isValid({})).toBe(false);
    expect(number.isValid([])).toBe(false);
    expect(number.isValid(null)).toBe(false);

    // Unusual exceptions.
    expect(number.isValid(NaN)).toBe(false);
    expect(number.isValid(Infinity)).toBe(false);
    expect(number.isValid(-Infinity)).toBe(false);
  });

  describe('coercion', () => {
    it('returns a number', () => {
      expect(number.coerce(5)).toBe(5);
      expect(number.coerce(-60)).toBe(-60);

      expect(number.coerce('0')).toBe(0);
      expect(number.coerce('-15')).toBe(-15);

      expect(number.coerce(true)).toBe(1);
      expect(number.coerce(false)).toBe(0);

      // Special cases.
      expect(number.coerce('invalid number')).toBe(0);
      expect(number.coerce('-Infinity')).toBe(0);
      expect(number.coerce('Infinity')).toBe(0);
      expect(number.coerce('NaN')).toBe(0);
      expect(number.coerce(undefined)).toBe(0);
      expect(number.coerce(null)).toBe(0);
    });

    it('respects valueOf() interfaces', () => {
      const coercible: any = {
        valueOf: () => 15,
      };

      const result = number.coerce(coercible);

      expect(result).toBe(15);
    });
  });
});

describe('boolean', () => {
  it('exists', () => {
    expect(boolean).toEqual(expect.any(Primitive));
    expect(boolean.name).toBe('boolean');
  });

  it('marks booleans as valid', () => {
    expect(boolean.isValid(true)).toBe(true);
    expect(boolean.isValid(false)).toBe(true);
  });

  it('marks non-booleans as invalid', () => {
    expect(boolean.isValid(5)).toBe(false);
    expect(boolean.isValid(-Infinity)).toBe(false);
    expect(boolean.isValid(NaN)).toBe(false);
    expect(boolean.isValid({})).toBe(false);
    expect(boolean.isValid([])).toBe(false);
    expect(boolean.isValid(/yolo/)).toBe(false);
    expect(boolean.isValid('contents')).toBe(false);
    expect(boolean.isValid(Symbol())).toBe(false);
    expect(boolean.isValid(new ArrayBuffer(8))).toBe(false);
  });

  describe('coercion', () => {
    it('returns a boolean', () => {
      expect(boolean.coerce(true)).toBe(true);
    });

    it('uses truthiness', () => {
      // Falsy
      expect(boolean.coerce('')).toBe(false);
      expect(boolean.coerce(0)).toBe(false);
      expect(boolean.coerce(false)).toBe(false);
      expect(boolean.coerce(NaN)).toBe(false);
      expect(boolean.coerce(undefined)).toBe(false);
      expect(boolean.coerce(null)).toBe(false);

      // Truthy
      expect(boolean.coerce(true)).toBe(true);
      expect(boolean.coerce(1)).toBe(true);
      expect(boolean.coerce(Infinity)).toBe(true);
      expect(boolean.coerce('contents')).toBe(true);
      expect(boolean.coerce((/yolo/: any))).toBe(true);
      expect(boolean.coerce(({}: any))).toBe(true);
      expect(boolean.coerce(([]: any))).toBe(true);
      expect(boolean.coerce((new ArrayBuffer(0): any))).toBe(true);
    });
  });
});
