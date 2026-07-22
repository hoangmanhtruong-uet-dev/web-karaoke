class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = "0px"
  readonly thresholds = [0]
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
  unobserve() {}
}

globalThis.IntersectionObserver = IntersectionObserverStub

afterEach(() => cleanup())
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
