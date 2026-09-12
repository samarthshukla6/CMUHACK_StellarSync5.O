import { NextResponse } from "next/server";
import {
  createEmailTransporter,
  verifyEmailTransporter,
  getEmailFromAddress,
} from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      guideName,
      guideEmail,
      guideStyle,
      appointmentDate,
      appointmentTime,
      travelerName = "A traveler",
    } = body;

    if (!guideName || !guideEmail || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { success: false, message: "Missing required fields (guide, date, time)." },
        { status: 400 }
      );
    }

    const { transporter, configError } = createEmailTransporter();
    if (configError) {
      return NextResponse.json({ success: false, message: configError }, { status: 500 });
    }

    const verifyError = await verifyEmailTransporter(transporter!);
    if (verifyError) {
      return NextResponse.json({ success: false, message: verifyError }, { status: 500 });
    }

    await transporter!.sendMail({
      from: `"${travelerName} via Atlas" <${getEmailFromAddress()}>`,
      to: guideEmail,
      subject: `Planning call request: ${travelerName} - ${appointmentDate}`,
      text: `Hi ${guideName},\n\n${travelerName} requested a planning call.\n\nStyle: ${guideStyle || "N/A"}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n\nPlease confirm or propose an alternative.\n\nAtlas`,
      html: `<h4>Planning call request</h4>
        <p>Hi ${guideName},</p>
        <p><strong>${travelerName}</strong> requested a planning call.</p>
        <ul>
          <li><strong>Style:</strong> ${guideStyle || "N/A"}</li>
          <li><strong>Date:</strong> ${appointmentDate}</li>
          <li><strong>Time:</strong> ${appointmentTime}</li>
        </ul>
        <p>Please confirm or propose an alternative.</p>`,
    });

    return NextResponse.json({ success: true, message: "Call request sent." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("schedule-appointment:", message);
    return NextResponse.json(
      { success: false, message: `Failed to request call: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: true, bookedSlots: [] });
}
