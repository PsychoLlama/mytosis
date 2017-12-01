// @flow
import { Composite, Pointer } from '@mytosis/types';

type GraphEntryPoints = {
  [title: string]: Composite,
};

/** Validates and indexes a collection of types. */
export default class Schema {
  _types: Map<string, Composite> = new Map();

  /**
   * @param  {Object} types - A map of root-level types.
   */
  constructor(types: GraphEntryPoints) {
    const searchForTypes = (composite: Composite) => {
      for (const type of Composite.toMigrationIterable(composite)) {
        const id = String(type);
        this._types.set(id, type);
      }

      // Follow type pointers.
      if (composite.defaultType instanceof Pointer) {
        searchForTypes(composite.defaultType.to);
      }

      Object.keys(composite.definition).forEach(key => {
        const type = composite.definition[key];

        if (type instanceof Pointer) {
          searchForTypes(type.to);
        }
      });
    };

    Object.keys(types).forEach(key => {
      const composite = types[key];
      searchForTypes(composite);
    });
  }

  /**
   * Looks for a type in the schema.
   * @param  {String} id - Any type ID, like Product@version.
   * @return {?Composite} - An object type.
   */
  findType(id: string): ?Composite {
    return this._types.get(id) || null;
  }
}
