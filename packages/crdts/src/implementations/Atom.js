// @flow
import { Composite } from '@mytosis/types';
// import assert from 'minimalistic-assert';

/**
 * The simplest Mytosis CRDT: the Atom. It tracks a single
 * value attached to a version value. The only operation is
 * replacing the current value with another, given a higher
 * version number.
 *
 * This structure can be used by other CRDTs to create more
 * useful data structures.
 *
 * The most complex part is deterministically resolving
 * conflicts for arbitrarily structured JSON data.
 *
 * Conflict resolution algorithm:
 * Take both objects and convert them to strings. Choose the
 * lexicographically larger value.
 *
 * The process of turning it into a string is as follows:
 * - If the value is a primitive, return the primitive.
 * - If the value is an object, turn it into a key/value tuple
 *   array sorted descending by key.
 * - Do this for all members of arrays & objects recursively.
 * - JSON.stringify(...) the result.
 */

/**
 * Sorts an entries array by key (descending).
 * @param  {Array} entry1 - Key/value pair.
 * @param  {Array} entry2 - Key/value pair.
 * @return {Number} - Positive if greater, negative otherwise.
 */
// const sortByKey = ([key1], [key2]) => (key1 > key2 ? 1 : -1);

/**
 * Array#sort comparison function between two atoms (objects). Assumes
 * the atoms will never contain non-primitives.
 * @param  {Atom} current - Any atom.
 * @param  {Atom} update - Any atom.
 * @return {Number} - > 0 if current is larger, < 0 otherwise, 0 for equal.
 */
// const compare = (current, update) => {
//   const entries = { current: [], update: [] };
//   current.forEach((value, key) => entries.current.push([key, value]));
//   update.forEach((value, key) => entries.update.push([key, value]));

//   entries.current.sort(sortByKey);
//   entries.update.sort(sortByKey);

//   const strings = {
//     current: JSON.stringify(entries.current),
//     update: JSON.stringify(entries.update),
//   };

//   // Objects are identical.
//   if (strings.current === strings.update) {
//     return 0;
//   }

//   // Choose the lexicographically larger object.
//   return strings.current > strings.update ? 1 : -1;
// };

type Metadata = {
  version: number,
  type: Composite,
  hasPendingUpdate: boolean,
};

type Packed<Value> = [number, Value];

/**
 * Represents a single mutable value. The only way to update it
 * is to replace it with an entirely new value.
 */
export default class Atom<Value> {
  __metadata: Metadata;
  data: Value;

  static create(type: Composite, value: Value): Atom<Value> {
    type.validate(value);

    const metadata = { version: 1, type, hasPendingUpdate: false };
    const atom = new Atom();

    Object.defineProperties(atom, {
      data: { enumerable: true, writable: true, value },
      __metadata: { value: metadata },
    });

    return atom;
  }

  static from(type: Composite, [version, value]: Packed<Value>): Atom<Value> {
    type.validate(value);

    const atom = new Atom();
    const metadata = { version, type, hasPendingUpdate: false };
    Object.defineProperties(atom, {
      data: { enumerable: true, writable: true, value },
      __metadata: { value: metadata },
    });

    return atom;
  }

  replaceValue(newValue: Value) {
    const { type } = this.__metadata;
    type.validate(newValue);

    this.__metadata.hasPendingUpdate = true;
    this.data = newValue;
  }
}
