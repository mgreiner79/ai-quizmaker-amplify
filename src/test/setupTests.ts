// src/test/setupTests.ts
import '@testing-library/jest-dom';

// ---- rAF shim (works with fake timers) ----
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
}
if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as number);
}
