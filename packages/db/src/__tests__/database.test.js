import Stream from '@mytosis/streams';

import database, { Database } from '../database';
import MockStorage from '../mocks/storage';

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

  describe('readKeys()', () => {
    it('returns a stream', () => {
      const db = database();
      const result = db.readKeys(['key1', 'key2']);

      expect(result).toEqual(expect.any(Stream));
    });

    it('reads from storage by default', async () => {
      const storage = new MockStorage();
      const db = database({ storage });
      const keys = ['list', 'of', 'keys'];
      const stream = db.readKeys(keys);

      await stream;

      expect(storage.read).toHaveBeenCalledWith(
        expect.objectContaining({
          keys,
        }),
      );
    });

    it('uses the storage plugin if provided', async () => {
      const storage = new MockStorage();
      const db = database();
      const keys = ['list', 'of', 'keys'];
      const stream = db.readKeys(keys, { storage });

      await stream;

      expect(storage.read).toHaveBeenCalledWith(
        expect.objectContaining({
          keys,
        }),
      );
    });
  });
});
