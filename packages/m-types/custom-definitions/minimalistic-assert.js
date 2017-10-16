declare module 'minimalistic-assert' {
  declare module.exports: {
    (expression: mixed, message?: string): void,
    equal(value1: mixed, value2: mixed, message?: string): void,
  };
}
