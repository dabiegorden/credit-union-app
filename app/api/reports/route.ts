import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import Savings from "@/models/Savings";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import ExcelJS from "exceljs";
import { authMiddleware } from "@/middleware/Authmiddleware";

// GET - Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff", "member"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const totalMembers = await Member.countDocuments({ status: "active" });
    const totalSavings = await Member.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$savingsBalance" },
        },
      },
    ]);

    const activeLoans = await Loan.countDocuments({ status: "active" });
    const totalLoans = await Loan.countDocuments();
    const loanAmountOutstanding = await Loan.aggregate([
      { $match: { status: { $in: ["active", "pending"] } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ["$totalPayable", "$amountPaid"] } },
        },
      },
    ]);

    const todayTransactions = await Savings.countDocuments({
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    return NextResponse.json(
      {
        dashboard: {
          totalMembers,
          totalSavings: totalSavings[0]?.total || 0,
          activeLoans,
          totalLoans,
          loanAmountOutstanding: loanAmountOutstanding[0]?.total || 0,
          todayTransactions,
        },
      },
      { status: 200 },
    );
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
      // Generate all reports
      await generateMembersReport(workbook);
      await generateSavingsReport(workbook);
      await generateLoansReport(workbook);
      await generateRepaymentReport(workbook);
    } else {
      switch (reportType) {
        case "members":
          await generateMembersReport(workbook);
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
        "Content-Disposition": `attachment; filename="credit-union-report-${Date.now()}.xlsx"`,
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

async function generateMembersReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Members");
  const members = await Member.find().sort({ dateJoined: -1 });

  worksheet.columns = [
    { header: "Member ID", key: "memberId", width: 15 },
    { header: "First Name", key: "firstName", width: 15 },
    { header: "Last Name", key: "lastName", width: 15 },
    { header: "Email", key: "email", width: 20 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Status", key: "status", width: 12 },
    { header: "Savings Balance", key: "savingsBalance", width: 15 },
    { header: "Date Joined", key: "dateJoined", width: 15 },
  ];

  members.forEach((member) => {
    worksheet.addRow({
      memberId: member.memberId,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      status: member.status,
      savingsBalance: member.savingsBalance,
      dateJoined: member.dateJoined.toLocaleDateString(),
    });
  });
}

async function generateSavingsReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Savings");
  const transactions = await Savings.find()
    .populate("memberId", "memberId firstName lastName")
    .sort({ date: -1 });

  worksheet.columns = [
    { header: "Member ID", key: "memberId", width: 15 },
    { header: "Member Name", key: "memberName", width: 20 },
    { header: "Type", key: "transactionType", width: 12 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Balance After", key: "balanceAfter", width: 15 },
    { header: "Date", key: "date", width: 15 },
  ];

  transactions.forEach((tx) => {
    worksheet.addRow({
      memberId: (tx.memberId as any).memberId,
      memberName: `${(tx.memberId as any).firstName} ${(tx.memberId as any).lastName}`,
      transactionType: tx.transactionType,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      date: tx.date.toLocaleDateString(),
    });
  });
}

async function generateLoansReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Loans");
  const loans = await Loan.find()
    .populate("memberId", "memberId firstName lastName")
    .sort({ dateApplied: -1 });

  worksheet.columns = [
    { header: "Member ID", key: "memberId", width: 15 },
    { header: "Member Name", key: "memberName", width: 20 },
    { header: "Loan Amount", key: "loanAmount", width: 12 },
    { header: "Interest Rate", key: "interestRate", width: 12 },
    { header: "Total Payable", key: "totalPayable", width: 12 },
    { header: "Amount Paid", key: "amountPaid", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Applied Date", key: "dateApplied", width: 15 },
  ];

  loans.forEach((loan) => {
    worksheet.addRow({
      memberId: (loan.memberId as any).memberId,
      memberName: `${(loan.memberId as any).firstName} ${(loan.memberId as any).lastName}`,
      loanAmount: loan.loanAmount,
      interestRate: loan.interestRate,
      totalPayable: loan.totalPayable,
      amountPaid: loan.amountPaid,
      status: loan.status,
      dateApplied: loan.dateApplied.toLocaleDateString(),
    });
  });
}

async function generateRepaymentReport(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Repayments");
  const repayments = await LoanRepayment.find()
    .populate("loanId", "loanAmount totalPayable")
    .sort({ date: -1 });

  worksheet.columns = [
    { header: "Loan Amount", key: "loanAmount", width: 12 },
    { header: "Amount Paid", key: "amountPaid", width: 12 },
    { header: "Balance Remaining", key: "balanceRemaining", width: 15 },
    { header: "Date", key: "date", width: 15 },
  ];

  repayments.forEach((rep) => {
    worksheet.addRow({
      loanAmount: (rep.loanId as any).loanAmount,
      amountPaid: rep.amountPaid,
      balanceRemaining: rep.balanceRemaining,
      date: rep.date.toLocaleDateString(),
    });
  });
}
