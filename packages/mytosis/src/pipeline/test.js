/* eslint-env mocha */
import expect from 'expect';

import ConnectionGroup from '../connection-group/index';
import mergeConfigs from '../merge-configs';
import { Connection } from '../mocks';
import * as pipeline from './index';

const hooks = (hooks) => mergeConfigs([{ hooks }]);

describe('The pipeline\'s default option setter', () => {
  const storage = { storage: true };
  let config, group, conn;

  beforeEach(() => {
    group = new ConnectionGroup();
    conn = new Connection();

    group.add(conn);

    config = mergeConfigs([{
      storage: [storage],
      network: group,
    }]);
  });

  it('adds storage and network fields', () => {
    const options = pipeline.defaults(config, {});

    expect(options).toContain({
      storage: [storage],
      network: group,
    });
  });

  it('uses given storage options instead of the default', () => {
    const options = pipeline.defaults(config, {
      storage: [{ custom: true }],
    });

    expect(options).toContain({
      storage: [{ custom: true }],
      network: group,
    });
  });

  it('uses given network options instead of the default', () => {
    const group = new ConnectionGroup();

    const options = pipeline.defaults(config, {
      network: group,
    });

    expect(options).toContain({
      storage: [storage],
      network: group,
    });
  });
});

describe('The before.read.node pipeline', () => {
  it('allows hooks to replace read options', async () => {
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
      it('allows hooks to override the arguments', async () => {
        const options = { original: 'yep' };
        const hook = (initial) => ({ ...initial, added: true });
        const config = buildConfig(path, hook);

        const result = await getPipeline(path)(config, options);
        expect(result).toContain({ ...options, added: true });
      });

      it('adds default settings', async () => {
        const options = { setting: true };
        const config = hooks();

        const result = await getPipeline(path)(config, options);

        expect(result).toEqual({
          network: new ConnectionGroup(),
          setting: true,
          storage: [],
        });
      });

      it('does not force defaults if otherwise specified', async () => {
        const options = {
          setting: true,
          storage: [{ storage: true }],
          network: [{ network: true }],
        };

        const config = hooks();
        const result = await getPipeline(path)(config, options);

        expect(result).toEqual(options);
      });

      it('uses an empty storage list if null is given', async () => {
        const options = { storage: null };
        const config = mergeConfigs([{
          storage: { name: 'storage driver' },
        }]);

        const result = await getPipeline(path)(config, options);

        expect(result.storage).toEqual([]);
      });

      it('uses an empty network group if null is given', async () => {
        const group = new ConnectionGroup();
        const conn = new Connection({ id: 'connection 1' });
        group.add(conn);

        const config = mergeConfigs([{
          network: group,
        }]);

        const result = await getPipeline(path)(config, { network: null });

        expect(result.network).toBeA(ConnectionGroup);
        expect([...result.network]).toEqual([]);
      });
    });
  });
});
