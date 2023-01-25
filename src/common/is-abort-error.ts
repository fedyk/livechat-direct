export function isAbortError(err: unknown): err is Error {
  return err instanceof Error && err.name === "AbortError"
}
