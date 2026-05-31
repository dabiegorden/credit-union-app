/**
 * GET /api/clients/[id]/statement
 * Generates a PDF transaction statement for a specific client.
 * Admin/Staff/Client (own only).
 *
 * Query params:
 *   from  — ISO date (default: 30 days ago)
 *   to    — ISO date (default: today)
 *   accountId — filter by specific account (optional)
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    // Clients can only generate their own statement
    if (auth.user?.role === "client" && auth.user.userId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await Client.findById(id).select("-password").lean();
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to")! + "T23:59:59Z")
      : new Date();
    const fromDate = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const accountIdFilter = searchParams.get("accountId") || "";

    const txQuery: Record<string, unknown> = {
      clientId: client._id,
      date: { $gte: fromDate, $lte: toDate },
    };
    if (accountIdFilter) txQuery.accountId = accountIdFilter;

    const [accounts, transactions] = await Promise.all([
      SavingsAccount.find({ clientId: client._id }).lean(),
      SavingsTransaction.find(txQuery)
        .populate("accountId", "accountNumber accountType accountName")
        .populate("recordedBy", "name role")
        .sort({ date: 1 })
        .lean(),
    ]);

    // Opening balance = balance at fromDate
    // We approximate as: currentBalance - sum of (deposits - withdrawals) in range
    const netInRange = transactions.reduce(
      (sum, t) =>
        sum + (t.transactionType === "deposit" ? t.amount : -t.amount),
      0,
    );

    const currentBalance = (client as any).savingsBalance || 0;
    const openingBalance = currentBalance - netInRange;

    // ── Generate PDF with pdf-lib ──────────────────────────────────────────
    // pdf-lib uses a bottom-left origin: y=0 is the bottom of the page.
    // A4 dimensions: 595 x 842 pts.
    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const MARGIN = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 495

    const pdfDoc = await PDFDocument.create();

    // Embed fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Helper: add a fresh page and return it with a mutable cursor
    const addPage = () => {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      return { page, cursor: PAGE_HEIGHT - MARGIN };
    };

    // Helper: draw text and return new cursor position
    const drawText = (
      page: ReturnType<typeof pdfDoc.addPage>,
      text: string,
      x: number,
      y: number,
      opts: {
        size?: number;
        font?: typeof fontBold;
        color?: ReturnType<typeof rgb>;
        align?: "left" | "center" | "right";
      } = {},
    ) => {
      const size = opts.size ?? 9;
      const font = opts.font ?? fontRegular;
      const color = opts.color ?? rgb(0, 0, 0);

      let drawX = x;
      if (opts.align === "center") {
        const textWidth = font.widthOfTextAtSize(text, size);
        drawX = (PAGE_WIDTH - textWidth) / 2;
      } else if (opts.align === "right") {
        const textWidth = font.widthOfTextAtSize(text, size);
        drawX = x - textWidth;
      }

      page.drawText(text, { x: drawX, y, size, font, color });
    };

    // ── Page 1
    let { page, cursor } = addPage();

    // ── Title
    drawText(page, "ACCOUNT STATEMENT", 0, cursor, {
      size: 20,
      font: fontBold,
      align: "center",
    });
    cursor -= 22;

    drawText(page, "Credit Union Management System", 0, cursor, {
      size: 10,
      align: "center",
    });
    cursor -= 24;

    // ── Client info box (height 80)
    const boxHeight = 80;
    const boxTop = cursor; // top edge in pdf-lib coords
    page.drawRectangle({
      x: MARGIN,
      y: boxTop - boxHeight,
      width: CONTENT_WIDTH,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Text inside box — positions relative to boxTop
    drawText(page, "CLIENT DETAILS", 60, boxTop - 12, {
      size: 9,
      font: fontBold,
    });
    drawText(
      page,
      `Name: ${(client as any).firstName} ${(client as any).lastName}`,
      60,
      boxTop - 26,
      { size: 9 },
    );
    drawText(page, `Client ID: ${(client as any).clientId}`, 60, boxTop - 38, {
      size: 9,
    });
    drawText(page, `Email: ${(client as any).email}`, 60, boxTop - 50, {
      size: 9,
    });
    drawText(page, `Phone: ${(client as any).phone}`, 300, boxTop - 26, {
      size: 9,
    });
    drawText(
      page,
      `Statement Period: ${fromDate.toDateString()} \u2013 ${toDate.toDateString()}`,
      300,
      boxTop - 38,
      { size: 9 },
    );
    drawText(
      page,
      `Generated: ${new Date().toDateString()}`,
      300,
      boxTop - 50,
      { size: 9 },
    );

    cursor = boxTop - boxHeight - 20;

    // ── Account Summary
    drawText(page, "Account Summary", MARGIN, cursor, {
      size: 11,
      font: fontBold,
    });
    cursor -= 16;

    accounts.forEach((acc) => {
      drawText(
        page,
        `${acc.accountNumber} \u2014 ${acc.accountName} (${acc.accountType}): GHS${acc.balance.toFixed(2)}`,
        MARGIN,
        cursor,
        { size: 9 },
      );
      cursor -= 13;
    });
    cursor -= 6;

    // ── Opening balance
    drawText(
      page,
      `Opening Balance (${fromDate.toDateString()}): GHS${openingBalance.toFixed(2)}`,
      MARGIN,
      cursor,
      { size: 9, font: fontBold },
    );
    cursor -= 18;

    // ── Transactions table header
    const colDate = MARGIN; // 50
    const colDesc = 135;
    const colType = 310;
    const colAmt = 380;
    const colBal = 450;
    const rowH = 16;

    // Header row background
    page.drawRectangle({
      x: MARGIN,
      y: cursor - rowH,
      width: CONTENT_WIDTH,
      height: rowH,
      color: rgb(0.91, 0.91, 0.91),
    });

    drawText(page, "Date", colDate, cursor - 12, { size: 8, font: fontBold });
    drawText(page, "Description", colDesc, cursor - 12, {
      size: 8,
      font: fontBold,
    });
    drawText(page, "Type", colType, cursor - 12, { size: 8, font: fontBold });
    drawText(page, "Amount", colAmt, cursor - 12, { size: 8, font: fontBold });
    drawText(page, "Balance", colBal, cursor - 12, { size: 8, font: fontBold });
    cursor -= rowH + 2;

    // ── Transaction rows
    if (transactions.length === 0) {
      cursor -= 4;
      drawText(page, "No transactions in this period.", 0, cursor, {
        size: 9,
        align: "center",
      });
      cursor -= 14;
    } else {
      transactions.forEach((t, i) => {
        // Add a new page when approaching the bottom (leave room for summary ~80 pts)
        if (cursor < MARGIN + 80) {
          ({ page, cursor } = addPage());
        }

        const rowY = cursor - rowH;
        const isDeposit = t.transactionType === "deposit";

        // Alternating row background
        if (i % 2 === 0) {
          page.drawRectangle({
            x: MARGIN,
            y: rowY,
            width: CONTENT_WIDTH,
            height: rowH,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        const acc = t.accountId as any;
        const desc = (t.description || acc?.accountName || "Transaction").slice(
          0,
          30,
        );
        const amt = `${isDeposit ? "+" : "-"}GHS${t.amount.toFixed(2)}`;
        const amtColor = isDeposit
          ? rgb(0.1, 0.48, 0.1)
          : rgb(0.698, 0.133, 0.133);
        const textY = rowY + 4;

        drawText(
          page,
          new Date(t.date).toLocaleDateString("en-GB"),
          colDate,
          textY,
          { size: 8 },
        );
        drawText(page, desc, colDesc, textY, { size: 8 });
        drawText(page, t.transactionType, colType, textY, { size: 8 });
        drawText(page, amt, colAmt, textY, { size: 8, color: amtColor });
        drawText(page, `GHS${t.balanceAfter.toFixed(2)}`, colBal, textY, {
          size: 8,
        });

        cursor -= rowH + 2;
      });
    }

    cursor -= 10;

    // ── Summary totals box
    const totalDeposits = transactions
      .filter((t) => t.transactionType === "deposit")
      .reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = transactions
      .filter((t) => t.transactionType === "withdrawal")
      .reduce((s, t) => s + t.amount, 0);
    const closingBalance = openingBalance + totalDeposits - totalWithdrawals;

    // Ensure the summary box fits on the current page
    if (cursor < MARGIN + 70) {
      ({ page, cursor } = addPage());
    }

    const sumBoxHeight = 60;
    page.drawRectangle({
      x: 300,
      y: cursor - sumBoxHeight,
      width: 245,
      height: sumBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    drawText(page, "Total Deposits:", 310, cursor - 10, {
      size: 8,
      font: fontBold,
    });
    drawText(page, "Total Withdrawals:", 310, cursor - 24, {
      size: 8,
      font: fontBold,
    });
    drawText(page, "Closing Balance:", 310, cursor - 38, {
      size: 8,
      font: fontBold,
    });
    drawText(page, `GHS${totalDeposits.toFixed(2)}`, 435, cursor - 10, {
      size: 8,
    });
    drawText(page, `GHS${totalWithdrawals.toFixed(2)}`, 435, cursor - 24, {
      size: 8,
    });
    drawText(page, `GHS${closingBalance.toFixed(2)}`, 435, cursor - 38, {
      size: 8,
    });

    cursor -= sumBoxHeight + 20;

    // ── Footer note
    drawText(
      page,
      "This is a computer-generated statement and requires no signature.",
      0,
      cursor,
      { size: 7, color: rgb(0.53, 0.53, 0.53), align: "center" },
    );

    // ── Serialise
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    const filename = `statement-${(client as any).clientId}-${fromDate.toISOString().split("T")[0]}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/clients/[id]/statement]", err);
    return NextResponse.json(
      { error: "Failed to generate statement" },
      { status: 500 },
    );
  }
}
