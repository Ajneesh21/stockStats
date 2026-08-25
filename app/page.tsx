"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Transaction, PortfolioSummary } from "@/lib/types";
import { SAMPLE_VESTED_TRANSACTIONS } from "@/lib/sample-data";
import { StoredPortfolio } from "@/lib/storage";
import { Navbar } from "@/components/Navbar";
import { PdfUploader } from "@/components/PdfUploader";
import { DashboardOverview } from "@/components/DashboardOverview";
import { PerformanceChart } from "@/components/PerformanceChart";
import { BenchmarkComparison } from "@/components/BenchmarkComparison";
import { HoldingsTable } from "@/components/HoldingsTable";
import { AssetAllocation } from "@/components/AssetAllocation";
import { TransactionLedger } from "@/components/TransactionLedger";
import { MetricsDetail } from "@/components/MetricsDetail";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import {
  TrendingUp,
  Globe,
  Layers,
  PieChart,
  FileText,
  Calculator,
  Loader2,
  UploadCloud,
} from "lucide-react";

type TabId =
  | "overview"
  | "benchmarks"
  | "holdings"
  | "allocation"
  | "ledger"
  | "metrics";

export default function Home() {
  const [portfolios, setPortfolios] = useState<StoredPortfolio[]>([]);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioName, setPortfolioName] = useState<string>("My Vested Portfolio");

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Calculate portfolio summary
  const calculatePortfolio = useCallback(
    async (txList: Transaction[], showLoader = false) => {
      if (!txList || txList.length === 0) {
        setSummary(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (showLoader) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: txList }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.summary) {
            setSummary(data.summary);
            setLastUpdated(new Date().toLocaleTimeString());
          }
        }
      } catch (err) {
        console.error("Calculation error:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Fetch all saved portfolios on mount
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const res = await fetch("/api/portfolios");
        if (res.ok) {
          const data = await res.json();
          const list: StoredPortfolio[] = data.portfolios || [];
          setPortfolios(list);

          if (list.length > 0) {
            // Pick active or first
            const active = list.find((p) => p.isDefault) || list[0];
            setCurrentPortfolioId(active.id);
            setPortfolioName(active.name);
            setTransactions(active.transactions);
            calculatePortfolio(active.transactions, true);
          } else {
            // If no portfolio yet, load demo by default so user sees full UI immediately
            const defaultDemo: StoredPortfolio = {
              id: "demo-default",
              name: "Sample Vested US Growth Portfolio",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              transactions: SAMPLE_VESTED_TRANSACTIONS,
              isDefault: true,
            };
            setPortfolios([defaultDemo]);
            setCurrentPortfolioId(defaultDemo.id);
            setPortfolioName(defaultDemo.name);
            setTransactions(defaultDemo.transactions);
            calculatePortfolio(defaultDemo.transactions, true);
          }
        }
      } catch (err) {
        console.error("Failed to load saved portfolios:", err);
        setIsLoading(false);
      }
    };

    fetchPortfolios();
  }, [calculatePortfolio]);

  // Select a different portfolio
  const handleSelectPortfolio = (id: string) => {
    const p = portfolios.find((item) => item.id === id);
    if (p) {
      setCurrentPortfolioId(p.id);
      setPortfolioName(p.name);
      setTransactions(p.transactions);
      calculatePortfolio(p.transactions, true);
    }
  };

  // Rename current portfolio
  const handleRenamePortfolio = async (id: string, newName: string) => {
    const p = portfolios.find((item) => item.id === id);
    if (!p) return;

    const updated = { ...p, name: newName };
    setPortfolioName(newName);
    setPortfolios((prev) => prev.map((item) => (item.id === id ? updated : item)));

    try {
      await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Failed to rename portfolio:", err);
    }
  };

  // Delete current portfolio
  const handleDeletePortfolio = async (id: string) => {
    if (portfolios.length <= 1) return;

    try {
      await fetch(`/api/portfolios?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const remaining = portfolios.filter((item) => item.id !== id);
      setPortfolios(remaining);

      if (remaining.length > 0) {
        const next = remaining[0];
        setCurrentPortfolioId(next.id);
        setPortfolioName(next.name);
        setTransactions(next.transactions);
        calculatePortfolio(next.transactions, true);
      }
    } catch (err) {
      console.error("Failed to delete portfolio:", err);
    }
  };

  // Handle Statement Uploaded -> Create & persist new portfolio as default
  const handleTransactionsLoaded = async (
    newTx: Transaction[],
    name = "My Vested Statement"
  ) => {
    const newPort: StoredPortfolio = {
      id: `port-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: newTx,
      isDefault: true,
    };

    setPortfolios((prev) => [newPort, ...prev.map((p) => ({ ...p, isDefault: false }))]);
    setCurrentPortfolioId(newPort.id);
    setPortfolioName(newPort.name);
    setTransactions(newTx);
    calculatePortfolio(newTx, true);

    // Save to persistent storage / Redis
    try {
      await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPort),
      });
    } catch (err) {
      console.error("Failed to persist new portfolio:", err);
    }
  };

  // Handle Load Demo
  const handleLoadDemo = () => {
    handleTransactionsLoaded(
      SAMPLE_VESTED_TRANSACTIONS,
      "Sample Vested US Growth Portfolio"
    );
  };

  // Refresh live prices
  const handleRefreshPrices = () => {
    calculatePortfolio(transactions, false);
  };

  // Save Transaction (Add / Edit)
  const handleSaveTransaction = async (tx: Transaction) => {
    let updatedTxList: Transaction[];
    const exists = transactions.some((t) => t.id === tx.id);
    if (exists) {
      updatedTxList = transactions.map((t) => (t.id === tx.id ? tx : t));
    } else {
      updatedTxList = [tx, ...transactions];
    }

    setTransactions(updatedTxList);
    calculatePortfolio(updatedTxList, false);

    // Update stored portfolio
    if (currentPortfolioId) {
      const p = portfolios.find((item) => item.id === currentPortfolioId);
      if (p) {
        const updatedPort = { ...p, transactions: updatedTxList };
        setPortfolios((prev) =>
          prev.map((item) => (item.id === currentPortfolioId ? updatedPort : item))
        );
        await fetch("/api/portfolios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPort),
        });
      }
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    const updatedTxList = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTxList);
    calculatePortfolio(updatedTxList, false);

    if (currentPortfolioId) {
      const p = portfolios.find((item) => item.id === currentPortfolioId);
      if (p) {
        const updatedPort = { ...p, transactions: updatedTxList };
        setPortfolios((prev) =>
          prev.map((item) => (item.id === currentPortfolioId ? updatedPort : item))
        );
        await fetch("/api/portfolios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPort),
        });
      }
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!transactions || transactions.length === 0) return;

    const headers = ["ID", "Date", "Symbol", "Type", "Shares", "Price", "Amount", "Notes"];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.symbol,
      t.type,
      t.shares,
      t.price,
      t.amount,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${portfolioName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_transactions.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Overview & Growth", icon: TrendingUp },
    { id: "benchmarks", label: "Global Benchmarks", icon: Globe },
    { id: "holdings", label: "Holdings & Live Quotes", icon: Layers },
    { id: "allocation", label: "Asset Allocation", icon: PieChart },
    { id: "ledger", label: "Transactions Ledger", icon: FileText },
    { id: "metrics", label: "TWR & Risk Analytics", icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* Top Navigation Bar with Portfolio Switcher */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onLoadDemo={handleLoadDemo}
        onRefreshPrices={handleRefreshPrices}
        onExportCsv={handleExportCsv}
        isRefreshing={isRefreshing}
        lastUpdatedTime={lastUpdated}
        portfolioName={portfolioName}
        hasData={transactions.length > 0}
        portfolios={portfolios}
        currentPortfolioId={currentPortfolioId}
        onSelectPortfolio={handleSelectPortfolio}
        onRenamePortfolio={handleRenamePortfolio}
        onDeletePortfolio={handleDeletePortfolio}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Tab Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 overflow-x-auto">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
            {lastUpdated && <span>Quotes updated: {lastUpdated}</span>}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="text-sm font-medium text-slate-300">
              Calculating Time-Weighted Returns & Live Market Prices...
            </p>
            <p className="text-xs text-slate-500">
              Benchmarking against S&P 500, Nasdaq 100 & Nifty 50
            </p>
          </div>
        ) : summary && transactions.length > 0 ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Summary Cards */}
            <DashboardOverview summary={summary} />

            {/* Tab 1: Overview & Growth Chart */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <PerformanceChart timeline={summary.timeline} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <HoldingsTable
                      holdings={summary.holdings}
                      totalValue={summary.totalValue}
                    />
                  </div>
                  <div>
                    <AssetAllocation
                      holdings={summary.holdings}
                      cashBalance={summary.cashBalance}
                      totalValue={summary.totalValue}
                      layout="vertical"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Global Benchmarks */}
            {activeTab === "benchmarks" && (
              <div className="space-y-6">
                <BenchmarkComparison summary={summary} />
                <PerformanceChart timeline={summary.timeline} />
              </div>
            )}

            {/* Tab 3: Holdings & Live Quotes */}
            {activeTab === "holdings" && (
              <div className="space-y-6">
                <HoldingsTable
                  holdings={summary.holdings}
                  totalValue={summary.totalValue}
                />
              </div>
            )}

            {/* Tab 4: Asset Allocation */}
            {activeTab === "allocation" && (
              <div className="space-y-6">
                <AssetAllocation
                  holdings={summary.holdings}
                  cashBalance={summary.cashBalance}
                  totalValue={summary.totalValue}
                  layout="grid"
                />
              </div>
            )}

            {/* Tab 5: Transactions Ledger */}
            {activeTab === "ledger" && (
              <div className="space-y-6">
                <TransactionLedger
                  transactions={transactions}
                  onAddTransaction={() => {
                    setSelectedTx(null);
                    setIsEditModalOpen(true);
                  }}
                  onEditTransaction={(tx) => {
                    setSelectedTx(tx);
                    setIsEditModalOpen(true);
                  }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onExportCsv={handleExportCsv}
                />
              </div>
            )}

            {/* Tab 6: TWR & Risk Metrics */}
            {activeTab === "metrics" && (
              <div className="space-y-6">
                <MetricsDetail summary={summary} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <UploadCloud className="h-12 w-12 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                No Statement Loaded
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Upload your Vested statement PDF or paste activity text to analyze your portfolio.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500"
              >
                Upload Statement
              </button>
              <button
                onClick={handleLoadDemo}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        )}
      </main>

      {/* PDF Upload Modal */}
      <PdfUploader
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onTransactionsLoaded={handleTransactionsLoaded}
      />

      {/* Edit / Add Transaction Modal */}
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveTransaction}
        transactionToEdit={selectedTx}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080b12] py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Vested StockStats Analyzer &copy; {new Date().getFullYear()} &middot; Next.js + Finnhub + Redis
          </p>
          <p className="text-[11px] text-slate-600">
            Real-time market quotes via Finnhub API & Yahoo Finance. All calculations computed locally.
          </p>
        </div>
      </footer>
    </div>
  );
}
