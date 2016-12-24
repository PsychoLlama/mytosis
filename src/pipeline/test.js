/* eslint-env mocha */
import mergeConfigs from '../merge-configs';
import * as pipeline from './index';
import expect, { createSpy } from 'expect';

const hooks = (hooks) => mergeConfigs([{ hooks }]);

describe('The pipeline\'s default option setter', () => {

  const storage = { storage: true };
  const client = { client: true };
  const config = mergeConfigs([{
    storage: [storage],
    network: {
      clients: [client],
    },
  }]);

  it('should add storage and network fields', () => {
    const options = pipeline.defaults(config, {});

    expect(options).toContain({
      storage: [storage],
      clients: [client],
    });
  });

  it('should use given storage options instead of the default', () => {
    const options = pipeline.defaults(config, {
      storage: [{ custom: true }],
    });

    expect(options).toContain({
      storage: [{ custom: true }],
      clients: [client],
    });
  });

  it('should use given network options instead of the default', () => {
    const options = pipeline.defaults(config, {
      clients: [{ custom: true }],
    });

    expect(options).toContain({
      clients: [{ custom: true }],
      storage: [storage],
    });
  });

});

describe('The pipeline\'s output formatter', () => {
  const spy = createSpy();
  const transform = pipeline.format(spy);

  beforeEach(::spy.reset);

  it('should return new arguments when given', () => {
    const result = transform(['new arg list'], ['original list']);
    expect(result).toEqual(['new arg list']);
  });

  it('should patch missing args with the previous args', () => {
    const result = transform(
      [undefined, 'second new item'],
      ['first old item', 'second old item']
    );
    expect(result).toEqual(['first old item', 'second new item']);
  });

  it('should call the handler when unknown args are given', () => {
    spy.andReturn(['successful']);
    const result = transform(
      new Set(),
      ['old args']
    );

    expect(result).toEqual(['successful']);
  });

  it('should assume no overriding if null is given', () => {
    spy.andReturn(null);
    const result = transform(new Map(), ['original']);
    expect(result).toEqual(['original']);
  });

});

describe('The before.read pipeline', () => {

  it('should allow hooks to change the args', async () => {
    const overridden = 'Haha changed your key';
    const read = async () => [overridden];
    const config = hooks({
      before: { read },
    });

    const [key] = await pipeline.before.read(config, [
      'original boring key',
    ]);

    expect(key).toBe(overridden);
  });

  describe('hook that returns a string', () => {

    it('should overwrite the key', async () => {
      const read = async () => 'String return';
      const config = hooks({
        before: { read },
      });

      const [key] = await pipeline.before.read(config, ['Original key']);

      expect(key).toBe('String return');
    });

  });

  describe('hook that returns an object', () => {

    it('should overwrite the options', async () => {
      const read = async () => ({ overridden: true });
      const config = hooks({
        before: { read },
      });

      const [, options] = await pipeline.before.read(config, ['sup', {}]);

      expect(options).toEqual({ overridden: true });
    });

  });

});

describe('The pipeline', () => {

  const methods = [
    ['before', 'read'],
    ['before', 'write'],
    ['before', 'request'],
    ['before', 'update'],

    ['after', 'read'],
    ['after', 'write'],
    ['after', 'request'],
    ['after', 'update'],
  ];

  methods.forEach(([tense, method]) => {
    describe(`"${tense}.${method}" method`, async () => {

      it('should allow hooks to override the arguments', async () => {
        const args = ['original string', { options: true }];
        const config = hooks({
          [tense]: {
            [method]: () => [undefined, { replaced: true }],
          },
        });

        const result = await pipeline[tense][method](config, args);
        expect(result).toEqual([
          'original string',
          { replaced: true },
        ]);

      });

      it('should add default options', async () => {
        const args = ['string', { setting: true }];
        const config = hooks();

        const result = await pipeline[tense][method](config, args);

        expect(result).toEqual([
          'string',
          {
            setting: true,
            storage: [],
            clients: [],
          },
        ]);
      });

    });
  });

});
