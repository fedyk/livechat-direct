import * as koa from "koa"
import { Cache } from "./common/cache"
import { Database } from "./common/database"

interface Context {
  db: Database
  cache: Cache
  cacheDir: string
  signal: AbortSignal
}

export interface AppState {
  userId?: string
  licenseId?: number
  accessToken?: string
  title?: string
  scripts?: string[]
  layout?: "default" | "empty"
  container?: "default" | "fluid"
}

export type AppContext = koa.ParameterizedContext<AppState, Context>
export type AppNext = koa.Next

export type QueryExecutor = Database
