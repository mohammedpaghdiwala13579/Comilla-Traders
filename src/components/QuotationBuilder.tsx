import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
// Added html2pdf.js for PDF generation
import html2pdf from "html2pdf.js";
import { 
  Download, Printer, Calendar, Save, Trash2, Plus, History, 
  Check, RefreshCw, FileText, Copy, FilePlus, MoveUp, 
  MoveDown, Heading, FileDown, Search, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, ChevronDown 
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";

interface QuotationRow {
  sl: number;
  desc: string;
  qty: string;
  unit: string;
  price: string;
  amount: number;
}

interface MergedRegion {
  id: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface SavedDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  docType: "quotation" | "invoice";
  dateVal: string;
  messers: string;
  address: string;
  invoiceNo: string;
  challanNo: string;
  requisitionNo: string;
  poNumber: string;
  vatPercent: number;
  transportation: number;
  rows: QuotationRow[];
  mergedRegions: MergedRegion[];
}

export default function QuotationBuilder() {
  const [docType, setDocType] = useState<"quotation" | "invoice">("quotation");
  const [dateVal, setDateVal] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [messers, setMessers] = useState("");
  const [address, setAddress] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [requisitionNo, setRequisitionNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [vatPercent, setVatPercent] = useState<number>(15);
  const [transportation, setTransportation] = useState<number>(0);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveFilename, setSaveFilename] = useState("");
  const [saveMethod, setSaveMethod] = useState<"default" | "custom">("default");

  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("comilla_autosave_enabled");
      return val === null ? true : val === "true";
    }
    return true;
  });
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [rows, setRows] = useState<QuotationRow[]>(() => {
    const initialRows: QuotationRow[] = [];
    for (let i = 1; i <= 20; i++) {
      initialRows.push({
        sl: i,
        desc: "",
        qty: "",
        unit: "",
        price: "",
        amount: 0,
      });
    }
    return initialRows;
  });

  const [mergedRegions, setMergedRegions] = useState<MergedRegion[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>({ rowIndex: 0, colIndex: 0 });
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionStart, setSelectionStart] = useState<{ rowIndex: number; colIndex: number } | null>({ rowIndex: 0, colIndex: 0 });
  const [selectionEnd, setSelectionEnd] = useState<{ rowIndex: number; colIndex: number } | null>({ rowIndex: 0, colIndex: 0 });

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowIndex: number;
    colIndex: number;
  } | null>(null);

  const dateRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerDatePicker = () => {
    if (dateRef.current) {
      try {
        dateRef.current.showPicker();
      } catch (e) {
        dateRef.current.focus();
        dateRef.current.click();
      }
    }
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    const [yyyy, mm, dd] = dateStr.split("-");
    setDateVal(`${dd}/${mm}/${yyyy}`);
  };

  useEffect(() => {
    document.body.classList.add("print-quotation-only");
    return () => {
      document.body.classList.remove("print-quotation-only");
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "documents"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: SavedDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const docRows = (data.rows || []).map((r: any) => ({
          sl: Number(r.sl) || 0,
          desc: String(r.desc ?? ""),
          qty: String(r.qty ?? ""),
          unit: String(r.unit ?? ""),
          price: String(r.price ?? ""),
          amount: Number(r.amount) || 0,
        }));
        const docMergedRegions: MergedRegion[] = Array.isArray(data.mergedRegions)
          ? data.mergedRegions.map((m: any) => ({
              id: String(m.id ?? `region-${Math.random().toString(36).substring(2, 9)}`),
              startRow: Number(m.startRow) || 0,
              endRow: Number(m.endRow) || 0,
              startCol: Number(m.startCol) ?? 0,
              endCol: Number(m.endCol) ?? 0,
            }))
          : [];
        docs.push({
          id: doc.id,
          name: data.name || "",
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
          docType: data.docType || "quotation",
          dateVal: data.dateVal || "",
          messers: data.messers || "",
          address: data.address || "",
          invoiceNo: data.invoiceNo || "",
          challanNo: data.challanNo || "",
          requisitionNo: data.requisitionNo || "",
          poNumber: data.poNumber || "",
          vatPercent: data.vatPercent ?? 15,
          transportation: data.transportation ?? 0,
          rows: docRows,
          mergedRegions: docMergedRegions
        });
      });
      setSavedDocs(docs);
    }, (error) => {
      console.error("Error listening to documents from Firestore:", error);
    });

    return () => unsubscribe();
  }, []);

  const generateUUID = () => {
    if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
      try {
        return window.crypto.randomUUID();
      } catch (e) {}
    }
    return 'doc-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
  };

  const saveCurrentDocToApp = async (customName?: string) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const now = new Date().toISOString();
    let docIdentifier = "";
    if (docType === "invoice" && invoiceNo) {
      docIdentifier = ` #${invoiceNo}`;
    } else if (docType === "quotation" && challanNo) {
      docIdentifier = ` (Challan #${challanNo})`;
    }
    const defaultName = `${docType === "quotation" ? "Quotation" : "Invoice"}${docIdentifier} - ${messers || "Unnamed Client"} (${dateVal})`;
    const nameToUse = customName || savedDocs.find(d => d.id === currentDocId)?.name || defaultName;

    const docId = currentDocId || generateUUID();

    const docData: SavedDocument = {
      id: docId,
      name: String(nameToUse),
      createdAt: String(savedDocs.find(d => d.id === currentDocId)?.createdAt || now),
      updatedAt: String(now),
      docType: docType as "quotation" | "invoice",
      dateVal: String(dateVal || ""),
      messers: String(messers || ""),
      address: String(address || ""),
      invoiceNo: String(invoiceNo || ""),
      challanNo: String(challanNo || ""),
      requisitionNo: String(requisitionNo || ""),
      poNumber: String(poNumber || ""),
      vatPercent: Number(vatPercent) ?? 15,
      transportation: Number(transportation) ?? 0,
      rows: rows.map(r => ({ ...r })),
      mergedRegions: mergedRegions.map(m => ({ ...m }))
    };

    setSaveStatus("saving");
    try {
      await setDoc(doc(db, "documents", docId), docData);
      if (!currentDocId) setCurrentDocId(docId);
      setLastSavedTime(new Date().toLocaleTimeString());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      setSaveStatus("error");
    }
  };

  const resetSheetFields = () => {
    setDocType("quotation");
    setDateVal(new Date().toLocaleDateString('en-GB'));
    setMessers("");
    setAddress("");
    setInvoiceNo("");
    setChallanNo("");
    setRequisitionNo("");
    setPoNumber("");
    setVatPercent(15);
    setTransportation(0);
    setRows(Array.from({ length: 20 }, (_, i) => ({
      sl: i + 1, desc: "", qty: "", unit: "", price: "", amount: 0
    })));
    setMergedRegions([]);
    setCurrentDocId(null);
    setLastSavedTime(null);
  };

  const loadSavedDoc = (doc: SavedDocument) => {
    setDocType(doc.docType);
    setDateVal(doc.dateVal);
    setMessers(doc.messers);
    setAddress(doc.address);
    setInvoiceNo(doc.invoiceNo || "");
    setChallanNo(doc.challanNo || "");
    setRequisitionNo(doc.requisitionNo || "");
    setPoNumber(doc.poNumber || "");
    setVatPercent(doc.vatPercent ?? 15);
    setTransportation(doc.transportation ?? 0);
    setRows(doc.rows.map(r => ({ ...r })));
    setMergedRegions((doc.mergedRegions || []).map(m => ({ ...m })));
    setCurrentDocId(doc.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSavedDoc = async (id: string) => {
    if (window.confirm("Delete document?")) {
      await deleteDoc(doc(db, "documents", id));
      if (currentDocId === id) resetSheetFields();
    }
  };

  const renameSavedDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const docObj = savedDocs.find(d => d.id === id);
    if (!docObj) return;
    const newName = window.prompt("Rename to:", docObj.name);
    if (newName?.trim()) {
      await setDoc(doc(db, "documents", id), { ...docObj, name: newName.trim(), updatedAt: new Date().toISOString() });
    }
  };

  const startNewDoc = () => {
    if (window.confirm("Start new document?")) resetSheetFields();
  };

  const duplicateCurrentDoc = async () => {
    const name = window.prompt("Name for copy:", `Copy of ${messers || "Quotation"}`);
    if (!name) return;
    const newId = generateUUID();
    await setDoc(doc(db, "documents", newId), {
      id: newId,
      name,
      docType,
      dateVal,
      messers,
      address,
      invoiceNo,
      challanNo,
      requisitionNo,
      poNumber,
      vatPercent,
      transportation,
      rows,
      mergedRegions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setCurrentDocId(newId);
  };

  // --- PDF DOWNLOAD FEATURE ---
  const handleDownloadPDF = () => {
    const element = document.querySelector(".sheet");
    const identifier = docType === "invoice" ? (invoiceNo || "NEW") : (challanNo || "NEW");
    const filename = `${docType === "invoice" ? "Invoice" : "Quotation"}_${identifier.replace(/[\/\\?%*:|"<>\s]/g, "_")}.pdf`;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Add a temporary class to force "print" view style during capture
    document.body.classList.add("pdf-exporting");
    
    html2pdf().set(opt).from(element).save().then(() => {
      document.body.classList.remove("pdf-exporting");
    });
  };

  // Debounced Auto-Save
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const hasContent = currentDocId || messers || invoiceNo || rows.some(r => r.desc);
    if (!hasContent) return;

    const timer = setTimeout(() => saveCurrentDocToApp(), 2000);
    return () => clearTimeout(timer);
  }, [docType, dateVal, messers, address, invoiceNo, challanNo, requisitionNo, poNumber, vatPercent, transportation, rows, mergedRegions, autoSaveEnabled]);

  const handleRowChange = (index: number, field: keyof QuotationRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };
      if (["desc", "unit", "qty", "price"].includes(field)) (target as any)[field] = value;
      const q = parseFloat(String(target.qty)) || 0;
      const p = parseFloat(String(target.price).replace(/,/g, "")) || 0;
      target.amount = q * p;
      updated[index] = target;
      return updated;
    });
  };

  const insertRow = (index: number, pos: 'above' | 'below') => {
    const at = pos === 'above' ? index : index + 1;
    setRows(prev => {
      const updated = [...prev];
      updated.splice(at, 0, { sl: 0, desc: "", qty: "", unit: "", price: "", amount: 0 });
      return updated.map((r, i) => ({ ...r, sl: i + 1 }));
    });
  };

  const deleteSpecificRow = (index: number) => {
    setRows(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length ? filtered.map((r, i) => ({ ...r, sl: i + 1 })) : [{ sl: 1, desc: "", qty: "", unit: "", price: "", amount: 0 }];
    });
  };

  const getMergeRegionAt = (r: number, c: number) => mergedRegions.find(m => r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol);

  const toggleMergeSelectedRangeV2 = () => {
    if (!selectionStart || !selectionEnd) return;
    const startRow = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const endRow = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const startCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const endCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);

    const existing = getMergeRegionAt(startRow, startCol);
    if (existing) {
      setMergedRegions(prev => prev.filter(m => m.id !== existing.id));
    } else {
      if (startRow === endRow && startCol === endCol) return;
      const newRegion = { id: generateUUID(), startRow, endRow, startCol, endCol };
      setMergedRegions(prev => [...prev, newRegion]);
    }
  };

  const handleCellMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    setSelectionStart({ rowIndex: r, colIndex: c });
    setSelectionEnd({ rowIndex: r, colIndex: c });
    setSelectedCell({ rowIndex: r, colIndex: c });
    setSelectedRowIndex(r);
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (isSelecting) setSelectionEnd({ rowIndex: r, colIndex: c });
  };

  const isCellSelected = (r: number, c: number) => {
    if (!selectionStart || !selectionEnd) return selectedCell?.rowIndex === r && selectedCell?.colIndex === c;
    const minR = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const maxR = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const minC = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const maxC = Math.max(selectionStart.colIndex, selectionEnd.colIndex);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);
  const calculatedGrandTotal = docType === "quotation" ? grandTotal : (grandTotal + (grandTotal * vatPercent) / 100 + transportation);

  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Taka Only";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    const convert = (n: number): string => {
      if (n >= 10000000) return convert(Math.floor(n / 10000000)) + " Crore " + convert(n % 10000000);
      if (n >= 100000) return convert(Math.floor(n / 100000)) + " Lakh " + convert(n % 100000);
      if (n >= 1000) return convert(Math.floor(n / 1000)) + " Thousand " + convert(n % 1000);
      if (n >= 100) return ones[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
      if (n >= 20) return tens[Math.floor(n / 10)] + " " + ones[n % 10];
      return ones[n];
    };

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    let res = convert(integerPart).trim() + " Taka";
    if (decimalPart > 0) res += " and " + convert(decimalPart).trim() + " Paisa";
    return res + " Only";
  };

  const handleQuickDownload = () => {
    const identifier = docType === "invoice" ? (invoiceNo || "NEW") : (challanNo || "NEW");
    const filename = `${docType === "invoice" ? "Invoice" : "Quotation"}_${identifier.replace(/[\/\\?%*:|"<>\s]/g, "_")}.xlsx`;
    
    const data = [
      ["COMILLA TRADERS"],
      ["Client:", messers],
      ["Address:", address],
      ["Date:", dateVal],
      [],
      ["SL", "Description", "Qty", "Unit", "Price", "Amount"],
      ...rows.map(r => [r.sl, r.desc, r.qty, r.unit, r.price, r.amount]),
      [],
      ["", "", "", "", "TOTAL", calculatedGrandTotal]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="quotation-container relative min-h-screen flex flex-col items-center bg-[#f1f5f9] py-5 overflow-x-auto text-[#000] font-sans antialiased" onMouseUp={() => setIsSelecting(false)}>
      
      {/* TOOLBAR */}
      <div className="top-toolbar no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] mb-3 flex flex-col md:flex-row justify-between items-center gap-2 px-3 sm:px-0 z-10">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-300 shadow-sm shrink-0">
            <button onClick={() => setDocType("quotation")} className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${docType === "quotation" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"}`}>Quotation</button>
            <button onClick={() => setDocType("invoice")} className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${docType === "invoice" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"}`}>Invoice</button>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs shrink-0">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" checked={autoSaveEnabled} onChange={(e) => setAutoSaveEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Auto</span>
            </label>
            {lastSavedTime && <span className="text-[8px] text-emerald-600 font-medium flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>{lastSavedTime}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
          <button onClick={startNewDoc} className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"><FilePlus className="h-3 w-3" /><span className="hidden sm:inline">NEW</span></button>
          {currentDocId && (
            <>
              <button onClick={duplicateCurrentDoc} className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"><Copy className="h-3 w-3" /><span className="hidden sm:inline">DUPE</span></button>
              <button onClick={() => deleteSavedDoc(currentDocId)} className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"><Trash2 className="h-3 w-3" /><span className="hidden sm:inline">DEL</span></button>
            </>
          )}

          <button onClick={() => saveCurrentDocToApp()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1">
            {saveStatus === "saving" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className="hidden sm:inline">{saveStatus === "saving" ? "SAVING" : "SAVE"}</span>
          </button>
          
          <button onClick={handleQuickDownload} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] py-1 px-3 rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /><span>EXCEL</span>
          </button>

          {/* NEW PDF DOWNLOAD BUTTON */}
          <button onClick={handleDownloadPDF} className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-[10px] py-1 px-3 rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer">
            <FileDown className="h-3.5 w-3.5" /><span>PDF</span>
          </button>
          
          <button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm cursor-pointer flex items-center gap-1">
            <Printer className="h-3 w-3" /><span className="hidden sm:inline">PRINT</span>
          </button>
        </div>
      </div>

      {/* MINI EXCEL MENU */}
      <div className="excel-editor-container no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] bg-[#f8f9fa] border border-slate-300 rounded-lg shadow-md mb-3 overflow-hidden text-slate-800 z-10">
        <div className="flex items-center gap-1 bg-[#f8f9fa] border-b border-slate-200 px-2 py-1 text-xs select-none">
          <span className="font-semibold text-[10px] text-emerald-700 mr-2 font-mono flex items-center gap-1">
            <span className="bg-emerald-700 text-white px-1 rounded-xs">田</span> ComillaSheets
          </span>
          <div className="relative group">
            <button className="px-1.5 py-0.5 hover:bg-slate-200 rounded-md cursor-pointer font-semibold text-[10px]">File</button>
            <div className="hidden group-hover:block absolute left-0 top-full bg-white border border-slate-200 shadow-xl rounded-md py-1 w-48 z-50">
              <button onClick={startNewDoc} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] font-bold"><FilePlus className="h-3 w-3" /> New</button>
              <button onClick={handleQuickDownload} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] font-bold text-emerald-600"><Download className="h-3 w-3" /> Download Excel</button>
              <button onClick={handleDownloadPDF} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] font-bold text-rose-600"><FileDown className="h-3 w-3" /> Download PDF</button>
              <button onClick={() => window.print()} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] font-bold border-t"><Printer className="h-3 w-3" /> Print</button>
            </div>
          </div>
          <button onClick={toggleMergeSelectedRangeV2} className="ml-1 px-1.5 py-0.5 hover:bg-emerald-100 rounded-md cursor-pointer font-bold text-emerald-700 text-[10px] flex items-center gap-1 border border-emerald-200 bg-emerald-50">
            <Heading className="h-3 w-3" /> Merge/Unmerge
          </button>
        </div>
      </div>

      {/* THE SHEET (Printable/PDF Area) */}
      <div className="sheet relative w-full max-w-[210mm] sm:w-[210mm] print:w-[210mm] min-h-[297mm] bg-white p-4 sm:p-[12mm] print:p-[12mm] shadow-lg box-border z-10 mx-auto">
        
        {/* WATERMARK */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none">
          <img src="https://i.ibb.co.com/3mNycQXx/1.png" alt="" className="w-[70%] opacity-[0.045] object-contain max-w-[500px]" />
        </div>

        <div className="relative z-10">
          {/* BUSINESS HEADER */}
          <div className="business-header border-b-2 border-black pb-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-black text-left">
            <div className="flex items-center gap-4">
              <div className="logo-container h-28 w-28 shrink-0 rounded-full border-2 border-slate-300 overflow-hidden bg-black flex items-center justify-center shadow-sm">
                <img src="https://i.ibb.co.com/gFBkpt8B/Chat-GPT-Image-Apr-23-2026-01-10-13-PM.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-[22pt] font-black tracking-tight leading-none">COMILLA TRADERS</h1>
                <p className="text-[9pt] font-extrabold text-slate-700 tracking-wider uppercase mt-1.5">Ship Chandler, Marine Supplier & General Merchant</p>
                <p className="text-[7.5pt] font-bold text-slate-500 uppercase tracking-widest mt-1">Mechanical & Electrical Marine Engineering Services</p>
              </div>
            </div>
            <div className="contact-details text-right text-[7.5pt] text-slate-800 hidden sm:block">
              <p className="font-bold">Office: <span className="font-medium">Jubilee Road, Chattogram, Bangladesh</span></p>
              <p className="font-bold">Helplines: <span className="font-medium">01819315746, 01712-900431</span></p>
              <p className="font-bold">Email: <span className="font-medium">comillatraders@gmail.com</span></p>
              <p className="font-bold text-indigo-700 uppercase tracking-widest">CHATTOGRAM &bull; BANGLADESH</p>
            </div>
          </div>

          <div className="doc-title text-center text-[15pt] font-black uppercase tracking-[8px] my-2">
            {docType}
          </div>

          {/* META INFO */}
          <div className="meta-grid grid grid-cols-2 gap-4 text-[9pt] mb-4">
            <div className="border border-black p-3 bg-slate-50/30">
              <label className="block text-[7.5pt] font-black uppercase tracking-wider mb-1">Messers:</label>
              <textarea value={messers} onChange={(e) => setMessers(e.target.value)} rows={1} className="w-full border-b border-black outline-none bg-transparent font-bold text-[9.5pt] resize-none" />
              <label className="block text-[7.5pt] font-black uppercase tracking-wider mt-2 mb-1">Address:</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full border-b border-black outline-none bg-transparent text-[9pt] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-2 border border-black p-3 bg-slate-50/30">
              <div className="col-span-1"><label className="block text-[7.5pt] font-black uppercase">No:</label><input value={docType === "invoice" ? invoiceNo : challanNo} onChange={(e) => docType === "invoice" ? setInvoiceNo(e.target.value) : setChallanNo(e.target.value)} className="w-full border-b border-black outline-none bg-transparent" /></div>
              <div className="col-span-1"><label className="block text-[7.5pt] font-black uppercase">Date:</label><input value={dateVal} onChange={(e) => setDateVal(e.target.value)} className="w-full border-b border-black outline-none bg-transparent" /></div>
              <div className="col-span-2"><label className="block text-[7.5pt] font-black uppercase">Requisition:</label><input value={requisitionNo} onChange={(e) => setRequisitionNo(e.target.value)} className="w-full border-b border-black outline-none bg-transparent" /></div>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full border-collapse border-[1.5px] border-black text-[9pt]">
            <thead>
              <tr className="bg-slate-50">
                <th className="w-[5%] border border-black p-1">SL</th>
                <th className="w-[45%] border border-black p-1 text-left px-2">Description</th>
                <th className="w-[10%] border border-black p-1">Qty</th>
                <th className="w-[15%] border border-black p-1">Unit</th>
                <th className="w-[12%] border border-black p-1">Price</th>
                <th className="w-[13%] border border-black p-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {[-1, 0, 1, 2, 3, 4].map(cIdx => {
                    const merge = getMergeRegionAt(rIdx, cIdx);
                    if (merge && (rIdx !== merge.startRow || cIdx !== merge.startCol)) return null;
                    const rSpan = merge ? merge.endRow - merge.startRow + 1 : 1;
                    const cSpan = merge ? merge.endCol - merge.startCol + 1 : 1;

                    return (
                      <td key={cIdx} rowSpan={rSpan} colSpan={cSpan} 
                        onMouseDown={(e) => handleCellMouseDown(e, rIdx, cIdx)}
                        onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                        className={`border border-black p-1 align-top relative ${isCellSelected(rIdx, cIdx) ? 'bg-indigo-50' : ''}`}
                      >
                        {cIdx === -1 && <div className="text-center font-mono">{rIdx + 1}</div>}
                        {cIdx === 0 && (
                          <textarea value={row.desc} onChange={(e) => handleRowChange(rIdx, "desc", e.target.value)} className="w-full border-none outline-none bg-transparent resize-none leading-tight min-h-[1.2rem]" rows={1} />
                        )}
                        {cIdx === 1 && <input value={row.qty} onChange={(e) => handleRowChange(rIdx, "qty", e.target.value)} className="w-full border-none outline-none bg-transparent text-center font-mono" />}
                        {cIdx === 2 && <input value={row.unit} onChange={(e) => handleRowChange(rIdx, "unit", e.target.value)} className="w-full border-none outline-none bg-transparent text-center" />}
                        {cIdx === 3 && <input value={row.price} onChange={(e) => handleRowChange(rIdx, "price", e.target.value)} className="w-full border-none outline-none bg-transparent text-center font-mono" />}
                        {cIdx === 4 && <div className="text-right pr-1 font-bold font-mono">{row.amount.toLocaleString()}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="mt-4 border-2 border-black flex">
            <div className="w-1/2 p-3 border-r-2 border-black bg-slate-50/50">
              <span className="text-[7.5pt] font-black uppercase block mb-1">Amount in Words:</span>
              <span className="text-[9pt] font-mono italic font-black uppercase leading-tight">{numberToWords(calculatedGrandTotal)}</span>
            </div>
            <div className="w-1/2 flex flex-col divide-y divide-black">
              <div className="flex">
                <span className="w-2/3 p-1.5 text-right font-bold bg-slate-50 uppercase text-[8pt] border-r border-black">Sub Total</span>
                <span className="w-1/3 p-1.5 text-right font-mono font-bold">{grandTotal.toLocaleString()}</span>
              </div>
              {docType === "invoice" && (
                <>
                  <div className="flex">
                    <span className="w-2/3 p-1.5 text-right font-bold bg-slate-50 uppercase text-[8pt] border-r border-black">VAT ({vatPercent}%)</span>
                    <span className="w-1/3 p-1.5 text-right font-mono font-bold">{((grandTotal * vatPercent) / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex">
                    <span className="w-2/3 p-1.5 text-right font-bold bg-slate-50 uppercase text-[8pt] border-r border-black">Transport</span>
                    <span className="w-1/3 p-1.5 text-right font-mono font-bold">{transportation.toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex bg-slate-100">
                <span className="w-2/3 p-2 text-right font-black uppercase text-[9pt] border-r border-black">Grand Total</span>
                <span className="w-1/3 p-2 text-right font-mono font-black text-[10pt]">{calculatedGrandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="mt-12 flex justify-between gap-10">
            <div className="w-[200px] text-center border-t border-black pt-2 font-bold text-[9pt]">Receiver's Signature</div>
            <div className="w-[200px] text-center relative">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none opacity-80">
                <img src="https://i.ibb.co.com/jZswrtn6/image-4-removebg-preview.png" alt="Stamp" className="w-28 h-28 object-contain" />
              </div>
              <div className="font-bold text-[9pt] mb-10">For Comilla Traders</div>
              <div className="border-t border-black pt-2 font-bold text-[9pt]">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVED DOCS LIST */}
      <div className="saved-docs-panel no-print w-full max-w-[210mm] mt-6 bg-white rounded-xl shadow-md p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2"><History className="h-5 w-5" /> Online History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 uppercase font-bold text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Document Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Grand Total</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedDocs.map(doc => (
                <tr key={doc.id} onClick={() => loadSavedDoc(doc)} className="border-t hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium">{doc.name}</td>
                  <td className="px-4 py-3 text-center uppercase">{doc.docType}</td>
                  <td className="px-4 py-3 text-right font-mono">{(doc.rows.reduce((s, r) => s + r.amount, 0) + (doc.docType === "invoice" ? (doc.rows.reduce((s, r) => s + r.amount, 0) * doc.vatPercent / 100) + doc.transportation : 0)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => renameSavedDoc(doc.id, e)} className="text-indigo-600 font-bold hover:underline">Rename</button>
                    <button onClick={() => deleteSavedDoc(doc.id)} className="text-rose-600 font-bold hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
