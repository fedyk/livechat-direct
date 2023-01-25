import { ErrorWithType } from "../common/error-with-type";
import { findChatById, incChatLastMessageId, insertMessage } from "./database";
import { getPublicMessage, getTimestamp } from "./helpers";
import { Method$CreateMessage, Push$MessageCreated, RTM$Context } from "./types";

export async function createMessage(ctx: RTM$Context): Promise<Method$CreateMessage["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const p = parsePayload(ctx.payload)
  const chat = await findChatById(ctx.pg, p.chat_id)
  const ts = getTimestamp()

  if (!chat) {
    throw new ErrorWithType("Chat not found", "chat_not_found", 404)
  }

  if (chat.user_a_id !== ctx.session.userId && chat.user_b_id !== ctx.session.userId) {
    throw new ErrorWithType("Access retricted", "restricted_chat", 403)
  }

  const messageId = await incChatLastMessageId(ctx.pg, {
    id: chat.id,
    last_message_author_id: ctx.session.userId,
    last_message_text: p.text,
    last_message_ts: ts,
    ts: ts,
  })

  if (messageId == null) {
    throw new ErrorWithType("Fail to reserve an idenificator for message", "internal", 500)
  }

  const message = await insertMessage(ctx.pg, {
    id: messageId,
    license_id: ctx.session.licenseId,
    random_id: p.random_id,
    chat_id: p.chat_id,
    author_id: ctx.session.userId,
    text: p.text,
    ts: ts,
  })

  const publicMessage = getPublicMessage(message)

  const push: Push$MessageCreated = {
    push: "messageCreated",
    payload: {
      chat_id: p.chat_id,
      message: publicMessage
    }
  }

  ctx.sendPushToUser(chat.user_a_id, push)
  ctx.sendPushToUser(chat.user_b_id, push)

  return publicMessage
}

function parsePayload(payload: any = {}): Method$CreateMessage["payload"] {
  const chat_id = Number(payload?.chat_id)
  const random_id = Number(payload?.random_id)
  const text = String(payload?.text ?? 0).trim()

  if (Number.isNaN(chat_id)) {
    throw new ErrorWithType("`chat_id` need to be a number", "empty_text", 400)
  }

  if (Number.isNaN(random_id)) {
    throw new ErrorWithType("`random_id` need to be a number", "empty_text", 400)
  }

  if (text.length === 0) {
    throw new ErrorWithType("`text` is required", "empty_text", 400)
  }

  return { chat_id, random_id, text }
}
