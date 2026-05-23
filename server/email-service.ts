import sgMail from "@sendgrid/mail";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "info@apollodronesinc.com";
const FROM_NAME = "Apollo DroneWorks";

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
}

export function isEmailEnabled(): boolean {
  return !!SENDGRID_KEY;
}

export async function sendQuoteEmail(opts: {
  toEmail: string;
  toName: string;
  quoteId: number;
  projectName: string;
  totalAmount: string;
  validUntil: string;
  services: string[];
}): Promise<void> {
  if (!isEmailEnabled()) return;

  const serviceList = opts.services.map(s => `<li>${s}</li>`).join("");

  await sgMail.send({
    to: { email: opts.toEmail, name: opts.toName },
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Your Apollo DroneWorks Quote #${opts.quoteId} — ${opts.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b111f; color: #f5f5f5; padding: 32px; border-radius: 8px;">
        <h1 style="color: #C7AE6A; margin-bottom: 4px;">Apollo DroneWorks</h1>
        <p style="color: #aaa; margin-top: 0;">Professional Drone Services — Southern Utah</p>
        <hr style="border-color: #333; margin: 24px 0;" />
        <h2 style="color: #f5f5f5;">Your Quote is Ready</h2>
        <p>Hi ${opts.toName},</p>
        <p>Thank you for requesting a quote. Here's a summary of your project estimate:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; color: #aaa;">Quote #</td><td style="padding: 8px 0; color: #f5f5f5;">${opts.quoteId}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Project</td><td style="padding: 8px 0; color: #f5f5f5;">${opts.projectName}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Services</td><td style="padding: 8px 0; color: #f5f5f5;"><ul style="margin: 0; padding-left: 16px;">${serviceList}</ul></td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Total Estimate</td><td style="padding: 8px 0; color: #C7AE6A; font-weight: bold; font-size: 18px;">$${opts.totalAmount}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Valid Until</td><td style="padding: 8px 0; color: #f5f5f5;">${opts.validUntil}</td></tr>
        </table>
        <hr style="border-color: #333; margin: 24px 0;" />
        <p>Ready to move forward? Book your service online or reply to this email to discuss your project.</p>
        <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/booking" style="display: inline-block; background: #C7AE6A; color: #000; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 8px 0;">Book Now</a>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">Apollo DroneWorks · Southern Utah · info@apollodronesinc.com</p>
      </div>
    `,
  });
}

export async function sendBookingConfirmationEmail(opts: {
  toEmail: string;
  toName: string;
  bookingId: number;
  serviceName: string;
  scheduledDate: string;
  totalAmount: string;
}): Promise<void> {
  if (!isEmailEnabled()) return;

  await sgMail.send({
    to: { email: opts.toEmail, name: opts.toName },
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Booking Confirmed — ${opts.serviceName} on ${opts.scheduledDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b111f; color: #f5f5f5; padding: 32px; border-radius: 8px;">
        <h1 style="color: #C7AE6A; margin-bottom: 4px;">Apollo DroneWorks</h1>
        <p style="color: #aaa; margin-top: 0;">Professional Drone Services — Southern Utah</p>
        <hr style="border-color: #333; margin: 24px 0;" />
        <h2 style="color: #f5f5f5;">✓ Your Booking is Confirmed</h2>
        <p>Hi ${opts.toName},</p>
        <p>Your drone service has been booked and confirmed. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; color: #aaa;">Booking #</td><td style="padding: 8px 0; color: #f5f5f5;">${opts.bookingId}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Service</td><td style="padding: 8px 0; color: #f5f5f5;">${opts.serviceName}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Date</td><td style="padding: 8px 0; color: #f5f5f5;">${opts.scheduledDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #aaa;">Amount Paid</td><td style="padding: 8px 0; color: #C7AE6A; font-weight: bold;">$${opts.totalAmount}</td></tr>
        </table>
        <hr style="border-color: #333; margin: 24px 0;" />
        <p>We'll be in touch closer to your flight date to confirm weather and logistics. Track your project status in your client portal.</p>
        <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard" style="display: inline-block; background: #C7AE6A; color: #000; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 8px 0;">View Dashboard</a>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">Apollo DroneWorks · Southern Utah · info@apollodronesinc.com</p>
      </div>
    `,
  });
}

export async function sendTestimonialRequestEmail(opts: {
  toEmail: string;
  toName: string;
  serviceName: string;
}): Promise<void> {
  if (!isEmailEnabled()) return;

  await sgMail.send({
    to: { email: opts.toEmail, name: opts.toName },
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `How did your ${opts.serviceName} shoot go?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b111f; color: #f5f5f5; padding: 32px; border-radius: 8px;">
        <h1 style="color: #C7AE6A; margin-bottom: 4px;">Apollo DroneWorks</h1>
        <hr style="border-color: #333; margin: 24px 0;" />
        <h2 style="color: #f5f5f5;">We'd love your feedback</h2>
        <p>Hi ${opts.toName},</p>
        <p>Thank you for choosing Apollo DroneWorks for your ${opts.serviceName}. We hope everything exceeded your expectations!</p>
        <p>If you have a moment, we'd love for you to share your experience. It helps other clients find us and helps us keep improving.</p>
        <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/testimonials" style="display: inline-block; background: #C7AE6A; color: #000; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 8px 0;">Leave a Review</a>
        <p>Thank you,<br/>The Apollo DroneWorks Team</p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">Apollo DroneWorks · Southern Utah · info@apollodronesinc.com</p>
      </div>
    `,
  });
}
