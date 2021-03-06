import expect, { spyOn } from 'expect';
import database from '../root';
import Context from '../context';

describe('A context', () => {
  let node, root;

  beforeEach(() => {
    root = database();

    const context = new Context(root);
    const { uid } = context.meta();

    root.merge({ [uid]: context });
    node = root.value(uid);
  });

  it('should expose the database root', () => {
    expect(node.root).toBe(root);
  });

  it('should accept node constructor settings', () => {
    node = new Context(root, {
      uid: 'potatoes',
    });

    const { uid } = node.meta();
    expect(uid).toBe('potatoes');
  });

  describe('fields()', () => {
    it('returns a promise', () => {
      const result = node.fields([]);

      expect(result).toBeA(Promise);
    });

    it('resolves with an array', async () => {
      const result = await node.fields([]);

      expect(result).toBeAn(Array);
    });

    it('contains all the primitive fields', async () => {
      node.merge({ one: true, two: 'also true' });
      const result = await node.fields(['two', 'one']);

      expect(result).toEqual(['also true', true]);
    });

    it('resolves pointers', async () => {
      await node.write('self', node);
      const fields = await node.fields(['self']);

      expect(fields).toEqual([node]);
    });

    it('keeps nodes and primitives in the correct order', async () => {
      node.merge({ primitive: true, another: 'yep' });
      await node.write('self', node);

      const result = await node.fields(['primitive', 'self', 'another']);

      expect(result).toEqual([true, node, 'yep']);
    });

    it('passes options to `nodes()`', async () => {
      spyOn(root, 'nodes').andCallThrough();

      await node.write('self', node);
      await node.fields(['self'], { storage: null });

      expect(root.nodes).toHaveBeenCalled();
      const options = root.nodes.calls[0].arguments[1];
      expect(options).toExist();
      expect(options.storage).toBe(null);
    });
  });

  describe('read()', () => {
    it('should return undefined if not found', async () => {
      const result = await node.read('nothing here');
      expect(result).toBe(undefined);
    });

    it('should return the value if it exists', async () => {
      await node.write('enabled', true);

      const enabled = await node.read('enabled');

      expect(enabled).toBe(true);
    });

    it('should resolve contexts through the root', async () => {
      const settings = new Context(root, { uid: 'settings' });
      await node.write('settings', settings);

      const read = spyOn(root, 'nodes');
      read.andReturn(Promise.resolve([settings]));

      const result = await node.read('settings');
      expect(result).toBe(settings);
    });
  });

  describe('write()', () => {
    it('should write as an edge when given a context', async () => {
      const settings = new Context(root, { uid: 'settings' });
      await node.write('settings', settings);

      const { value } = node.meta('settings');
      expect(value).toEqual({ edge: 'settings' });
    });

    it('increments node state', async () => {
      await node.write('count', 5);
      expect(node.value('count')).toBe(5);

      await node.write('count', 7);
      expect(node.value('count')).toBe(7);

      await node.write('count', 3);
      expect(node.value('count')).toBe(3);

      expect(node.state('count')).toBe(3);
    });
  });

  describe('new()', () => {
    it('should return a new context', () => {
      const copy = node.new();
      expect(copy).toBeA(Context);
    });

    it('should use the same uid', () => {
      const copy = node.new();
      expect(copy.meta()).toContain({
        uid: String(node),
      });
    });

    it('should attach the same root reference', () => {
      const copy = node.new();
      expect(copy.root).toBe(root);
    });

    it('should include API extensions', () => {
      const root = database({
        extend: {
          context: { hello: 'coder' },
        },
      });

      const ctx = new Context(root);
      const copy = ctx.new();
      expect(copy.hello).toBe('coder');
    });
  });

  describe('API extension', () => {
    const extend = context =>
      database({
        extend: { context },
      });

    it('should contain extensions from the config', () => {
      const root = extend({
        wazzup() {},
      });

      const ctx = new Context(root);
      expect(ctx.wazzup).toBeA(Function);
    });

    it('should be non-enumerable', () => {
      const root = extend({ 'non-enumerable': true });

      const ctx = new Context(root);
      const keys = Object.keys(ctx);
      expect(keys).toNotContain('non-enumerable');
    });

    it('should be immutable', () => {
      const root = extend({ hey: 'there' });

      const ctx = new Context(root);
      expect(() => {
        ctx.hey = 'change!';
      }).toThrow(Error);
    });
  });
});
