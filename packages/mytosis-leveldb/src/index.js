/*
  eslint-disable
  no-constant-condition,
  no-use-before-define,
  require-jsdoc,
*/
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
 * Reads a key from LevelDB returning a promise.
 * @param  {LevelUP} level - LevelDB instance.
 * @param  {String} key - Key to read.
 * @return {Promise<Object>} - The node json data.
 */
const readAsPromise = level => key =>
  new Promise((resolve, reject) => {
    level.get(key, (error, result) => {
      // Represent "not found" errors as "undefined".
      if (error && error.type !== NOT_FOUND_ERROR) {
        return reject(error);
      }

      return resolve(result);
    });
  });

/**
 * Create a $q.defer style promise.
 * @return {Promise} - A deferred promise.
 */
const defer = () => {
  let res, rej;

  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  promise.resolve = res;
  promise.reject = rej;

  return promise;
};

/**
 * Reads values from a object mode readable stream as an async iterator.
 * @param  {Stream.Readable} stream - A value stream from levelup.
 * @return {Promise<Object>} - Resolves with each node.
 */
async function* streamToGenerator(stream) {
  let promise;

  stream.on('data', data => promise.resolve(data));
  stream.once('end', () => promise.resolve(null));

  stream.on('error', error => {
    stream.removeAllListeners();
    promise.reject(error);
  });

  while (true) {
    promise = defer();

    yield promise;
  }
}

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
  constructor(config) {
    assert(config, `Constructor expected an object, was given "${config}"`);
    assert(
      typeof config.backend === 'object' && config.backend,
      'Invalid "config.backend". A LevelDB interface is required.',
    );

    const level = (this._level = config.backend);
    this._readKey = readAsPromise(level);
  }

  /**
   * Reads a key from LevelDB.
   * @param  {Object} action - Mytosis style action.
   * @param  {String} action.key - The key to read.
   * @return {Promise} - Resolves with the data (if no errors occur).
   */
  read(action) {
    const reads = action.keys.map(this._readKey);

    return Promise.all(reads);
  }

  /**
   * Write a collection of nodes as an atomic operation.
   * @param  {Object} action - Mytosis style action.
   * @param  {Graph} action.graph - A collection of updated nodes.
   * @return {Promise} - Resolves when the write finishes.
   */
  write(action) {
    return new Promise((resolve, reject) => {
      const writes = [...action.graph].map(mapToWriteOp);

      // Writes all nodes simultaneously.
      this._level.batch(writes, error => {
        if (error) {
          return reject(error);
        }

        return resolve();
      });
    });
  }

  /**
   * Streams every node from the database.
   * @return {AsyncIterator<Object>} - Yields every node.
   */
  async *[Symbol.asyncIterator]() {
    // Don't flush all at once - read one value at a time.
    const stream = this._level.createValueStream({ highWaterMark: 1 });

    for await (const value of streamToGenerator(stream)) {
      // `null` marks a terminated stream.
      if (!value) {
        return;
      }

      yield value;
    }
  }
}
