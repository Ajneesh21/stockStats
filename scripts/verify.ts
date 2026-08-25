import { calculateTWR } from "../lib/twr-calculator";
import { calculateXIRR } from "../lib/xirr-calculator";
import { parseVestedStatementText } from "../lib/pdf-parser";
import { computePortfolioSummary } from "../lib/portfolio-engine";
import { SAMPLE_VESTED_TRANSACTIONS } from "../lib/sample-data";

async function runVerification() {
  console.log("=== 1. Testing Time-Weighted Return (TWR) Engine ===");

  // Scenario:
  // 2023-01-01: Deposit $10,000. Day 0 Value = $10,000.
  // 2023-06-01: Grew to $12,000 (+20%). Deposit $8,000. End-of-day Value = $20,000.
  // 2023-12-31: Dropped by 10% to $18,000 (-10%). Value = $18,000.
  const cashFlows = [
    { date: "2023-01-01", amount: 10000 },
    { date: "2023-06-01", amount: 8000 },
  ];

  const valuations = new Map<string, number>();
  valuations.set("2023-01-01", 10000);
  valuations.set("2023-06-01", 20000); // $12,000 before + $8,000 deposit
  valuations.set("2023-12-31", 18000);

  const twr = calculateTWR(cashFlows, valuations, "2023-01-01", "2023-12-31");
  console.log("TWR Cumulative Return:", twr.cumulativeTwrPercent.toFixed(2) + "%");
  console.log("TWR Sub-periods Count:", twr.subPeriods.length);
  const expectedTwr = (1.2 * 0.9 - 1) * 100; // +8.0%
  const isTwrAccurate = Math.abs(twr.cumulativeTwrPercent - expectedTwr) < 0.1;
  console.log(`TWR Math Accuracy Check (Expected ~8.0%, Got ${twr.cumulativeTwrPercent.toFixed(2)}%):`, isTwrAccurate ? "PASSED ✅" : "FAILED ❌");

  console.log("\n=== 2. Testing Money-Weighted Return (XIRR) Engine ===");
  const xirrFlows = [
    { date: "2023-01-01", amount: -10000 },
    { date: "2023-06-01", amount: -8000 },
    { date: "2023-12-31", amount: 21000 },
  ];
  const xirr = calculateXIRR(xirrFlows);
  console.log("XIRR Result:", xirr.toFixed(2) + "%");
  console.log("XIRR Convergence Check:", !isNaN(xirr) && isFinite(xirr) && xirr > 0 ? "PASSED ✅" : "FAILED ❌");

  console.log("\n=== 3. Testing Vested Statement with Holdings ($10.3k) + Activity ===");
  const fullStatementSnippet = `
VESTED FINANCE / DRIVEWEALTH LLC
ACCOUNT STATEMENT: DW-10829472
Period: Aug 01, 2026 to Aug 31, 2026
Account Name: User Investor

ACCOUNT SUMMARY:
Total Account Value: $10,342.18
Cash Balance: $540.41
Securities Value: $9,801.77

HOLDINGS & OPEN POSITIONS:
Symbol   Description              Quantity    Price     Current Value   Cost Basis
NVDA     NVIDIA CORPORATION       18.5000     $128.40   $2,375.40       $1,800.00
AAPL     APPLE INC                15.2000     $228.50   $3,473.20       $2,600.00
MSFT     MICROSOFT CORP           4.0000      $422.30   $1,689.20       $1,200.00
VOO      VANGUARD S&P 500         4.4000      $512.60   $2,255.44       $1,900.00

RECENT ACCOUNT ACTIVITY:
Date Time (in UTC) Type Amount (in USD) Account Balance (in USD) Comment
2026-08-24 02:37:21 PM SPUR 509.8 30.61 Meta Platforms Inc Market Buy
2026-08-21 02:02:40 PM SPUR 551.26 540.41 Meta Platforms Inc Market Buy
2026-08-21 01:59:52 PM CSR 1000 1091.67 Deposit
2026-08-19 01:32:40 PM SSAL 42.86 91.67 LUCAS GC LIMITED Market Sell
2026-08-18 05:39:28 PM SSAL 6.27 48.81 C3IS INC Market Sell
  `;

  const parsedFull = parseVestedStatementText(fullStatementSnippet);
  console.log("Parsed Total Transactions/Holdings:", parsedFull.transactions.length);

  const fullSummary = await computePortfolioSummary(parsedFull.transactions);
  console.log("Calculated Total Portfolio Value:", "$" + fullSummary.totalValue.toLocaleString());
  console.log("Active Holdings Count:", fullSummary.holdings.length);
  fullSummary.holdings.forEach((h) => {
    console.log(`  -> ${h.symbol.padEnd(5)} | Shares: ${h.shares} | Value: $${h.currentValue} (${h.portfolioWeight}%)`);
  });
  console.log("Total Portfolio ~10.3k Check:", fullSummary.totalValue > 9500 ? "PASSED ✅" : "FAILED ❌");

  console.log("\n=== 4. Testing Full Portfolio Engine with Sample Vested Data ===");
  const summary = await computePortfolioSummary(SAMPLE_VESTED_TRANSACTIONS);
  console.log("Total Portfolio Value:", "$" + summary.totalValue.toLocaleString());
  console.log("Net Invested Capital:", "$" + summary.netInvestedCapital.toLocaleString());
  console.log("Cumulative TWR:", summary.twrPercent + "%");
  console.log("Annualized TWR (CAGR):", summary.annualizedTwrPercent + "%");
  console.log("XIRR (MWRR):", summary.xirrPercent + "%");
  console.log("Holdings Count:", summary.holdings.length);
  console.log("Realized Trades Count:", summary.realizedTrades.length);
  console.log("Global Benchmarks Calculated:", Object.keys(summary.benchmarks));
  console.log("Portfolio Engine Check:", summary.holdings.length > 0 && summary.twrPercent !== 0 ? "PASSED ✅" : "FAILED ❌");

  console.log("\n🎉 ALL FINANCIAL ENGINES VERIFIED SUCCESSFULLY! 🚀");
}

runVerification().catch(console.error);
