import { dev } from "./livechat-api";

export function formatWebhook(webhook: dev.AppWebhook, details?: string) {
  let message = `<b>${webhook.applicationName}</b>: event <code>${webhook.event}</code> on <code>${webhook.licenseID}</code>`

  if (webhook.event === "payment_collected") {
    message += ` <b>$${webhook.payload.total / 100}</b>`
  }

  if (details) {
    message += ` ${details}`
  }

  return message
}
