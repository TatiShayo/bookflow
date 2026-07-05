import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

export async function sendBookingConfirmation(to: string, data: {
  attendeeName: string;
  hostName: string;
  eventTitle: string;
  date: string;
  time: string;
  duration: number;
  joinLink?: string;
  amount?: number;
  currency?: string;
}) {
  return getResend().emails.send({
    from: "BookFlow <bookings@bookflow.app>",
    to,
    subject: `Confirmed: ${data.eventTitle} with ${data.hostName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#0ea5e9;margin-bottom:24px;">You're booked! 🎉</h1>
        <p style="font-size:16px;margin-bottom:8px;">Hi ${data.attendeeName},</p>
        <p style="font-size:16px;margin-bottom:24px;">Your session with <strong>${data.hostName}</strong> is confirmed.</p>
        <div style="background:#1c1e2e;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;"><strong>${data.eventTitle}</strong></p>
          <p style="margin:0 0 8px;color:#94a3b8;">${data.date} at ${data.time} (${data.duration} min)</p>
          ${data.amount ? `<p style="margin:0;color:#10b981;">Paid: ${data.currency} ${data.amount}</p>` : ""}
        </div>
        ${data.joinLink ? `<a href="${data.joinLink}" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">Join Meeting</a>` : ""}
        <p style="color:#64748b;font-size:14px;">Powered by BookFlow — Get booked and paid.</p>
      </div>
    `,
  });
}

export async function sendHostNotification(to: string, data: {
  attendeeName: string;
  eventTitle: string;
  date: string;
  time: string;
  attendeeEmail: string;
}) {
  return getResend().emails.send({
    from: "BookFlow <bookings@bookflow.app>",
    to,
    subject: `New booking: ${data.eventTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#0ea5e9;margin-bottom:24px;">New booking! 📅</h1>
        <div style="background:#1c1e2e;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;"><strong>${data.attendeeName}</strong> booked <strong>${data.eventTitle}</strong></p>
          <p style="margin:0 0 8px;color:#94a3b8;">${data.date} at ${data.time}</p>
          <p style="margin:0;color:#94a3b8;">${data.attendeeEmail}</p>
        </div>
        <p style="color:#64748b;font-size:14px;margin-top:24px;">Powered by BookFlow</p>
      </div>
    `,
  });
}

export async function sendCancellationEmail(to: string, data: {
  attendeeName: string;
  hostName: string;
  eventTitle: string;
  date: string;
  time: string;
}) {
  return getResend().emails.send({
    from: "BookFlow <bookings@bookflow.app>",
    to,
    subject: `Cancelled: ${data.eventTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#ef4444;margin-bottom:24px;">Booking Cancelled</h1>
        <p style="font-size:16px;margin-bottom:24px;">Your session <strong>${data.eventTitle}</strong> with ${data.hostName} on ${data.date} at ${data.time} has been cancelled.</p>
      </div>
    `,
  });
}
