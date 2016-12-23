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

    db = database({
      hooks: {
        before: { write: hook },
      },
      storage: [storage],
    });
  });

  describe('"before.write"', () => {
    let write;

    beforeEach(() => {
      write = spyOn(storage, 'write').andCallThrough();
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

});
