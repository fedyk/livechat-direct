import { Next } from "koa";
import { NPM_PACKAGE_VERSION } from "../config";
import { AppContext } from "../types";

export async function template(ctx: AppContext, next: Next) {
  await next()

  ctx.response.body = renderBody(String(ctx.response.body));
}

function renderBody(body: string) {
  return /*html*/`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Direct for LiveChat</title>
    <link rel="icon" type="image/png" href="/direct/icon.png?v${NPM_PACKAGE_VERSION}" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,600" type="text/css" />
    <link rel="stylesheet" href="/direct/styles.css?v=${NPM_PACKAGE_VERSION}" />
    <script>var exports = {};</script>
    <script src="/common/accounts-sdk-2.0.5.min.js?${NPM_PACKAGE_VERSION}"></script>
    <script src="/common/agentapp-sdk-1.5.1.min.js?${NPM_PACKAGE_VERSION}"></script>
    <script src="/common/preact.umd.js?${NPM_PACKAGE_VERSION}"></script>
    <script src="/direct/widget.js?${NPM_PACKAGE_VERSION}"></script>
    <script>
      LiveChat.createFullscreenWidget()
        .then(function(fullscreenWidget) {
          window.fullscreenWidget = fullscreenWidget
        })
        .catch(function(err) {
          console.warn("LiveChat SDK: fail to create full screen widget")
        })
    </script>
  </head>
  
  <body>
  ${body}
  </body>
  
</html>`
}
