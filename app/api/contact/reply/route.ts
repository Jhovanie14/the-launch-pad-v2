import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, reply, firstName } = await req.json();

  if (!email || !reply)
    return NextResponse.json(
      { error: "Missing email or reply." },
      { status: 400 }
    );

  try {
    await resend.emails.send({
      from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>",
      to: email,
      subject: "Response from The Launch Pad",
      html: `
        <p>Hi,${firstName}</p>
        <p>${reply}</p>
        <br/>
        <p>Best regards,<br/>The Launch Pad Team</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
