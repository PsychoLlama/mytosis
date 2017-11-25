// @flow
import { create as createConfig } from '../config-utils';
import database, { Database } from '../database';
import Context from '../database-context';

jest.mock('../database-context');

describe('Database', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('factory export', () => {
    it('is a function', () => {
      expect(database).toEqual(expect.any(Function));
    });

    it('creates a new DB without requiring `new`', () => {
      const db = database();

      expect(db).toEqual(expect.any(Database));
    });

    it('creates a new DB when `new` is used', () => {
      const db = new database();

      expect(db).toEqual(expect.any(Database));
    });
  });

  it('creates a new context', () => {
    database();

    expect(Context).toHaveBeenCalledWith(expect.any(Object));
  });

  it('provides a config object to the context', () => {
    database();

    expect(Context).toHaveBeenCalledWith(createConfig());
  });

  it('uses the given options in the new config', () => {
    const hooks = [read => read];
    database({ hooks });
    const expectedConfig = createConfig({ hooks });

    expect(Context).toHaveBeenCalledWith(expectedConfig);
  });
});
