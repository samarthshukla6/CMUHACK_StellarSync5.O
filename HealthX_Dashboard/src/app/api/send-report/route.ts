import { NextResponse } from "next/server";
import {
  createEmailTransporter,
  verifyEmailTransporter,
  getEmailFromAddress,
} from "@/lib/email";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const guideEmail = formData.get("guideEmail") as string | null;
    const guideName = formData.get("guideName") as string | null;
    const travelerName = (formData.get("travelerName") as string | null) || "Traveler";
    const reportFile = formData.get("reportFile");

    if (!guideEmail || !guideName) {
      return NextResponse.json(
        { success: false, message: "Missing guide email or name." },
        { status: 400 }
      );
    }

    if (!reportFile || typeof reportFile === "string" || !("arrayBuffer" in reportFile)) {
      return NextResponse.json(
        { success: false, message: "Itinerary file is missing or invalid." },
        { status: 400 }
      );
    }

    const file = reportFile as File;
    const { transporter, configError } = createEmailTransporter();
    if (configError) {
      return NextResponse.json({ success: false, message: configError }, { status: 500 });
    }

    const verifyError = await verifyEmailTransporter(transporter!);
    if (verifyError) {
      return NextResponse.json({ success: false, message: verifyError }, { status: 500 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await transporter!.sendMail({
      from: `"${travelerName} via Atlas" <${getEmailFromAddress()}>`,
      to: guideEmail,
      subject: `Travel itinerary for ${travelerName}`,
      text: `Hi ${guideName},\n\nPlease find the travel itinerary attached for ${travelerName}.\n\nAtlas`,
      html: `<p>Hi ${guideName},</p><p>Please find the travel itinerary attached for ${travelerName}.</p><p>Atlas</p>`,
      attachments: [
        {
          filename: file.name,
          content: fileBuffer,
          contentType: file.type || "application/octet-stream",
        },
      ],
    });

    return NextResponse.json({ success: true, message: "Itinerary sent." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-report:", message);
    return NextResponse.json(
      { success: false, message: `Failed to send itinerary: ${message}` },
      { status: 500 }
    );
  }
}
