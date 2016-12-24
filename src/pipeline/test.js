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

describe('The before.read.node pipeline', () => {

  it('should allow hooks to change the key', async () => {
    const read = async () => 'String return';
    const config = hooks({
      before: {
        read: { node: read },
      },
    });

    const [
      key,
    ] = await pipeline.before.read.node(config, [
      'Original key',
      {},
    ]);

    expect(key).toBe('String return');
  });

  it('should allow hooks to change the options', async () => {
    const read = async () => ({ overridden: true });
    const config = hooks({
      before: {
        read: { node: read },
      },
    });

    const [,
      options,
    ] = await pipeline.before.read.node(config, [
      'sup',
      {},
    ]);

    expect(options).toEqual({ overridden: true });
  });

});

describe('The pipeline', () => {

  const methods = [
    ['before', 'read', 'node'],
    ['before', 'read', 'field'],
    ['before', 'write'],
    ['before', 'request'],
    ['before', 'update'],

    ['after', 'read', 'node'],
    ['after', 'read', 'field'],
    ['after', 'write'],
    ['after', 'request'],
    ['after', 'update'],
  ];

  const buildConfig = (path, fn) => {
    const hooksObject = {};

    path.reduce((object, field, index) => {
      const value = index === path.length - 1 ? fn : {};
      object[field] = value;

      return object[field];
    }, hooksObject);

    return hooks(hooksObject);
  };

  const getPipeline = (path) => path.reduce((obj, type) => (
    obj[type]
  ), pipeline);

  methods.forEach((path) => {
    describe(`"${path.join('.')}" method`, async () => {

      it('should allow hooks to override the arguments', async () => {
        const args = ['original string', { options: true }];
        const hook = () => [undefined, { replaced: true }];
        const config = buildConfig(path, hook);

        const result = await getPipeline(path)(config, args);
        expect(result).toEqual([
          'original string',
          { replaced: true },
        ]);

      });

      it('should add default options', async () => {
        const args = ['string', { setting: true }];
        const config = hooks();

        const result = await getPipeline(path)(config, args);

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
