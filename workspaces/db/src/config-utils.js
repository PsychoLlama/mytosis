import Schema from './schema';

/**
 * Provides default settings for database configs.
 * @param  {Options} options - User-provided database configuration.
 * @return {Config} - Properly formatted db config.
 */
export const create = options => {
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
