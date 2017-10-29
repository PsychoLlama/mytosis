/* eslint-disable no-underscore-dangle */
// @flow
import assert from 'minimalistic-assert';

type primitive = number | string | boolean;
type DehydratedMap = { [string]: primitive };
type Dehydrated = [number, DehydratedMap];

/**
 * Sorts an entries array by key (descending).
 * @param  {Array} entry1 - Key/value pair.
 * @param  {Array} entry2 - Key/value pair.
 * @return {Number} - Positive if greater, negative otherwise.
 */
const sortByKey = ([key1], [key2]) => (key1 > key2 ? 1 : -1);

/**
 * Array#sort comparison function between two atoms (objects). Assumes
 * the atoms will never contain non-primitives.
 * @param  {Atom} current - Any atom.
 * @param  {Atom} update - Any atom.
 * @return {Number} - > 0 if current is larger, < 0 otherwise, 0 for equal.
 */
const compare = (current, update) => {
  const entries = { current: [], update: [] };
  current.forEach((value, key) => entries.current.push([key, value]));
  update.forEach((value, key) => entries.update.push([key, value]));

  entries.current.sort(sortByKey);
  entries.update.sort(sortByKey);

  const strings = {
    current: JSON.stringify(entries.current),
    update: JSON.stringify(entries.update),
  };

  // Objects are identical.
  if (strings.current === strings.update) {
    return 0;
  }

  // Choose the lexicographically larger object.
  return strings.current > strings.update ? 1 : -1;
};

/**
 * Represents an object where all properties are written simultaneously.
 * The only supported action is essentially a PUT.
 */
export default class Atom {
  __crdt__: Map<string, primitive>;
  version: number;

  /**
   * @param  {Number} version - A lamport timestamp.
   * @param  {Object} data - Data to import.
   * @return {Atom} - A new atom with all the data.
   */
  static import([version: number, data: DehydratedMap]: Dehydrated) {
    const validVersion = isFinite(version) && version > 0;
    assert(validVersion, `Atom given invalid version (${version}).`);

    const atom = new Atom();
    atom.version = version;

    Object.keys(data).forEach(key => {
      atom.__crdt__.set(key, data[key]);
    });

    return atom;
  }

  /** Creates an atom */
  constructor() {
    Object.defineProperties(this, {
      __crdt__: {
        value: new Map(),
        writable: true,
      },
      version: {
        writable: true,
        value: 1,
      },
    });
  }

  /**
   * Returns the value of the given field.
   * @param  {String} field - The field to read.
   * @return {any} - Any JSON compatible value.
   */
  read(field: string) {
    return this.__crdt__.get(field);
  }

  /**
   * Determines whether the update is necessary.
   * @param  {Atom} update - An update.
   * @return {Atom|null} - The minimal update.
   */
  shake(update: Atom) {
    const crdt = { update: update.__crdt__, current: this.__crdt__ };
    const sameVersion = update.version === this.version;
    const sameSize = crdt.update.size === crdt.current.size;

    // Choose the one with more data.
    if (sameVersion && !sameSize) {
      return crdt.update.size > crdt.current.size ? update : null;
    }

    // Choose the lexicographically larger.
    if (sameVersion) {
      const sorted = compare(crdt.current, crdt.update);

      // Identical objects.
      if (sorted === 0) {
        return null;
      }

      // Conflict. Deterministically choose a winner.
      return sorted > 0 ? null : update;
    }

    return update.version > this.version ? update : null;
  }

  /**
   * Applies an update to the atom. Assumes the update blindly
   * (assumes the update has already been shaken).
   * @param  {Atom} update - The value to replace current state.
   * @return {undefined}
   */
  merge(update: Atom) {
    this.__crdt__ = update.__crdt__;
    this.version = update.version;
  }

  /**
   * Formats an update for the atom.
   * @param  {Object} update - New fields for the atom.
   * @return {Atom} - A patch which, when applied, will yield the new state.
   */
  createUpdate(update: DehydratedMap) {
    const version = this.version + 1;

    return Atom.import([version, update]);
  }

  /**
   * Serializes the atom into a compact package.
   * @return {Array} - The version and data payload.
   */
  toJSON(): Dehydrated {
    const target = {};

    this.__crdt__.forEach((value, key) => {
      target[key] = value;
    });

    return [this.version, target];
  }
}
