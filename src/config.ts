import * as dotenv from "dotenv"

dotenv.config({
  path: __dirname + "/../.env"
})

if (!process.env.APP_KEYS) {
  throw new Error('No keys config. Set APP_KEYS environment variable. The format is <string_key1>;<string_key2>.')
}

if (!process.env.DATABASE_URL) {
  throw new Error("`process.env.DATABASE_URL` can't be empty")
}

if (!process.env.APP_HOST) {
  throw new Error("`process.env.APP_HOST` can't be empty")
}

process.env.TZ = "UTC"

if (new Date().getTimezoneOffset() !== 0) {
  throw new Error("server timezone should be `UTC`")
}

export const NODE_ENV = String(process.env.NODE_ENV ?? "development")
export const PORT = Number(process.env.PORT || 3000)
export const APP_KEYS = process.env.APP_KEYS + ""
export const DATABASE_URL = String(process.env.DATABASE_URL ?? "").trim()
export const DATABASE_SSL = process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false
export const APP_HOST = String(process.env.APP_HOST ?? "")
export const NPM_PACKAGE_VERSION = String(process.env.npm_package_version)

if (Number.isNaN(PORT)) {
  throw new Error("`POST` should be a valid number")
}
