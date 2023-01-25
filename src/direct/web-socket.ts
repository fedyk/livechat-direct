import Debug from "debug"
import WebSocket from "ws";
import * as net from "net";
import * as http from "http";
import * as buffer from "buffer";
import { promisify } from "util";
import { getChats } from "./get-chats";
import { ErrorWithType } from "../common/error-with-type";
import { AccessTokenInfo } from "../common/livechat-accounts-api";
import { getUserStatuses } from "./get-statuses";
import { createMessage } from "./create-message";
import { getMessages } from "./get-messages";
import { createChat } from "./create-chat";
import { QueryExecutor } from "../types";
import { Cache } from "../common/cache";
import { insertOrUpdateStatus } from "./database";
import { ping } from "./pong";
import { getPublicStatus, getTimestamp } from "./helpers";
import { readMessages } from "./read-messages";
import { setTyping } from "./set-typing";
import { Limiter } from "./limiter";
import { getTokenInfo } from "./tokens";
import { Methods, Pushes, RTM$Context, RTM$Session } from "./types";
import { getState } from "./get-state";
import { signIn } from "./sign-in";

const debug = Debug("direct:web-socket")

interface WebSocketEx extends WebSocket {
  isAlive?: boolean
  licenseId?: number
  userId?: string
  limiter?: Limiter
  session?: RTM$Session
}

export function createWebSocket(pg: QueryExecutor, cache: Cache) {
  const server = new WebSocket.Server({
    noServer: true
  })
  const interval = setInterval(pingConnections, 30000)

  server.on("connection", onConnection)

  return {
    dispose,
    upgrade
  }

  async function dispose() {
    clearInterval(interval)
    await promisify(server.close)()
  }

  function upgrade(request: http.IncomingMessage, socket: net.Socket, head: buffer.Buffer) {
    const url = new URL(request.url || "", `https://${request.headers.host}`)
    const token = url.searchParams.get("token")

    if (!token) {
      return socket.destroy()
    }

    getTokenInfo(cache, token).then(function (info) {
      if (!info) {
        return socket.destroy()
      }

      if (getOpenConnesByUserId(info.entityId) > 10) {
        return socket.destroy()
      }

      server.handleUpgrade(request, socket, head, function (connection) {
        server.emit("connection", connection, info)
      })
    }).catch(function (err) {
      console.error("fail to get token info", err)
      socket.destroy()
    })
  }

  function pingConnections() {
    debug("ping %s connections", server.clients.size)

    server.clients.forEach(function (ws: WebSocketEx) {
      if (ws.isAlive === false) {
        return ws.terminate()
      }

      ws.isAlive = false
      ws.ping()
    })
  }

  function getOpenConnesByUserId(userId: string) {
    let count = 0

    server.clients.forEach(function (ws: WebSocketEx) {
      if (ws.userId === userId) {
        count++
      }
    })

    return count
  }

  function onConnection(ws: WebSocketEx, info: AccessTokenInfo) {
    ws.isAlive = true
    ws.userId = info.entityId
    ws.licenseId = info.licenseId
    ws.limiter = new Limiter({
      max: 10,
      highWater: 10,
      duration: 1000
    })

    if (info) {
      ws.session = {
        userId: info.entityId,
        licenseId: info.licenseId,
      }
    }

    ws.on("pong", onPong)
    ws.on("error", onError)
    ws.on("close", onClose)
    ws.on("message", onMessage)

    updateUserStatus("online")

    function onPong() {
      ws.isAlive = true
    }

    function onError() { }

    function onClose() {
      ws.off("error", onError)
      ws.off("close", onClose)
      ws.off("message", onMessage)

      if (getOpenConnesByUserId(info.entityId) === 0) {
        updateUserStatus("offline")
      }

      ws.isAlive = void 0
      ws.userId = void 0
      ws.licenseId = void 0
      ws.limiter?.dispose()
      ws.limiter = void 0
    }

    async function onMessage(data: WebSocket.Data, isBinary: boolean) {
      let method
      let payload
      let requestId
      let response

      try {
        const json = parseData(data, isBinary)
        const request = parseRequest(parseJSON(json))

        method = request.method
        payload = request.payload
        requestId = request.requestId

        if (ws.limiter) {
          const limit = ws.limiter.get()

          if (limit.remaining === 0) {
            throw new ErrorWithType("Too many requests", "too_many_requests", 420)
          }
        }

        const context: RTM$Context = {
          pg: pg,
          payload,
          ts: getTimestamp(),
          session: ws.session,
          setSession,
          sendPushToUser,
          sendPushToLicense,
        }

        response = await onRequest(method,  context)

        sendData(ws, createResponse(method, response, requestId, 200))
      }
      catch (err) {
        if (!(err instanceof ErrorWithType) || err.status === 500) {
          console.error(err)
        }

        sendData(ws, createErrorResponse(err, method || "", requestId || -1))
      }
    }

    function onRequest(action: Methods["method"], ctx: RTM$Context) {
      switch (action) {
        case "ping":
          return ping(ctx)
        case "sign_in":
          return signIn(ctx)
        case "get_state":
          return getState(ctx)
        case "getChats":
          return getChats(ctx)
        case "createChat":
          return createChat(ctx)
        case "createMessage":
          return createMessage(ctx)
        case "getMessages":
          return getMessages(ctx)
        case "readMessages":
          return readMessages(ctx)
        case "setTyping":
          return setTyping(ctx)
        case "getUserStatuses":
          return getUserStatuses(ctx)
        default:
          throw new ErrorWithType("Unsupported action", "missed_action", 404)
      }
    }

    function updateUserStatus(status: "online" | "offline") {
      insertOrUpdateStatus(pg, {
        license_id: info.licenseId,
        user_id: info.entityId,
        status: status,
        updated_at: getTimestamp(),
      })
        .then(function (status) {
          licenseEmitter(info.licenseId, {
            push: "userStatusUpdated",
            payload: getPublicStatus(status),
          })
        })
        .catch(function (err) {
          console.error(err)
        })
    }

    function setSession(session: RTM$Session) {
      ws.session = session
    }

    function sendPushToUser(userId: string, push: Pushes) {
      userEmitter(userId, push)
    }

    function sendPushToLicense(licenseId: number, push: Pushes) {
      licenseEmitter(licenseId, push)
    }
  }

  function userEmitter(userId: string, push: Pushes) {
    server.clients.forEach(function (ws: WebSocketEx) {
      if (ws.readyState === WebSocket.OPEN && ws.userId === userId) {
        sendData(ws, createPush(push))
      }
    })
  }

  function licenseEmitter(licenseId: number, push: Pushes) {
    server.clients.forEach(function (ws: WebSocketEx) {
      if (ws.readyState === WebSocket.OPEN && ws.licenseId === licenseId) {
        sendData(ws, createPush(push))
      }
    })
  }
}

function parseData(data: WebSocket.Data, isBinary: boolean): string {
  if (isBinary) {
    throw new RangeError("binary data are not supported")
  }

  if (typeof data === "string") {
    return data
  }

  if (data instanceof Buffer) {
    return data.toString()
  }

  if (Array.isArray(data)) {
    throw new RangeError("Array of Buffers is not supported")
  }

  if (data instanceof ArrayBuffer) {
    throw new RangeError("ArrayBuffer is not supported")
  }

  throw new RangeError("Unsupportted type of data")
}

function parseJSON(data: any) {
  try {
    return JSON.parse(data)
  }
  catch (er) {
    return void 0;
  }
}

function parseRequest(message: any) {
  if (!Array.isArray(message) || message.length !== 3) {
    throw new ErrorWithType(`Request should be following: ['method', payload, requestId]`, "wrong_message_format", 400)
  }

  const method = String(message[0])
  const payload = message[1] || {}
  const requestId = Number(message[2])

  if (Number.isNaN(requestId)) {
    throw new ErrorWithType("`requestId` needs to be a valid int", "wrong_message_format", 400)
  }

  return {
    method: method as Methods["method"],
    payload: payload as Methods["payload"],
    requestId
  }
}

function createResponse(action: string, payload: any, requestId: number, status: number) {
  return JSON.stringify([
    action,
    payload,
    requestId,
    status
  ])
}

function createPush(push: Pushes) {
  return JSON.stringify([push.push, push.payload])
}

function createErrorResponse(err: any, action: string, requestId: number) {
  const message = err instanceof Error ? err.message : String(err)
  const type = err instanceof ErrorWithType ? err.type : "internal"
  const status = err instanceof ErrorWithType ? (err.status || 500) : 500

  return createResponse(action, { message, type }, requestId, status)
}

function sendData(ws: WebSocket, data: any) {
  ws.send(data, function (err) {
    if (err) {
      console.error("fail to send data", err, data)
      ws.terminate()
    }
  })
}
