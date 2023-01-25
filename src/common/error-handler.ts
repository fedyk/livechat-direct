import Debug from "debug"
import { isAbortError } from "./is-abort-error.js"
import { AppContext, AppNext } from "../types"
import { ErrorWithType } from "./error-with-type"

const debug = Debug("error-handler")

export function errorHandler(ctx: AppContext, next: AppNext) {
  return next().catch(function (err: unknown) {
    const isAjax = ctx.accepts("html", "json") === "json" || ctx.request.type === "application/json"
    let status = 500
    let type = "internal_error"
    let message = "Internal error"
    let data: unknown = {}

    if (err instanceof ErrorWithType) {
      status = err.status
      type = err.type
      data = err.data
    }

    if (err instanceof Error) {
      message = err.message
    }

    if (isAbortError(err)) {
      status = 400 // abort errors are not critical
      type = "timeout_error"
    }

    if (status === 500) {
      console.error("koa: ", err)

      console.error(err, {
        extra: {
          state: JSON.stringify(ctx.state),
          method: ctx.request.method,
          path: ctx.request.path,
          err_type: type,
          err_data: data,
          err_message: message
        }
      })
    }

    debug("request ended with error; status=%s type=%s message='%s' is_ajax", status, type, message, isAjax)

    ctx.status = status

    if (isAjax) {
      ctx.body = { error: message, type: type, data: data }
    }
    else {
      ctx.body = renderSimpleErrorPage(message, type, data)
    }
  })
}

function renderSimpleErrorPage(body: string, type?: string, data?: any) {
  return `<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="theme-color" content="#000000">
    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro&display=swap" rel="stylesheet">
    <title>Something went wrong</title>
    <style>
      html,
      body {
        font-family: Source Sans Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.46;
        color: #424d57;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    </style>
  </head>
  <body>
    <div>
      <strong>${body}</strong>
      <div>Error code: ${type}</div>
      ${data ? `<code>${JSON.stringify(data, null, 2)}</code>` : ""}
    </body>
  </html>`
}
