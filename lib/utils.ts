import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | undefined | null,
  options?: {
    currency?: "USD" | "INR";
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showPlusSign?: boolean;
    compact?: boolean;
  }
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "$0.00";
  }

  const {
    currency = "USD",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showPlusSign = false,
    compact = false,
  } = options || {};

  const prefix = currency === "INR" ? "₹" : "$";
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : showPlusSign && value > 0 ? "+" : "";

  if (compact && absValue >= 1_000_000_000) {
    return `${sign}${prefix}${(absValue / 1_000_000_000).toFixed(2)}B`;
  }
  if (compact && absValue >= 1_000_000) {
    return `${sign}${prefix}${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (compact && absValue >= 1_000) {
    return `${sign}${prefix}${(absValue / 1_000).toFixed(2)}K`;
  }

  const formattedNum = absValue.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return `${sign}${prefix}${formattedNum}`;
}

export function formatLargeNumber(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(decimals)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}K`;
  }
  return `${sign}${abs.toFixed(decimals)}`;
}

export function formatPercent(
  value: number | undefined | null,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showPlusSign?: boolean;
  }
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0.00%";
  }

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showPlusSign = true,
  } = options || {};

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : showPlusSign && value > 0 ? "+" : "";

  return `${sign}${absValue.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  })}%`;
}

export function formatDate(
  dateStr: string | Date | undefined,
  dateFormat = "MMM dd, yyyy"
): string {
  if (!dateStr) return "-";
  try {
    const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    return format(d, dateFormat);
  } catch {
    return String(dateStr);
  }
}

export function getSectorColor(sector: string): string {
  const map: Record<string, string> = {
    Technology: "#3b82f6", // Blue
    "Information Technology": "#3b82f6",
    "Consumer Cyclical": "#ec4899", // Pink
    "Consumer Discretionary": "#ec4899",
    "Communication Services": "#8b5cf6", // Purple
    Financials: "#10b981", // Emerald
    "Financial Services": "#10b981",
    Healthcare: "#06b6d4", // Cyan
    "Health Care": "#06b6d4",
    Industrials: "#f59e0b", // Amber
    Energy: "#ef4444", // Red
    "Consumer Staples": "#84cc16", // Lime
    Utilities: "#14b8a6", // Teal
    "Real Estate": "#a855f7", // Violet
    "Index / ETF": "#6366f1", // Indigo
    ETF: "#6366f1",
    Cash: "#64748b", // Slate
  };
  return map[sector] || "#94a3b8";
}

export function getTickerSector(symbol: string): {
  sector: string;
  name: string;
} {
  const lookup: Record<string, { sector: string; name: string }> = {
    AAPL: { sector: "Technology", name: "Apple Inc." },
    MSFT: { sector: "Technology", name: "Microsoft Corporation" },
    NVDA: { sector: "Technology", name: "NVIDIA Corporation" },
    GOOGL: { sector: "Communication Services", name: "Alphabet Inc. (Google)" },
    GOOG: { sector: "Communication Services", name: "Alphabet Inc. (Google)" },
    AMZN: { sector: "Consumer Cyclical", name: "Amazon.com, Inc." },
    TSLA: { sector: "Consumer Cyclical", name: "Tesla, Inc." },
    META: { sector: "Communication Services", name: "Meta Platforms, Inc." },
    VOO: { sector: "Index / ETF", name: "Vanguard S&P 500 ETF" },
    QQQ: { sector: "Index / ETF", name: "Invesco QQQ Trust" },
    SPY: { sector: "Index / ETF", name: "SPDR S&P 500 ETF Trust" },
    VTI: { sector: "Index / ETF", name: "Vanguard Total Stock Market ETF" },
    AMD: { sector: "Technology", name: "Advanced Micro Devices, Inc." },
    NFLX: { sector: "Communication Services", name: "Netflix, Inc." },
    BRK_B: { sector: "Financials", name: "Berkshire Hathaway Inc." },
    JNJ: { sector: "Healthcare", name: "Johnson & Johnson" },
    JPM: { sector: "Financials", name: "JPMorgan Chase & Co." },
    V: { sector: "Financials", name: "Visa Inc." },
    MA: { sector: "Financials", name: "Mastercard Incorporated" },
    DIS: { sector: "Communication Services", name: "The Walt Disney Company" },
    COIN: { sector: "Financials", name: "Coinbase Global, Inc." },
    PLTR: { sector: "Technology", name: "Palantir Technologies Inc." },
    ARM: { sector: "Technology", name: "Arm Holdings plc" },
    AVGO: { sector: "Technology", name: "Broadcom Inc." },
    SMCI: { sector: "Technology", name: "Super Micro Computer, Inc." },
    LGCL: { sector: "Technology", name: "Lucas GC Limited" },
    CISS: { sector: "Industrials", name: "C3is Inc." },
  };

  if (lookup[symbol.toUpperCase()]) {
    return lookup[symbol.toUpperCase()];
  }
  return { sector: "Technology / Other", name: symbol.toUpperCase() };
}
