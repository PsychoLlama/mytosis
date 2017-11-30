// @flow
import { Primitive } from '@mytosis/types';

export const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: (value = '') => String(value),
});
