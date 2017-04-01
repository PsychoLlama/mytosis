import merge from '../merge-configs';
import { Graph, Node } from 'graph-crdt';
import Context from './context';
import * as pipeline from '../pipeline';

const settings = Symbol('database configuration');

/**
 * Plugin manager for graph-crdt.
 * @class Database
 */
class Database extends Graph {

  /**
   * Instantiates a new graph database.
   * @param  {Object} config - A database configuration object.
   */
  constructor (config) {
    super();

    this[settings] = config;

    const createRouter = config.router;

    const router = createRouter
      ? createRouter(this, config)
      : null;

    Object.defineProperty(this, 'router', { value: router });

    const extensions = config.extend.root;

    /** Add API extensions from the config. */
    Object.keys(extensions).forEach((key) => {
      const value = extensions[key];

      /** Non-enumerable and immutable. */
      Object.defineProperty(this, key, { value });
    });
  }

  /**
   * Applies a collection of changes all at once.
   * @param  {Graph|Database} update - A collection of updates.
   * @param  {Object} [options] - Override global configuration.
   * @return {Promise} - Resolves when the commit has been processed.
   */
  async commit (update, options = {}) {

    // Storage drivers get the full state of each node.
    const graph = new Graph();
    const contexts = this.new();

    for (const [id] of update) {
      const node = update.value(id);

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
      ...options,
      update,
      graph,
    });

    // Persist.
    const writes = config.storage.map((store) => store.write(config));

    if (this.router) {
      await this.router.push(config);
    }

    // Wait for writes to finish.
    await Promise.all(writes);

    // Merge in the update.
    const deltas = this.merge(contexts);

    return await pipeline.after.write(this[settings], {
      ...config,
      ...deltas,
    });
  }

  /**
   * Merges a node into the graph.
   * @param  {String} uid - The unique ID of the node.
   * @param  {Object} value - The fields to add/update.
   * @param  {Object} [options] - Override default behavior.
   * @return {Context} - Resolves to the context written.
   */
  async write (uid, value, options = {}) {

    // Turn the object into a database context.
    const context = new Context(this, { uid });
    const current = this.value(uid);

    // Ensure object updates increment state.
    if (current && value) {
      for (const field in value) {
        if (value.hasOwnProperty(field)) {
          context.merge({ [field]: current.value(field) });
          context.meta(field).state = current.state(field);
        }
      }
    }

    context.merge(value);

    const update = Graph.source({ [uid]: context });

    await this.commit(update, options);

    return this.value(uid);
  }

  /**
   * Read a context from the database.
   * @param  {String} key - The node's unique ID.
   * @param  {Object} [options] - Plugin-level options.
   * @return {Context|null} - Resolves to the node.
   */
  async read (key, options = {}) {
    const config = this[settings];

    const params = await pipeline.before.read.node(config, {
      ...options,
      key,
    });

    let node = this.value(params.key);

    // Not cached.
    if (node === null) {

      // Ask the storage plugins for it.
      const reads = [...params.storage].map(store => store.read(params));

      // Ask the network for it.
      if (this.router) {
        reads.push(this.router.pull(params));
      }

      for (const result of await Promise.all(reads)) {
        const update = Node.source(result);

        if (result) {
          node = node || new Context(this, { uid: params.key });
          node.merge(update);
        }
      }

      /** Cache the value. */
      if (node) {
        this.merge({ [params.key]: node });
      }
    }

    /** After-read hooks. */
    const result = await pipeline.after.read.node(config, {
      ...params,
      context: node,
    });

    return result.context;
  }

  /**
   * description
   * @param  {Mixed} query - query that is passed to the engine
   * @param  {Object} options - options for executing the query
   * @return {undefined}
   */
  query (query, options) {

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
}

/**
 * Creates a new instance of `Database` with or without `new`.
 * @param  {...Object} configs - Plugins and configurations for the database.
 * @return {Database} - A new database instance.
 */
function database (...configs) {
  const config = merge(configs);

  return new Database(config);
}

database.configuration = settings;

export default database;
