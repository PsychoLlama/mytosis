const assert = (value, msg) => {
  if (!value) {
    throw new Error(`mytosis-localstorage: ${msg}`);
  }
};

const validateBackend = (backend) => {
  assert(
    typeof backend === 'object' && backend,
    `Expected a valid backend, got "${backend}"`
  );

  assert(backend.removeItem, 'Backend does not support `removeItem()` method.');
  assert(backend.setItem, 'Backend does not support `setItem()` method.');
  assert(backend.getItem, 'Backend does not support `getItem()` method.');
  assert(backend.clear, 'Backend does not support `clear()` method.');
};

/**
 * Determine if a key belongs to a prefix.
 * @param  {String} prefix - Key prefix.
 * @param  {String} key - A localStorage key.
 * @return {Boolean} - Whether the key is correctly prefixed.
 */
const matchesPrefix = (prefix) => (key) => (
  key.slice(0, prefix.length) === prefix
);

/**
 * Creates a localStorage plugin for Mytosis
 * @class LocalStoragePlugin
 */
module.exports = class LocalStoragePlugin {

  /**
   * @param {Object} [options] - Plugin settings.
   * @param {String} [options.prefix=''] - Prefixes all reads and writes.
   * @param {Storage} [options.backend=localStorage]
   * Use a different localStorage interface (like sessionStorage).
   */
  constructor ({
    backend = global.localStorage,
    prefix = '',
  } = {}) {
    validateBackend(backend);

    /**
     * The storage backend being used.
     * @type {Storage}
     */
    Object.defineProperty(this, 'backend', {
      value: backend,
    });

    /**
     * The prefix for all data.
     * @type {String}
     */
    Object.defineProperty(this, 'prefix', {
      value: prefix,
    });
  }

  /**
   * Write a graph to localStorage.
   * @param  {Object} write - Mytosis write details.
   * @param  {Graph} write.graph - A collection of graphs to write.
   * @return {undefined}
   */
  write ({ graph }) {
    for (const [field, node] of graph) {
      const data = JSON.stringify(node);
      const index = `${this.prefix}${field}`;
      this.backend.setItem(index, data);
    }
  }

  /**
   * Read a key from localStorate.
   * @param  {Object} write - Mytosis read details.
   * @param  {String} write.key - Node index.
   * @return {Object|null} - Whatever was in localStorage.
   */
  read ({ keys }) {
    return keys.map((key) => {
      const index = `${this.prefix}${key}`;
      const result = this.backend.getItem(index);

      if (result) {
        return JSON.parse(result);
      }

      return null;
    });
  }

  /**
   * Removes a node from localStorage.
   * @param  {String} id - The unique node id.
   * @return {undefined}
   */
  remove (id) {
    const index = `${this.prefix}${id}`;
    this.backend.removeItem(index);
  }

  /**
   * Streams all the nodes from storage.
   * @return {AsyncIterator<Node>} - Every node in localStorage.
   */
  async * [Symbol.asyncIterator] () {
    const { backend, prefix } = this;
    const isPrefixed = matchesPrefix(prefix);

    for (const key in backend) {
      if (backend.hasOwnProperty(key) && isPrefixed(key)) {
        const string = backend.getItem(key);
        yield JSON.parse(string);
      }
    }
  }
};
