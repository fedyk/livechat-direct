import fetch, { RequestInit, Response } from "node-fetch"
import { ErrorWithType } from "./error-with-type"

export type AccessTokenInfo = ReturnType<typeof parseTokenInfo>

export function getAccessTokenInfo(accessToken: string) {
  return performAccounts(`info?code=${encodeURIComponent(accessToken)}`, "GET", void 0)
    .then(parseTokenInfo)
}

/**
 * parse Authorization header
 */
export function parseAuthorization(authorization?: any) {
  const parts = String(authorization ?? "").trim().split(" ")

  if (parts.length !== 2) {
    throw new ErrorWithType("Invalid access token", "authorization", 400)
  }

  const type = parts[0].toLowerCase()
  const accessToken = parts[1]

  if (type !== "bearer") {
    throw new ErrorWithType("Unsupported authorization token", "authorization", 400)
  }

  return { type, accessToken }
}

function performAccounts<T = any>(path: string, method: string, payload: any = null, options?: Partial<RequestInit>) {
  const url = `https://accounts.livechat.com/${path}`
  const headers = {
    "Content-Type": "application/json",
  }

  return fetch(url, {
    ...options,
    method: method,
    body: payload ? JSON.stringify(payload) : void 0,
    headers: headers,
  }).then(resp => parseResponse<T>(resp))
}

function parseResponse<T = any>(response: Response) {
  return response.text().then(function (text) {
    let json

    try {
      json = JSON.parse(text)
    }
    catch (err) {
      throw new ErrorWithType(text, "internal", response.status)
    }

    if (response.status === 200) {
      return json as T
    }

    const message = json.result || json.error_description || JSON.stringify(json)

    throw new ErrorWithType(message, "authorization", response.status)
  })
}

function parseTokenInfo(data: any) {
  return {
    accessToken: String(data?.access_token ?? ""),
    refreshToken: String(data?.refresh_token ?? ""),
    entityId: String(data?.entity_id),
    clientId: String(data?.client_id),
    accountId: String(data?.account_id),
    organizationId: String(data?.organization_id),
    expiresIn: Number(data?.expires_in ?? "0"),
    scope: String(data?.scope),
    licenseId: Number(data?.license_id ?? "0"),
    tokenType: String(data?.token_type ?? "")
  }
}
