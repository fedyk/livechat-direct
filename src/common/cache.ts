import Debug from "debug"
import { LRUMap } from "lru_map"
import { IDisposable } from "./lifecycle"

interface Item {
  value: string
  expiredAt: number
}

const store = new LRUMap<string, Item>(1000)
const debug = Debug("cache")

export class Cache implements IDisposable {
  lookupTimer: NodeJS.Timer

  constructor() {
    this.lookupTimer = setInterval(this._lookup.bind(this), 60 * 1000)
    this.lookupTimer.unref()
  }

  dispose(): void {
    clearInterval(this.lookupTimer)
  }

  async get(key: string) {
    const entity = store.get(key)

    if (entity && entity.expiredAt > Date.now()) {
      return entity.value
    }
  }

  /**
   * @param ex seconds
   * @returns 
   */
  async set(key: string, value: string, ex?: number) {
    const expiredAt = ex ? Date.now() + ex * 1000 : Infinity

    store.set(key, {
      value: value,
      expiredAt: expiredAt
    })
  }

  async del(key: string) {
    return store.delete(key)
  }

  /**
   * @param key {string}
   * @param value {string}
   * @param ex {number} seconds
   * @returns Promise<0 | 1>
   */
  async setnx(key: string, value: string, ex?: number) {
    const prevValue = await this.get(key)

    if (prevValue) {
      return 0
    }

    await this.set(key, value, ex)

    return 1
  }

  get size() {
    return store.size
  }

  protected _lookup() {
    const now = new Date()

    debug("lookup in cache store time=%s store_size=%s", now, store.size)

    store.forEach(function (item, key) {
      if (item.expiredAt != null && item.expiredAt < now.getTime()) {
        store.delete(key)
      }
    })
  }
}
