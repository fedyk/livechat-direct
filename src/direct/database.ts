import { QueryExecutor } from "../types"
import { DB$Chat, DB$Message, DB$Status } from "./types"

/**
 * Chats
 */

interface FindChats$Options {
  userId: string
  offsetId: number
  limit: number
  ts: number
}

export function findChats(pg: QueryExecutor, options: FindChats$Options) {
  const query = buildQuery()

  return pg.query(query.sql, query.params).then(function (result) {
    return result.rows as DB$Chat[]
  })

  function buildQuery() {
    let c = 1
    let params: unknown[] = [options.userId]
    let sql = `SELECT * FROM direct_chats WHERE (user_a_id = $${c} OR user_b_id = $${c})`

    if (options.offsetId !== 0) {
      c++
      sql += ` AND id < $${c}`
      params.push(options.offsetId)
    }

    c++
    sql += ` AND ts > $${c}`
    params.push(options.ts)

    c++
    sql += ` ORDER BY id DESC LIMIT $${c}`
    params.push(options.limit)

    return { sql, params }
  }
}

export function findChatBetweenUsers(pg: QueryExecutor, user_a_id: string, user_b_id: string) {
  const sql = `SELECT * FROM direct_chats
    WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)
    LIMIT 1`

  return pg.query(sql, [user_a_id, user_b_id])
    .then(({ rows }) => rows.length > 0 ? rows[0] as DB$Chat : void 0)
}

export function findChatById(pg: QueryExecutor, id: number) {
  const sql = `SELECT * FROM direct_chats WHERE id = $1`

  return pg.query(sql, [id])
    .then(({ rows }) => rows.length > 0 ? rows[0] as DB$Chat : void 0)
}

export function insertChat(pg: QueryExecutor, c: Omit<DB$Chat, "id">) {
  const sql = `INSERT INTO direct_chats (
    license_id,
    user_a_id,
    user_b_id,
    seen_till_message_id_a,
    seen_till_message_id_b,
    last_message_id,
    last_message_text,
    last_message_author_id,
    last_message_ts,
    ts
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`

  return pg.query(sql, [
    c.license_id,
    c.user_a_id,
    c.user_b_id,
    c.seen_till_message_id_a,
    c.seen_till_message_id_b,
    c.last_message_id,
    c.last_message_text,
    c.last_message_author_id,
    c.last_message_ts,
    c.ts
  ]).then(function (result) {
    return result.rows[0] as DB$Chat
  })
}

export function incChatLastMessageId(pg: QueryExecutor, c: Pick<DB$Chat, "id" |
  "last_message_author_id" |
  "last_message_text" |
  "last_message_ts" |
  "ts"
>) {
  const sql = `UPDATE direct_chats
    SET last_message_id = last_message_id + 1, last_message_text = $1, last_message_author_id = $2, last_message_ts = $3, ts = $4
    WHERE id = $5
    RETURNING last_message_id`

  return pg.query(sql, [c.last_message_text, c.last_message_author_id, c.last_message_ts, c.ts, c.id]).then(function (result) {
    if (result.rows.length === 1 && result.rows[0].last_message_id) {
      return Number(result.rows[0].last_message_id)
    }

    return null
  })
}

export function updateSeenTillMessageIdA(pg: QueryExecutor, c: Pick<DB$Chat, "id" | "seen_till_message_id_a">) {
  const sql = `UPDATE direct_chats SET seen_till_message_id_a = $1 WHERE id = $2 RETURNING *`

  return pg.query(sql, [c.seen_till_message_id_a, c.id]).then(function (result) {
    return result.rows[0] as DB$Chat
  })
}

export function updateSeenTillMessageIdB(pg: QueryExecutor, c: Pick<DB$Chat, "id" | "seen_till_message_id_b">) {
  const sql = `UPDATE direct_chats SET seen_till_message_id_b = $1 WHERE id = $2 RETURNING *`

  return pg.query(sql, [c.seen_till_message_id_b, c.id]).then(function (result) {
    return result.rows[0] as DB$Chat
  })
}

/**
 * Messages
 */
export function findChatMessages(pg: QueryExecutor, chatId: number, offsetId: number, limit: number) {
  const query = buildQuery()

  return pg.query(query.sql, query.params)
    .then(result => result.rows as DB$Message[])

  function buildQuery() {
    const params: unknown[] = [chatId]
    let sql = `SELECT * FROM direct_messages WHERE chat_id = $1 `

    if (offsetId > 0) {
      params.push(offsetId)
      sql += `AND id < $${params.length} `
    }

    params.push(limit)
    sql += `ORDER BY id DESC LIMIT $${params.length}`

    return { sql, params }
  }
}

export function insertMessage(pg: QueryExecutor, m: DB$Message) {
  const sql = `INSERT INTO direct_messages (
    id,
    random_id,
    chat_id,
    license_id,
    author_id,
    text,
    ts
  ) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`

  return pg.query(sql, [
    m.id,
    m.random_id,
    m.chat_id,
    m.license_id,
    m.author_id,
    m.text,
    m.ts,
  ]).then(function (result) {
    return result.rows[0] as DB$Message
  })
}

/**
 * Status
 */

export function insertOrUpdateStatus(pg: QueryExecutor, a: Omit<DB$Status, "id">) {
  const sql = `INSERT INTO direct_statuses (license_id, user_id, status, updated_at)
    VALUES($1, $2, $3, $4)
    ON CONFLICT (user_id) DO UPDATE
    SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
    RETURNING *`

  return pg.query(sql, [a.license_id, a.user_id, a.status, a.updated_at])
    .then(result => result.rows[0] as DB$Status)
}

export function findStatusesByLicenseId(pg: QueryExecutor, licenseId: number) {
  const sql = `SELECT * FROM direct_statuses WHERE license_id = $1`

  return pg.query(sql, [licenseId])
    .then(result => result.rows as DB$Status[])
}