// @flow
import { Primitive, Derivation, Composite } from '@mytosis/types';
import { Atom } from '@mytosis/crdts';

import { string, number, boolean, buffer, pointer, atom } from '../types';

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

describe('buffer', () => {
  it('exists', () => {
    expect(buffer).toEqual(expect.any(Primitive));
    expect(buffer.name).toBe('buffer');
  });

  it('marks non-buffers as invalid', () => {
    expect(buffer.isValid({})).toBe(false);
    expect(buffer.isValid([1, 0, 1])).toBe(false);
    expect(buffer.isValid(5)).toBe(false);
    expect(buffer.isValid(-Infinity)).toBe(false);
    expect(buffer.isValid(NaN)).toBe(false);
    expect(buffer.isValid(null)).toBe(false);
    expect(buffer.isValid(undefined)).toBe(false);
    expect(buffer.isValid('contents')).toBe(false);
  });

  it('allows valid values', () => {
    const buf = new ArrayBuffer(8);
    expect(buffer.isValid(buf)).toBe(true);
    expect(buffer.isValid(new Uint8Array(buf))).toBe(true);
    expect(buffer.isValid(new Uint8ClampedArray(buf))).toBe(true);
    expect(buffer.isValid(new Uint16Array(buf))).toBe(true);
    expect(buffer.isValid(new Uint32Array(buf))).toBe(true);
    expect(buffer.isValid(new Int8Array(buf))).toBe(true);
    expect(buffer.isValid(new Int16Array(buf))).toBe(true);
    expect(buffer.isValid(new Int32Array(buf))).toBe(true);
    expect(buffer.isValid(new Float32Array(buf))).toBe(true);
    expect(buffer.isValid(new Float64Array(buf))).toBe(true);
  });

  describe('coercion', () => {
    it('returns the buffer if already valid', () => {
      const buf = new ArrayBuffer(8);
      expect(buffer.coerce(buf)).toBe(buf);
      expect(buffer.coerce(new Uint8Array(buf))).toEqual(
        expect.any(Uint8Array),
      );
      expect(buffer.coerce(new Uint8ClampedArray(buf))).toEqual(
        expect.any(Uint8ClampedArray),
      );
      expect(buffer.coerce(new Uint16Array(buf))).toEqual(
        expect.any(Uint16Array),
      );
      expect(buffer.coerce(new Uint32Array(buf))).toEqual(
        expect.any(Uint32Array),
      );
      expect(buffer.coerce(new Int8Array(buf))).toEqual(expect.any(Int8Array));
      expect(buffer.coerce(new Int16Array(buf))).toEqual(
        expect.any(Int16Array),
      );
      expect(buffer.coerce(new Int32Array(buf))).toEqual(
        expect.any(Int32Array),
      );
      expect(buffer.coerce(new Int32Array(buf))).toEqual(
        expect.any(Int32Array),
      );
      expect(buffer.coerce(new Float32Array(buf))).toEqual(
        expect.any(Float32Array),
      );
      expect(buffer.coerce(new Float64Array(buf))).toEqual(
        expect.any(Float64Array),
      );
    });

    // Lossless coercion would be too weird. Let's hope nobody wants it.
    it('returns an empty array buffer if the value is invalid', () => {
      expect(buffer.coerce(5)).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce('contents')).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(null)).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(undefined)).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(([]: any))).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(({}: any))).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(-Infinity)).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(NaN)).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(false)).toEqual(new ArrayBuffer(0));
      expect(buffer.coerce(true)).toEqual(new ArrayBuffer(0));

      expect(buffer.coerce(undefined).byteLength).toBe(0);
    });
  });
});

describe('pointer', () => {
  it('exists', () => {
    expect(pointer).toEqual(expect.any(Derivation));
    expect(pointer.subtype).toBe(string);
    expect(pointer.name).toBe('pointer');
  });

  it('borrows the validation from string', () => {
    expect(pointer.isValid(5)).toBe(false);
    expect(pointer.isValid(false)).toBe(false);

    expect(pointer.isValid('')).toBe(true);
    expect(pointer.isValid('with contents')).toBe(true);
  });

  it('dehydrates to the same value', () => {
    expect(pointer.dehydrate('')).toBe('');
    expect(pointer.dehydrate('value')).toBe('value');
  });

  it('hydrates to the same value', () => {
    expect(pointer.hydrate('')).toBe('');
    expect(pointer.hydrate('value')).toBe('value');
  });
});

describe('atom', () => {
  it('returns a composite', () => {
    const User = atom('User', {
      initialFieldSet: {},
    });

    expect(User).toEqual(expect.any(Composite));
    expect(User.name).toBe('User');
  });

  it('attaches the Atom CRDT', () => {
    const User = atom('User', {
      initialFieldSet: {},
    });

    expect(User.CRDT).toBe(Atom);
  });

  it('passes type information', () => {
    const User = atom('Leaderboard', {
      defaultType: pointer,
      initialFieldSet: {
        highScore: number,
      },
    });

    expect(User.definition.highScore).toBe(number);
    expect(User.defaultType).toBe(pointer);
  });
});
