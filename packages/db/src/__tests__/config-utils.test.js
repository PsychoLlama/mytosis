import { create as createConfig } from '../config-utils';
import { MockStorage } from '../mocks/storage';
import * as type from '../types';
import Schema from '../schema';

describe('Config creator', () => {
  it('returns an object given nothing', () => {
    const result = createConfig();

    expect(result).toEqual(expect.any(Object));
  });

  it('provides default options', () => {
    const config = createConfig();

    expect(config).toEqual({
      schema: new Schema({}),
      storage: null,
      hooks: [],
      network: {
        connections: [],
        router: null,
      },
    });
  });

  it('uses the storage engine if provided', () => {
    const storage = new MockStorage();
    const config = createConfig({ storage });

    expect(config.storage).toBe(storage);
  });

  it('adds all given hooks', () => {
    const hook1 = read => read;
    const hook2 = read => read;
    const hooks = [hook1, hook2];

    const config = createConfig({ hooks });

    expect(config.hooks).toEqual(hooks);
  });

  it('uses the given network settings', () => {
    const network = {
      connections: [],
      router: {
        push: () => Promise.resolve(),
        pull: () => Promise.resolve(),
      },
    };

    const config = createConfig({ network });

    expect(config.network).toEqual(network);
  });

  it('creates a schema', () => {
    const Lobby = type.atom('Lobby');
    const config = createConfig({
      schema: { lobby: Lobby },
    });

    const id = String(Lobby);
    expect(config.schema).toEqual(expect.any(Schema));
    expect(config.schema.findType(id)).toBe(Lobby);
  });
});
