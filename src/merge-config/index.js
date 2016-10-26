const hooks = {
  read: [],
  write: [],
  update: [],
  request: [],
};

/**
 * An empty plugin object. Every plugin group
 * will boil down to one of these.
 * @type {Object}
 */
const base = {
  hooks: {
    before: hooks,
    after: hooks,
    catch: hooks,
  },
  storage: [],
  methods: {
    root: {},
    context: {},
  },
  network: {
    clients: [],
    servers: [],
  },
};

const merge = {

  /**
   * Merges a hook object with another.
   * @param  {Object} hook - The base hook to extend.
   * @param  {Object} hook.read - The base hook to extend.
   * @param  {Object} hook.write - The base hook to extend.
   * @param  {Object} hook.update - The base hook to extend.
   * @param  {Object} hook.request - The base hook to extend.
   * @param  {Object} target={} - The hooks to add.
   * @return {Object} - The merged hook object.
   */
  hook: ({
    read,
    write,
    update,
    request,
  }, target = {}) => ({
    read: read.concat(target.read || []),
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
   * Merges two method objects.
   * @param  {Object} base - The base object to extend.
   * @param  {Object} ext={} - An object with method extensions.
   * @param  {Object} ext.root - Methods to add to a root context.
   * @param  {Object} ext.context - Methods for node contexts.
   * @return {Object} - The combined methods object.
   */
  methods: ({ root, context }, ext = {}) => ({
    root: Object.assign(root, ext.root),
    context: Object.assign(context, ext.context),
  }),

  /**
   * Merges two network configurations together.
   * @param  {Object} base - The base network object to extend.
   * @param  {Array} base.clients - A list of network clients.
   * @param  {Array} base.servers - A list of network servers.
   * @param  {Object} ext={} - Extensions to the base object.
   * @return {Object} - The merged network object.
   */
  network: ({ clients, servers }, ext = {}) => ({
    clients: clients.concat(ext.clients || []),
    servers: servers.concat(ext.servers || []),
  }),

  /**
   * Merges two storage arrays together.
   * @param  {Array} base - A list of storage interfaces.
   * @param  {Array} ext=[] - A list of storage interfaces.
   * @return {Array} - The merged list.
   */
  storage: (base, ext = []) => base.concat(ext),

  /**
   * Merges two plugin objects together.
   * @param  {Object} base - The base plugin object to extend.
   * @param  {Object} base.hooks - Database lifecycle hooks.
   * @param  {Array} base.storage - A list of storage drivers.
   * @param  {Object} base.network - A list of network drivers.
   * @param  {Object} base.methods - Method extensions.
   * @param  {Object} ext - An object to merge with the base.
   * @return {Object} - The complete, merged plugin object.
   */
  plugins: (base, ext) => ({
    hooks: merge.hooks(base.hooks, ext.hooks),
    storage: merge.storage(base.storage, ext.storage),
    methods: merge.methods(base.methods, ext.methods),
    network: merge.network(base.network, ext.network),
  }),
};

/**
 * Merges plugin objects into a single object.
 * @param  {...Object} plugins - A list of plugin objects.
 * @return {Object} - The merged plugin object.
 */
export default (...plugins) => (
  plugins.reduce(merge.plugins, base)
);
