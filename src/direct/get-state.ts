import { Method$GetState, RTM$Context } from "./types";

export function getState(ctx: RTM$Context): Method$GetState["response"] {
  return {
    ts: ctx.ts
  }
}
