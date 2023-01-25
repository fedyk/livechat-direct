import * as crypto from "crypto"
import { AccessTokenInfo, getAccessTokenInfo, parseAuthorization } from "../common/livechat-accounts-api";
import { getTokenInfo, setTokenInfo } from "./tokens";
import { DirectContext } from "./types";

export async function getToken(ctx: DirectContext) {
  const authorization = parseAuthorization(ctx.headers.authorization)
  const token = crypto.createHash("md5").update(authorization.accessToken).digest("hex")
  let info = await getTokenInfo(ctx.cache, token)

  if (info) {
    return done(200, token, info)
  }

  info = await getAccessTokenInfo(authorization.accessToken)

  await setTokenInfo(ctx.cache, token, info)

  return done(200, token, info)

  function done(status: number, token: string, info: AccessTokenInfo) {
    ctx.status = status
    ctx.body = {
      token,
      info: {
        access_token: info.accessToken,
        account_id: info.accountId,
        client_id: info.clientId,
        entity_id: info.entityId,
        expires_in: info.expiresIn,
        license_id: info.licenseId,
        organization_id: info.organizationId,
        scope: info.scope,
        token_type: info.tokenType,
      }
    }
  }
}
