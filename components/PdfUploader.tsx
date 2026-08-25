"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Eye,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Clipboard,
} from "lucide-react";
import { Transaction, ParsedPdfResult } from "@/lib/types";
import { SAMPLE_VESTED_TRANSACTIONS } from "@/lib/sample-data";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PdfUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionsLoaded: (transactions: Transaction[], portfolioName: string) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  isOpen,
  onClose,
  onTransactionsLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedPdfResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setUploadError(null);
    setParsedResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to parse PDF document");
      }

      setParsedResult(data);
    } catch (err: any) {
      console.error("PDF Parsing error:", err);
      setUploadError(err.message || "Failed to read or parse this PDF file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleParsePastedText = async () => {
    if (!pastedText.trim()) {
      setUploadError("Please paste some statement text first.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setParsedResult(null);
    setFileName("Pasted Statement Activity");

    try {
      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to parse pasted text");
      }

      setParsedResult(data);
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse pasted text");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleApply = () => {
    if (parsedResult && parsedResult.transactions.length > 0) {
      const pName =
        parsedResult.accountInfo?.investorName
          ? `${parsedResult.accountInfo.investorName}'s Portfolio`
          : fileName.replace(/\.pdf$/i, "") || "Vested Portfolio";
      onTransactionsLoaded(parsedResult.transactions, pName);
      onClose();
    }
  };

  const handleLoadSample = () => {
    onTransactionsLoaded(
      SAMPLE_VESTED_TRANSACTIONS,
      "Sample Vested US Growth Portfolio"
    );
    onClose();
  };

  const handleLoadSnippetExample = () => {
    setPastedText(`Date Time (in UTC) Type Amount (in USD) Account Balance (in USD) Comment
2026-08-24 02:37:21 PM SPUR 509.8 30.61 Meta Platforms Inc Market Buy
2026-08-21 02:02:40 PM SPUR 551.26 540.41 Meta Platforms Inc Market Buy
2026-08-21 01:59:52 PM CSR 1000 1091.67 Deposit
2026-08-19 01:32:40 PM SSAL 42.86 91.67 LUCAS GC LIMITED Market Sell
2026-08-18 05:39:28 PM SSAL 6.27 48.81 C3IS INC Market Sell`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Import Vested Statement
              </h2>
              <p className="text-xs text-slate-400">
                Upload your Vested PDF statement or paste transaction activity rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle (Upload File vs Paste Text) */}
        {!parsedResult && (
          <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
            <button
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === "file"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload PDF / Excel / CSV</span>
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === "paste"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span>Paste Text Activity</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* File Upload Mode */}
          {!parsedResult && activeTab === "file" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".numbers,.xlsx,.xls,.csv,.pdf,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                  <p className="text-sm font-medium text-slate-200">
                    Extracting & Parsing Vested Transactions...
                  </p>
                  <p className="text-xs text-slate-400">
                    Reading trades, transfers, dividends, and holdings
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    Click to browse or drag & drop statement
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Supports Apple Numbers (.numbers), Excel (.xlsx), PDF, or CSV exports
                  </p>
                </>
              )}
            </div>
          )}

          {/* Paste Text Mode */}
          {!parsedResult && activeTab === "paste" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Paste your statement table or transaction log:</span>
                <button
                  onClick={handleLoadSnippetExample}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Insert Sample Snippet
                </button>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Date Time (in UTC) Type Amount (in USD) Account Balance (in USD) Comment&#10;2026-08-24 02:37:21 PM SPUR 509.8 30.61 Meta Platforms Inc Market Buy&#10;2026-08-21 02:02:40 PM SPUR 551.26 540.41 Meta Platforms Inc Market Buy&#10;2026-08-21 01:59:52 PM CSR 1000 1091.67 Deposit..."
                rows={7}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />

              <button
                onClick={handleParsePastedText}
                disabled={isUploading || !pastedText.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Parse Statement Text</span>
              </button>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to parse file</p>
                <p className="mt-0.5 text-slate-300">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-200">
                      Successfully Parsed Statement
                    </p>
                    <p className="text-xs text-slate-300">
                      Found {parsedResult.totalTransactionsParsed} transactions in{" "}
                      <span className="font-mono text-white">{fileName}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setParsedResult(null);
                    setFileName("");
                  }}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Change File
                </button>
              </div>

              {/* Transactions Preview Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Preview Parsed Transactions ({parsedResult.transactions.length})
                  </span>
                  {parsedResult.rawTextPreview && (
                    <button
                      onClick={() => setShowRawText(!showRawText)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="h-3 w-3" />
                      {showRawText ? "Hide Raw" : "Inspect Raw"}
                    </button>
                  )}
                </div>

                {showRawText ? (
                  <pre className="max-h-48 overflow-y-auto p-3 text-[11px] font-mono text-slate-400 whitespace-pre-wrap">
                    {parsedResult.rawTextPreview}
                  </pre>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800/80 bg-slate-900/80 text-[11px] text-slate-400">
                        <tr>
                          <th className="px-3 py-1.5">Date</th>
                          <th className="px-3 py-1.5">Symbol</th>
                          <th className="px-3 py-1.5">Type</th>
                          <th className="px-3 py-1.5 text-right">Shares</th>
                          <th className="px-3 py-1.5 text-right">Price</th>
                          <th className="px-3 py-1.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-slate-200">
                        {parsedResult.transactions.map((t, idx) => (
                          <tr key={t.id || idx} className="hover:bg-slate-800/40">
                            <td className="px-3 py-1.5 text-slate-400">{t.date}</td>
                            <td className="px-3 py-1.5 font-semibold text-white">{t.symbol}</td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  t.type === "BUY"
                                    ? "bg-blue-500/20 text-blue-300"
                                    : t.type === "SELL"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : t.type === "DIVIDEND"
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {t.type}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono">
                              {t.shares > 0 ? t.shares.toFixed(4) : "-"}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono">
                              {t.price > 0 ? formatCurrency(t.price) : "-"}
                            </td>
                            <td
                              className={`px-3 py-1.5 text-right font-mono font-medium ${
                                t.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(t.amount, { showPlusSign: true })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Demo Fallback Option */}
          {!parsedResult && (
            <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-blue-950/20 to-purple-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Try our preloaded sample portfolio
                    </p>
                    <p className="text-[11px] text-slate-400">
                      2+ years of DCA history in AAPL, NVDA, MSFT, TSLA, and VOO.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLoadSample}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <span>Load Demo</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3.5 bg-slate-900/80">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </button>
          {parsedResult && parsedResult.transactions.length > 0 && (
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              <span>Apply & Analyze Portfolio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
