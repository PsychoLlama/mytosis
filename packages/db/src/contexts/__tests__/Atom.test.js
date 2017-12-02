// @flow
import { create as createConfig } from '../../config-utils';
import DatabaseContext from '../../database-context';
import * as type from '../../types';
import Atom from '../Atom';

describe('Atom', () => {
  const createContext = options => {
    const config = createConfig(options);
    const context = new DatabaseContext(config);

    return context;
  };

  it('exists', () => {
    expect(Atom).toEqual(expect.any(Function));
  });

  it('exposes the type & ID', () => {
    const User = type.atom('User');
    const atom = Atom.new({
      context: createContext(),
      type: User,
      id: 'abc',
    });

    expect(atom.id).toBe('abc');
    expect(atom.type).toBe(User);
  });

  describe('static import()', () => {
    it('exposes the type & ID', () => {
      const User = type.atom('User');
      const atom = Atom.import({
        context: createContext(),
        data: [1, {}],
        type: User,
        id: 'abc',
      });

      expect(atom.id).toBe('abc');
      expect(atom.type).toBe(User);
    });
  });

  describe('getFieldMetadata()', () => {
    it('throws if the field has no type definition', () => {
      const User = type.atom('User');
      const atom = Atom.new({
        context: createContext(),
        type: User,
        id: 'no',
      });

      const fail = () => atom.getFieldMetadata('potatoes');

      expect(fail).toThrow(/type/i);
    });

    it('yields the field type', () => {
      const User = type.atom('User', {
        initialFieldSet: { name: type.string },
      });

      const atom = Atom.new({
        context: createContext(),
        type: User,
        id: 'no',
      });

      const result = atom.getFieldMetadata('name');
      expect(result.type).toBe(type.string);
    });

    it('uses the default type when not explicitly defined', () => {
      const User = type.atom('User', { defaultType: type.number });
      const atom = Atom.new({
        context: createContext(),
        type: User,
        id: 'nope',
      });

      const result = atom.getFieldMetadata('unknown');
      expect(result.type).toBe(type.number);
    });

    it('includes the field data', () => {
      const User = type.atom('User', { defaultType: type.string });
      const atom = Atom.import({
        context: createContext(),
        type: User,
        id: 'yolo',
        data: [
          1,
          {
            status: 'enabled',
          },
        ],
      });

      const result = atom.getFieldMetadata('status');

      expect(result).toEqual({
        type: type.string,
        value: 'enabled',
      });
    });
  });
});
