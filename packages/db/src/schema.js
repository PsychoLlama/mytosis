// @flow
import { Composite, Pointer } from '@mytosis/types';

type GraphEntryPoints = {
  [title: string]: Composite,
};

type Index = {
  path: Composite[],
  type: Composite,
};

const fmtPath = (path: Composite[]) => path.map(type => type.name).join(' -> ');

const assertNoDuplicate = (type, indexed, path) => {
  if (!indexed || indexed.type.firstComposite === type.firstComposite) {
    return;
  }

  const msg =
    `Two different definitions were found for "${type.name}". Locations:` +
    `\n\t${fmtPath(indexed.path)}` +
    `\n\t${fmtPath(path)}`;

  throw new Error(msg);
};

/** Validates and indexes a collection of types. */
export default class Schema {
  _types: Map<string, Index> = new Map();

  /**
   * @param  {Object} types - A map of root-level types.
   */
  constructor(types: GraphEntryPoints) {
    const searchForTypes = (composite: Composite, path: Composite[]) => {
      const originalComposite = composite.firstComposite;

      // Follow type pointers.
      if (originalComposite.defaultType instanceof Pointer) {
        const pointer = originalComposite.defaultType;
        searchForTypes(pointer.to, path.concat(pointer.to));
      }

      Object.keys(originalComposite.definition).forEach(key => {
        const type = originalComposite.definition[key];

        if (type instanceof Pointer) {
          searchForTypes(type.to, path.concat(type.to));
        }
      });

      for (const type of Composite.toMigrationIterable(composite)) {
        const id = String(type);
        assertNoDuplicate(type, this._types.get(id), path);

        this._types.set(id, {
          path,
          type,
        });

        if (type.migration && type.migration.type instanceof Pointer) {
          const pointer = type.migration.type;
          searchForTypes(pointer.to, path.concat(pointer.to));
        }
      }
    };

    // Kick off the search, starting at the root.
    Object.keys(types).forEach(key => {
      const composite = types[key];
      searchForTypes(composite, [composite]);
    });
  }

  /**
   * Looks for a type in the schema.
   * @param  {String} id - Any type ID, like Product@version.
   * @return {?Composite} - An object type.
   */
  findType(id: string): ?Composite {
    const result = this._types.get(id);

    return result ? result.type : null;
  }
}
