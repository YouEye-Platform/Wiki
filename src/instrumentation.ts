/**
 * Next.js Instrumentation Hook
 *
 * Starts background jobs when the server initializes.
 * Only runs on the server side (nodejs runtime).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFeaturedArticleJob } = await import(
      "@/lib/notifications/featured-article-job"
    );
    startFeaturedArticleJob();
  }
}
