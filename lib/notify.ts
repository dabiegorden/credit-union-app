// lib/notify.ts
// Creates an in-app notification and (optionally) sends an email via Resend.
import { Resend } from "resend";
import Notification, {
  NotificationType,
  RecipientModel,
} from "@/models/Notification";

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotifyOptions {
  recipient: string; // ObjectId of Client or User
  recipientModel: RecipientModel;
  type: NotificationType;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
  // Optional email delivery
  email?: string;
  emailName?: string;
  sendEmail?: boolean;
}

/**
 * Persist a notification and optionally email the recipient. Failures never
 * throw — notification delivery must not break the primary operation.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  try {
    await Notification.create({
      recipient: opts.recipient,
      recipientModel: opts.recipientModel,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      meta: opts.meta,
    });
  } catch (err) {
    console.error("[notify] failed to store notification:", err);
  }

  if (opts.sendEmail && opts.email) {
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ??
          "First Choice Credit Union <markowusu@newhopewellnesshub.org>",
        to: [opts.email],
        subject: opts.title,
        html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0B1D3A">
          <h2 style="color:#0B1D3A;margin:0 0 8px">${opts.title}</h2>
          <p style="font-size:15px;line-height:1.6;color:#334155">Hi ${opts.emailName ?? "there"},</p>
          <p style="font-size:15px;line-height:1.6;color:#334155">${opts.message}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
          <p style="font-size:12px;color:#94a3b8">First Choice Credit Union</p>
        </div>`,
      });
    } catch (err) {
      console.error("[notify] failed to send email:", err);
    }
  }
}
