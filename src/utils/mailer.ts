import nodemailer from "nodemailer";
import { env } from "../config/env";

const missing: string[] = [];

if (!env.SMTP_HOST) missing.push("SMTP_HOST");
if (!env.SMTP_USER) missing.push("SMTP_USER");
if (!env.SMTP_PASS) missing.push("SMTP_PASS");

if (missing.length > 0) {
  console.error(
    `[mailer] Missing SMTP configuration: ${missing.join(", ")}`
  );
}

const transporter = missing.length === 0
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

async function sendMail(
  to: string,
  subject: string,
  html: string
) {
  if (!transporter) {
    throw new Error(
      "SMTP is not configured. Check SMTP_HOST, SMTP_USER and SMTP_PASS."
    );
  }

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

export async function sendVerificationCodeEmail(
  email: string,
  code: string
) {
  return sendMail(
    email,
    "আপনার ভেরিফিকেশন কোড - Shopno Fashion",
    `<p>আপনার অর্ডার নিশ্চিত করতে এই কোডটি ব্যবহার করুন:</p>
     <h2 style="letter-spacing:4px">${code}</h2>
     <p>কোডটি ১০ মিনিটের জন্য বৈধ থাকবে।</p>`
  );
}

const STATUS_LABELS_BN: Record<string, string> = {
  PENDING: "অপেক্ষমান",
  CONFIRMED: "নিশ্চিত হয়েছে",
  PROCESSING: "প্রসেসিং চলছে",
  SHIPPED: "পাঠানো হয়েছে",
  DELIVERED: "ডেলিভারি হয়েছে",
  CANCELLED: "বাতিল হয়েছে",
};

export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: string
) {
  const label = STATUS_LABELS_BN[status] ?? status;

 return sendMail(
  email,
  `অর্ডার আপডেট | ${orderNumber} - Shopno Fashion`,
  `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; padding:30px 15px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e5e5;">
        
        <!-- Header -->
        <div style="background:#111111; padding:24px; text-align:center;">
          <h1 style="margin:0; color:#ffffff; font-size:24px;">
            Shopno Fashion
          </h1>
          <p style="margin:6px 0 0; color:#cccccc; font-size:13px;">
            আপনার পছন্দ, আমাদের অঙ্গীকার
          </p>
        </div>

        <!-- Content -->
        <div style="padding:30px;">
          <h2 style="margin:0 0 18px; color:#222222; font-size:20px;">
            অর্ডার স্ট্যাটাস আপডেট
          </h2>

          <p style="color:#555555; font-size:15px; line-height:1.7;">
            প্রিয় গ্রাহক,
          </p>

          <p style="color:#555555; font-size:15px; line-height:1.7;">
            আপনার অর্ডারের সর্বশেষ আপডেট নিচে দেওয়া হলো:
          </p>

          <!-- Order Info -->
          <div style="background:#f8f8f8; border-radius:8px; padding:18px; margin:22px 0;">
            <p style="margin:0 0 10px; color:#666666; font-size:14px;">
              অর্ডার নম্বর
            </p>

            <p style="margin:0 0 16px; color:#111111; font-size:18px; font-weight:bold;">
              ${orderNumber}
            </p>

            <p style="margin:0 0 8px; color:#666666; font-size:14px;">
              বর্তমান স্ট্যাটাস
            </p>

            <p style="margin:0; color:#111111; font-size:17px; font-weight:bold;">
              ${label}
            </p>
          </div>

          <p style="color:#555555; font-size:15px; line-height:1.7;">
            আপনার অর্ডারের বিস্তারিত তথ্য এবং বর্তমান অবস্থা দেখতে আমাদের
            ট্র্যাকিং পেজ ভিজিট করুন।
          </p>

          <!-- CTA -->
          <div style="text-align:center; margin:28px 0;">
            <a
              href="${env.FRONTEND_URL}/track-order?order=${orderNumber}"
              style="display:inline-block; background:#111111; color:#ffffff; text-decoration:none; padding:13px 26px; border-radius:7px; font-size:14px; font-weight:bold;"
            >
              অর্ডার ট্র্যাক করুন
            </a>
          </div>

          <p style="color:#777777; font-size:13px; line-height:1.6; margin-top:25px;">
            আপনার অর্ডার সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করতে
            দ্বিধা করবেন না। আমরা আপনাকে সর্বোত্তম সেবা দিতে প্রস্তুত।
          </p>

          <p style="color:#555555; font-size:14px; line-height:1.6; margin-bottom:0;">
            ধন্যবাদ,<br />
            <strong>Shopno Fashion Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#fafafa; border-top:1px solid #eeeeee; padding:18px; text-align:center;">
          <p style="margin:0; color:#999999; font-size:12px;">
            © ${new Date().getFullYear()} Shopno Fashion. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `
);
}