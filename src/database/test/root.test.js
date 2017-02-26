/* eslint-env mocha */
import { Graph } from 'graph-crdt';
import Context from '../context';
import database from '../root';
import expect from 'expect';

describe('A database', () => {
  let db;

  const settings = database.configuration;

  beforeEach(() => {
    db = database();
  });

  it('should be an object', () => {
    expect(db).toBeAn(Object);
  });

  it('should generate a database configuration', () => {
    const config = db[settings];
    expect(config).toBeAn(Object);
  });

  it('should create a new graph', () => {
    expect(db).toBeA(Graph);
  });

  describe('read', () => {

    it('should return null if nothing is found', async () => {
      const settings = await db.read('settings');
      expect(settings).toBe(null);
    });

  });

  describe('write', () => {

    it('should save to the graph', async () => {
      await db.write('user', { name: 'Jesse' });

      const node = db.value('user');

      expect(node).toBeA(Context);

      const name = await node.read('name');
      expect(name).toBe('Jesse');
    });

    it('should merge updates, not overwrite', async () => {
      await db.write('user', { name: 'Bob' });
      await db.write('user', { handle: 'BobTheGreat' });

      const user = db.value('user');

      expect(await user.read('name')).toBe('Bob');
      expect(await user.read('handle')).toBe('BobTheGreat');
    });

    it('should return the written context', async () => {
      const user = await db.write('user', {
        name: 'Bob',
      });

      expect(user).toBeA(Context);
      expect(user).toBe(db.value('user'));

      const name = await user.read('name');
      expect(name).toBe('Bob');
    });

  });

  describe('extended API', () => {
    const extend = (api) => database({
      extend: { root: api },
    });

    it('should be added', () => {
      const db = extend({
        method: () => true,
        prop: 'yep',
      });

      expect(db.method).toBeA(Function);
      expect(db.prop).toBe('yep');
    });

    it('should be non-enumerable', () => {
      const db = extend({ prop: 'value' });
      const keys = Object.keys(db);
      expect(keys).toNotContain('prop');
    });

    it('should be immutable', () => {
      const db = extend({ stuff: 'original' });
      expect(() => {
        db.stuff = 'something else';
      }).toThrow(Error);
    });

  });

});
