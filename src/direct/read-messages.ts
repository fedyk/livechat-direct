import { ErrorWithType } from "../common/error-with-type";
import { findChatById, updateSeenTillMessageIdA, updateSeenTillMessageIdB } from "./database";
import { DB$Chat, Method$ReadMessages, Push$MessageSeen, RTM$Context } from "./types";

export async function readMessages(ctx: RTM$Context): Promise<Method$ReadMessages["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const p = parsePayload(ctx.payload)
  let chat = await findChatById(ctx.pg, p.chat_id)

  if (!chat) {
    throw new ErrorWithType("Chat not found", "chat_not_found", 404)
  }

  validate(chat, ctx.session.userId, p.message_id)

  if (chat.user_a_id === ctx.session.userId) {
    chat = await updateSeenTillMessageIdA(ctx.pg, {
      id: chat.id,
      seen_till_message_id_a: p.message_id,
    })
  }

  if (chat.user_b_id === ctx.session.userId) {
    chat = await updateSeenTillMessageIdB(ctx.pg, {
      id: chat.id,
      seen_till_message_id_b: p.message_id,
    })
  }

  const push: Push$MessageSeen = {
    push: "messageSeen",
    payload: {
      chat_id: chat.id,
      user_id: ctx.session.userId,
      message_id: p.message_id
    }
  }

  ctx.sendPushToUser(chat.user_a_id, push)
  ctx.sendPushToUser(chat.user_b_id, push)

  return {}
}

function parsePayload(payload: any = {}): Method$ReadMessages["payload"] {
  const chat_id = Number(payload?.chat_id)
  const message_id = Number(payload?.message_id)

  if (Number.isNaN(chat_id)) {
    throw new ErrorWithType("`chat_id` need to be a number", "invalid_chat_id", 400)
  }

  if (Number.isNaN(message_id)) {
    throw new ErrorWithType("`message_id` need to be a number", "invalid_seen_up_to", 400)
  }

  return { chat_id, message_id }
}

function validate(chat: DB$Chat, userId: string, maxMessageId: number) {
  if (chat.user_a_id !== userId && chat.user_b_id !== userId) {
    throw new ErrorWithType("Access retricted", "restricted_chat", 403)
  }

  if (chat.user_a_id === userId) {
    if (chat.seen_till_message_id_a >= maxMessageId) {
      throw new ErrorWithType("`message_id` need to be greater that current value", "invalid_message_id", 400)
    }
  }

  if (chat.user_b_id === userId) {
    if (chat.seen_till_message_id_b >= maxMessageId) {
      throw new ErrorWithType("`seen_up_to` need to be greater that current value", "invalid_message_id", 400)
    }
  }
}
