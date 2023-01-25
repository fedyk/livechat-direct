import { ErrorWithType } from "../common/error-with-type";
import { Method$Ping, RTM$Context } from "./types";

export function ping(ctx: RTM$Context): Method$Ping["response"] {
  return parsePayload(ctx.payload)
}

function parsePayload(payload: any): Method$Ping["payload"] {
  let ts: number | undefined

  if (payload?.ts) {
    ts = Number(payload.ts)

    if (Number.isNaN(ts)) {
      throw new ErrorWithType("`ts` needs to be an valid number", "validation", 403)
    }
  }

  return { ts }
}
