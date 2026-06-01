// GET /api/report/export?token=... — render the public report to PDF via Puppeteer.
// Navigates to the no-login /r/[token] page so the same rendered report becomes the PDF.
// NOTE: bundled Chromium works locally; on Vercel use @sparticuz/chromium + puppeteer-core.
import { NextResponse } from "next/server";
import { getReportByShareToken } from "@/lib/db";
import { appUrl } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !getReportByShareToken(token)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(`${appUrl}/r/${token}`, { waitUntil: "networkidle0", timeout: 30000 });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "16px", bottom: "16px", left: "16px", right: "16px" },
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ux-kpi-report.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
