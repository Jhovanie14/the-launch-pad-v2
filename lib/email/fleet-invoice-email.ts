import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendFleetInvoiceEmail({
  to,
  companyName,
  invoiceNumber,
  amount,
  dueDate,
  hostedInvoiceUrl,
}: {
  to: string;
  companyName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  hostedInvoiceUrl: string | undefined | null;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>", // Update with your domain
      to: [to],
      subject: `Invoice ${invoiceNumber} - Fleet Services`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #1e3a8a;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background-color: #f9fafb;
                padding: 30px;
                border: 1px solid #e5e7eb;
              }
              .invoice-details {
                background-color: white;
                padding: 20px;
                margin: 20px 0;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .detail-row:last-child {
                border-bottom: none;
                font-weight: bold;
                font-size: 1.2em;
              }
              .cta-button {
                display: inline-block;
                background-color: #1e3a8a;
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 0.9em;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Fleet Services Invoice</h1>
              </div>
              <div class="content">
                <p>Dear ${companyName},</p>
                <p>Thank you for your continued business. Please find your invoice details below:</p>
                
                <div class="invoice-details">
                  <div class="detail-row">
                    <span>Invoice Number:</span>
                    <span><strong>${invoiceNumber}</strong></span>
                  </div>
                  <div class="detail-row">
                    <span>Due Date:</span>
                    <span>${new Date(dueDate).toLocaleDateString()}</span>
                  </div>
                  <div class="detail-row">
                    <span>Amount Due:</span>
                    <span>$${amount.toFixed(2)}</span>
                  </div>
                </div>

                <center>
                  <a href="${hostedInvoiceUrl}" class="cta-button">
                    View & Pay Invoice
                  </a>
                </center>

                <p style="margin-top: 30px;">
                  You can pay this invoice online using a credit or debit card. 
                  Click the button above to view your invoice and make a payment.
                </p>

                <p>
                  If you have any questions about this invoice, please don't hesitate to contact us.
                </p>

                <p>Best regards,<br>Fleet Services Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply directly to this message.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Resend email error:", error);
    throw error;
  }
}
