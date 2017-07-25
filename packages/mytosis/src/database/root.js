import { Graph, Node } from 'graph-crdt';

import * as pipeline from '../pipeline';
import merge from '../merge-configs';
import Context from './context';

const settings = Symbol('database configuration');

/**
 * Determines whether a connection is offline.
 * @param  {Connection} connection - Valid member of a connection group.
 * @return {Boolean} - Whether the connection is offline.
 */
const isOffline = connection => Boolean(connection.offline);

/**
 * Turns a node into a context.
 * @param  {Database} database - The current graph context.
 * @param  {Object|Node} data - Any data that can be transformed to a node.
 * @return {Context} - A new database context.
 */
const createContextFromNode = database => data => {
  // Ensure the data is a node.
  const node = data instanceof Node ? data : Node.source(data);

  // Create a context from it.
  const { uid } = node.meta();
  const context = new Context(database, { uid });
  context.merge(node);

  return context;
};

/**
 * Caches a node context in the database.
 * @param  {Database} graph - A database.
 * @param  {Node|Context} [node] - The data to cache.
 * @return {void}
 */
const cacheContext = graph => context => {
  if (!context) {
    return;
  }

  const { uid } = context.meta();
  graph.merge({ [uid]: context });
};

/**
 * Plugin manager for graph-crdt.
 * @class Database
 */
class Database extends Graph {
  /**
   * Instantiates a new graph database.
   * @param  {Object} config - A database configuration object.
   */
  constructor(config) {
    super();

    this[settings] = config;

    const createRouter = config.router;

    const router = createRouter ? createRouter(this, config) : null;

    Object.defineProperty(this, 'router', { value: router });

    const extensions = config.extend.root;

    /** Add API extensions from the config. */
    Object.keys(extensions).forEach(key => {
      const value = extensions[key];

      /** Non-enumerable and immutable. */
      Object.defineProperty(this, key, { value });
    });
  }

  /**
   * Creates an in-memory database to aggregate changes before committing.
   * Storage and network plugins are excluded from the branch.
   * @return {Database} - A new, ephemeral database instance.
   */
  branch() {
    const { extend, hooks } = this[settings];

    const config = merge([{ extend, hooks }]);
    const branch = new Database(config);

    branch.merge(this);

    // Set the correct graph root for each context.
    for (const [, context] of branch) {
      context.root = branch;
    }

    return branch;
  }

  /**
   * Applies a collection of changes all at once.
   * @param  {Graph|Database} update - A collection of updates.
   * @param  {Object} [options] - Override global configuration.
   * @return {Promise} - Resolves when the commit has been processed.
   */
  async commit(update, options = {}) {
    // Storage drivers get the full state of each node.
    const graph = new Graph();
    const contexts = this.new();

    for (const [id, node] of update) {
      if (node instanceof Context) {
        contexts.merge({ [id]: node });
      } else {
        const context = new Context(this, { uid: id });
        context.merge(node);
        contexts.merge({ [id]: context });
      }

      // If the node exists in the graph...
      const current = this.value(id);

      if (current) {
        const { uid } = current.meta();

        // Merge it with the update.
        graph.merge({ [uid]: current });
      }
    }

    graph.merge(update);

    const config = await pipeline.before.write(this[settings], {
      offline: this[settings].network.filter(isOffline),
      ...options,
      update,
      graph,
    });

    // Merge in the update.
    const deltas = this.merge(contexts);

    const write = {
      ...config,
      ...deltas,
    };

    // Persist.
    const writes = [];

    if (config.storage) {
      writes.push(config.storage.write(write));
    }

    if (this.router) {
      this.router.push(write);
    }

    // Wait for writes to finish.
    await Promise.all(writes);

    return await pipeline.after.write(this[settings], write);
  }

  /**
   * Merges a node into the graph.
   * @param  {String} uid - The unique ID of the node.
   * @param  {Object} value - The fields to add/update.
   * @param  {Object} [options] - Override default behavior.
   * @return {Context} - Resolves to the context written.
   */
  async write(uid, value, options = {}) {
    // Turn the object into a database context.
    const context = new Context(this, { uid });
    const current = this.value(uid);

    for (const field in value) {
      if (!value.hasOwnProperty(field)) {
        continue;
      }

      // Turn nested nodes into edges.
      if (value[field] instanceof Node) {
        value[field] = { edge: String(value[field]) };
      }

      // Ensure object updates increment state.
      if (current) {
        context.merge({ [field]: current.value(field) });
        context.meta(field).state = current.state(field);
      }
    }

    context.merge(value);

    const update = Graph.source({ [uid]: context });

    await this.commit(update, options);

    return this.value(uid);
  }

  /**
   * Reads a list of nodes.
   * @param  {String[]} keys - Keys to read.
   * @param  {Object} [options] - Read-level settings.
   * @return {Promise<Array<Context|null>>} - All the nodes it found.
   * @example
   * const [timeline, profile] = await db.nodes(['timeline', 'profile'])
   */
  async nodes(keys, options = {}) {
    const config = await pipeline.before.read.nodes(this[settings], {
      ...options,
      offline: this[settings].network.filter(isOffline),
      keys,
    });

    // Load nodes from the cache and resolve with the value.
    const getFinalValue = action => {
      const nodes = config.keys.map(key => this.value(key));

      return pipeline.after.read.nodes(this[settings], {
        ...action,
        contexts: nodes,
      });
    };

    // Find all the keys that aren't cached.
    const absentFromCache = config.keys.filter(key => !this.value(key));
    const reads = [];

    // Terminate early if everything is already cached.
    if (!absentFromCache.length && !config.force) {
      const result = await getFinalValue(config);

      return result.contexts;
    }

    // Only request missing data.
    const readAction = {
      ...config,
      keys: absentFromCache,
    };

    // Storage
    if (config.storage) {
      const read = config.storage.read(readAction);
      reads.push(read);
    }

    // Network
    if (this.router) {
      const read = this.router.pull(readAction);
      reads.push(read);
    }

    const results = await Promise.all(reads);

    const requestedKeys = absentFromCache.reduce((keys, key) => {
      keys[key] = true;
      return keys;
    }, {});

    // Ignore nodes we didn't request.
    const isRelevantContext = context => {
      const { uid } = context.meta();
      return requestedKeys.hasOwnProperty(uid);
    };

    // Process each node.
    results.forEach((nodes = []) =>
      nodes
        .filter(Boolean)
        .map(createContextFromNode(this))
        .filter(isRelevantContext)
        .forEach(cacheContext(this)),
    );

    // Run the results through the pipeline.
    const result = await getFinalValue(readAction);

    // Map each key to it's context equivalent.
    return result.contexts;
  }

  /**
   * Read a context from the database.
   * @param  {String} key - The node's unique ID.
   * @param  {Object} [options] - Plugin-level options.
   * @param  {ConnectionGroup|null} [options.network]
   * Override the group of network connections.
   * @param  {Object|null} [options.storage] - Storage plugins to use.
   * @param  {Boolean} [options.force] - Ignore cache and force read.
   * @return {Context|null} - Resolves to the node.
   */
  async read(key, options = {}) {
    const [node] = await this.nodes([key], options);
    return node;
  }

  /**
   * description
   * @param  {Mixed} query - query that is passed to the engine
   * @param  {Object} options - options for executing the query
   * @return {undefined}
   */
  query(query, options) {
    const config = this[settings];
    const engines = config.engines;
    const engine = options.engine;

    // Make sure the engine exists
    if (!engines.hasOwnProperty(engine)) {
      throw new Error('No engine is defined in options');
    }

    const queryEngine = engines[engine];
    return queryEngine.executeQuery(query, this);
  }

  /**
   * Streams every node from supported storage plugins.
   * @private
   * @throws {Error} - If the storage plugin doesn't support streaming.
   * @return {Iterator<Promise<Array>>}
   * Async iterator, yields every value in the database.
   * @example
   * for await (const node of db) {
   *   console.log('Found:', node)
   * }
   */
  async *[Symbol.asyncIterator]() {
    const storage = this[settings].storage || {};
    const supported = Boolean(storage[Symbol.asyncIterator]);

    if (!supported) {
      throw new Error('Storage plugin does not support streaming.');
    }

    // Start the database stream!
    for await (const node of storage) {
      // Make sure each value is a node.
      yield node instanceof Node ? node : Node.source(node);
    }
  }
}

/**
 * Creates a new instance of `Database` with or without `new`.
 * @param  {...Object} configs - Plugins and configurations for the database.
 * @return {Database} - A new database instance.
 */
function database(...configs) {
  const config = merge(configs);

  return new Database(config);
}

database.configuration = settings;

export default database;
