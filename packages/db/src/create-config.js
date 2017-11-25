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

type Options = {|
  +network?: NetworkConfiguration,
  +storage?: StoragePlugin,
  +hooks?: Hook[],
|};

type Config = {|
  +storage: ?StoragePlugin,
  +hooks: Hook[],
  +network: {
    +connections: Object[],
    +router: ?Object,
  },
|};

export default (config?: Options): Config => {
  const { hooks = [], network = {}, storage = null } = config || {};
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
