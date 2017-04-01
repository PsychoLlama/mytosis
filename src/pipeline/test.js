/* eslint-env mocha */
import expect from 'expect';

import ConnectionGroup from '../connection-group/index';
import mergeConfigs from '../merge-configs';
import * as pipeline from './index';

const hooks = (hooks) => mergeConfigs([{ hooks }]);

describe('The pipeline\'s default option setter', () => {
  const storage = { storage: true };
  const client = { client: true };
  let config;

  beforeEach(() => {
    config = mergeConfigs([{
      storage: [storage],
      network: {
        clients: [client],
      },
    }]);
  });

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

describe('The before.read.node pipeline', () => {
  it('should allow hooks to replace the read options', async () => {
    const read = async () => ({ overridden: true });
    const config = hooks({
      before: {
        read: { node: read },
      },
    });

    const options = await pipeline.before.read.node(config, {
      string: 'sup',
    });

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
        const options = { original: 'yep' };
        const hook = (initial) => ({ ...initial, added: true });
        const config = buildConfig(path, hook);

        const result = await getPipeline(path)(config, options);
        expect(result).toContain({ ...options, added: true });
      });

      it('should add default settings', async () => {
        const options = { setting: true };
        const config = hooks();

        const result = await getPipeline(path)(config, options);

        expect(result).toEqual({
          network: new ConnectionGroup(),
          setting: true,
          storage: [],
        });
      });

      it('should not force defaults if otherwise specified', async () => {
        const options = {
          setting: true,
          storage: [{ storage: true }],
          network: [{ network: true }],
        };

        const config = hooks();
        const result = await getPipeline(path)(config, options);

        expect(result).toEqual(options);
      });
    });
  });
});
