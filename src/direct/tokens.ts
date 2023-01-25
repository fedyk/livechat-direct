import { Cache } from "../common/cache"
import { ErrorWithType } from "../common/error-with-type"
import { AccessTokenInfo } from "../common/livechat-accounts-api"

function getTokenCacheKey(token: string) {
  return `direct_token_${token}`
}

export function getTokenInfo(cache: Cache, token: string) {
  return cache.get(getTokenCacheKey(token)).then(function (value) {
    if (!value) {
      return
    }

    return JSON.parse(value) as AccessTokenInfo
  })
}

export function setTokenInfo(cache: Cache, token: string, info: AccessTokenInfo) {
  return cache.set(getTokenCacheKey(token), JSON.stringify(info), info.expiresIn)
}
