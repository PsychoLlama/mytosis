// @flow
import type Stream from '@mytosis/streams';

import type { ReadDescriptor } from './database-context';
import Schema from './schema';

type StoragePlugin = {
  write(Object): Promise<Object>,
  read(ReadDescriptor): Stream<?Object>,
};

type Hook = Object => Object;

type NetworkConfiguration = {
  connections: Object[],
  router: Object,
};

export type Options = {|
  +network?: NetworkConfiguration,
  +storage?: StoragePlugin,
  +schema?: Object,
  +hooks?: Hook[],
|};

export type Config = {
  +storage: ?StoragePlugin,
  +schema: Schema,
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
  const { hooks = [], network = {}, storage = null, schema = {} } =
    options || {};

  const { connections = [], router = null } = network;

  return {
    schema: new Schema(schema),
    storage,
    hooks,
    network: {
      connections,
      router,
    },
  };
};
