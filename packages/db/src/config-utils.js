// @flow
type StoragePlugin = {
  write(Object): Promise<Object>,
  read(Object): Promise<Object>,
};

type Hook = Object => Object;

type NetworkConfiguration = {
  connections: Object[],
  router: Object,
};

export type Options = {|
  +network?: NetworkConfiguration,
  +storage?: StoragePlugin,
  +hooks?: Hook[],
|};

export type Config = {
  +storage: ?StoragePlugin,
  +hooks: Hook[],
  +network: {
    +connections: Object[],
    +router: ?Object,
  },
};

/**
 * Provides default settings for database configs.
 * @param  {Options} options - User-provided database configuration.
 * @return {Config} - Properly formatted db config.
 */
export const create = (options?: Options): Config => {
  const { hooks = [], network = {}, storage = null } = options || {};
  const { connections = [], router = null } = network;

  return {
    hooks,
    storage,
    network: {
      connections,
      router,
    },
  };
};
