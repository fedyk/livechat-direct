import { Method$SignIn, RTM$Context } from "./types";
import { ErrorWithType } from "../common/error-with-type";
import { getAccessTokenInfo } from "../common/livechat-accounts-api";
import { insertOrUpdateStatus } from "./database";

export async function signIn(ctx: RTM$Context): Promise<Method$SignIn["response"]> {
  const payload = parsePayload(ctx.payload)
  const info = await getAccessTokenInfo(payload.access_token)

  await insertOrUpdateStatus(ctx.pg, {
    license_id: info.licenseId,
    user_id: info.entityId,
    status: "online",
    updated_at: ctx.ts,
  })

  await ctx.sendPushToLicense(info.licenseId, {
    push: "user_status_updated",
    payload: {
      status: {
        user_id: info.entityId,
        status: "online",
        updated_at: ctx.ts
      },
      ts: ctx.ts,
    }
  })

  await ctx.setSession({
    userId: info.entityId,
    licenseId: info.licenseId,
  })

  return {
    ts: ctx.ts,
    me: {
      user_id: info.entityId,
      license_id: info.licenseId,
    }
  }
}

function parsePayload(payload: any) {
  const access_token = String(payload?.access_token ?? "").trim()

  if (access_token.length === 0) {
    throw new ErrorWithType("`access_token` is required", "validation", 400)
  }

  return {
    access_token
  }
}
