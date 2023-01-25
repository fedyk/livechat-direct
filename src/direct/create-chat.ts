import { ErrorWithType } from "../common/error-with-type";
import { findChatBetweenUsers, insertChat } from "./database";
import { getPublicChat, getTimestamp } from "./helpers";
import { Method$CreateChat, RTM$Context } from "./types";

export async function createChat(ctx: RTM$Context): Promise<Method$CreateChat["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const p = parsePayload(ctx.payload)
  let chat = await findChatBetweenUsers(ctx.pg, ctx.session.userId, p.user_id)

  if (chat) {
    throw new ErrorWithType("Chat between users already exist", "chat_already_exist", 409)
  }

  chat = await insertChat(ctx.pg, {
    license_id: ctx.session.licenseId,
    user_a_id: ctx.session.userId,
    user_b_id: p.user_id,
    seen_till_message_id_a: 0,
    seen_till_message_id_b: 0,
    last_message_id: 0,
    last_message_text: null,
    last_message_author_id: null,
    last_message_ts: 0,
    ts: getTimestamp()
  })

  const publicChat = getPublicChat(chat)

  ctx.sendPushToUser(p.user_id, {
    push:"chatCreated",
    payload: {
      chat: publicChat
    }
  })

  return publicChat
}

function parsePayload(payload: any = {}): Method$CreateChat["payload"] {
  const user_id = String(payload.user_id ?? "").trim().toLocaleLowerCase()

  if (user_id.length === 0) {
    throw new ErrorWithType("`user_id` is required", "validation_error", 400)
  }

  return { user_id }
}
