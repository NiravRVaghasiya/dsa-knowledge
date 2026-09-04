// Test stub for CSS-module imports. Returns the requested class name verbatim,
// so components under test can reference `styles.foo` and produce a stable
// `className="foo"` in static markup without a CSS pipeline.
export default new Proxy(
  {},
  {
    get: (_target, prop) => (typeof prop === 'string' ? prop : ''),
  },
);
