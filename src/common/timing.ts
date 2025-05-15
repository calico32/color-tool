export function timedRaf(name: string, callback: () => void) {
  const start = performance.now()
  requestAnimationFrame(() => {
    const end = performance.now()
    const duration = end - start
    if (duration > 16) {
      console.warn(`raf ${name} took ${duration.toFixed(2)}ms, exceeding 16ms`)
    }
    callback()
  })
}

export function injectTimedRaf() {
  const originalRaf = window.requestAnimationFrame
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const start = performance.now()
    const wrappedCallback = (t: DOMHighResTimeStamp) => {
      const end = performance.now()
      const duration = end - start
      if (duration > 16) {
        console.warn(`raf took ${duration.toFixed(2)}ms, exceeding 16ms`)
      }
      callback(t)
    }
    return originalRaf(wrappedCallback)
  }
}
