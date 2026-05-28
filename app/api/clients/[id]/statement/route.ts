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
import PDFDocument from "pdfkit";

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

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", resolve);

      // ── Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("ACCOUNT STATEMENT", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Credit Union Management System", { align: "center" })
        .moveDown();

      // ── Client info box
      doc.rect(50, doc.y, 495, 80).stroke();
      const boxTop = doc.y + 8;
      doc.fontSize(9).font("Helvetica-Bold").text("CLIENT DETAILS", 60, boxTop);
      doc
        .font("Helvetica")
        .text(
          `Name: ${(client as any).firstName} ${(client as any).lastName}`,
          60,
          boxTop + 14,
        )
        .text(`Client ID: ${(client as any).clientId}`, 60, boxTop + 26)
        .text(`Email: ${(client as any).email}`, 60, boxTop + 38)
        .text(`Phone: ${(client as any).phone}`, 300, boxTop + 14)
        .text(
          `Statement Period: ${fromDate.toDateString()} – ${toDate.toDateString()}`,
          300,
          boxTop + 26,
        )
        .text(`Generated: ${new Date().toDateString()}`, 300, boxTop + 38);
      doc.moveDown(5);

      // ── Account summary
      doc.fontSize(11).font("Helvetica-Bold").text("Account Summary");
      doc.moveDown(0.3);
      accounts.forEach((acc) => {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `${acc.accountNumber} — ${acc.accountName} (${acc.accountType}): GH₵${acc.balance.toFixed(2)}`,
          );
      });
      doc.moveDown();

      // ── Opening balance
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(
          `Opening Balance (${fromDate.toDateString()}): GH₵${openingBalance.toFixed(2)}`,
        );
      doc.moveDown(0.5);

      // ── Transactions table
      const colDate = 50,
        colDesc = 135,
        colType = 310,
        colAmt = 380,
        colBal = 450;
      const headerY = doc.y;

      doc.rect(50, headerY, 495, 16).fill("#e8e8e8");
      doc
        .fillColor("black")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Date", colDate, headerY + 4)
        .text("Description", colDesc, headerY + 4)
        .text("Type", colType, headerY + 4)
        .text("Amount", colAmt, headerY + 4)
        .text("Balance", colBal, headerY + 4);
      doc.moveDown(1);

      if (transactions.length === 0) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text("No transactions in this period.", { align: "center" });
      } else {
        transactions.forEach((t, i) => {
          if (doc.y > 720) {
            doc.addPage();
          }
          const rowY = doc.y;
          const isDeposit = t.transactionType === "deposit";
          if (i % 2 === 0) doc.rect(50, rowY, 495, 14).fill("#fafafa");

          const acc = t.accountId as any;
          const desc = t.description || (acc?.accountName ?? "Transaction");
          const amt = `${isDeposit ? "+" : "-"}GH₵${t.amount.toFixed(2)}`;

          doc
            .fillColor(isDeposit ? "#1a7a1a" : "#b22222")
            .fontSize(8)
            .font("Helvetica")
            .text(
              new Date(t.date).toLocaleDateString("en-GB"),
              colDate,
              rowY + 3,
            )
            .fillColor("black")
            .text(desc.slice(0, 30), colDesc, rowY + 3)
            .text(t.transactionType, colType, rowY + 3)
            .text(amt, colAmt, rowY + 3)
            .text(`GH₵${t.balanceAfter.toFixed(2)}`, colBal, rowY + 3);
          doc.moveDown(0.9);
        });
      }

      doc.moveDown();

      // ── Summary totals
      const totalDeposits = transactions
        .filter((t) => t.transactionType === "deposit")
        .reduce((s, t) => s + t.amount, 0);
      const totalWithdrawals = transactions
        .filter((t) => t.transactionType === "withdrawal")
        .reduce((s, t) => s + t.amount, 0);
      const closingBalance = openingBalance + totalDeposits - totalWithdrawals;

      doc.rect(300, doc.y, 245, 60).stroke();
      const sumY = doc.y + 6;
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Total Deposits:", 310, sumY)
        .text("Total Withdrawals:", 310, sumY + 14)
        .text("Closing Balance:", 310, sumY + 28)
        .font("Helvetica")
        .text(`GH₵${totalDeposits.toFixed(2)}`, 435, sumY)
        .text(`GH₵${totalWithdrawals.toFixed(2)}`, 435, sumY + 14)
        .text(`GH₵${closingBalance.toFixed(2)}`, 435, sumY + 28);

      doc.moveDown(5);
      doc
        .fontSize(7)
        .fillColor("#888")
        .text(
          "This is a computer-generated statement and requires no signature.",
          { align: "center" },
        );

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
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
