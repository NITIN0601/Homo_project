import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import type { InventoryItem } from "../../../types";
import { CLINIC, INVENTORY as INV_CONFIG } from "../../../config";
import { formatDateISO } from "../../../utils/format";

interface ExcelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onSyncInventory: (updatedInventory: InventoryItem[]) => void;
}

export const ExcelSyncModal: React.FC<ExcelSyncModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onSyncInventory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedPreview, setParsedPreview] = useState<InventoryItem[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  // ── Export Live Inventory to Excel (.xlsx) ──────────────────────────────────
  const handleExportToExcel = () => {
    try {
      const dataToExport = inventory.map((item) => ({
        ID: item.id,
        Medicine_Name: item.name,
        Potency: item.potency,
        Formulation: item.formulation,
        Category: item.category,
        Price_INR: item.priceINR,
        Stock_Quantity: item.stockQty,
        Reorder_Threshold: item.reorderQty || 10,
        Supplier: item.supplier,
        Batch_Number: item.batchNumber,
        Expiry_Date: item.expiryDate,
        Status: item.stockQty <= (item.reorderQty || 10) ? "LOW STOCK" : "IN STOCK",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pharmacy_Inventory");

      const todayStr = formatDateISO();
      const filename = `${CLINIC.NAME.replace(/\s+/g, "_")}_Pharmacy_Inventory_${todayStr}.xlsx`;
      XLSX.writeFile(workbook, filename);

      setSuccessMsg(`✓ Successfully generated and exported "${filename}"`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Failed to export Excel file: ${err.message || "Unknown error"}`);
    }
  };

  // ── Download Sample Excel Template ──────────────────────────────────────────
  const handleDownloadSampleTemplate = () => {
    try {
      const sampleData = [
        {
          ID: "m101",
          Medicine_Name: "Arsenicum Album",
          Potency: "30C",
          Formulation: "Globules 4g",
          Category: "constitutional",
          Price_INR: 180,
          Stock_Quantity: 45,
          Reorder_Threshold: 10,
          Supplier: "Dr. Reckeweg & Co. Germany",
          Batch_Number: "BTH-ARS-2026",
          Expiry_Date: "2028-12-31",
        },
        {
          ID: "m102",
          Medicine_Name: "Bryonia Alba",
          Potency: "200C",
          Formulation: "Liquid Dilution 30ml",
          Category: "acute",
          Price_INR: 220,
          Stock_Quantity: 8,
          Reorder_Threshold: 15,
          Supplier: "SBL Pvt Ltd",
          Batch_Number: "BTH-BRY-2026",
          Expiry_Date: "2028-09-30",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sample_Template");
      XLSX.writeFile(workbook, `${CLINIC.NAME.replace(/\s+/g, "_")}_Inventory_Template.xlsx`);
    } catch (err: any) {
      setErrorMsg(`Failed to generate template: ${err.message}`);
    }
  };

  // ── Import & Parse Excel (.xlsx / .csv) ──────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg("The selected Excel sheet contains no readable rows or headers.");
          setParsedPreview(null);
          setIsProcessing(false);
          return;
        }

        const items: InventoryItem[] = rawJson.map((row: any, idx: number) => {
          const id = String(row.ID || row.id || `m-excel-${idx + 1}`);
          const name = String(row.Medicine_Name || row.Name || row.name || `Remedy ${idx + 1}`);
          const potency = String(row.Potency || row.potency || "30C");
          const formulation = String(row.Formulation || row.formulation || "Globules 4g");
          const category = (row.Category || row.category || "acute").toLowerCase();
          const priceINR = Number(row.Price_INR || row.price || 150);
          const stockQty = Number(row.Stock_Quantity || row.Stock || row.stock || 50);
          const reorderQty = Number(row.Reorder_Threshold || row.reorderThreshold || 10);
          const supplier = String(row.Supplier || row.supplier || "SBL Pvt Ltd");
          const batchNumber = String(row.Batch_Number || row.Batch || `BTH-${id.toUpperCase()}-2026`);
          const expiryDate = String(row.Expiry_Date || row.Expiry || "2028-06-01");

          return {
            id,
            name,
            potency,
            formulation,
            category,
            priceINR,
            stockQty,
            reorderQty,
            supplier,
            batchNumber,
            expiryDate,
            isActive: true,
            lastRestocked: formatDateISO(),
          };
        });

        setParsedPreview(items);
        setIsProcessing(false);
      } catch (err: any) {
        console.error("Excel import parsing error:", err);
        setErrorMsg(`Failed to parse file: ${err.message || "Invalid Excel format"}`);
        setParsedPreview(null);
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Commit Parsed Items to State ────────────────────────────────────────────
  const handleCommitSync = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onSyncInventory(parsedPreview);
    setSuccessMsg(`✓ Successfully synced ${parsedPreview.length} inventory records from "${fileName}"!`);
    setTimeout(() => {
      onClose();
      setParsedPreview(null);
      setFileName("");
      setSuccessMsg(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-sync-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-950 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xl shadow-inner">
              📊
            </span>
            <div>
              <h3 id="excel-sync-modal-title" className="font-extrabold text-base tracking-tight">
                Dispensary Pharmacy Excel Sync
              </h3>
              <p className="text-xs text-emerald-300">
                Two-way dynamic spreadsheet integration · Export current stock or import supply spreadsheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-lg font-mono px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Alerts */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-950 p-3 rounded-2xl flex items-center justify-between gap-2 animate-fadeIn font-semibold">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 font-bold">
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3 rounded-2xl flex items-center gap-2 animate-fadeIn font-bold">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Export Card */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:border-emerald-300 transition-all space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  📥
                </span>
                <div>
                  <h4 className="font-bold text-stone-900">Export Current Inventory</h4>
                  <p className="text-[11px] text-stone-500">
                    Download {inventory.length} active pharmacy remedies as formatted .xlsx
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportToExcel}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📥</span> Download Excel (.xlsx)
              </button>
            </div>

            {/* Template Card */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:border-purple-300 transition-all space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                  📋
                </span>
                <div>
                  <h4 className="font-bold text-stone-900">Download Excel Template</h4>
                  <p className="text-[11px] text-stone-500">
                    Get pre-formatted spreadsheet template with valid headers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📄</span> Download Blank Template
              </button>
            </div>
          </div>

          {/* Import Upload Area */}
          <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-3xl p-6 text-center bg-stone-50/40 hover:bg-emerald-50/20 transition-all space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
              id="excel-modal-file-input"
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-black">
              📤
            </div>
            <div>
              <h4 className="font-extrabold text-stone-900 text-sm">
                Upload &amp; Sync Inventory Spreadsheet
              </h4>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>📁</span> {fileName ? `Replace (${fileName})` : "Choose Spreadsheet File"}
              </button>
            </div>

            {fileName && !parsedPreview && isProcessing && (
              <p className="text-emerald-700 font-bold animate-pulse text-[11px]">
                Parsing spreadsheet records...
              </p>
            )}
          </div>

          {/* Preview Table if file parsed */}
          {parsedPreview && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                    <span>🔍</span> Spreadsheet Preview ({parsedPreview.length} items detected in "{fileName}")
                  </h4>
                  <p className="text-stone-500 text-[11px]">
                    Verify the columns below before confirming synchronization into clinic inventory.
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full">
                  Valid Schema
                </span>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3">ID</th>
                      <th className="py-2 px-3">Remedy</th>
                      <th className="py-2 px-3">Potency &amp; Form</th>
                      <th className="py-2 px-3">Price</th>
                      <th className="py-2 px-3">Stock Qty</th>
                      <th className="py-2 px-3">Supplier</th>
                      <th className="py-2 px-3">Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {parsedPreview.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-stone-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-stone-500">{item.id}</td>
                        <td className="py-2 px-3 font-black text-stone-900">{item.name}</td>
                        <td className="py-2 px-3 text-stone-600">{item.potency} · {item.formulation}</td>
                        <td className="py-2 px-3 font-bold text-stone-800">{INV_CONFIG.CURRENCY_SYMBOL}{item.priceINR}</td>
                        <td className="py-2 px-3">
                          <span className={`font-bold ${item.stockQty <= (item.reorderQty || 10) ? "text-amber-700" : "text-emerald-700"}`}>
                            {item.stockQty}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-stone-600">{item.supplier}</td>
                        <td className="py-2 px-3 font-mono text-stone-500 text-[10px]">{item.batchNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
          >
            Cancel
          </button>

          {parsedPreview && (
            <button
              type="button"
              onClick={handleCommitSync}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>✓</span> Confirm &amp; Sync {parsedPreview.length} Items into Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelSyncModal;
