import { DB$Chat, DB$Message, DB$Status, Public$Chat, Public$Message, Public$UserStatus, Push$MessageCreated } from "./types"

export function getPublicChat(chat: DB$Chat): Public$Chat {
  return {
    id: chat.id,
    user_a_id: chat.user_a_id,
    seen_till_message_id_a: chat.seen_till_message_id_a,
    user_b_id: chat.user_b_id,
    seen_till_message_id_b: chat.seen_till_message_id_b,
    last_message_id: chat.last_message_id,
    last_message_text: chat.last_message_text,
    last_message_author_id: chat.last_message_author_id,
    last_message_ts: chat.last_message_ts,
    ts: chat.ts,
  }
}

export function getPublicMessage(message: DB$Message): Public$Message {
  return {
    id: message.id,
    text: message.text,
    random_id: message.random_id,
    author_id: message.author_id,
    ts: message.ts,
  }
}

export function getPublicStatus(status: DB$Status): Public$UserStatus {
  return {
    user_id: status.user_id,
    status: status.status,
    updated_at: status.updated_at,
  }
}

export function getTimestamp() {
  return Math.floor(Date.now() / 1000)
}