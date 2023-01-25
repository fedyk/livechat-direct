import pg from "pg"
import Debug from "debug"
import { ConnectionOptions } from "tls"

const debug = Debug("database")

export type Database = ReturnType<typeof initDatabase>

export function initDatabase(url: string, ssl: boolean | ConnectionOptions) {
  const debugQuery = debug.extend("query")
  const pool = new pg.Pool({
    connectionString: url,
    ssl: ssl,
    max: 10
  })

  pool.on("error", function (err) {
    debug.extend("error")("error=%s", err)
  })

  return {
    query,
    dispose,
    get totalPoolCount() {
      return pool.totalCount
    },
    get idlePoolCount() {
      return pool.idleCount
    },
    get waitingPoolCount() {
      return pool.waitingCount
    }
  }

  function dispose() {
    pool.end().catch(function (err) {
      console.error("fail to end database pool", err)
    })
  }

  function query(sql: string, values?: any[]) {
    debugQuery(`query=${sql}`)
    return pool.query(sql, values)
  }
}
