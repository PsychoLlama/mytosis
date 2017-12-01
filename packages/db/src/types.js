// @flow
import type {
  Definition as CompositeDefinition,
  Context,
} from '@mytosis/types/dist/Composite';
import { Primitive, Pointer, Composite } from '@mytosis/types';
import { Atom } from '@mytosis/crdts';

export const string = new Primitive('string', {
  isValid: (value): boolean => typeof value === 'string',
  coerce: (value): string => {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  },
});

// Excludes NaN and ±Infinity.
export const number = new Primitive('number', {
  isValid: (value): boolean => typeof value === 'number' && isFinite(value),
  coerce: (value): number => {
    const result = Number(value);

    return isFinite(result) ? result : 0;
  },
});

export const boolean = new Primitive('boolean', {
  isValid: (value): boolean => value === true || value === false,
  coerce: (value): boolean => !!value,
});

// Represents typed arrays (binary values).
export const buffer = new Primitive('buffer', {
  coerce: buf => {
    if (buffer.isValid(buf)) {
      return buf;
    }

    return new ArrayBuffer(0);
  },

  isValid: (value): boolean =>
    ArrayBuffer.isView(value) || value instanceof ArrayBuffer,
});

export const atom = (
  name: string,
  options?: $Rest<CompositeDefinition, { context: Context }> = {},
) => {
  const definition = {
    ...options,
    context: Atom,
  };

  // Swap composite references with pointers.
  if (options.defaultType instanceof Composite) {
    definition.defaultType = new Pointer(string, options.defaultType);
  }

  Object.keys(definition.initialFieldSet || {}).forEach(key => {
    const type = definition.initialFieldSet[key];

    if (type instanceof Composite) {
      definition.initialFieldSet[key] = new Pointer(string, type);
    }
  });

  return new Composite(name, definition);
};
