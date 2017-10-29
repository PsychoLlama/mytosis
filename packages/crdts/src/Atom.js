// @flow

/**
 * Represents an object where all properties are written simultaneously.
 * The only supported action is (basically) a PUT.
 */
export default class Atom {
  /**
   * @param  {Object} data - Data to import.
   * @return {Atom} - A new atom with all the data.
   */
  static import() {
    return new Atom();
  }
}
