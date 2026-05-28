import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import SavingsTransaction from "@/models/Savingstransaction";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import ExcelJS from "exceljs";
import { authMiddleware } from "@/middleware/Authmiddleware";

// GET - Basic dashboard statistics (lightweight, for non-dashboard pages)
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff", "client"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const [
      totalClients,
      savingsAgg,
      activeLoans,
      totalLoans,
      outstandingAgg,
      todayTx,
    ] = await Promise.all([
      Client.countDocuments({ status: "active" }),
      Client.aggregate([
        { $group: { _id: null, total: { $sum: "$savingsBalance" } } },
      ]),
      Loan.countDocuments({ status: "active" }),
      Loan.countDocuments(),
      Loan.aggregate([
        { $match: { status: { $in: ["active", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
      ]),
      SavingsTransaction.countDocuments({
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    return NextResponse.json({
      dashboard: {
        totalClients,
        totalSavings: savingsAgg[0]?.total || 0,
        activeLoans,
        totalLoans,
        loanAmountOutstanding: outstandingAgg[0]?.total || 0,
        todayTransactions: todayTx,
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}

// POST - Generate Excel reports
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const { reportType } = await request.json();
    await connectDB();

    const workbook = new ExcelJS.Workbook();

    if (!reportType || reportType === "all") {
      await generateClientsReport(workbook);
      await generateSavingsReport(workbook);
      await generateLoansReport(workbook);
      await generateRepaymentReport(workbook);
    } else {
      switch (reportType) {
        case "clients":
          await generateClientsReport(workbook);
          break;
        case "savings":
          await generateSavingsReport(workbook);
          break;
        case "loans":
          await generateLoansReport(workbook);
          break;
        case "repayments":
          await generateRepaymentReport(workbook);
          break;
        default:
          return NextResponse.json(
            { error: "Invalid report type" },
            { status: 400 },
          );
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}

async function generateClientsReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Clients");
  const clients = await Client.find().sort({ createdAt: -1 }).lean();

  worksheet.columns = [
    { header: "Client ID", key: "clientId", width: 15 },
    { header: "First Name", key: "firstName", width: 15 },
    { header: "Last Name", key: "lastName", width: 15 },
    { header: "Email", key: "email", width: 25 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Status", key: "status", width: 12 },
    { header: "Savings Balance", key: "savingsBalance", width: 15 },
    { header: "Date Registered", key: "createdAt", width: 18 },
  ];

  clients.forEach((c: any) => {
    worksheet.addRow({
      clientId: c.clientId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      status: c.status,
      savingsBalance: c.savingsBalance,
      createdAt: new Date(c.createdAt).toLocaleDateString(),
    });
  });
}

async function generateSavingsReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Savings");
  const transactions = await SavingsTransaction.find()
    .populate("clientId", "clientId firstName lastName")
    .sort({ date: -1 })
    .lean();

  worksheet.columns = [
    { header: "Client ID", key: "clientId", width: 15 },
    { header: "Client Name", key: "clientName", width: 22 },
    { header: "Type", key: "transactionType", width: 12 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Balance After", key: "balanceAfter", width: 15 },
    { header: "Date", key: "date", width: 15 },
  ];

  transactions.forEach((tx: any) => {
    worksheet.addRow({
      clientId: tx.clientId?.clientId ?? "",
      clientName: tx.clientId
        ? `${tx.clientId.firstName} ${tx.clientId.lastName}`
        : "",
      transactionType: tx.transactionType,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      date: new Date(tx.date).toLocaleDateString(),
    });
  });
}

async function generateLoansReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Loans");
  const loans = await Loan.find()
    .populate("clientId", "clientId firstName lastName")
    .sort({ applicationDate: -1 })
    .lean();

  worksheet.columns = [
    { header: "Loan ID", key: "loanId", width: 14 },
    { header: "Client ID", key: "clientId", width: 14 },
    { header: "Client Name", key: "clientName", width: 22 },
    { header: "Loan Amount", key: "loanAmount", width: 14 },
    { header: "Interest Rate", key: "finalInterestRate", width: 14 },
    { header: "Total Payable", key: "totalPayable", width: 14 },
    { header: "Amount Paid", key: "amountPaid", width: 12 },
    { header: "Outstanding", key: "outstandingBalance", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Applied Date", key: "applicationDate", width: 15 },
  ];

  loans.forEach((l: any) => {
    worksheet.addRow({
      loanId: l.loanId,
      clientId: l.clientId?.clientId ?? "",
      clientName: l.clientId
        ? `${l.clientId.firstName} ${l.clientId.lastName}`
        : "",
      loanAmount: l.loanAmount,
      finalInterestRate: l.finalInterestRate,
      totalPayable: l.totalPayable,
      amountPaid: l.amountPaid,
      outstandingBalance: l.outstandingBalance,
      status: l.status,
      applicationDate: l.applicationDate
        ? new Date(l.applicationDate).toLocaleDateString()
        : "",
    });
  });
}

async function generateRepaymentReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Repayments");
  const repayments = await LoanRepayment.find()
    .populate("loanId", "loanId loanAmount totalPayable")
    .populate("clientId", "clientId firstName lastName")
    .sort({ paymentDate: -1 })
    .lean();

  worksheet.columns = [
    { header: "Repayment ID", key: "repaymentId", width: 15 },
    { header: "Loan ID", key: "loanId", width: 14 },
    { header: "Client ID", key: "clientId", width: 14 },
    { header: "Client Name", key: "clientName", width: 22 },
    { header: "Amount Paid", key: "amount", width: 14 },
    { header: "Principal", key: "principalPortion", width: 12 },
    { header: "Interest", key: "interestPortion", width: 12 },
    { header: "Penalty", key: "penaltyPortion", width: 12 },
    { header: "Balance Before", key: "outstandingBalanceBefore", width: 16 },
    { header: "Balance After", key: "outstandingBalanceAfter", width: 16 },
    { header: "Method", key: "method", width: 15 },
    { header: "Payment Date", key: "paymentDate", width: 15 },
  ];

  repayments.forEach((r: any) => {
    worksheet.addRow({
      repaymentId: r.repaymentId,
      loanId: r.loanId?.loanId ?? "",
      clientId: r.clientId?.clientId ?? "",
      clientName: r.clientId
        ? `${r.clientId.firstName} ${r.clientId.lastName}`
        : "",
      amount: r.amount,
      principalPortion: r.principalPortion,
      interestPortion: r.interestPortion,
      penaltyPortion: r.penaltyPortion,
      outstandingBalanceBefore: r.outstandingBalanceBefore,
      outstandingBalanceAfter: r.outstandingBalanceAfter,
      method: r.method,
      paymentDate: new Date(r.paymentDate).toLocaleDateString(),
    });
  });
}
