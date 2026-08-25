"use client";

import React from "react";
import { PortfolioSummary } from "@/lib/types";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import {
  Activity,
  Calculator,
  ShieldAlert,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileCheck,
} from "lucide-react";

interface MetricsDetailProps {
  summary: PortfolioSummary;
}

export const MetricsDetail: React.FC<MetricsDetailProps> = ({ summary }) => {
  return (
    <div className="space-y-6">
      {/* 1. TWR Sub-Periods Audit Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-400" />
              Time-Weighted Return (TWR) Sub-Periods Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Each sub-period is divided by cash flow events to eliminate deposit/withdrawal timing bias
            </p>
          </div>
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-mono text-blue-300">
            Formula: \(R_{"{TWR}"} = \prod (1 + R_i) - 1\)
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Sub-Period</th>
                <th className="px-3 py-2.5">Start Date</th>
                <th className="px-3 py-2.5">End Date</th>
                <th className="px-3 py-2.5 text-right">Start NAV</th>
                <th className="px-3 py-2.5 text-right">Cash Flow</th>
                <th className="px-3 py-2.5 text-right">End NAV</th>
                <th className="px-3 py-2.5 text-right">Period Return (%)</th>
                <th className="px-3 py-2.5 text-right">Cumulative TWR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {summary.twrSubPeriods.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 text-xs">
                    No sub-period events generated yet.
                  </td>
                </tr>
              ) : (
                summary.twrSubPeriods.map((sp, idx) => {
                  const isPeriodPositive = sp.periodReturn >= 0;
                  const isCumPositive = sp.cumulativeTWR >= 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2.5 font-mono text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300">
                        {formatDate(sp.startDate, "yyyy-MM-dd")}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300">
                        {formatDate(sp.endDate, "yyyy-MM-dd")}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        {formatCurrency(sp.startValue)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono ${
                          sp.cashFlow > 0
                            ? "text-blue-400 font-medium"
                            : sp.cashFlow < 0
                            ? "text-amber-400 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        {sp.cashFlow !== 0
                          ? formatCurrency(sp.cashFlow, { showPlusSign: true })
                          : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-200">
                        {formatCurrency(sp.endValue)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-bold ${
                          isPeriodPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatPercent(sp.periodReturn)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-extrabold ${
                          isCumPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatPercent(sp.cumulativeTWR)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Realized Capital Gains & Tax Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" />
              Realized Capital Gains & Tax Report
            </h3>
            <p className="text-xs text-slate-400">
              FIFO matched sell executions with short-term vs long-term tax classification
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Total Realized P&L:</span>
            <span
              className={`font-bold ${
                summary.realizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(summary.realizedPnL, { showPlusSign: true })}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Sell Date</th>
                <th className="px-3 py-2.5">Symbol</th>
                <th className="px-3 py-2.5 text-right">Shares Sold</th>
                <th className="px-3 py-2.5 text-right">Sell Price</th>
                <th className="px-3 py-2.5 text-right">Cost Basis</th>
                <th className="px-3 py-2.5 text-right">Realized Gain/Loss</th>
                <th className="px-3 py-2.5 text-right">Holding Days</th>
                <th className="px-3 py-2.5 text-center">Tax Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {summary.realizedTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 text-xs">
                    No sell transactions executed in this portfolio yet.
                  </td>
                </tr>
              ) : (
                summary.realizedTrades.map((trade) => {
                  const isGain = trade.realizedGain >= 0;

                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2.5 font-mono text-slate-300">
                        {formatDate(trade.sellDate, "yyyy-MM-dd")}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-white font-mono">
                        {trade.symbol}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {trade.shares.toFixed(4)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        {formatCurrency(trade.sellPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                        {formatCurrency(trade.costBasis)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-bold ${
                          isGain ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(trade.realizedGain, { showPlusSign: true })} (
                        {formatPercent(trade.realizedGainPercent)})
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        {trade.holdingPeriodDays} days
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            trade.taxType === "LONG_TERM"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {trade.taxType === "LONG_TERM" ? "Long Term" : "Short Term"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
