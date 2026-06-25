/**
 * Notification Sender for YE-App-Wiki
 *
 * Sends notifications to YE-UI's notification ingest API.
 * Uses the Canvas SDK API client for service-to-service auth.
 */

import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-wiki");

export interface NotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly type: "info" | "warning" | "error" | "success";
  readonly actionUrl?: string;
  readonly userId: string;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const res = await api.fetch(
      "/notifications",
      {
        method: "POST",
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          type: payload.type,
          actionUrl: payload.actionUrl,
          user_id: payload.userId,
        }),
      },
      payload.userId
    );

    if (!res.ok) {
      console.warn(
        `[Wiki Notifications] Failed: ${res.status} ${res.statusText}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "[Wiki Notifications] API unreachable:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
