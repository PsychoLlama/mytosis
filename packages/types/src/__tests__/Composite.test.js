// @flow
import Composite from '../Composite';
import Primitive from '../Primitive';
import Pointer from '../Pointer';
import Union from '../Union';

const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
});

const number = new Primitive('number', {
  isValid: value => typeof value === 'number',
  coerce: Number,
});

const CRDT = {
  import: data => data,
};

describe('Composite', () => {
  it('is a function', () => {
    expect(Composite).toEqual(expect.any(Function));
  });

  it('throws if the name is invalid', () => {
    const def = { CRDT };

    expect(() => new Composite('', def)).toThrow(/name/);
    expect(() => new Composite('lowercase', def)).toThrow(/name/);
    expect(() => new Composite(' Spaced', def)).toThrow(/name/);
    expect(() => new Composite('Trailing ', def)).toThrow(/name/);
    expect(() => new Composite('Numb3rs', def)).toThrow(/name/);
    expect(() => new Composite('Sym&ols', def)).toThrow(/name/);
    expect(() => new Composite('kebab-case', def)).toThrow(/name/);

    expect(() => new Composite('SNAKE_CASE', def)).not.toThrow(/name/);
    expect(() => new Composite('Product', def)).not.toThrow();
  });

  it('allows names with colons in them', () => {
    const def = { CRDT };

    expect(() => new Composite(':Product:name', def)).toThrow(/name/i);
    expect(() => new Composite('Product:name', def)).not.toThrow();
  });

  describe('validator', () => {
    it('throws if a field is unrecognized', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { name: string },
        CRDT,
      });

      const fail = () => Product.validate({ rating: 5 });

      expect(fail).toThrow(/field/i);
    });

    it('throws if the type is invalid', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { description: string },
        CRDT,
      });

      const fail = () => Product.validate({ description: 10 });

      expect(fail).toThrow(/description/i);
    });

    it('throws if the pointer is invalid', () => {
      const Company = new Composite('Company', {
        initialFieldSet: { name: string },
        CRDT,
      });

      const Product = new Composite('Product', {
        CRDT,
        initialFieldSet: {
          seller: new Pointer(string, Company),
        },
      });

      const fail = () =>
        Product.validate({
          seller: true,
        });

      expect(fail).toThrow(/seller/i);
    });

    it('validates default types', () => {
      const Player = new Composite('Player', {
        initialFieldSet: { gamertag: string },
        CRDT,
      });

      const Players = new Composite('Players', {
        defaultType: new Pointer(string, Player),
        CRDT,
      });

      const fail = () =>
        Players.validate({
          steve: 10,
        });

      expect(fail).toThrow(/Player/i);
    });

    it('validates unions', () => {
      const Player = new Composite('Player', {
        defaultType: new Union(number, [string, number]),
        CRDT,
      });

      const fail = () => Player.validate({ value: true });
      const pass = () => Player.validate({ value: '5' });

      expect(fail).toThrow(/Player.value/);
      expect(pass).not.toThrow();
    });

    it('passes when the type is valid', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { name: string },
        CRDT,
      });

      const pass = () => Product.validate({ name: 'hammer' });

      expect(pass).not.toThrow();
    });

    it('fails when one of the fields is invalid', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { name: string, description: string },
        CRDT,
      });

      const fail = () =>
        Product.validate({
          name: 'Hammer',
          description: Infinity,
        });

      expect(fail).toThrow(/Product.description/);
    });
  });
});
