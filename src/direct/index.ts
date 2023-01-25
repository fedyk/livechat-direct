import Router from "@koa/router";
import koaSend from "koa-send"
import { createDocsMiddleware } from "../common/create-docs-middleware";
import { template } from "./template";
import { app } from "./app";
import { DirectContext, DirectState } from "./types";
import { createWebSocket } from "./web-socket";
import { QueryExecutor } from "../types";
import { Cache } from "../common/cache";
import { appWebhook } from "./app-webhook";
import { getToken } from "./get-token";

export function initDirect(pg: QueryExecutor, cache: Cache) {
  const ws = createWebSocket(pg, cache)
  const router = new Router<DirectState, DirectContext>({
    prefix: "/direct"
  })

  router.get("/", template, app)
  router.get("/widget.js", serverWidget)
  router.get("/privacy", template, createDocsMiddleware("docs/direct/privacy.md"))
  router.get("/api", template, createDocsMiddleware("docs/direct/api.md"))
  router.post("/get_token", getToken)
  router.post("/app-webhook", appWebhook)

  return {
    router: router,
    dispose: dispose,
    upgrade: ws.upgrade,
  }

  function dispose() {
    ws.dispose()
  }

  function serverWidget(ctx: DirectContext) {
    return koaSend(ctx, "browser/widget.js", {
      root: __dirname,
      maxage: 1000 * 60 * 60 * 24 * 365,
    })
  }
}
