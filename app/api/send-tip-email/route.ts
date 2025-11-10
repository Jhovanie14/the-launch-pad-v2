import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, name, bookingId } = await req.json();
    console.log("🟢 Tip email request received:", { email, name, bookingId });

    const tipLink = `https://buy.stripe.com/bJeaEW32W1WD4tHeq9cwg01?booking=${bookingId}`;

    const data = await resend.emails.send({
      from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>",
      to: email,
      subject: "✨ Your car looks incredible — help us celebrate!",
      html: `
         <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thank You!</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
              background-color: #f8f8f8;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%);
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
            .header {
              background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
              padding: 40px 24px;
              text-align: center;
              color: white;
            }
            .header-emoji {
              font-size: 48px;
              margin-bottom: 16px;
              display: block;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              line-height: 1.2;
              letter-spacing: -0.5px;
            }
            .header-subtitle {
              margin: 12px 0 0 0;
              font-size: 16px;
              opacity: 0.95;
              font-weight: 500;
            }
            .content {
              padding: 40px 32px;
            }
            .greeting {
              font-size: 18px;
              color: #1a1a1a;
              margin: 0 0 24px 0;
              line-height: 1.5;
              font-weight: 600;
            }
            .message-card {
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: center;
            }
            .message-text {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.6;
              margin: 0;
            }
            .highlight {
              color: #0066ff;
              font-weight: 600;
            }
            .section {
              margin: 32px 0;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 16px 0;
            }
            .tip-reasons {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .reason {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              padding: 12px;
              background: #f0f4ff;
              border-radius: 6px;
              font-size: 14px;
              color: #4b5563;
              line-height: 1.5;
            }
            .reason-icon {
              flex-shrink: 0;
              font-size: 16px;
              margin-top: 2px;
            }
            .cta-container {
              text-align: center;
              margin: 32px 0;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: #ffffff !important;
                padding: 16px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 700;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
            }

            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(79, 172, 254, 0.6);
                background: linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%);
            }
            .footer {
              padding: 24px 32px;
              background: #fafbfc;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #888;
              line-height: 1.6;
            }
            .footer-link {
              color: #0066ff;
              text-decoration: none;
            }
            .divider {
              height: 1px;
              background: #e5e7eb;
              margin: 24px 0;
            }
            @media (max-width: 600px) {
              .container {
                border-radius: 0;
              }
              .header {
                padding: 32px 20px;
              }
              .header h1 {
                font-size: 24px;
              }
              .content {
                padding: 24px 20px;
              }
              .footer {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f8f8;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table cellpadding="0" cellspacing="0" border="0" class="container">
                  <!-- Header -->
                  <tr>
                    <td class="header">
                      <span class="header-emoji">🌟</span>
                      <h1>You Just Made Our Day!</h1>
                      <p class="header-subtitle">Your car looks absolutely stunning</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td class="content">
                      <p class="greeting">Hey ${name || "there"},</p>
                      
                      <div class="message-card">
                        <p class="message-text">
                          We just finished giving your car the <span class="highlight">ultimate spa day</span>, and honestly? It's looking incredible. Our team poured their heart into every detail. ❤️
                        </p>
                      </div>

                      <p class="message-text" style="margin: 24px 0;">
                        If your experience matched that fresh, sparkly finish, we'd be so grateful for a tip. It means the world to our crew and helps us keep delivering that <span class="highlight">5-star treatment</span>.
                      </p>

                      <!-- Why tip section -->
                      <div class="section">
                        <div class="section-title">Why your tip matters</div>
                        <div class="tip-reasons">
                          <div class="reason">
                            <span class="reason-icon">💪</span>
                            <span><strong>Fuels our team</strong> — Your crew works hard to exceed expectations</span>
                          </div>
                          <div class="reason">
                            <span class="reason-icon">✨</span>
                            <span><strong>100% to attendants</strong> — Every tip goes directly to the car wash attendants working on your vehicle</span>
                          </div>
                          <div class="reason">
                            <span class="reason-icon">🚀</span>
                            <span><strong>Your appreciation matters</strong> — Tips recognize their effort and motivate great service every time</span>
                          </div>
                        </div>
                      </div>

                      <!-- CTA -->
                      <div class="cta-container">
                        <a href="${tipLink}" target="_blank" class="cta-button">💙 Leave a Tip</a>
                      </div>

                      <!-- Google Review Section -->
                      <div class="cta-container">
                        <p class="message-text" style="margin-bottom: 12px;">
                          Loved your car wash experience? 💫 Let others know!
                        </p>
                        <a
                          href="https://g.page/r/CZw2a77VbVUUEBM/review"
                          target="_blank"
                          class="cta-button"
                          style="background: linear-gradient(135deg, #34d399 0%, #059669 100%); box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4);"
                        >
                          ⭐ Leave us a Google Review
                        </a>
                      </div>

                      <p class="message-text" style="text-align: center; font-size: 14px; color: #888; margin: 16px 0 0 0;">
                        No pressure — just pure appreciation if you want to show some love ✌️
                      </p>

                      <div class="divider"></div>

                      <p class="message-text" style="font-size: 15px;">
                        <strong>See you soon!</strong> <br/>
                        The Launch Pad Wash Team 🚀
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td class="footer">
                      <p style="margin: 0;">
                        Thank you for choosing The Launch Pad Wash!
                      </p>
                      <p style="margin: 8px 0 0 0; color: #aaa;">
                        This is an automated message. <a href="#" class="footer-link">Manage preferences</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("✅ Resend response:", data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error sending tip email:", error);
    return NextResponse.json({ success: false, error });
  }
}
