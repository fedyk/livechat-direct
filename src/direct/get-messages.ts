import { ErrorWithType } from "../common/error-with-type";
import { findChatById, findChatMessages, } from "./database";
import { getPublicMessage } from "./helpers";
import { Method$GetMessages, RTM$Context } from "./types";

export async function getMessages(ctx: RTM$Context): Promise<Method$GetMessages["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const { chat_id, offset_id, limit } = parsePayload(ctx.payload)
  const chat = await findChatById(ctx.pg, chat_id)

  if (!chat) {
    throw new ErrorWithType("chat doesn't exist", "not_exist", 404)
  }

  if (chat.user_a_id !== ctx.session.userId && chat.user_b_id !== ctx.session.userId) {
    throw new ErrorWithType("chat access restricted", "access_restricted", 403)
  }

  const messages = await findChatMessages(ctx.pg, chat_id, offset_id, limit)

  return messages.map(getPublicMessage)
}

function parsePayload(payload: any = {}): Method$GetMessages["payload"] {
  const chat_id = Number(payload.chat_id)
  const limit = Number(payload.limit ?? 50)
  const offset_id = Number(payload.offset_id ?? 0)

  if (Number.isNaN(chat_id)) {
    throw new ErrorWithType("`chat_id` need to be a number", "validation", 400)
  }

  if (Number.isNaN(limit)) {
    throw new ErrorWithType("`limin` need to be a number", "validation", 400)
  }

  if (limit < 1 || limit > 100) {
    throw new ErrorWithType("`limin` need to be within range 1-100", "validation", 400)
  }

  if (Number.isNaN(offset_id)) {
    throw new ErrorWithType("`offset_id` need to be a number", "validation", 400)
  }

  return { chat_id, limit, offset_id }
}
