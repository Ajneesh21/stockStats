import fs from "fs";
import path from "path";
import { parseVestedSpreadsheetSheets } from "../lib/vested-sheet-parser";
import { computePortfolioSummary } from "../lib/portfolio-engine";

async function main() {
  const csvDir = path.join(process.cwd(), "Transactions2.csv");
  const sheetMap: Record<string, string> = {};

  const files = fs.readdirSync(csvDir);
  for (const f of files) {
    if (f.endsWith(".csv")) {
      const content = fs.readFileSync(path.join(csvDir, f), "utf-8");
      sheetMap[f] = content;
    }
  }

  console.log("=== PARSING USER'S REAL VESTED NUMBERS SPREADSHEET ===");
  const parsed = parseVestedSpreadsheetSheets(sheetMap);
  console.log(`Parsed ${parsed.transactions.length} total transactions!`);

  console.log("\n--- Breakdown by Type ---");
  const counts: Record<string, number> = {};
  parsed.transactions.forEach((t) => {
    counts[t.type] = (counts[t.type] || 0) + 1;
  });
  console.log(counts);

  console.log("\n--- Computing Portfolio Summary ---");
  const summary = await computePortfolioSummary(parsed.transactions);

  console.log("\n==========================================");
  console.log(`Total Portfolio Value: $${summary.totalValue.toLocaleString()}`);
  console.log(`Net Invested Capital: $${summary.netInvestedCapital.toLocaleString()}`);
  console.log(`Cash Balance: $${summary.cashBalance.toLocaleString()}`);
  console.log(`Unrealized P&L: $${summary.unrealizedPnL.toLocaleString()} (${summary.unrealizedPnLPercent}%)`);
  console.log(`Dividends & Interest: $${summary.totalDividends.toLocaleString()}`);
  console.log(`Realized Capital Gains: $${summary.realizedPnL.toLocaleString()}`);
  console.log(`Time-Weighted Return (TWR): ${summary.twrPercent}%`);
  console.log(`Money-Weighted Return (XIRR): ${summary.xirrPercent}%`);
  console.log("==========================================");

  console.log("\n--- Daily Timeline Points (Real Market Movement) ---");
  summary.timeline.forEach((pt) => {
    console.log(`  ${pt.date} | Val: $${pt.portfolioValue} | Port TWR: ${pt.cumulativeTWR}% | S&P 500: ${pt.sp500TWR}% | Nasdaq: ${pt.nasdaqTWR}%`);
  });
}

main().catch(console.error);
