// Creates a convenient `assert` function.
export const asserter = (app) => (expr, msg) => {
  if (!expr) {
    throw new Error(`${app}: ${msg}`);
  }
};

