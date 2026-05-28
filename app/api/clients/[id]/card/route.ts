/**
 * GET /api/clients/[id]/card?type=debit|credit|atm
 * Returns the data needed to render a card template.
 * Admin/Staff only — card is printed/issued at the branch.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { authMiddleware } from "@/middleware/Authmiddleware";

function maskCardNumber(clientId: string, accountSuffix: string): string {
  // Deterministic card number derived from clientId — NOT a real payment network number
  const base = clientId.replace("CLT-", "").padStart(4, "0");
  return `4000 ${base} ${accountSuffix.padStart(4, "0")} 0001`;
}

function formatExpiry(createdAt: Date): string {
  const exp = new Date(createdAt);
  exp.setFullYear(exp.getFullYear() + 4); // 4-year validity
  return `${String(exp.getMonth() + 1).padStart(2, "0")}/${String(exp.getFullYear()).slice(-2)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const client = await Client.findById(id).select("-password").lean();
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const cardType = (searchParams.get("type") || "debit") as
      | "debit"
      | "credit"
      | "atm";

    const c = client as any;
    const seq = parseInt(c.clientId.replace("CLT-", "")) || 1;

    const cardData = {
      holderName: `${c.firstName} ${c.lastName}`.toUpperCase(),
      cardNumber: maskCardNumber(c.clientId, String(seq)),
      expiry: formatExpiry(new Date(c.createdAt)),
      clientId: c.clientId,
      cardType,
      network: cardType === "atm" ? "ATM" : "VISA",
      issueDate: new Date().toLocaleDateString("en-GB"),
      // Visual variant data for the front-end card renderer
      theme:
        cardType === "credit" ? "gold" : cardType === "atm" ? "dark" : "blue",
    };

    return NextResponse.json({ success: true, cardData });
  } catch (err) {
    console.error("[GET /api/clients/[id]/card]", err);
    return NextResponse.json(
      { error: "Failed to generate card data" },
      { status: 500 },
    );
  }
}
