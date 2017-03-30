import trigger from '../trigger-hooks';

/**
 * Sets default options for methods like `.read` & `.write`.
 * @param  {Object} config - The database configuration object.
 * @param  {Object} [options] - Options passed to read/write.
 * @return {Object} - An options object with defaults set via the config.
 */
export const defaults = (config, options = {}) => ({
  ...options,
  storage: options.storage || config.storage,
  clients: options.clients || config.network.clients,
});

/**
 * Adds default options for pipeline objects.
 * @param  {Object} config - The database configuration object.
 * @param  {Object} options - An action being passed through the pipeline.
 * @return {Object} - A new value with default options added (does not mutate).
 */
const addDefaultProps = (config, options) => ({

  // Provide default destinations.
  storage: config.storage,
  network: config.network,

  ...options,
});

/**
 * Returns whatever it's passed.
 * @param  {Mixed} value - Any value.
 * @return {Mixed} - That same value.
 */
const identity = (value) => value;

/**
 * Creates an event pipeline.
 * @param  {String} path - The path to the hooks inside a hooks object.
 * @param  {Function} [transform] - Handles special return values from hooks.
 * @return {Function} - Triggers a pipeline.
 */
const createPipeline = (path, transform = identity) => (

  /**
   * Triggers a pipeline.
   * @param  {Object} config - Database configuration object.
   * @param  {Array} options - The initial parameters.
   * @return {Promise} - Resolves to the pipeline output.
   */
  (config, options) => trigger({
    hooks: path.reduce((hooks, type) => hooks[type], config.hooks),
    initial: addDefaultProps(config, options),
    transform: transform,
  })
);

export const before = {
  read: {
    node: createPipeline(['before', 'read', 'node']),
    field: createPipeline(['before', 'read', 'field']),
  },

  write: createPipeline(['before', 'write']),
  request: createPipeline(['before', 'request']),
  update: createPipeline(['before', 'update']),
};

export const after = {
  read: {
    node: createPipeline(['after', 'read', 'node']),
    field: createPipeline(['after', 'read', 'field']),
  },

  write: createPipeline(['after', 'write']),
  request: createPipeline(['after', 'request']),
  update: createPipeline(['after', 'update']),
};
