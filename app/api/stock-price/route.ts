import { NextRequest, NextResponse } from "next/server";
import { getMultipleStockQuotes, getStockQuote } from "@/lib/stock-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");
  const symbolParam = searchParams.get("symbol");

  try {
    if (symbolParam) {
      const quote = await getStockQuote(symbolParam);
      return NextResponse.json({ quote });
    }

    if (symbolsParam) {
      const symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const quotes = await getMultipleStockQuotes(symbols);
      return NextResponse.json({ quotes });
    }

    return NextResponse.json(
      { error: "Please provide ?symbols=AAPL,MSFT or ?symbol=AAPL" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error fetching stock quotes", details: err?.message },
      { status: 500 }
    );
  }
}
