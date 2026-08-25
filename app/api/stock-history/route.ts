import { NextRequest, NextResponse } from "next/server";
import { getStockDailyHistory } from "@/lib/stock-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "^GSPC";
  const startDate = searchParams.get("startDate") || "2022-01-01";

  try {
    const history = await getStockDailyHistory(symbol, startDate);
    return NextResponse.json({ symbol, history });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error fetching stock history", details: err?.message },
      { status: 500 }
    );
  }
}
