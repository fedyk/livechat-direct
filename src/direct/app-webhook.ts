import { dev } from "../common/livechat-api";
import { formatWebhook } from "../common/livechat-app-webhooks";
import { DirectContext } from "./types";

const debug = require("debug")("direct:app-webhook")

export async function appWebhook(ctx: DirectContext) {
  debug(formatWebhook(dev.parseAppWebHook(ctx.request.body)))

  ctx.status = 200
  ctx.body = "ok"
}
