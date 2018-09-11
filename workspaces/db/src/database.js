import { create as createConfig } from './config-utils';
import DatabaseContext from './database-context';

/** Graph read entry point. */
export class Database {
  /**
   * @param  {Object} options - DB config options.
   */
  constructor(options) {
    const config = createConfig(options);

    Object.defineProperty(this, '_context', {
      value: new DatabaseContext(config),
    });
  }

  /**
   * Does things
   * @param  {String[]} keys - Any keys to read.
   * @param  {Object} options - Tweaks to how the keys are read.
   * @return {Stream} - A stream of results. Usually paired with `await`.
   */
  readKeys(keys, options) {
    const context = this._context;
    const descriptor = context.createReadDescriptor(keys, options);

    return context.createReadStream(descriptor);
  }
}

/**
 * Creates a new database instance without directly exposing the class.
 * Can be used with or without `new`.
 * @param  {Options} options - Database configuration options.
 * @return {Database} - Brand new DB.
 */
export default function database(options) {
  return new Database(options);
}
