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
      next = map(next);
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

export const before = {

  read: (config, [key, options]) => trigger({
    args: [key, defaults(config, options)],

    hooks: config.hooks.before.read,

    transform: format((value) => {

      // Override the key.
      if (typeof value === 'string') {
        return [value];
      }

      // Override the options.
      if (value instanceof Object) {
        return [undefined, value];
      }

      // No tranformation.
      return [];
    }),
  }),

};
