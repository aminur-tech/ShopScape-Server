import nodemailer from "nodemailer";
import { env } from "../config/env";

/*
|--------------------------------------------------------------------------
| SMTP Configuration
|--------------------------------------------------------------------------
*/

const missingConfig: string[] = [];

if (!env.SMTP_HOST) missingConfig.push("SMTP_HOST");
if (!env.SMTP_USER) missingConfig.push("SMTP_USER");
if (!env.SMTP_PASS) missingConfig.push("SMTP_PASS");
if (!env.SMTP_FROM) missingConfig.push("SMTP_FROM");

if (missingConfig.length > 0) {
  console.error(
    `[mailer] Missing SMTP configuration: ${missingConfig.join(", ")}`
  );
}

/*
|--------------------------------------------------------------------------
| Transporter
|--------------------------------------------------------------------------
*/

const transporter =
  missingConfig.length === 0
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

/*
|--------------------------------------------------------------------------
| Email Constants
|--------------------------------------------------------------------------
*/

const SHOP_NAME = "ShopScape";
const FRONTEND_URL = env.FRONTEND_URL.replace(/\/$/, "");

/*
|--------------------------------------------------------------------------
| Send Mail
|--------------------------------------------------------------------------
*/

async function sendMail(
  to: string,
  subject: string,
  html: string
) {
  if (!transporter) {
    throw new Error(
      "SMTP configuration is incomplete. Please check SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM."
    );
  }

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

/*
|--------------------------------------------------------------------------
| Base Email Layout
|--------------------------------------------------------------------------
*/

function emailLayout(
  content: string,
  previewText = ""
) {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${SHOP_NAME}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f4f6f8;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #1f2937;
    }

    table {
      border-collapse: collapse;
    }

    a {
      text-decoration: none;
    }

    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
      }

      .content {
        padding: 24px 18px !important;
      }

      .header {
        padding: 22px 18px !important;
      }

      .otp {
        font-size: 30px !important;
        letter-spacing: 8px !important;
      }
    }
  </style>
</head>

<body>

  ${
    previewText
      ? `
      <div
        style="
          display:none;
          max-height:0;
          overflow:hidden;
          opacity:0;
          color:transparent;
        "
      >
        ${previewText}
      </div>
      `
      : ""
  }

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f4f6f8;"
  >
    <tr>
      <td
        align="center"
        style="padding:35px 15px;"
      >

        <table
          class="container"
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:600px;
            max-width:600px;
            background:#ffffff;
            border-radius:14px;
            overflow:hidden;
            border:1px solid #e5e7eb;
          "
        >

          <!-- Header -->

          <tr>
            <td
              class="header"
              align="center"
              style="
                background:#111827;
                padding:28px 20px;
              "
            >

              <div
                style="
                  color:#ffffff;
                  font-size:26px;
                  font-weight:700;
                  letter-spacing:-0.5px;
                "
              >
                ${SHOP_NAME}
              </div>

              <div
                style="
                  margin-top:6px;
                  color:#9ca3af;
                  font-size:13px;
                "
              >
                আপনার পছন্দ, আমাদের অঙ্গীকার
              </div>

            </td>
          </tr>

          <!-- Content -->

          <tr>
            <td
              class="content"
              style="
                padding:32px;
              "
            >

              ${content}

            </td>
          </tr>

          <!-- Footer -->

          <tr>
            <td
              style="
                background:#f9fafb;
                border-top:1px solid #e5e7eb;
                padding:20px;
                text-align:center;
              "
            >

              <p
                style="
                  margin:0;
                  color:#9ca3af;
                  font-size:12px;
                  line-height:1.6;
                "
              >
                © ${new Date().getFullYear()} ${SHOP_NAME}.
                All rights reserved.
              </p>

              <p
                style="
                  margin:6px 0 0;
                  color:#9ca3af;
                  font-size:12px;
                "
              >
                এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে।
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

/*
|--------------------------------------------------------------------------
| Verification Code Email
|--------------------------------------------------------------------------
*/

export async function sendVerificationCodeEmail(
  email: string,
  code: string
) {
  const html = emailLayout(
    `
      <div style="text-align:center;">

        <div
          style="
            width:56px;
            height:56px;
            margin:0 auto 18px;
            border-radius:50%;
            background:#f3f4f6;
            font-size:28px;
            line-height:56px;
          "
        >
          ✉️
        </div>

        <h1
          style="
            margin:0;
            color:#111827;
            font-size:24px;
          "
        >
          ইমেইল ভেরিফিকেশন
        </h1>

        <p
          style="
            margin:12px 0 0;
            color:#6b7280;
            font-size:14px;
            line-height:1.7;
          "
        >
          আপনার অর্ডার সম্পন্ন করার জন্য নিচের
          verification code ব্যবহার করুন।
        </p>

        <div
          style="
            margin:28px 0;
            padding:22px;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
          "
        >

          <div
            style="
              color:#6b7280;
              font-size:12px;
              margin-bottom:10px;
            "
          >
            আপনার verification code
          </div>

          <div
            class="otp"
            style="
              color:#111827;
              font-size:34px;
              font-weight:700;
              letter-spacing:10px;
            "
          >
            ${code}
          </div>

        </div>

        <div
          style="
            padding:14px;
            background:#fff7ed;
            border:1px solid #fed7aa;
            border-radius:10px;
            color:#9a3412;
            font-size:13px;
            line-height:1.6;
          "
        >
          ⚠️ এই কোডটি ১০ মিনিটের জন্য বৈধ।
          আপনার verification code কারও সাথে শেয়ার করবেন না।
        </div>

        <p
          style="
            margin:24px 0 0;
            color:#9ca3af;
            font-size:12px;
            line-height:1.6;
          "
        >
          আপনি যদি এই request না করে থাকেন,
          তাহলে এই ইমেইলটি উপেক্ষা করুন।
        </p>

      </div>
    `,
    `আপনার ShopScape verification code হলো ${code}`
  );

  return sendMail(
    email,
    `Verification Code | ${SHOP_NAME}`,
    html
  );
}

/*
|--------------------------------------------------------------------------
| Order Status Labels
|--------------------------------------------------------------------------
*/

const STATUS_LABELS_BN: Record<string, string> = {
  PENDING: "অপেক্ষমান",
  CONFIRMED: "নিশ্চিত হয়েছে",
  PROCESSING: "প্রসেসিং চলছে",
  SHIPPED: "পাঠানো হয়েছে",
  DELIVERED: "ডেলিভারি সম্পন্ন হয়েছে",
  CANCELLED: "অর্ডার বাতিল হয়েছে",
};

/*
|--------------------------------------------------------------------------
| Order Status Email
|--------------------------------------------------------------------------
*/

export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: string
) {
  const label =
    STATUS_LABELS_BN[status] ?? status;

  const trackUrl =
    `${FRONTEND_URL}/track-order?order=${encodeURIComponent(
      orderNumber
    )}`;

  const html = emailLayout(
    `
      <div>

        <h1
          style="
            margin:0;
            color:#111827;
            font-size:24px;
          "
        >
          অর্ডার স্ট্যাটাস আপডেট
        </h1>

        <p
          style="
            margin:16px 0 0;
            color:#4b5563;
            font-size:15px;
            line-height:1.7;
          "
        >
          প্রিয় গ্রাহক,
        </p>

        <p
          style="
            margin:8px 0 0;
            color:#4b5563;
            font-size:15px;
            line-height:1.7;
          "
        >
          আপনার ShopScape অর্ডারের সর্বশেষ
          স্ট্যাটাস আপডেট করা হয়েছে।
        </p>

        <!-- Order Information -->

        <div
          style="
            margin:26px 0;
            padding:20px;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
          "
        >

          <div
            style="
              color:#6b7280;
              font-size:12px;
              margin-bottom:7px;
            "
          >
            অর্ডার নম্বর
          </div>

          <div
            style="
              color:#111827;
              font-size:18px;
              font-weight:700;
              margin-bottom:20px;
            "
          >
            ${orderNumber}
          </div>

          <div
            style="
              color:#6b7280;
              font-size:12px;
              margin-bottom:7px;
            "
          >
            বর্তমান স্ট্যাটাস
          </div>

          <div
            style="
              color:#111827;
              font-size:17px;
              font-weight:700;
            "
          >
            ${label}
          </div>

        </div>

        <p
          style="
            color:#4b5563;
            font-size:14px;
            line-height:1.7;
          "
        >
          আপনার অর্ডারের বিস্তারিত তথ্য এবং
          বর্তমান অবস্থা দেখতে নিচের বাটনে ক্লিক করুন।
        </p>

        <!-- CTA -->

        <div
          style="
            text-align:center;
            margin:30px 0;
          "
        >

          <a
            href="${trackUrl}"
            style="
              display:inline-block;
              background:#111827;
              color:#ffffff;
              padding:13px 26px;
              border-radius:8px;
              font-size:14px;
              font-weight:700;
            "
          >
            অর্ডার ট্র্যাক করুন
          </a>

        </div>

        <p
          style="
            margin:24px 0 0;
            color:#6b7280;
            font-size:13px;
            line-height:1.7;
          "
        >
          অর্ডার সম্পর্কে কোনো প্রশ্ন থাকলে
          আমাদের সাথে যোগাযোগ করতে পারেন।
        </p>

        <p
          style="
            margin:20px 0 0;
            color:#374151;
            font-size:14px;
            line-height:1.6;
          "
        >
          ধন্যবাদ,<br />
          <strong>${SHOP_NAME} Team</strong>
        </p>

      </div>
    `,
    `আপনার অর্ডার ${orderNumber} এর স্ট্যাটাস: ${label}`
  );

  return sendMail(
    email,
    `Order Update | ${orderNumber} - ${SHOP_NAME}`,
    html
  );
}

/*
|--------------------------------------------------------------------------
| Optional: SMTP Connection Test
|--------------------------------------------------------------------------
*/

export async function verifyMailerConnection() {
  if (!transporter) {
    throw new Error(
      "SMTP transporter is not configured."
    );
  }

  await transporter.verify();

  console.log(
    "[mailer] SMTP connection verified successfully."
  );
}

export async function sendAdminOrderMessageEmail({
  email,
  orderNumber,
  subject,
  message,
}: {
  email: string;
  orderNumber: string;
  subject: string;
  message: string;
}) {
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  const trackUrl =
    `${FRONTEND_URL}/track-order?order=${encodeURIComponent(
      orderNumber
    )}`;

  const html = emailLayout(
    `
      <div>

        <h1
          style="
            margin:0;
            color:#111827;
            font-size:24px;
          "
        >
          ${subject}
        </h1>

        <p
          style="
            margin:16px 0 0;
            color:#4b5563;
            font-size:15px;
            line-height:1.7;
          "
        >
          প্রিয় গ্রাহক,
        </p>

        <div
          style="
            margin:24px 0;
            padding:20px;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
            color:#374151;
            font-size:15px;
            line-height:1.8;
          "
        >
          ${safeMessage}
        </div>

        <div
          style="
            margin:20px 0;
            padding:16px;
            background:#f3f4f6;
            border-radius:10px;
          "
        >
          <div
            style="
              color:#6b7280;
              font-size:12px;
            "
          >
            অর্ডার নম্বর
          </div>

          <div
            style="
              margin-top:5px;
              color:#111827;
              font-weight:700;
              font-size:17px;
            "
          >
            ${orderNumber}
          </div>
        </div>

        <div
          style="
            text-align:center;
            margin:28px 0;
          "
        >
          <a
            href="${trackUrl}"
            style="
              display:inline-block;
              background:#111827;
              color:#ffffff;
              padding:13px 26px;
              border-radius:8px;
              font-size:14px;
              font-weight:700;
            "
          >
            অর্ডার ট্র্যাক করুন
          </a>
        </div>

        <p
          style="
            margin:20px 0 0;
            color:#374151;
            font-size:14px;
            line-height:1.7;
          "
        >
          ধন্যবাদ,<br />
          <strong>${SHOP_NAME} Team</strong>
        </p>

      </div>
    `,
    `ShopScape থেকে আপনার অর্ডার ${orderNumber} সম্পর্কে নতুন বার্তা`
  );

  return sendMail(
    email,
    `${subject} | ${SHOP_NAME}`,
    html
  );
}