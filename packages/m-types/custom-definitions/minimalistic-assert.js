declare module 'minimalistic-assert' {
  declare module.exports: {
    (expression: any, message?: string): void,
    equal(value1: any, value2: any, message?: string): void,
  };
}
