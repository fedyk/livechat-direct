import { ErrorWithType } from "../common/error-with-type";
import { findStatusesByLicenseId } from "./database";
import { getPublicStatus } from "./helpers";
import { Method$GetUserStatuses, RTM$Context } from "./types";

export async function getUserStatuses(ctx: RTM$Context): Promise<Method$GetUserStatuses["response"]> {
  if (!ctx.session) {
    throw new ErrorWithType("Not authorized", "authorization", 400)
  }

  const statuses = await findStatusesByLicenseId(ctx.pg, ctx.session.licenseId)

  return statuses.map(getPublicStatus)
}
