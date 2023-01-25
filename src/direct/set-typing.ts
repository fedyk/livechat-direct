import { ErrorWithType } from "../common/error-with-type";
import { findChatById } from "./database";
import { Method$SetTyping, RTM$Context } from "./types";

export async function setTyping(ctx: RTM$Context): Promise<Method$SetTyping["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const payload = parsePayload(ctx.payload)
  const chat = await findChatById(ctx.pg, payload.chat_id)

  if (!chat) {
    throw new ErrorWithType("Chat not found", "chat_not_found", 404)
  }

  if (chat.user_a_id !== ctx.session.userId && chat.user_b_id !== ctx.session.userId) {
    throw new ErrorWithType("Access retricted", "restricted_chat", 403)
  }

  let emitterUserId = chat.user_a_id

  if (chat.user_a_id === ctx.session.userId) {
    emitterUserId = chat.user_b_id
  }

  ctx.sendPushToUser(emitterUserId, {
    push: "onTyping",
    payload: {
      chat_id: chat.id,
      user_id: ctx.session.userId,
      is_typing: payload.is_typing,
    }
  })

  return {}
}

function parsePayload(payload: any = {}): Method$SetTyping["payload"] {
  const chat_id = Number(payload.chat_id)
  const is_typing = Boolean(payload.is_typing)

  if (Number.isNaN(chat_id)) {
    throw new ErrorWithType("`chat_id` need to be a number", "validation", 400)
  }

  if (chat_id < 0) {
    throw new ErrorWithType("`chat_id` need to be possitive number", "validation", 400)
  }

  return { chat_id, is_typing }
}
