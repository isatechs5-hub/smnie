import nodemailer from 'nodemailer';
import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';

export interface NotificationDispatchInput {
  recipientUserId?: number | null;
  recipientEmail: string;
  recipientRole?: string;
  title: string;
  body: string;
  relatedEntity?: string;
  relatedId?: string;
  sendEmail?: boolean;
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || '587');

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function dispatchNotification(input: NotificationDispatchInput): Promise<void> {
  let deliveryStatus = 'unread';

  if (input.sendEmail) {
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'NIEM Admissions <info@smnie.in>',
          to: input.recipientEmail,
          subject: input.title,
          text: input.body,
        });
        deliveryStatus = 'sent';
      } catch (err) {
        console.error('SMTP delivery failed, recording notification in database:', err);
        deliveryStatus = 'logged';
      }
    } else {
      deliveryStatus = 'logged';
    }
  }

  try {
    await db.insert(notifications).values({
      recipientUserId: input.recipientUserId ?? null,
      recipientEmail: input.recipientEmail,
      recipientRole: input.recipientRole ?? 'admin',
      channel: input.sendEmail ? 'email' : 'in_app',
      title: input.title,
      body: input.body,
      deliveryStatus,
      relatedEntity: input.relatedEntity ?? '',
      relatedId: input.relatedId ?? '',
    });
  } catch (err) {
    console.error('Failed to persist notification record:', err);
  }
}
