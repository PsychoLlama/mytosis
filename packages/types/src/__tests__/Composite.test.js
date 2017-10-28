// @flow
import * as migrations from '../migrations';
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

  describe('migrations', () => {
    it('throws if the migration set is empty', () => {
      const Product = new Composite('Product', { CRDT });
      const fail = () => Product.migrate([]);

      expect(fail).toThrow(/migration/i);
    });

    it('returns a new composite', () => {
      const v1 = new Composite('Product', {
        initialFieldSet: { name: string },
        CRDT,
      });

      const v2 = v1.migrate([new migrations.Add('yolo', string)]);

      expect(v2).toEqual(expect.any(Composite));
      expect(v2).not.toBe(v1);
      expect(v2.name).toBe(v1.name);
      expect(v2.CRDT).toBe(v1.CRDT);
    });

    it('updates the fields', () => {
      const v1 = new Composite('Product', {
        initialFieldSet: { title: string },
        CRDT,
      });

      const v2 = v1.migrate([
        new migrations.Add('name', string),
        new migrations.Move('title', 'name'),
        new migrations.Remove('title'),
      ]);

      expect(v2.definition).toEqual({ name: string });
      expect(v1.definition).toEqual({ title: string });
    });

    it('sets the migration pointers', () => {
      const v1 = new Composite('Player', {
        initialFieldSet: { name: string },
        CRDT,
      });

      expect(v1.lastComposite).toBe(null);
      expect(v1.nextComposite).toBe(null);

      const v2 = v1.migrate([
        new migrations.Add('gamertag', string),
        new migrations.Move('name', 'gamertag'),
        new migrations.Remove('name'),
        new migrations.Add('score', number),
      ]);

      expect(v2.lastComposite).toEqual(expect.any(Composite));
      expect(v1.nextComposite).toEqual(expect.any(Composite));
      expect(v2.lastComposite.lastComposite.lastComposite.lastComposite).toBe(
        v1,
      );
      expect(v2.lastComposite.definition).toEqual({ gamertag: string });
      expect(v2.lastComposite.lastComposite.definition).toEqual({
        gamertag: string,
        name: string,
      });
    });

    it('tracks the version', () => {
      const v1 = new Composite('User', { CRDT });
      expect(v1.lastVersion).toBe(null);
      expect(v1.nextVersion).toBe(null);

      const v2 = v1.migrate([
        new migrations.Add('firstName', string),
        new migrations.Add('lastName', string),
        new migrations.Add('joined', string),
      ]);

      expect(v2.lastVersion).toBe(v1);
      expect(v2.nextVersion).toBe(null);
    });
  });
});
