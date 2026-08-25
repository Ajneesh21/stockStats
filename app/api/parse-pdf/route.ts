import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { parseVestedStatementText, parseVestedXlsxBuffer } from "@/lib/pdf-parser";
import { parseVestedSpreadsheetSheets } from "@/lib/vested-sheet-parser";
import * as XLSX from "xlsx";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Case 1: JSON with pasted raw text
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const rawText = body.text || "";
      if (!rawText.trim()) {
        return NextResponse.json(
          { error: "No text provided" },
          { status: 400 }
        );
      }
      const result = parseVestedStatementText(rawText);
      return NextResponse.json(result);
    }

    // Case 2: Multipart Form Data with PDF, Numbers, XLSX, CSV, or TXT file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If Apple Numbers (.numbers) file
    if (fileName.endsWith(".numbers")) {
      try {
        const tempId = `numbers-${Date.now()}`;
        const tempFilePath = path.join("/tmp", `${tempId}.numbers`);
        const tempCsvDir = path.join("/tmp", `${tempId}-csv`);

        fs.writeFileSync(tempFilePath, buffer);

        // Export via AppleScript on macOS
        const appleScript = `
          tell application "Numbers"
            open POSIX file "${tempFilePath}"
            set doc to front document
            export doc to POSIX file "${tempCsvDir}" as CSV
            close doc saving no
          end tell
        `;

        await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);

        const sheetMap: Record<string, string> = {};
        if (fs.existsSync(tempCsvDir)) {
          const files = fs.readdirSync(tempCsvDir);
          for (const f of files) {
            if (f.endsWith(".csv")) {
              sheetMap[f] = fs.readFileSync(path.join(tempCsvDir, f), "utf-8");
            }
          }
        }

        // Clean up temporary files
        try {
          fs.unlinkSync(tempFilePath);
          if (fs.existsSync(tempCsvDir)) {
            fs.rmSync(tempCsvDir, { recursive: true, force: true });
          }
        } catch {}

        if (Object.keys(sheetMap).length > 0) {
          const result = parseVestedSpreadsheetSheets(sheetMap);
          return NextResponse.json(result);
        }
      } catch (err: any) {
        console.error("[Numbers File Parse Error]:", err);
      }
    }

    // If Excel file (.xlsx or .xls)
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      try {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetMap: Record<string, string> = {};
        for (const sheetName of workbook.SheetNames) {
          const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          sheetMap[sheetName] = csvText;
        }

        const result = parseVestedSpreadsheetSheets(sheetMap);
        if (result.success && result.transactions.length > 0) {
          return NextResponse.json(result);
        }
      } catch (err) {
        // Fallback to single sheet parser
      }

      const result = parseVestedXlsxBuffer(buffer);
      return NextResponse.json(result);
    }

    // If CSV or text file
    if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      const result = parseVestedStatementText(text);
      return NextResponse.json(result);
    }

    // PDF file
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text || "";

    if (!rawText.trim()) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from PDF. The PDF might be scanned or password protected.",
        },
        { status: 422 }
      );
    }

    const result = parseVestedStatementText(rawText);

    return NextResponse.json({
      ...result,
      numPages: pdfData.numpages,
      info: pdfData.info,
    });
  } catch (err: any) {
    console.error("[Parse API Error]:", err);
    return NextResponse.json(
      {
        error: "Failed to parse document",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
