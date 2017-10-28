// @flow
import Derivation from '../Derivation';
import Composite from '../Composite';
import Primitive from '../Primitive';
import {
  DefaultTypeChange,
  TypeChange,
  Remove,
  Move,
  Add,
} from '../migrations';

const CRDT = { import: data => data };
const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
});

const number = new Primitive('number', {
  isValid: value => typeof value === 'number',
  coerce: Number,
});

const boolean = new Primitive('boolean', {
  isValid: value => typeof value === 'boolean',
  coerce: Boolean,
});

const time = new Derivation('time', string, {
  dehydrate: date => date.toUTCString(),
  isValid: date => date instanceof Date,
  hydrate: utc => new Date(utc),
});

describe('Migration', () => {
  const createType = () =>
    new Composite('Player', {
      CRDT,
      initialFieldSet: {
        firstName: string,
        gamertag: string,
        lastName: string,
        score: number,
      },
    });

  describe('Add', () => {
    it('updates the field set', () => {
      const type = createType();
      const migration = new Add('joined', string);
      const result = migration.migrateType(type);

      expect(result).toEqual({
        defaultType: type.defaultType,
        definition: {
          ...type.definition,
          joined: string,
        },
      });
    });

    it('updates the data set', () => {
      const migration = new Add('joined', string);
      const result = migration.migrateData({
        gamertag: 'z33k',
      });

      expect(result).toEqual({ gamertag: 'z33k', joined: undefined });
    });

    it('throws if the field exists', () => {
      const migration = new Add('gamertag', string);
      const type = createType();
      const fail = () => migration.migrateType(type);

      expect(fail).toThrow(/exists?/i);
    });
  });

  describe('Remove', () => {
    it('drops the field from the type', () => {
      const migration = new Remove('gamertag');
      const type = createType();
      const result = migration.migrateType(type);

      const expected = { ...type.definition };
      delete expected.gamertag;

      expect(result.definition).toEqual(expected);
      expect(result.defaultType).toBe(type.defaultType);
    });

    it('drops the field from data', () => {
      const migration = new Remove('lastName');
      const result = migration.migrateData({
        firstName: 'Bob',
        lastName: 'Bobinson',
      });

      expect(result).toEqual({ firstName: 'Bob' });
    });

    it('throws if the field does not exist', () => {
      const migration = new Remove('wat');
      const type = createType();
      const fail = () => migration.migrateType(type);

      expect(fail).toThrow(/exists?/i);
    });
  });

  describe('TypeChange', () => {
    it('throws if the field does not exist', () => {
      const migration = new TypeChange('bacon', string);
      const type = createType();
      const fail = () => migration.migrateType(type);

      expect(fail).toThrow(/exists?/i);
    });

    it('updates the type', () => {
      const migration = new TypeChange('score', string);
      const type = createType();
      const result = migration.migrateType(type);

      expect(result).toEqual({
        defaultType: type.defaultType,
        definition: {
          ...type.definition,
          score: string,
        },
      });
    });

    // Requires primitive coercion interface.
    it('coerces primitive data types', () => {
      const migration = new TypeChange('score', string);
      const result = migration.migrateData({
        lastName: 'Stevenson',
        score: 30,
      });

      expect(result).toEqual({
        lastName: 'Stevenson',
        score: '30',
      });
    });

    it('does not attempt a migration if the field is absent', () => {
      const migration = new TypeChange('score', string);
      const input = { lastName: 'Stevenson' };
      const result = migration.migrateData(input);

      expect(result).toEqual(input);
    });

    it('can migrate primitives to derived types', () => {
      const migration = new TypeChange('score', time);
      const input = { lastName: 'Johnson', score: 500 };
      const result = migration.migrateData(input);

      expect(result).toEqual({ ...input, score: '500' });
    });

    // Requires an implementation of Pointer.
    it('migrates composite types');
  });

  describe('Move', () => {
    it('throws if the source field is undefined', () => {
      const migration = new Move('noSuchField', 'lastName');
      const type = createType();
      const fail = () => migration.migrateType(type);

      expect(fail).toThrow(/noSuchField/);
    });

    it('throws if the target field is undefined', () => {
      const migration = new Move('firstName', 'poptarts');
      const type = createType();
      const fail = () => migration.migrateType(type);

      expect(fail).toThrow(/poptarts/);
    });

    it('throws if the two fields are incompatible', () => {
      const migration = new Move('firstName', 'score');
      const type = createType();
      const fail = () => migration.migrateType(type);

      expect(fail).toThrow(/number/i);
    });

    it('returns the same type data', () => {
      const migration = new Move('firstName', 'gamertag');
      const type = createType();
      const result = migration.migrateType(type);

      expect(result).toEqual({
        defaultType: type.defaultType,
        definition: type.definition,
      });
    });

    it('migrates data', () => {
      const migration = new Move('firstName', 'lastName');
      const result = migration.migrateData({
        firstName: 'Smith',
        score: 30,
      });

      expect(result).toEqual({ lastName: 'Smith', score: 30 });
    });

    it('overwrites the target', () => {
      const migration = new Move('firstName', 'gamertag');
      const result = migration.migrateData({
        firstName: 'Steve',
        gamertag: 'st3v3',
      });

      expect(result).toEqual({ gamertag: 'Steve' });
    });

    it('skips the migration if the field is absent', () => {
      const migration = new Move('firstName', 'lastName');
      const result = migration.migrateData({
        lastName: 'Jobs',
      });

      expect(result).toEqual({ lastName: 'Jobs' });
    });
  });

  describe('DefaultTypeChange', () => {
    it('creates the correct type', () => {
      const migration = new DefaultTypeChange(number);
      const type = createType();
      const result = migration.migrateType(type);

      expect(result.definition).toEqual(type.definition);
      expect(result.defaultType).toBe(number);
    });

    it('migrates all data', () => {
      const type = new Composite('Counter', { CRDT, defaultType: number });
      const migration = new DefaultTypeChange(string);
      const result = migration.migrateData(type, {
        abc: 2,
        def: 4,
        ghi: 6,
      });

      expect(result).toEqual({
        abc: '2',
        def: '4',
        ghi: '6',
      });
    });

    it('works with derivations', () => {
      const type = new Composite('Counter', { CRDT, defaultType: number });
      const migration = new DefaultTypeChange(time);
      const result = migration.migrateData(type, {
        id: 5,
      });

      expect(result).toEqual({ id: '5' });
    });

    it('leaves field definitions alone', () => {
      const migration = new DefaultTypeChange(string);
      const type = new Composite('Counter', {
        initialFieldSet: { tombstone: boolean },
        defaultType: number,
        CRDT,
      });

      const result = migration.migrateData(type, {
        tombstone: true,
        abc: 40,
        def: 16,
      });

      expect(result).toEqual({
        tombstone: true,
        abc: '40',
        def: '16',
      });
    });

    it('removes mapped values when the default type is removed', () => {
      const migration = new DefaultTypeChange(null);
      const type = new Composite('Counter', {
        initialFieldSet: { tombstone: boolean },
        defaultType: number,
        CRDT,
      });

      const result = migration.migrateData(type, {
        tombstone: true,
        abc: 40,
        def: 16,
      });

      expect(result).toEqual({ tombstone: true });
    });
  });
});
