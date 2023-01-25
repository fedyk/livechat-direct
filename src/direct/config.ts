import { APP_HOST } from "../config"

if (!process.env.DIRECT_CLIENT_ID) {
  throw new Error("`process.env.DIRECT_CLIENT_ID` can't be empty")
}

export const CLIENT_ID = String(process.env.DIRECT_CLIENT_ID ?? "").trim()
export const APP_REDIRECT_URL = `https://${APP_HOST}/direct`
