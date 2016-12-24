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
 * Adds default options to the last argument value (typically options).
 * @param  {Object} config - The database configuration object.
 * @param  {Array} args - A list of arguments.
 * @return {Array} - Newly arguments, with default options added.
 */
const normalizeArgs = (config, args = []) => {
  const last = args[args.length - 1];

  return args.slice(0, args.length - 1).concat([
    defaults(config, last),
  ]);
};

/**
 * Handles common return values from pipeline hooks.
 * @param  {Function} map - Turns non-array return values into an array.
 * @return {Function} - Formats output from one hook for the next.
 */
export const format = (map) => (

  /**
   * Takes output from one hook and formats it for the next.
   * @param  {Mixed} next - Anything a hook can return.
   * @param  {Array} last - The input to the last hook.
   * @return {Array} - The arguments for the next hook.
   */
  (next, last) => {

    /** If an array isn't returned, turn it into one. */
    if (!(next instanceof Array)) {
      next = map(next) || [];
    }

    /** Uses the last input to patch any missing arguments. */
    return last.map((prev, index) => {
      if (next[index] === undefined) {
        return prev;
      }

      return next[index];
    });
  }

);

/**
 * Ignore a pipeline return value, skipping to the next.
 * @return {Array} - An empty list of arguments.
 */
const skip = () => [];

/**
 * Creates an event pipeline.
 * @param  {String} path - The path to the hooks inside a hooks object.
 * @param  {Function} [types] - Handles special hook return values.
 * @return {Function} - Triggers a pipeline.
 */
const createPipeline = (path, types = skip) => (

  /**
   * Triggers a pipeline.
   * @param  {Object} config - Database configuration object.
   * @param  {Array} args - The initial parameters.
   * @return {Promise} - Resolves to the pipeline output.
   */
  (config, args) => trigger({
    hooks: path.reduce((hooks, type) => (
      hooks[type]
    ), config.hooks),
    args: normalizeArgs(config, args),
    transform: format(types),
  })

);

export const before = {

  read: {
    node: createPipeline(['before', 'read', 'node'], (value) => {

      // Override the key.
      if (typeof value === 'string') {
        return [value];
      }

      // Override the options.
      if (value instanceof Object) {
        return [undefined, value];
      }

      return null;

    }),
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
