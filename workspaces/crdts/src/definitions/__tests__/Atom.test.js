// @flow
import { Composite } from '@mytosis/types';

import { define as defineAtom } from '../Atom';
import Atom from '../../Atom';

describe('Atom definition', () => {
  it('returns a definition', () => {
    const definition = defineAtom(jest.fn());

    expect(definition).toMatchObject({
      initialMigration: expect.any(Function),
      constructors: expect.any(Object),
      createType: expect.any(Function),
      migrations: expect.any(Object),
    });
  });

  it('uses the given initial migration', () => {
    const initialMigration = jest.fn();
    const definition = defineAtom(initialMigration);

    expect(definition.initialMigration).toBe(initialMigration);
  });

  it('initializes a composite type with the correct name', () => {
    const definition = defineAtom(jest.fn());
    const typeName = 'SomeTypeName';
    const type = definition.createType(typeName);

    expect(type).toEqual(expect.any(Composite));
    expect(type.name).toBe(typeName);
  });

  it('exposes an atom constructor', () => {
    const definition = defineAtom(jest.fn());
    const type = definition.createType('Coordinate');
    const atom = definition.constructors.create(type, {});

    expect(atom).toEqual(expect.any(Atom));
  });
});
