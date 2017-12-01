// @flow
import { Composite } from '@mytosis/types';

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
      const id = String(composite);
      this._types.set(id, composite);

      if (composite.defaultType instanceof Composite) {
        searchForTypes(composite.defaultType);
      }
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
