import trigger from '../trigger-hooks';

export const before = {

  /**
   * Triggers the before.read hook pipeline.
   * @param  {Object} config - A database configuration object.
   * @param  {Arguments|Array} args - A list of arguments given to `.read`.
   * @return {Promise} - Resolves to the processed arguments.
   */
  read (config, [key, options = {}]) {
    const hooks = config.hooks.before.read;

    /** Set the default read options. */
    options.clients = options.clients || config.network.clients;
    options.storage = options.storage || config.storage;

    /** Iterate over the before.read hooks. */
    return trigger({
      args: [key, options],
      hooks,

      transform (values, [key, options]) {

        // It's a [key, options] pair.
        if (values instanceof Array) {
          return values;
        }

        // Overwriting the read options.
        if (values instanceof Object) {
          return [key, values];
        }

        // Overwriting the key.
        if (typeof values === 'string') {
          values = [values, options];
        }

        // When in doubt...
        return values;
      },
    });

  },
};
