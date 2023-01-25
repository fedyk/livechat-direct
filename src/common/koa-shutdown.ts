import { AppContext } from "../types";

export function createKoaShutdown() {
  let counter = 0

  function middleware(ctx: AppContext, next: Function) {
    counter++

    return Promise.resolve(next()).finally(function () {
      counter--
    })
  }

  function dispose() {
    console.log(`${counter} pending request(-s) during shutdown of server`)
  }

  return { middleware, dispose }
}