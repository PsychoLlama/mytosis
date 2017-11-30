// @flow
import { Primitive } from '@mytosis/types';

import { string } from '../primitives';

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

    it('returns empty string when given undefined', () => {
      const result = string.coerce(undefined);

      expect(result).toBe('');
    });
  });
});
