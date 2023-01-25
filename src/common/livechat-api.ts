import { ErrorWithType } from "./error-with-type";

export namespace dev {
  export type AppWebhook = ReturnType<typeof parseAppWebHook>
  export type InAppUpgradeWebhook = ReturnType<typeof parseInAppUpgradeWebhook>

  export function parseAppWebHook(body: any = {}) {
    const event = String(body.event)
    const clientID = String(body.clientID ?? "")
    const userID = String(body.userID ?? "")
    const applicationID = String(body.applicationID ?? "")
    const applicationName = String(body.applicationName ?? "")
    const licenseID = Number(body.licenseID ?? "")
    const organizationID = String(body.organizationID ?? "")

    if (event === "application_uninstalled") {
      return {
        event: "application_uninstalled" as const,
        clientID: clientID,
        userID: userID,
        applicationID: applicationID,
        applicationName: applicationName,
        licenseID: licenseID,
        organizationID: organizationID,
      }
    }

    if (event === "application_installed") {
      return {
        event: "application_installed" as const,
        clientID: clientID,
        userID: userID,
        applicationID: applicationID,
        applicationName: applicationName,
        licenseID: licenseID,
        organizationID: organizationID,
      }
    }

    if (event === "payment_activated") {
      return {
        event: "payment_activated" as const,
        clientID: clientID,
        userID: userID,
        applicationID: applicationID,
        applicationName: applicationName,
        licenseID: licenseID,
        organizationID: organizationID,
        payload: {
          paymentID: String(body.payload?.paymentID),
          quantity: Number(body.payload?.quantity),
        } as const
      }
    }

    if (event === "payment_collected") {
      return {
        event: "payment_collected" as const,
        clientID: clientID,
        userID: userID,
        applicationID: applicationID,
        applicationName: applicationName,
        licenseID: licenseID,
        organizationID: organizationID,
        payload: {
          paymentID: String(body.payload?.paymentID),
          total: Number(body.payload?.total),
        } as const
      }
    }

    if (event === "payment_cancelled") {
      return {
        event: "payment_cancelled" as const,
        clientID: clientID,
        userID: userID,
        applicationID: applicationID,
        applicationName: applicationName,
        licenseID: licenseID,
        organizationID: organizationID,
        payload: {
          paymentID: String(body.payload?.paymentID),
        } as const
      }
    }

    throw new ErrorWithType("Unsupported type of event:" + event, "validation", 400)
  }

  export function parseInAppUpgradeWebhook(body: any = {}) {
    return {
      id: String(body.id ?? ""),
      transaction: String(body.transaction ?? ""),
      organization: String(body.organization ?? ""),
      license: Number(body.license),
      name: String(body.name ?? ""),
      type: String(body.type ?? "").toUpperCase() as "ENABLE" | "DISABLE",
      quantity: Number(body.quantity),
    }
  }
}
