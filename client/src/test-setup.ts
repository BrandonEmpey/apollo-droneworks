import "@testing-library/jest-dom";

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;

if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = (_pointerId: number) => true;
}
if (typeof Element !== "undefined" && !Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = (_pointerId: number) => {};
}
if (typeof Element !== "undefined" && !Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = (_pointerId: number) => {};
}
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (typeof window === "undefined") {
  // Node-environment tests (e.g. server route integration tests that opt
  // into `// @vitest-environment node`) don't need DOM polyfills. Bail
  // before touching `window`/`Element` to keep this shared setup file
  // safe for both jsdom and node runs.
} else {
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "DOMRect", {
  writable: true,
  value: class DOMRect {
    bottom = 0;
    height = 0;
    left = 0;
    right = 0;
    top = 0;
    width = 0;
    x = 0;
    y = 0;
    static fromRect() { return new DOMRect(); }
    toJSON() { return {}; }
  },
});
}
