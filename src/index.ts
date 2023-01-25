import * as config from "./config"
import * as path from "path";
import net from "net"
import http from "http"
import Koa from "koa"
import etag from "koa-etag";
import conditional from "koa-conditional-get";
import koaStatic from "koa-static"
import bodyParser from "koa-bodyparser"
import { AppContext, AppState } from "./types"
import { initDirect } from "./direct/index"
import { errorHandler } from "./common/error-handler"
import { Cache } from "./common/cache";
import { createKoaShutdown } from "./common/koa-shutdown";
import { koaSignal } from "./common/koa-signal";
import { initDatabase } from "./common/database";

export async function init() {
  const onSignTerm = createTerminationListener("SIGTERM")
  const onSignInt = createTerminationListener("SIGINT")
  const onSignUp = createTerminationListener("SIGHUP")
  const cacheDir = path.resolve(__dirname, "./../.cache")
  const database = initDatabase(config.DATABASE_URL, config.DATABASE_SSL)
  const app = new Koa<AppState, AppContext>()
  const server = http.createServer(app.callback())
  const appShutdown = createKoaShutdown()
  const cache = new Cache()
  const direct = initDirect(database, cache)

  app.keys = config.APP_KEYS.split(";")
  app.proxy = true
  app.context.db = database
  app.context.cache = cache
  app.context.cacheDir = cacheDir
  app.use(appShutdown.middleware)
  app.use(koaSignal)
  app.use(conditional())
  app.use(etag())
  app.use(errorHandler)
  app.use(bodyParser())
  app.use(koaStatic(__dirname + "/../public"))
  app.use(direct.router.routes())
  app.on("error", onAppError)
  process.on("SIGHUP", onSignUp)
  process.on("SIGINT", onSignInt)
  process.on("SIGTERM", onSignTerm)
  server.on("upgrade", onUpgrade)
  server.listen(config.PORT, () => console.info(`listening on port ${config.PORT}`))

  return {
    dispose
  }

  async function dispose() {
    appShutdown.dispose()
    cache.dispose()
    database.dispose()
    process.off("SIGHUP", onSignUp)
    process.off("SIGINT", onSignInt)
    process.off("SIGTERM", onSignTerm)
  }

  function onAppError(err: any) {
    if (err instanceof Error && "code" in err) {
      return console.debug("app error", err)
    }

    console.error("koa error: ", err)
  }

  function onUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer) {
    const requestUrl = String(request.url || "/")

    if (requestUrl.startsWith("/direct/ws")) {
      return direct.upgrade(request, socket, head)
    }

    return socket.destroy()
  }

  function createTerminationListener(signalName: string) {
    return async function terminationListener() {
      console.log(`Received ${signalName}...`)

      setTimeout(forceExit, 5000).unref()

      try {
        await dispose()
        process.exit(0)
      }
      catch (err) {
        console.error(err)
        process.exit(1)
      }
    }

    function forceExit() {
      console.log(`...waited 5s after ${signalName}, exiting.`)
      process.exit(1)
    }
  }
}
