import Atom from '../Atom';

describe('Atom', () => {
  it('is a function', () => {
    expect(Atom).toEqual(expect.any(Function));
  });

  it('contains the version', () => {
    const atom = Atom.import([6, {}]);

    expect(atom.version).toBe(6);
  });

  it('provides a version default', () => {
    const atom = new Atom();

    expect(atom.version).toBe(1);
  });

  it('throws if the version is invalid', () => {
    expect(() => Atom.import([-1, {}])).toThrow(/version/i);
    expect(() => Atom.import([Infinity, {}])).toThrow(/version/i);
    expect(() => Atom.import([-Infinity, {}])).toThrow(/version/i);
    expect(() => Atom.import([NaN, {}])).toThrow(/version/i);
  });

  describe('toJSON()', () => {
    it('returns an import-style value', () => {
      const atom = Atom.import([60, { data: true }]);

      expect(atom.toJSON()).toEqual([60, { data: true }]);
    });
  });

  describe('value()', () => {
    it('returns undefined when the value is undefined', () => {
      const atom = Atom.import([1, {}]);
      const value = atom.read('non-existent');

      expect(value).toBeUndefined();
    });

    it('returns the value when defined', () => {
      const atom = Atom.import([1, { value: 'defined' }]);
      const value = atom.read('value');

      expect(value).toBe('defined');
    });

    it('filters values from the prototype', () => {
      const atom = Atom.import([1, {}]);
      const value = atom.read('toString');

      expect(value).toBeUndefined();
    });
  });

  describe('import()', () => {
    it('creates a new Atom', () => {
      const atom = Atom.import([1, {}]);

      expect(atom).toEqual(expect.any(Atom));
    });

    it('contains all the key/value pairs', () => {
      const atom = Atom.import([
        1,
        {
          contents: 'contents',
          data: true,
          value: 5,
        },
      ]);

      expect(atom.read('contents')).toEqual('contents');
      expect(atom.read('data')).toEqual(true);
      expect(atom.read('value')).toEqual(5);
    });
  });

  describe('shake()', () => {
    it('returns null for older versions', () => {
      const atom = Atom.import([2, {}]);
      const update = Atom.import([1, {}]);
      const shaken = atom.shake(update);

      expect(shaken).toBe(null);
    });

    it('returns the update for newer versions', () => {
      const atom = Atom.import([1, {}]);
      const update = Atom.import([2, {}]);
      const shaken = atom.shake(update);

      expect(shaken).toBe(update);
    });

    describe('conflict', () => {
      it('returns null if the update has less data', () => {
        const atom = Atom.import([1, { data: true }]);
        const update = Atom.import([1, {}]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(null);
      });

      it('returns the update if the current value has less data', () => {
        const atom = Atom.import([1, {}]);
        const update = Atom.import([1, { data: true }]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(update);
      });

      it('returns null if the data is the same', () => {
        const atom = Atom.import([1, { data: true }]);
        const update = Atom.import([1, { data: true }]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(null);
      });

      it('returns the same things', () => {
        const atom = Atom.import([1, { data: 1 }]);
        const update = Atom.import([1, { data: 2 }]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(update);
      });

      // Technically objects are unordered, but JS engines
      // usually iterate over keys in the order they're defined.
      it('returns null when the objects are identical', () => {
        const atom = Atom.import([1, { bacon: true, stuff: 'yeah' }]);
        const update = Atom.import([1, { stuff: 'yeah', bacon: true }]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(null);
      });

      it('chooses the lexicographically larger object', () => {
        const atom = Atom.import([1, { alpha: 1, beta: 2 }]);
        const update = Atom.import([1, { gamma: 3, delta: 4 }]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(update);
      });

      it('chooses the lexicographically larger object (inverted)', () => {
        const atom = Atom.import([1, { gamma: 3, delta: 4 }]);
        const update = Atom.import([1, { alpha: 1, beta: 2 }]);
        const shaken = atom.shake(update);

        expect(shaken).toBe(null);
      });
    });
  });

  describe('merge()', () => {
    it('applies the update', () => {
      const atom = Atom.import([1, { name: 'stale' }]);
      const update = Atom.import([2, { name: 'update' }]);
      atom.merge(update);

      expect(atom.read('name')).toBe('update');
      expect(atom.version).toBe(update.version);
    });

    it('is unaffected by later mutations of the update', () => {
      const atom = Atom.import([1, { name: 'stale' }]);
      const update = Atom.import([2, { name: 'update' }]);
      atom.merge(update);

      const later = Atom.import([3, { name: 'noooo' }]);
      update.merge(later);

      expect(atom.read('name')).toBe('update');
    });
  });

  describe('createUpdate()', () => {
    it('returns an atom', () => {
      const atom = Atom.import([1, {}]);
      const result = atom.createUpdate({
        bacon: true,
        wat: 'no',
      });

      expect(result).toEqual(expect.any(Atom));
    });

    it('uses an incremented version', () => {
      const atom = Atom.import([30, {}]);
      const result = atom.createUpdate({ progress: true });

      expect(result.version).toBe(atom.version + 1);
    });
  });
});
