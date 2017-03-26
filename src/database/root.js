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

    for (const [key] of update) {

      // If the node exists in the graph...
      const current = this.value(key);

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

    // Wait for writes to finish.
    await Promise.all(writes);

    // Merge in the update.
    const deltas = this.merge(update);

    return await pipeline.after.write(this[settings], {
      update: config.update,
      graph: config.graph,
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
    const config = this[settings];
    const update = new Context(this, { uid });
    const currentState = this.value(uid);

    // HACK: Fixes critical issue where node states aren't incremented.
    // Safe to refactor once Database#commit() is implemented.
    if (value && currentState) {
      const existing = currentState.new();

      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          if (currentState.state(key)) {
            existing.merge({ [key]: currentState.value(key) });
            existing.meta(key).state = currentState.state(key);
          }
        }
      }

      update.merge(existing);
    }

    update.merge(value);

    let fullState = update;

    if (currentState) {
      fullState = update.new();

      fullState.merge(currentState);
      fullState.merge(update);
    }

    const params = await pipeline.before.write(config, {
      ...options,
      graph: Graph.source({ [uid]: fullState }),
    });

    this.merge({ [uid]: update });
    const node = this.value(uid);

    /** Persist the change. */
    for (const store of params.storage) {
      await store.write(params);
    }

    const { context } = await pipeline.after.write(config, {
      ...options,
      context: node,
    });

    return context;
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

    /** Not cached. */
    if (node === null) {

      /** Ask the storage plugins for it. */
      for (const store of params.storage) {
        const result = await store.read(params);
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
