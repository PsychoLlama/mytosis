// @flow
import { Composite, primitives } from '@mytosis/types';

import Atom from '../Atom';

describe('Atom', () => {
  const createPlayerType = () =>
    new Composite('Player', {
      initialFieldSet: {
        displayName: primitives.string,
        x: primitives.number,
        y: primitives.number,
      },
    });

  it('is a function', () => {
    expect(Atom).toEqual(expect.any(Function));
  });

  it('exposes computed state', () => {
    const Player = createPlayerType();
    const state = { displayName: 'Steve', x: 3, y: 1 };
    const atom = Atom.create(Player, state);

    expect(atom.data).toEqual(state);
  });

  it('throws if the input is invalid', () => {
    const Player = createPlayerType();
    const state = { displayName: 'Steve', y: 'invalid', x: 3 };
    const fail = () => Atom.create(Player, state);

    expect(fail).toThrow(/invalid/i);
  });

  it('can replace state', () => {
    const state = { displayName: 'Gargron', x: 1, y: 2 };
    const atom = Atom.create(createPlayerType(), state);
    const update = { displayName: 'Gargron', x: 2, y: 3 };

    const result = atom.replaceValue(update);

    expect(atom.data).toEqual(update);
    expect(result).toBeUndefined();
  });

  it('throws if the new value is invalid', () => {
    const state = { displayName: 'Johnson', x: 10, y: -30 };
    const atom = Atom.create(createPlayerType(), state);
    const fail = () => atom.replaceValue({ displayName: null });

    expect(fail).toThrow(/invalid/i);
  });

  it('can import state', () => {
    const Player = createPlayerType();
    const state = { displayName: 'Yolo McSwagger', x: 5, y: 9000 };
    const version = 30;

    const atom = Atom.from(Player, [version, state]);

    expect(atom.data).toEqual(state);
    expect(atom.__metadata.version).toBe(version);
  });

  it('throws if the imported state is invalid', () => {
    const Player = createPlayerType();
    const state = { displayName: null };
    const fail = () => Atom.from(Player, [1, state]);

    expect(fail).toThrow(/invalid/i);
  });

  it('keeps track of new non-committed values', () => {
    const Player = createPlayerType();
    const state = { displayName: 'Leroy', x: -3000, y: 5 };
    const atom = Atom.from(Player, [1, state]);

    expect(atom.__metadata.hasPendingUpdate).toBe(false);

    const update = { displayName: 'Leroy', x: -9000, y: -1 };
    atom.replaceValue(update);

    expect(atom.__metadata.hasPendingUpdate).toBe(true);
  });
});
