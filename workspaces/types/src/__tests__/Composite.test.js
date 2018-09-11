import * as migration from '../migrations';
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

const context = {
  import: data => data,
};

describe('Composite', () => {
  it('is a function', () => {
    expect(Composite).toEqual(expect.any(Function));
  });

  it('throws if the name is invalid', () => {
    const def = { context };

    expect(() => new Composite('', def)).toThrow(/name/);
    expect(() => new Composite('lowercase', def)).toThrow(/name/);
    expect(() => new Composite(' Spaced', def)).toThrow(/name/);
    expect(() => new Composite('Trailing ', def)).toThrow(/name/);
    expect(() => new Composite('Sym&ols', def)).toThrow(/name/);
    expect(() => new Composite('kebab-case', def)).toThrow(/name/);

    expect(() => new Composite('SNAKE_CASE', def)).not.toThrow(/name/);
    expect(() => new Composite('Product', def)).not.toThrow();
    expect(() => new Composite('Product3', def)).not.toThrow();
  });

  it('allows names with colons in them', () => {
    const def = { context };

    expect(() => new Composite(':Product:name', def)).toThrow(/name/i);
    expect(() => new Composite('Product:name', def)).not.toThrow();
  });

  describe('validator', () => {
    it('throws if a field is unrecognized', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { name: string },
        context,
      });

      const fail = () => Product.validate({ rating: 5 });

      expect(fail).toThrow(/field/i);
    });

    it('throws if the type is invalid', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { description: string },
        context,
      });

      const fail = () => Product.validate({ description: 10 });

      expect(fail).toThrow(/description/i);
    });

    it('throws if the pointer is invalid', () => {
      const Company = new Composite('Company', {
        initialFieldSet: { name: string },
        context,
      });

      const Product = new Composite('Product', {
        context,
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
        context,
      });

      const Players = new Composite('Players', {
        defaultType: new Pointer(string, Player),
        context,
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
        context,
      });

      const fail = () => Player.validate({ value: true });
      const pass = () => Player.validate({ value: '5' });

      expect(fail).toThrow(/Player.value/);
      expect(pass).not.toThrow();
    });

    it('passes when the type is valid', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { name: string },
        context,
      });

      const pass = () => Product.validate({ name: 'hammer' });

      expect(pass).not.toThrow();
    });

    it('fails when one of the fields is invalid', () => {
      const Product = new Composite('Product', {
        initialFieldSet: { name: string, description: string },
        context,
      });

      const fail = () =>
        Product.validate({
          name: 'Hammer',
          description: Infinity,
        });

      expect(fail).toThrow(/Product.description/);
    });
  });

  describe('migration', () => {
    it('throws if the migration set is empty', () => {
      const Product = new Composite('Product', { context });
      const fail = () => Product.migrate([]);

      expect(fail).toThrow(/migration/i);
    });

    it('returns a new composite', () => {
      const v1 = new Composite('Product', {
        initialFieldSet: { name: string },
        context,
      });

      const v2 = v1.migrate([new migration.Add('yolo', string)]);

      expect(v2).toEqual(expect.any(Composite));
      expect(v2).not.toBe(v1);
      expect(v2.name).toBe(v1.name);
      expect(v2.context).toBe(v1.context);
    });

    it('updates the fields', () => {
      const v1 = new Composite('Product', {
        initialFieldSet: { title: string },
        context,
      });

      const v2 = v1.migrate([
        new migration.Add('name', string),
        new migration.Move('title', 'name'),
        new migration.Remove('title'),
      ]);

      expect(v2.definition).toEqual({ name: string });
      expect(v1.definition).toEqual({ title: string });
    });

    it('sets the migration pointers', () => {
      const v1 = new Composite('Player', {
        initialFieldSet: { name: string },
        context,
      });

      expect(v1.lastComposite).toBe(null);
      expect(v1.nextComposite).toBe(null);

      const v2 = v1.migrate([
        new migration.Add('gamertag', string),
        new migration.Move('name', 'gamertag'),
        new migration.Remove('name'),
        new migration.Add('score', number),
      ]);

      expect(v2.lastComposite).toEqual(expect.any(Composite));
      expect(v1.nextComposite).toEqual(expect.any(Composite));
      expect(v2.lastComposite.nextComposite).toBe(v2);
      expect(v2.lastComposite.lastComposite.lastComposite.lastComposite).toBe(
        v1,
      );

      expect(v2.lastComposite.definition).toEqual({ gamertag: string });
      expect(v2.lastComposite.lastComposite.definition).toEqual({
        gamertag: string,
        name: string,
      });

      expect(v1.nextComposite.nextComposite.nextComposite.definition).toEqual({
        gamertag: string,
      });
    });

    it('tracks the version', () => {
      const v1 = new Composite('User', { context });
      const v2 = v1.migrate([new migration.Add('firstName', string)]);
      const v3 = v2.migrate([new migration.Add('lastName', string)]);
      const v4 = v3.migrate([
        new migration.Add('invited', string),
        new migration.Add('status', string),
      ]);

      expect(v1.nextVersion).toBe(v2);
      expect(v2.nextVersion).toBe(v3);
      expect(v3.nextVersion).toBe(v4);
      expect(v4.nextVersion).toBe(null);

      expect(v4.lastVersion).toBe(v3);
      expect(v3.lastVersion).toBe(v2);
      expect(v2.lastVersion).toBe(v1);
      expect(v1.lastVersion).toBe(null);

      expect(v3.nextComposite).toBe(v4.lastComposite);
      expect(v4.lastComposite.lastVersion).toBe(v3);

      expect(v1.nextComposite.nextComposite.nextComposite.nextComposite).toBe(
        v4,
      );
      expect(v4.lastComposite.lastComposite.lastComposite.lastComposite).toBe(
        v1,
      );
    });

    it('keeps a reference to each migration', () => {
      const user = new Composite('User', { context });
      expect(user.migration).toBe(null);

      user.migrate([
        new migration.Add('firstName', string),
        new migration.Remove('firstName'),
      ]);

      expect(user.migration).toEqual(expect.any(migration.Add));
      expect(user.nextComposite.migration).toEqual(
        expect.any(migration.Remove),
      );
    });

    it('throws if you migrate the same composite twice', () => {
      const v1 = new Composite('User', { context });
      const migrate = () => v1.migrate([new migration.Add('fullName', string)]);

      expect(migrate).not.toThrow();
      expect(migrate).toThrow(/(migrate|migration)/i);
    });

    it('increments the version', () => {
      const v1 = new Composite('User', { context });
      const v2 = v1.migrate([new migration.Add('fullName', string)]);
      const v3 = v2.migrate([
        new migration.Add('accountStatus', string),
        new migration.Add('someNumberField', number),
      ]);

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
      expect(v3.version).toBe(3);
    });

    it('keeps a reference to the original composite', () => {
      const v1 = new Composite('User', { context });
      const v2 = v1.migrate([new migration.Add('fullName', string)]);
      const v3 = v2.migrate([new migration.Add('status', string)]);
      const v4 = v3.migrate([
        new migration.Add('lat', number),
        new migration.Add('long', number),
      ]);

      expect(v1.firstComposite).toBe(v1);
      expect(v2.firstComposite).toBe(v1);
      expect(v3.firstComposite).toBe(v1);
      expect(v4.firstComposite).toBe(v1);
      expect(v4.lastComposite.firstComposite).toBe(v1);
    });

    it('uses the migration preprocessor', () => {
      const migrationInterceptor = jest.fn(() => [
        new migration.Add('intercepted', string),
      ]);
      const v1 = new Composite('User', { migrationInterceptor, context });
      const operations = [new migration.Add('shouldBeIntercepted', string)];
      const v2 = v1.migrate(operations);

      expect(migrationInterceptor).toHaveBeenCalledWith(operations);
      expect(v2.definition).toEqual({ intercepted: string });
    });

    it('passes the migration preprocessor through versions', () => {
      const migrationInterceptor = ([operation]) => {
        if (operation instanceof migration.Add) {
          return [
            new migration.Add(`prefixed-${operation.field}`, operation.type),
          ];
        }

        return [];
      };

      const v1 = new Composite('User', { context, migrationInterceptor });
      const v2 = v1.migrate([new migration.Add('address', string)]);
      const v3 = v2.migrate([new migration.Add('name', string)]);

      expect(v3.definition).toEqual({
        'prefixed-address': string,
        'prefixed-name': string,
      });
    });
  });

  describe('toString()', () => {
    it('returns the type ID', () => {
      const Product = new Composite('Product', { context });
      const id = String(Product);

      expect(id).toBe('Product@1');
    });
  });

  describe('static toMigrationIterable()', () => {
    it('returns an iterable', () => {
      const User = new Composite('User', { context });
      const result = Composite.toMigrationIterable(User);

      expect(result[Symbol.iterator]).toEqual(expect.any(Function));
    });

    it('yields every migrated composite', () => {
      const v1 = new Composite('User', { context });
      const v2 = v1.migrate([new migration.Add('firstName', string)]);
      const v3 = v2.migrate([new migration.Add('lastName', string)]);
      const v4 = v3.migrate([new migration.Add('invited', string)]);
      const result = [...Composite.toMigrationIterable(v1)];

      expect(result).toEqual([v1, v2, v3, v4]);
    });

    it('shows migrations between versions', () => {
      const v1 = new Composite('User', { context });
      const v2 = v1.migrate([
        new migration.Add('firstName', string),
        new migration.Add('lastName', string),
      ]);
      const v3 = v2.migrate([new migration.Add('status', string)]);
      const result = [...Composite.toMigrationIterable(v1)];

      expect(result).toEqual([v1, v2.lastComposite, v2, v3]);
    });

    // Previous tests always pass v1. What happens if we pass v3?
    it('includes past migrations', () => {
      const v1 = new Composite('User', { context });
      const v2 = v1.migrate([new migration.Add('firstName', string)]);
      const v3 = v2.migrate([new migration.Add('lastName', string)]);
      const v4 = v3.migrate([new migration.Add('invited', string)]);
      const result = [...Composite.toMigrationIterable(v3)];

      expect(result).toEqual([v1, v2, v3, v4]);
    });
  });
});
