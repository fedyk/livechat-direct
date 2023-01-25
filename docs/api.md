# Direct API

## Concepts

```ts
// current user
interface Me {
  userId: string
  licenseId: number
}

interface Chat {
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

interface Message {
  id: number
  text: string
  author_id: string
  random_id: number
  ts: number
}

interface UserStatus {
  user_id: string
  status: "online" | "offline"
  updated_at: number
}

```

## Methods

```ts
function ping({ ts: number}): { ts: number}

function sign_in({ access_token: string}): {
  me: Me
  ts: number
}

function get_state(): {
  ts: number
}

function getChats({
  limit: number = 50
  offset_id: number = 0
  ts: number = 0
}): Chat[]

function createChat({
  user_id: string
}): Chat

function createMessage({
  chat_id: string
  random_id: string
  text: string
}): Message

function getMessages({
  chat_id: string
  limit: number = 50
  offset_id: number = 0
}): Message[]

function readMessages({
  chat_id: number
  message_id: number
}): void

function setTyping({
  chat_id: number
  is_typing: boolean
}): void

function getUserStatuses(): UserStatus[]
```

## Pushes

```ts
["chatCreated", {
  chat: Chat
}]

["messageCreated", {
  chat_id: string
  message: Message
}]

["messageSeen", {
  chat_id: number
  user_id: string
  message_id: number
}]

["onTyping", {
  chat_id: number
  user_id: string
  is_typing: boolean
}]

// deprecated
["userStatusUpdated", UserStatus]

["user_status_updated", {
  status: UserStatus
  ts: number
}]

```
