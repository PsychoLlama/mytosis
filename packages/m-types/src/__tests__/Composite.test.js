// @flow
import Composite from '../Composite';
import Primitive from '../Primitive';

const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
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

    it('throws if the nested composite type is invalid', () => {
      const Product = new Composite('Product', {
        CRDT,
        initialFieldSet: {
          seller: new Composite('Company', {
            initialFieldSet: { name: string },
            CRDT,
          }),
        },
      });

      const fail = () =>
        Product.validate({
          seller: { name: 5 },
        });

      expect(fail).toThrow(/name/i);
    });

    it('works with default types', () => {
      const Players = new Composite('Players', {
        CRDT,
        defaultType: new Composite('Player', {
          initialFieldSet: { gamertag: string },
          CRDT,
        }),
      });

      const fail = () =>
        Players.validate({
          bobjones6: { gamertag: null },
        });

      expect(fail).toThrow(/Player.gamertag/i);
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
