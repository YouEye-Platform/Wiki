/**
 * Featured Article Daily Notification Job
 *
 * Runs once per day (scheduled via setInterval at startup).
 * Fetches Wikipedia's featured article of the day and sends a notification
 * to all known users via the YE-UI notification API.
 *
 * Schedule: 8:00 AM system timezone (checked every minute).
 * Guard: only fires once per calendar day (tracked by lastRunDate).
 */

import { getFeaturedContent } from "@/lib/wikipedia/client";
import { sendNotification } from "./sender";

const YOUEYE_UI_URL =
  process.env.YOUEYE_API_URL ?? "http://youeye-ui.youeye:3000";

let lastRunDate: string | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

/** Get all user IDs from YE-UI (admin endpoint) */
async function getAllUserIds(): Promise<string[]> {
  try {
    const res = await fetch(`${YOUEYE_UI_URL}/api/v1/users`, {
      headers: {
        "Content-Type": "application/json",
        "X-App-Slug": "wiki",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data.users)) {
      return data.users.map((u: { id: string }) => u.id);
    }
    return [];
  } catch {
    return [];
  }
}

/** Execute the daily featured article notification */
async function runFeaturedArticleNotification(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Guard: only run once per calendar day
  if (lastRunDate === today) return;

  const hour = new Date().getHours();
  // Only fire at 8 AM
  if (hour !== 8) return;

  lastRunDate = today;

  try {
    const userIds = await getAllUserIds();
    if (userIds.length === 0) {
      console.log("[Featured Article Job] No users found to notify");
      return;
    }

    let sent = 0;
    for (const userId of userIds) {
      const featured = await getFeaturedContent(undefined, "en", userId);
      const article = featured?.tfa;
      if (!article) continue;

      const title = article.displaytitle ?? article.title ?? "Featured Article";
      const excerpt =
        article.extract ??
        article.description ??
        "Check out today's featured article on Wikipedia.";
      const body = excerpt.length > 200 ? excerpt.slice(0, 197) + "..." : excerpt;

      const ok = await sendNotification({
        title: `Today's Featured Article: ${title}`,
        body,
        type: "info",
        actionUrl: `/wiki/article/${encodeURIComponent(title)}`,
        userId,
      });
      if (ok) sent++;
    }

    console.log(
      `[Featured Article Job] Sent featured article notification to ${sent}/${userIds.length} users`
    );
  } catch (err) {
    console.warn(
      "[Featured Article Job] Failed:",
      err instanceof Error ? err.message : err
    );
    // Reset lastRunDate so it retries next minute
    lastRunDate = null;
  }
}

/** Start the daily featured article notification scheduler */
export function startFeaturedArticleJob(): void {
  if (intervalId !== null) return; // Already running

  console.log("[Featured Article Job] Scheduler started (fires daily at 8:00 AM)");

  // Check every minute
  intervalId = setInterval(runFeaturedArticleNotification, 60_000);

  // Also run immediately on startup in case we missed today's window
  runFeaturedArticleNotification().catch(() => {
    // Non-critical — logged inside the function
  });
}

/** Stop the scheduler (for cleanup) */
export function stopFeaturedArticleJob(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** Manually trigger the notification (for testing) */
export async function triggerFeaturedArticleNow(): Promise<void> {
  try {
    const userIds = await getAllUserIds();
    for (const userId of userIds) {
      const featured = await getFeaturedContent(undefined, "en", userId);
      const article = featured?.tfa;
      if (!article) continue;

      const title = article.displaytitle ?? article.title ?? "Featured Article";
      const excerpt = article.extract ?? article.description ?? "Check out today's featured article.";
      const body = excerpt.length > 200 ? excerpt.slice(0, 197) + "..." : excerpt;

      await sendNotification({
        title: `Today's Featured Article: ${title}`,
        body,
        type: "info",
        actionUrl: `/wiki/article/${encodeURIComponent(title)}`,
        userId,
      });
    }
  } catch (err) {
    console.warn("[Featured Article Job] Manual trigger failed:", err);
  }
}
