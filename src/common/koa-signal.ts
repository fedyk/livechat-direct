import Debug from "debug"
import { AppContext, AppNext } from "../types";

const debug = Debug("koa-signal")

export function koaSignal(ctx: AppContext, next: AppNext) {
  const abortController = new AbortController()

  ctx.signal = abortController.signal
  ctx.req.on("close", onClose)
  ctx.req.on("end", onEnd)

  return next()

  function onEnd() {
    debug("onEnd")
    ctx.signal = null!
    ctx.req.off("close", onClose)
    ctx.req.off("end", onEnd)
  }

  function onClose() {
    debug("onClose")
    abortController.abort()
  }
}
