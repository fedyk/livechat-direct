import { IDisposable } from "../common/lifecycle"

interface Options {
  max: number
  highWater: number
  duration: number
}

/**
 * @example
 * const limiter = new Limiter({ max: 5, duration: 1000, highWater: 10 }) // 5 req/sec
 */
export class Limiter implements IDisposable {
  max: number
  highWater: number
  duration: number
  set: number[]

  constructor(options: Options) {
    this.max = options.max
    this.highWater = options.highWater
    this.duration = options.duration
    this.set = []
  }

  dispose() {
    this.set = null!
  }

  get() {
    const now = Date.now()
    const min = now - this.duration

    if (this.set.length < this.highWater) {
      this.set.push(now)
    }

    this.set = this.set.filter(n => n > min)

    const count = this.set.length
    const remaining = count < this.max ? this.max - count : 0

    return {
      remaining
    }
  }
}
