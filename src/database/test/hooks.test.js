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
        hooks: {
          before: { write: hook },
        },
        storage: [storage],
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

});
