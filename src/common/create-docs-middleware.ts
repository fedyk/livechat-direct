import { readFileSync } from "fs"
import { marked } from "marked"
import { AppContext } from "../types";
import { ErrorWithType } from "./error-with-type";

export function createDocsMiddleware(pathToFile: string) {
  return function docsMiddleware(ctx: AppContext) {
    const file = readFileSync(pathToFile, {
      encoding: "utf8"
    })

    if (!file) {
      throw new ErrorWithType(`Can't fine file ${pathToFile}`, "docs", 404)
    }

    ctx.status = 200
    ctx.body = `<div class="container">${marked(file)}</div>`
  }
}
