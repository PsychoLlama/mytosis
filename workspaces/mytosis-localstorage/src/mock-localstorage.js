/* eslint-env jest, node */
function mockLocalStorage() {
  global.localStorage = Object.defineProperties(
    {},
    {
      mockReset: { value: mockLocalStorage },
      removeItem: { value: jest.fn() },
      getItem: { value: jest.fn() },
      setItem: { value: jest.fn() },
      clear: { value: jest.fn() },
    }
  );
}

mockLocalStorage();
