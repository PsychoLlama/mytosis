/* eslint-env jest */
global.localStorage = {
  toString: jest.fn(() => '[object Storage]'),
  removeItem: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
