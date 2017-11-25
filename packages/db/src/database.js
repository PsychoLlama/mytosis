// @flow
import { create as createConfig } from './config-utils';
import DatabaseContext from './database-context';
import type { Options } from './config-utils';

/** Graph read entry point. */
export class Database {
  _context: DatabaseContext;

  /**
   * @param  {Object} options - DB config options.
   */
  constructor(options?: Options) {
    const config = createConfig(options);

    Object.defineProperty(this, '_context', {
      value: new DatabaseContext(config),
    });
  }
}

/**
 * Creates a new database instance without directly exposing the class.
 * Can be used with or without `new`.
 * @param  {Options} options - Database configuration options.
 * @return {Database} - Brand new DB.
 */
export default function database(options?: Options) {
  return new Database(options);
}
