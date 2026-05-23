import cron from "node-cron";
import { generateBlogPost } from "../ai/blog-generator";

const SATURDAY_9AM = "0 9 * * 6";

let task: cron.ScheduledTask | null = null;

export function startBlogCron() {
  if (task) {
    console.log("[blog-cron] Already started");
    return;
  }
  if (!process.env.XAI_API_KEY) {
    console.warn(
      "[blog-cron] XAI_API_KEY not set; weekly blog generation disabled"
    );
    return;
  }

  task = cron.schedule(
    SATURDAY_9AM,
    async () => {
      console.log("[blog-cron] Triggered weekly blog generation");
      try {
        const post = await generateBlogPost();
        console.log(
          `[blog-cron] Weekly blog post published (id=${post.id}, title="${post.title}")`
        );
      } catch (err) {
        console.error("[blog-cron] Weekly blog generation failed:", err);
      }
    },
    { timezone: "America/Denver" }
  );

  console.log(
    "[blog-cron] Scheduled weekly blog generation: Saturdays 9:00 AM Mountain Time"
  );
}

export function stopBlogCron() {
  if (task) {
    task.stop();
    task = null;
  }
}
