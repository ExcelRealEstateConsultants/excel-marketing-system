const express = require("express");
const crypto = require("crypto");

const prisma = require("../lib/prisma");
const { verifyPassword, hashPassword } = require("../lib/auth");

const router = express.Router();

const PASSWORD_RESET_MINUTES = 30;

function getPasswordResetSuccessMessage() {
  return "If an active RapportLink account exists for that email, password reset instructions have been sent.";
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return String(process.env.BASE_URL).replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  const apiKey = process.env.BREVO_API_KEY;

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL || process.env.SENDER_EMAIL;

  const senderName = process.env.BREVO_SENDER_NAME || "RapportLink";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is not configured.");
  }

  const greeting = firstName ? `Hi ${firstName},` : "Hello,";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",

    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },

    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },

      to: [
        {
          email,
        },
      ],

      subject: "Reset your RapportLink password",

      htmlContent: `
          <!doctype html>
          <html>
            <body
              style="
                margin: 0;
                padding: 0;
                background: #f4f7f9;
                font-family: Arial, sans-serif;
                color: #1f2937;
              "
            >
              <div
                style="
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 40px 20px;
                "
              >
                <div
                  style="
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 36px;
                    box-shadow: 0 10px 30px rgba(4, 44, 73, 0.08);
                  "
                >
                  <h1
                    style="
                      margin: 0 0 20px;
                      color: #042c49;
                      font-size: 26px;
                    "
                  >
                    Reset your RapportLink password
                  </h1>

                  <p
                    style="
                      margin: 0 0 18px;
                      font-size: 15px;
                      line-height: 1.6;
                    "
                  >
                    ${greeting}
                  </p>

                  <p
                    style="
                      margin: 0 0 24px;
                      font-size: 15px;
                      line-height: 1.6;
                    "
                  >
                    We received a request to reset the password
                    for your RapportLink account.
                  </p>

                  <p
                    style="
                      margin: 0 0 26px;
                    "
                  >
                    <a
                      href="${resetUrl}"
                      style="
                        display: inline-block;
                        background: #00a143;
                        color: #ffffff;
                        text-decoration: none;
                        padding: 13px 22px;
                        border-radius: 9px;
                        font-weight: 700;
                      "
                    >
                      Reset Password
                    </a>
                  </p>

                  <p
                    style="
                      margin: 0 0 12px;
                      color: #64748b;
                      font-size: 13px;
                      line-height: 1.6;
                    "
                  >
                    This link expires in
                    ${PASSWORD_RESET_MINUTES} minutes
                    and can only be used once.
                  </p>

                  <p
                    style="
                      margin: 0;
                      color: #64748b;
                      font-size: 13px;
                      line-height: 1.6;
                    "
                  >
                    If you did not request a password reset,
                    you can ignore this email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Brevo password reset email failed (${response.status}): ${body}`,
    );
  }
}

// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordIsValid = await verifyPassword(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    req.session.userId = user.id;

    return res.json({
      success: true,

      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
});

// =====================================================
// FORGOT PASSWORD
// =====================================================

router.post("/forgot-password", async (req, res) => {
  const genericMessage = getPasswordResetSuccessMessage();

  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    /*
      Always return the same public response if the
      account does not exist or is inactive.

      This prevents someone from using the reset form
      to discover which email addresses have accounts.
      */

    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordResetToken: hashedToken,

        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl =
      `${getBaseUrl(req)}` +
      `/reset-password?token=` +
      encodeURIComponent(rawToken);

    try {
      await sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetUrl,
      });
    } catch (emailError) {
      console.error("Password reset email error:", emailError);

      /*
        Do not reveal email delivery/account details
        through the public response.
        */
    }

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot-password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process the password reset request.",
    });
  }
});

// =====================================================
// RESET PASSWORD
// =====================================================

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();

    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required.",
      });
    }

    if (password.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Your new password must be at least 10 characters long.",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,

        passwordResetExpiresAt: {
          gt: new Date(),
        },

        isActive: true,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired.",
      });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordHash,

        passwordResetToken: null,

        passwordResetExpiresAt: null,
      },
    });

    return res.json({
      success: true,
      message:
        "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset-password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset the password.",
    });
  }
});

// =====================================================
// CURRENT USER
// =====================================================

router.get("/me", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        user: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.session.userId,
      },
    });

    if (!user || !user.isActive) {
      req.session.destroy(() => {});

      return res.status(401).json({
        success: false,
        user: null,
      });
    }

    return res.json({
      success: true,

      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Current-user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve current user.",
    });
  }
});

// =====================================================
// LOGOUT
// =====================================================

router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to log out.",
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      success: true,
    });
  });
});

module.exports = router;
