// GET /api/report/export?token=... — render the public report to PDF via Puppeteer.
// Navigates to the no-login /r/[token] page so the same rendered report becomes the PDF.
// NOTE: bundled Chromium works locally; on Vercel use @sparticuz/chromium + puppeteer-core.
import { NextResponse } from "next/server";
import { getReportByShareToken } from "@/lib/db";
import { uploadReportPdf } from "@/lib/storage";
import { appUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const report = token ? await getReportByShareToken(token) : undefined;
  if (!report) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  // Puppeteer (bundled Chromium) only runs on a Node host. On Cloudflare Workers the import fails;
  // return 501 so the client falls back to the browser print dialog.
  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    return NextResponse.json(
      { error: "Server-side PDF export is unavailable on this host. Use the browser print dialog." },
      { status: 501 },
    );
  }

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
    // Best-effort archive to the reports bucket (don't fail the download if it errors).
    await uploadReportPdf(report.id, new Uint8Array(pdf)).catch(() => null);
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
