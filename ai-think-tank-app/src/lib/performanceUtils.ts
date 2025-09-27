/**
 * Performance optimization utilities for reducing main thread blocking
 */

/**
 * Debounce function with leading and trailing options
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = { trailing: true }
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    lastArgs = args

    const execute = () => {
      if (lastArgs) {
        func.apply(context, lastArgs)
        lastArgs = null
      }
    }

    const shouldCallNow = options.leading && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      timeout = null
      if (options.trailing && lastArgs) {
        execute()
      }
    }, delay)

    if (shouldCallNow) {
      execute()
    }
  }
}

/**
 * Throttle function using requestAnimationFrame
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let isThrottled = false
  let lastArgs: Parameters<T> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    lastArgs = args

    if (!isThrottled) {
      isThrottled = true
      requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(context, lastArgs)
          lastArgs = null
        }
        isThrottled = false
      })
    }
  }
}

/**
 * Run a function in the next idle callback
 */
export function runWhenIdle<T extends (...args: any[]) => any>(
  func: T,
  timeout = 1000
): (...args: Parameters<T>) => void {
  return function (this: any, ...args: Parameters<T>) {
    const context = this

    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => func.apply(context, args),
        { timeout }
      )
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => func.apply(context, args), 0)
    }
  }
}

/**
 * Batch multiple updates into a single render cycle
 */
export class UpdateBatcher<T> {
  private pending: T[] = []
  private scheduled = false

  constructor(
    private processor: (items: T[]) => void,
    private delay = 0
  ) {}

  add(item: T): void {
    this.pending.push(item)

    if (!this.scheduled) {
      this.scheduled = true

      if (this.delay > 0) {
        setTimeout(() => this.flush(), this.delay)
      } else {
        requestAnimationFrame(() => this.flush())
      }
    }
  }

  private flush(): void {
    const items = this.pending.slice()
    this.pending = []
    this.scheduled = false

    if (items.length > 0) {
      this.processor(items)
    }
  }
}

/**
 * Create a memoized selector with shallow equality check
 */
export function createSelector<T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
): (state: T) => R {
  let lastState: T | undefined
  let lastResult: R | undefined

  const defaultEqualityFn = (a: R, b: R) => a === b

  return (state: T) => {
    if (state === lastState) {
      return lastResult as R
    }

    const result = selector(state)

    if (
      lastResult !== undefined &&
      (equalityFn || defaultEqualityFn)(result, lastResult)
    ) {
      return lastResult
    }

    lastState = state
    lastResult = result
    return result
  }
}