import { ParameterizedContext } from "koa"
import { AccessTokenInfo } from "../common/livechat-accounts-api"
import { AppContext, AppState, QueryExecutor } from "../types"

export interface DB$Chat {
  id: number
  license_id: number
  user_a_id: string
  user_b_id: string
  seen_till_message_id_a: number
  seen_till_message_id_b: number
  last_message_id: number,
  last_message_text: string | null
  last_message_author_id: string | null
  last_message_ts: number
  ts: number
}

export interface DB$Message {
  id: number
  chat_id: number
  license_id: number
  random_id: number
  author_id: string
  text: string
  ts: number
}

export interface DB$Status {
  license_id: number
  user_id: string
  status: "online" | "offline"
  updated_at: number
}

export type DirectState = AppState & {
  accessTokenInfo?: AccessTokenInfo
}

export type DirectContext = ParameterizedContext<DirectState, AppContext & {
  params: any
}>

export interface RTM$Context {
  readonly pg: QueryExecutor
  readonly ts: number
  readonly payload?: any
  readonly session?: RTM$Session
  setSession(session: RTM$Session): void
  sendPushToUser(userId: string, push: Pushes): void
  sendPushToLicense(licenseId: number, push: Pushes): void
}

export interface RTM$Session {
  userId: string
  licenseId: number
}

 interface Public$Me {
  user_id: string
  license_id: number
}

export interface Public$Chat {
  id: number
  user_a_id: string
  user_b_id: string
  seen_till_message_id_a: number
  seen_till_message_id_b: number
  last_message_id: number | null
  last_message_text: string | null
  last_message_author_id: string | null
  last_message_ts: number
  ts: number
}

export interface Public$Message {
  id: number
  text: string
  author_id: string
  random_id: number
  ts: number
}

export interface Public$UserStatus {
  user_id: string
  status: "online" | "offline"
  updated_at: number
}

export type Pushes = Push$ChatCreated |
  Push$MessageCreated |
  Push$MessageSeen |
  Push$UserStatusUpdated |
  Push$UserStatusUpdated_DEPRECATED |
  Push$OnTyping;

export interface Push$ChatCreated {
  push: "chatCreated"
  payload: {
    chat: Public$Chat
  }
}

export interface Push$MessageCreated {
  push: "messageCreated"
  payload: {
    chat_id: number,
    message: Public$Message,
  }
}

export interface Push$MessageSeen {
  push: "messageSeen"
  payload: {
    chat_id: number
    user_id: string
    message_id: number
  }
}

export interface Push$UserStatusUpdated {
  push: "user_status_updated"
  payload: {
    status: Public$UserStatus
    ts: number
  }
}

export interface Push$UserStatusUpdated_DEPRECATED {
  push: "userStatusUpdated"
  payload: Public$UserStatus
}

export interface Push$OnTyping {
  push: "onTyping"
  payload: {
    chat_id: number
    user_id: string
    is_typing: boolean
  }
}

export type Methods = Method$Ping |
  Method$SignIn |
  Method$GetState |
  Method$GetChats |
  Method$GetChat |
  Method$CreateChat |
  Method$CreateMessage |
  Method$GetMessages |
  Method$ReadMessages |
  Method$GetUserStatuses |
  Method$SetTyping;

export interface Method$Ping {
  method: "ping",
  payload: {
    ts?: number
  }
  response: {
    ts?: number
  }
}

export interface Method$SignIn {
  method: "sign_in"
  payload: {
    access_token: string
  }
  response: {
    me: Public$Me,
    ts: number,
  }
}

export interface Method$GetState {
  method: "get_state"
  payload: {}
  response: {
    ts: number
  }
}

export interface Method$GetChats {
  method: "getChats"
  payload: {
    limit: number
    offset_id: number
    ts: number
  }
  response: Public$Chat[]
}

interface Method$GetChat {
  method: "get_chat"
  payload: {
    limit: number
    offset_id: number
    ts: number
  }
  response: Public$Chat[]
}

export interface Method$CreateChat {
  method: "createChat"
  payload: {
    user_id: string
  }
  response: Public$Chat
}

export interface Method$GetMessages {
  method: "getMessages"
  payload: {
    chat_id: number
    limit: number
    offset_id: number
  }
  response: Public$Message[]
}

export interface Method$ReadMessages {
  method: "readMessages"
  payload: {
    chat_id: number
    message_id: number
  }
  response: {}
}

export interface Method$CreateMessage {
  method: "createMessage"
  payload: {
    chat_id: number
    random_id: number
    text: string
  }
  response: Public$Message
}

export interface Method$GetUserStatuses {
  method: "getUserStatuses"
  payload: {}
  response: Public$UserStatus[]
}

export interface Method$SetTyping {
  method: "setTyping"
  payload: {
    chat_id: number
    is_typing: boolean
  }
  response: {}
}
