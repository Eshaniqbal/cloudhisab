import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { toEmail, invoiceNumber, customerName, totalAmount, pdfUrl } = body;

        if (!toEmail) {
            return NextResponse.json({ success: false, error: "Recipient email is required" }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"CloudHisaab" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Invoice ${invoiceNumber} from CloudHisaab`,
            text: `Hello ${customerName},\n\nYour invoice ${invoiceNumber} for ₹${totalAmount || ''} is ready.\n\nYou can securely view and download your invoice online here: ${pdfUrl || 'Not available'}\n\nThank you!`,
            html: `
                <div style="background-color: #f3f4f6; padding: 40px 20px; font-family: 'Inter', Helvetica, Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
                        
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">CloudHisaab</h1>
                            <p style="color: rgba(255, 255, 255, 0.8); font-size: 15px; margin: 8px 0 0 0;">Your invoice is ready</p>
                        </div>

                        <!-- Body -->
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #111827; font-size: 22px; font-weight: 600; margin: 0 0 20px 0;">Hi ${customerName},</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Thank you for your business. Your invoice <strong>#${invoiceNumber}</strong> is ready. Please find the summary below.
                            </p>

                            <!-- Invoice Summary Box -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding-bottom: 12px;">
                                            <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Invoice Number</span>
                                        </td>
                                        <td align="right" style="padding-bottom: 12px;">
                                            <span style="color: #0f172a; font-size: 15px; font-weight: 600;">${invoiceNumber}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 12px; border-top: 1px solid #e2e8f0;">
                                            <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Total Amount</span>
                                        </td>
                                        <td align="right" style="padding-top: 12px; border-top: 1px solid #e2e8f0;">
                                            <span style="color: #4f46e5; font-size: 18px; font-weight: 800;">₹${totalAmount || '0'}</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <p style="color: #4b5563; font-size: 15px; text-align: center; margin-bottom: 24px;">
                                You can also view or download your invoice securely online.
                            </p>

                            <!-- CTA Button -->
                            ${pdfUrl ? `
                            <div style="text-align: center; margin-bottom: 10px;">
                                <a href="${pdfUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: 'Inter', Helvetica, sans-serif;">
                                    View Invoice Online
                                </a>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; font-size: 13px; margin: 0;">
                                If you have any questions, simply reply to this email.
                            </p>
                            <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0 0;">
                                &copy; ${new Date().getFullYear()} CloudHisaab. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
        console.error("Email sending error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
