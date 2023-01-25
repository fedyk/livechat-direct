import { DirectContext } from "./types";
import { CLIENT_ID, APP_REDIRECT_URL } from "./config";

export async function app(ctx: DirectContext) {
  const params = JSON.stringify({
    client_id: CLIENT_ID,
    redirect_uri: APP_REDIRECT_URL,
  })

  ctx.status = 200
  ctx.body = /*html*/`
    <div id="app" class="app">
      <div class="sticky-center">
        <div class="loader loader-large"></div>
      </div>
    </div>
    <script>
      initApp(${params}).catch(function(err) {
        console.error(err)
        alert(err.message)
      })
    </script>
  `
}
