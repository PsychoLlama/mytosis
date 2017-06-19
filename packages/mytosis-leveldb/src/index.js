const NOT_FOUND_ERROR = 'NotFoundError';

/**
 * Turns a key-value pair in a graph into a level write operation.
 * @private
 * @param  {Array} pair - Key-value pair.
 * @return {Object} - LevelDB write operation.
 */
const mapToWriteOp = ([key, node]) => ({
  value: node.toJSON(),
  type: 'put',
  key,
});

/**
 * Asserts an expression is true.
 * @param  {Mixed} expr - Any expression.
 * @param  {String} msg - An error message.
 * @throws {Error} - An error prefixed with the module name.
 * @return {undefined}
 */
const assert = (expr, msg) => {
  if (!expr) {
    throw new Error(`mytosis-leveldb: ${msg}`);
  }
};

/**
 * A LevelDB plugin for Mytosis. Manages level instances
 * (to keep compability with browsers, you must provide the instance).
 * @class
 */
export default class LevelDB {

  /**
   * @param  {Object} config - Configures the level interface.
   * @param  {Object} config.backend - A compatible level instance.
   * @throws {Error} - If required config options are omitted.
   */
  constructor (config) {
    assert(config, `Constructor expected an object, was given "${config}"`);
    assert(
      typeof config.backend === 'object' && config.backend,
      'Invalid "config.backend". A LevelDB interface is required.',
    );

    this._level = config.backend;
  }

  /**
   * Reads a key from LevelDB.
   * @param  {Object} action - Mytosis style action.
   * @param  {String} action.key - The key to read.
   * @return {Promise} - Resolves with the data (if no errors occur).
   */
  read (action) {
    return new Promise((resolve, reject) => {
      this._level.get(action.key, (error, result) => {

        // Represent "not found" errors as "undefined".
        if (error && error.type !== NOT_FOUND_ERROR) {
          return reject(error);
        }

        return resolve(result);
      });
    });
  }

  /**
   * Write a collection of nodes as an atomic operation.
   * @param  {Object} action - Mytosis style action.
   * @param  {Graph} action.graph - A collection of updated nodes.
   * @return {Promise} - Resolves when the write finishes.
   */
  write (action) {
    return new Promise((resolve, reject) => {
      const writes = [...action.graph].map(mapToWriteOp);

      // Writes all nodes simultaneously.
      this._level.batch(writes, (error) => {
        if (error) {
          return reject(error);
        }

        return resolve();
      });
    });
  }
}
