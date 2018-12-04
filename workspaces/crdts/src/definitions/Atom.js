// @flow
import { Composite } from '@mytosis/types';

import Atom from '../implementations/Atom';

const createType = (typeName: string) => new Composite(typeName, {});
const createAtom: (Composite, Object) => Atom = () => new Atom();

export function define(initialMigration: () => mixed) {
  return {
    initialMigration,
    migrations: {},
    createType,
    constructors: {
      create: createAtom,
    },
  };
}
