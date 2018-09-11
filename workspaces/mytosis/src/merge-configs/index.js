import ConnectionGroup from '../connection-group/index';

const hooks = {
  read: {
    nodes: [],
    fields: [],
  },
  write: [],
  update: [],
  request: [],
};

/**
 * An empty plugin object. Every plugin group
 * will boil down to one of these.
 * @type {Object}
 */
export const base = {
  /**
   * Lifecycle hooks.
   * @type {Object}
   */
  hooks: {
    before: hooks,
    after: hooks,
    catch: hooks,
  },

  /**
   * The given storage plugin.
   * @type {Array|null}
   */
  storage: null,

  /**
   * API extensions.
   * @type {Object}
   */
  extend: {
    root: {},
    context: {},
  },

  /**
   * Query engines.
   * @type {Object}
   */
  engines: {},
};

const merge = {
  /**
   * Merges read hooks together.
   * @param  {Object} hooks - Read hooks.
   * @param  {Function[]} hooks.nodes - Node-related read events.
   * @param  {Function[]} hooks.fields - Field-related read events.
   * @param  {Object} target - Read-related hooks to add.
   * @return {Object} - The merged read hooks.
   */
  read: ({ fields, nodes }, target = {}) => ({
    fields: fields.concat(target.fields || []),
    nodes: nodes.concat(target.nodes || []),
  }),

  /**
   * Merges a hook object with another.
   * @param  {Object} hook - A collection of hooks to extend.
   * @param  {Object} hook.read - Read hooks.
   * @param  {Array} hook.write - The base hook to extend.
   * @param  {Array} hook.update - The base hook to extend.
   * @param  {Array} hook.request - The base hook to extend.
   * @param  {Object} target={} - The hooks to add.
   * @return {Object} - The merged hook object.
   */
  hook: ({ read, write, update, request }, target = {}) => ({
    read: merge.read(read, target.read),
    write: write.concat(target.write || []),
    update: update.concat(target.update || []),
    request: request.concat(target.request || []),
  }),

  /**
   * Merges hook objects together.
   * @param  {Object} hooks - Database lifecycle hooks.
   * @param  {Object} hooks.before - Hooks to run before an event.
   * @param  {Object} hooks.after - Hooks to run after an event.
   * @param  {Object} hooks.catch - Hooks to run after an error.
   * @param  {Object} ext={} - Hooks to merge with the base.
   * @return {Object} - The merged hooks object.
   */
  hooks: (hooks, ext = {}) => ({
    before: merge.hook(hooks.before, ext.before),
    after: merge.hook(hooks.after, ext.after),
    catch: merge.hook(hooks.catch, ext.catch),
  }),

  /**
   * Adds a router to the config.
   * @throws {Error} If more than one router was given.
   * @param  {undefined} existing - Should never exist.
   * @param  {Function} router - A router factory.
   * @return {Function} - The router factory.
   */
  router: (existing, router) => {
    if (existing && router) {
      const msg =
        'Cannot combine routers. ' +
        'Ensure `config.router` is only specified once.';

      throw new Error(msg);
    }

    return router;
  },

  /**
   * Merges two method objects.
   * @param  {Object} base - The base object to extend.
   * @param  {Object} ext={} - An object with method extensions.
   * @param  {Object} ext.root - Methods to add to a root context.
   * @param  {Object} ext.context - Methods for node contexts.
   * @return {Object} - The combined extensions object.
   */
  extensions: ({ root, context }, ext = {}) => ({
    root: Object.assign({}, root, ext.root),
    context: Object.assign({}, context, ext.context),
  }),

  /**
   * Merges two network configurations together.
   * @param  {ConnectionGroup} [base] - A connection or connection group.
   * @param  {ConnectionGroup|Object} extension - A connection or group to add.
   * @return {ConnectionGroup|Object} - The merged network object.
   */
  network: (base, extension) => {
    // Support connections not inside a group.
    if (base) {
      base = ConnectionGroup.ensure(base);
    }

    if (extension) {
      extension = ConnectionGroup.ensure(extension);
    }

    // Merge two connection groups together.
    if (base && extension) {
      return base.union(extension);
    }

    return extension;
  },

  /**
   * Sets the storage context.
   * @param  {Object} [current] - Current storage plugin.
   * @param  {Object} [plugin] - A storage plugin.
   * @throws {Error} - If two storage plugins are defined.
   * @return {Object} - The storage plugin.
   */
  storage: (current, plugin) => {
    if (current && plugin) {
      throw new Error('Only one storage plugin allowed per database.');
    }

    return plugin || current;
  },

  /**
   * Merges two engine objects together.
   * @param  {Object} base - Collection of query engines.
   * @param  {Object} ext={} - Collection of query engines.
   * @return {Object} - The merged collection.
   */
  engines: (base, ext = {}) => Object.assign({}, base, ext),

  /**
   * Merges two plugin objects together.
   * @param  {Object} base - The base plugin object to extend.
   * @param  {Object} base.hooks - Database lifecycle hooks.
   * @param  {Array} base.storage - A list of storage drivers.
   * @param  {Object} base.network - A list of network drivers.
   * @param  {Object} base.extend - Method extensions.
   * @param  {Object} ext - An object to merge with the base.
   * @return {Object} - The complete, merged plugin object.
   */
  plugins: (base, ext) => ({
    hooks: merge.hooks(base.hooks, ext.hooks),
    router: merge.router(base.router, ext.router),
    extend: merge.extensions(base.extend, ext.extend),
    storage: merge.storage(base.storage, ext.storage),
    network: merge.network(base.network, ext.network),
    engines: merge.engines(base.engines, ext.engines),
  }),
};

/**
 * Merges plugin objects into a single object.
 * @param  {Object[]} plugins - A list of plugin objects.
 * @return {Object} - The merged plugin object.
 */
export default plugins => {
  const config = plugins.reduce(merge.plugins, base);

  return {
    ...config,

    // Default the router to "null".
    router: config.router || null,

    // Add a default (empty) network group.
    network: config.network || new ConnectionGroup(),
  };
};
