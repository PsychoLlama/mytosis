// @flow
import Atom from '../Atom';

describe('Atom', () => {
  it('is a function', () => {
    expect(Atom).toEqual(expect.any(Function));
  });

  describe('import()', () => {
    it('creates a new Atom', () => {
      const atom = Atom.import();

      expect(atom).toEqual(expect.any(Atom));
    });
  });
});
