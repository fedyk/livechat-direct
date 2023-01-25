import { ErrorWithType } from "../common/error-with-type";
import { findChats } from "./database";
import { getPublicChat } from "./helpers";
import { DB$Chat, Method$GetChats, Public$Chat, RTM$Context } from "./types";

export async function getChats(ctx: RTM$Context): Promise<Method$GetChats["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const payload = parsePayload(ctx.payload)
  const chats = await findChats(ctx.pg, {
    userId: ctx.session.userId,
    offsetId: payload.offset_id,
    limit: payload.limit,
    ts: payload.ts,
  })

  return getPublicChats(chats)
}

function parsePayload(payload: any = {}): Method$GetChats["payload"] {
  const limit = Number(payload.limit ?? 50)
  const offset_id = Number(payload.offset_id ?? 0)
  const ts = Number(payload.ts ?? 0)

  if (Number.isNaN(limit)) {
    throw new ErrorWithType("`limin` need to be a number", "validation", 400)
  }

  if (limit < 1 || limit > 50) {
    throw new ErrorWithType("`limin` need to be within range 1-50", "validation", 400)
  }

  if (Number.isNaN(offset_id)) {
    throw new ErrorWithType("`offset_id` need to be a number", "validation", 400)
  }

  if (offset_id < 0) {
    throw new ErrorWithType("`offset_id` need to be possitive number", "validation", 400)
  }

  if (Number.isNaN(ts)) {
    throw new ErrorWithType("`ts` can't be invalid timestamp", "validation", 400)
  }

  return { limit, offset_id, ts }
}

function getPublicChats(chats: DB$Chat[]) {
  return chats.map<Public$Chat>(function (chat) {
    return getPublicChat(chat)
  })
}
