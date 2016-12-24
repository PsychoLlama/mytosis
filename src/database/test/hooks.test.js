/* eslint-env mocha */
import expect, { createSpy, spyOn } from 'expect';
import database from '../../index';
import { Storage } from './mocks';
import { Graph } from 'graph-crdt';

describe('Database hook', () => {
  let db, storage, hook;

  beforeEach(() => {
    storage = new Storage();
    hook = createSpy();
  });

  describe('"before.write"', () => {
    let write;

    beforeEach(() => {
      write = spyOn(storage, 'write').andCallThrough();
      db = database({
        storage: [storage],
        hooks: {
          before: { write: hook },
        },
      });
    });

    afterEach(() => write.restore());

    it('should be called before writes', async () => {
      await db.write('users', {});
      expect(hook).toHaveBeenCalled();
    });

    it('should be able to override the graph', async () => {
      const graph = new Graph();
      hook.andReturn([graph]);

      await db.write('stuff', {});

      const [contents] = write.calls[0].arguments;
      expect(contents).toBe(graph);
    });

  });

  describe('"after.write"', () => {

    beforeEach(() => {
      db = database({
        hooks: {
          after: { write: hook },
        },
      });
    });

    it('should be called after writes', async () => {
      await db.write('users', {});
      expect(hook).toHaveBeenCalled();
    });

    it('should be passed the context', async () => {
      const settings = await db.write('settings', {
        enabled: true,
      });
      const [node] = hook.calls[0].arguments;
      expect(node).toBe(settings);
    });

    it('should be passed the options', async () => {
      await db.write('beans', {}, {
        cool: true,
      });

      const [, options] = hook.calls[0].arguments;
      expect(options).toContain({
        cool: true,
      });
    });

    it('should allow overriding of the return context', async () => {
      hook.andReturn([
        { trickery: true },
      ]);
      const result = await db.write('beans', {});
      expect(result).toEqual({
        trickery: true,
      });
    });

  });

  describe('"before.read"', () => {
    let read, hook;

    beforeEach(() => {
      read = spyOn(storage, 'read');
      hook = createSpy();
      db = database({
        storage: [storage],
        hooks: {
          before: {
            read: { node: hook },
          },
        },
      });
    });

    it('should call the hook before reads', async () => {
      expect(hook).toNotHaveBeenCalled();
      await db.read('users');
      expect(hook).toHaveBeenCalled();
    });

    it('should pass the key and options', async () => {
      const options = { 'engage hyperdrive': true };
      await db.read('key name', options);
      const [key, opts] = hook.calls[0].arguments;
      expect(key).toBe('key name');
      expect(opts).toContain(options);
    });

    it('should allow overriding the key', async () => {
      hook.andCall((key) => `prefix/${key}`);
      await db.read('stuff');
      const [uid] = read.calls[0].arguments;
      expect(uid).toBe('prefix/stuff');
    });

    it('should allow overriding the options', async () => {
      hook.andCall((key, options) => (
        Object.assign({ overridden: true }, options)
      ));

      await db.read('key', { original: true });
      const [, options] = read.calls[0].arguments;
      expect(options).toContain({
        overridden: true,
        original: true,
      });
    });

  });

  describe('"after.read"', () => {
    let hook;

    beforeEach(async () => {
      hook = createSpy();
      db = database({
        hooks: {
          after: {
            read: { node: hook },
          },
        },
      });

      await db.write('data', {
        existing: true,
      });
    });

    it('should be called after reads', async () => {
      await db.read('data');
      expect(hook).toHaveBeenCalled();
    });

    it('should be passed the read value and options', async () => {
      const data = await db.read('data', { cool: 'totally' });
      const [node, options] = hook.calls[0].arguments;

      expect(node).toBe(data);
      expect(options).toContain({ cool: 'totally' });
    });

    it('should allow override of the return node', async () => {
      hook.andReturn(['haha, replaced!']);
      const value = await db.read('data');
      expect(value).toBe('haha, replaced!');
    });

  });

});
