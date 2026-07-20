import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null
  readonly rootMargin = "0px"
  readonly thresholds = [0]
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverMock,
})
