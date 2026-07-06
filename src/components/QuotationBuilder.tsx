```html
<FILE file_path="/home/workdir/attachments/1.txt" size="124290 bytes">import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Download, Printer, Calendar, Save, Trash2, Plus, History, Check, RefreshCw, FileText, Copy, FilePlus, MoveUp, MoveDown, Heading, Undo, Redo, Search, Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronDown } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuotationRow {
  sl: number;
  desc: string;
  qty: string;
  unit: string;
  price: string;
  amount: number;
}

// A merged region is a rectangular block of cells that renders as one cell.
// Columns: -1 = SL, 0 = Description, 1 = Qty, 2 = Unit, 3 = Price, 4 = Amount.
// startRow/endRow/startCol/endCol are all inclusive.
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

  // In-app storage & Auto-Save states
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

  // Initialize with 20 rows by default
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

  // Rectangular cell-merge regions, independent of row/column content.
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
  const sheetRef = useRef<HTMLDivElement>(null);

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
    // Add print class to body when on this tab to ensure specialized quotation print stylesheet takes effect
    document.body.classList.add("print-quotation-only");
    return () => {
      document.body.classList.remove("print-quotation-only");
    };
  }, []);

  // --- IN-APP DOCUMENTS DB OPERATIONS ---

  // Load saved documents list from Firestore on mount in real-time
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

  // Safe unique ID generator fallback for sandboxed frames
  const generateUUID = () => {
    if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
      try {
        return window.crypto.randomUUID();
      } catch (e) {
        // Fallback
      }
    }
    return 'doc-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
  };

  // Save current sheet to Firestore (manual)
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

    const sanitizedRows = rows.map(r => ({
      sl: Number(r.sl) || 0,
      desc: String(r.desc ?? ""),
      qty: String(r.qty ?? ""),
      unit: String(r.unit ?? ""),
      price: String(r.price ?? ""),
      amount: Number(r.amount) || 0
    }));

    const sanitizedMergedRegions = mergedRegions.map(m => ({
      id: String(m.id),
      startRow: Number(m.startRow) || 0,
      endRow: Number(m.endRow) || 0,
      startCol: Number(m.startCol) ?? 0,
      endCol: Number(m.endCol) ?? 0
    }));

    const docData: SavedDocument = {
      id: docId,
      name: String(nameToUse || "Unnamed Document"),
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
      rows: sanitizedRows,
      mergedRegions: sanitizedMergedRegions
    };

    setSaveStatus("saving");
    try {
      await setDoc(doc(db, "documents", docId), docData);
      if (!currentDocId) {
        setCurrentDocId(docId);
      }
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      console.error("Error saving document to Firestore:", e);
      try {
        localStorage.setItem(`comilla_backup_${docId}`, JSON.stringify(docData));
      } catch (err) {
        console.error("Local backup also failed:", err);
      }
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Reset sheet fields to a fresh document
  const resetSheetFields = () => {
    setDocType("quotation");
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    setDateVal(`${dd}/${mm}/${yyyy}`);
    setMessers("");
    setAddress("");
    setInvoiceNo("");
    setChallanNo("");
    setRequisitionNo("");
    setPoNumber("");
    setVatPercent(15);
    setTransportation(0);
    
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
    setRows(initialRows);
    setMergedRegions([]);
    setCurrentDocId(null);
    setLastSavedTime(null);
  };

  // Load a saved sheet
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
    setLastSavedTime(null);

    // Smooth scroll to top so the user can edit the page immediately
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Delete a saved sheet from Firestore
  const deleteSavedDoc = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved document from the online database?")) {
      try {
        await deleteDoc(doc(db, "documents", id));
        if (currentDocId === id) {
          resetSheetFields();
        }
      } catch (e) {
        console.error("Error deleting document from Firestore:", e);
      }
    }
  };

  // Rename sheet in Firestore
  const renameSavedDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const documentObj = savedDocs.find(d => d.id === id);
    if (!documentObj) return;
    const newName = window.prompt("Rename this document:", documentObj.name);
    if (newName && newName.trim() !== "") {
      try {
        const updatedData = {
          ...documentObj,
          name: newName.trim(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "documents", id), updatedData);
      } catch (e) {
        console.error("Error renaming document in Firestore:", e);
      }
    }
  };

  // Start fresh blank sheet
  const startNewDoc = () => {
    if (window.confirm("Start a new document? Unsaved changes on your active sheet will be overwritten.")) {
      resetSheetFields();
    }
  };

  // Duplicate the current sheet and save it as a new online document
  const duplicateCurrentDoc = async () => {
    const defaultName = `Copy of ${messers ? messers.trim() : "Quotation"} (${dateVal})`;
    const docName = window.prompt("Enter a name for the duplicated copy:", defaultName);
    if (!docName || docName.trim() === "") return;

    setSaveStatus("saving");
    try {
      const newId = `doc_${Date.now()}`;
      const docPayload = {
        id: newId,
        name: docName.trim(),
        docType,
        dateVal,
        messers,
        address,
        invoiceNo: invoiceNo || "",
        challanNo: challanNo || "",
        requisitionNo: requisitionNo || "",
        poNumber: poNumber || "",
        vatPercent,
        transportation,
        rows: rows.map(r => ({
          sl: r.sl,
          desc: r.desc,
          qty: r.qty,
          unit: r.unit,
          price: r.price,
          amount: r.amount
        })),
        mergedRegions: mergedRegions.map(m => ({ ...m })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "documents", newId), docPayload);
      setCurrentDocId(newId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Error duplicating document:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Debounced Auto-Save to Firestore effect
  useEffect(() => {
    if (!autoSaveEnabled) return;

    // Only auto-save if the user has added some content or is editing an existing doc
    const hasAnyContent = 
      currentDocId !== null ||
      messers.trim() !== "" || 
      address.trim() !== "" || 
      invoiceNo.trim() !== "" || 
      challanNo.trim() !== "" || 
      poNumber.trim() !== "" ||
      rows.some(r => r.desc.trim() !== "");

    if (!hasAnyContent) return;

    const timer = setTimeout(async () => {
      const docId = currentDocId || generateUUID();
      const now = new Date().toISOString();
      
      let docIdentifier = "";
      if (docType === "invoice" && invoiceNo) {
        docIdentifier = ` #${invoiceNo}`;
      } else if (docType === "quotation" && challanNo) {
        docIdentifier = ` (Challan #${challanNo})`;
      }
      const defaultName = `${docType === "quotation" ? "Quotation" : "Invoice"}${docIdentifier} - ${messers || "Unnamed Client"} (${dateVal})`;
      const nameToUse = savedDocs.find(d => d.id === currentDocId)?.name || defaultName;

      const sanitizedRows = rows.map(r => ({
        sl: Number(r.sl) || 0,
        desc: String(r.desc ?? ""),
        qty: String(r.qty ?? ""),
        unit: String(r.unit ?? ""),
        price: String(r.price ?? ""),
        amount: Number(r.amount) || 0
      }));

      const sanitizedMergedRegions = mergedRegions.map(m => ({
        id: String(m.id),
        startRow: Number(m.startRow) || 0,
        endRow: Number(m.endRow) || 0,
        startCol: Number(m.startCol) ?? 0,
        endCol: Number(m.endCol) ?? 0
      }));

      const docData: SavedDocument = {
        id: docId,
        name: String(nameToUse || "Unnamed Document"),
        createdAt: String(savedDocs.find(d => d.id === docId)?.createdAt || now),
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
        rows: sanitizedRows,
        mergedRegions: sanitizedMergedRegions
      };

      setSaveStatus("saving");
      try {
        await setDoc(doc(db, "documents", docId), docData);
        if (!currentDocId) {
          setCurrentDocId(docId);
        }
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (e) {
        console.error("Auto-save to Firestore failed:", e);
        try {
          localStorage.setItem(`comilla_backup_${docId}`, JSON.stringify(docData));
        } catch (err) {
          console.error("Local backup also failed:", err);
        }
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    }, 1500);

    autoSaveTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      autoSaveTimerRef.current = null;
    };
  }, [
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
    autoSaveEnabled,
    currentDocId
  ]);

  // Automatically adjust height of all textareas when rows change
  useEffect(() => {
    const textareas = document.querySelectorAll("textarea[data-row]");
    textareas.forEach((ta: any) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [rows]);

  // Dismiss context menu and handle drag release globally
  useEffect(() => {
    const handleDismiss = () => {
      setContextMenu(null);
    };
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
    };
    document.addEventListener("click", handleDismiss);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("click", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  const handleRowChange = (index: number, field: keyof QuotationRow, value: string) => {
    setRows((prevRows) => {
      const updated = [...prevRows];
      const targetRow = { ...updated[index] };
      
      if (field === "desc" || field === "unit" || field === "qty" || field === "price") {
        (targetRow as any)[field] = value;
      }

      // Calculate amount
      const q = parseFloat(String(targetRow.qty || "")) || 0;
      const p = parseFloat(String(targetRow.price || "").replace(/,/g, "")) || 0;
      targetRow.amount = q * p;

      updated[index] = targetRow;
      return updated;
    });
  };

  const addRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      {
        sl: prevRows.length + 1,
        desc: "",
        qty: "",
        unit: "",
        price: "",
        amount: 0,
      },
    ]);
  };

  const removeRow = () => {
    setRows((prevRows) => {
      if (prevRows.length <= 1) return prevRows;
      return prevRows.slice(0, -1);
    });
  };

  const insertRow = (index: number, position: 'above' | 'below') => {
    const insertAt = position === 'above' ? index : index + 1;

    setRows((prevRows) => {
      const updated = [...prevRows];
      const newRow: QuotationRow = {
        sl: 0,
        desc: "",
        qty: "",
        unit: "",
        price: "",
        amount: 0,
      };
      updated.splice(insertAt, 0, newRow);
      return updated.map((r, i) => ({
        ...r,
        sl: i + 1
      }));
    });

    // Shift any merged region that starts at or after the insertion point down by one row
    // so existing merges keep pointing at the same logical rows.
    setMergedRegions((prevRegions) =>
      prevRegions.map((region) => {
        if (region.startRow >= insertAt) {
          return { ...region, startRow: region.startRow + 1, endRow: region.endRow + 1 };
        }
        if (region.endRow >= insertAt) {
          return { ...region, endRow: region.endRow + 1 };
        }
        return region;
      })
    );
  };

  const deleteSpecificRow = (index: number) => {
    setRows((prevRows) => {
      if (prevRows.length <= 1) {
        return [{
          sl: 1,
          desc: "",
          qty: "",
          unit: "",
          price: "",
          amount: 0,
        }];
      }
      const updated = prevRows.filter((_, i) => i !== index);
      return updated.map((r, i) => ({
        ...r,
        sl: i + 1
      }));
    });

    // Shift/shrink merged regions to account for the removed row; drop any region
    // that no longer spans at least one row after the deletion.
    setMergedRegions((prevRegions) =>
      prevRegions
        .map((region) => {
          let { startRow, endRow } = region;
          if (startRow > index) startRow -= 1;
          if (endRow >= index) endRow -= 1;
          return { ...region, startRow, endRow };
        })
        .filter((region) => region.endRow >= region.startRow)
    );
  };

  const clearSpecificRow = (index: number) => {
    setRows((prevRows) => {
      const updated = [...prevRows];
      updated[index] = {
        sl: index + 1,
        desc: "",
        qty: "",
        unit: "",
        price: "",
        amount: 0,
      };
      return updated;
    });
  };

  // Column labels used when collecting cell content into a merged cell's combined value,
  // and when clearing the covered cells' underlying fields after a merge.
  const COLUMN_FIELD_BY_INDEX: Record<number, "desc" | "qty" | "unit" | "price" | null> = {
    [-1]: null, // SL is derived (row position), never has stored text
    0: "desc",
    1: "qty",
    2: "unit",
    3: "price",
    4: null, // Amount is derived (qty * price), never stored as free text
  };

  // Returns the merged region covering (rowIndex, colIndex), if any.
  const getMergeRegionAt = (rowIndex: number, colIndex: number): MergedRegion | undefined => {
    return mergedRegions.find(
      (m) =>
        rowIndex >= m.startRow &&
        rowIndex <= m.endRow &&
        colIndex >= m.startCol &&
        colIndex <= m.endCol
    );
  };

  // Info a cell needs to render correctly under the merge model:
  // - region: the covering region, if any
  // - isAnchor: true if (rowIndex, colIndex) is the top-left cell of that region (the one that
  //   actually renders content with colSpan/rowSpan); false if it's a covered cell that should
  //   render nothing because the anchor's colSpan/rowSpan already occupies this grid position.
  const getMergeInfo = (rowIndex: number, colIndex: number) => {
    const region = getMergeRegionAt(rowIndex, colIndex);
    if (!region) return { region: undefined, isAnchor: false };
    const isAnchor = rowIndex === region.startRow && colIndex === region.startCol;
    return { region, isAnchor };
  };

  const rangesOverlap = (a: MergedRegion, b: { startRow: number; endRow: number; startCol: number; endCol: number }) => {
    return a.startRow <= b.endRow && a.endRow >= b.startRow && a.startCol <= b.endCol && a.endCol >= b.startCol;
  };

  // Merge the current drag/click selection into one cell. Content from every covered cell
  // is concatenated into the anchor (top-left) cell so nothing is silently lost, and the
  // now-covered cells' own fields are cleared since they're no longer independently editable.
  const mergeSelectedRange = () => {
    if (!selectionStart || !selectionEnd) return;

    const startRow = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const endRow = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const startCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const endCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);

    // A single cell isn't a "merge" — nothing to combine.
    if (startRow === endRow && startCol === endCol) return;

    const candidateRegion = { startRow, endRow, startCol, endCol };

    // Refuse overlapping merges (same rule Excel follows): resolve the existing merge first.
    const overlapping = mergedRegions.find((m) => rangesOverlap(m, candidateRegion));
    if (overlapping) {
      window.alert("Part of this selection is already merged. Unmerge it first, then try again.");
      return;
    }

    // Collect text content from every covered cell (top-to-bottom, left-to-right) into the anchor.
    setRows((prevRows) => {
      const updated = prevRows.map((r) => ({ ...r }));
      const pieces: string[] = [];

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const field = COLUMN_FIELD_BY_INDEX[c];
          if (field && updated[r]) {
            const val = String(updated[r][field] ?? "").trim();
            if (val !== "") pieces.push(val);
          }
        }
      }

      const combined = pieces.join(" ");
      const anchorField = COLUMN_FIELD_BY_INDEX[startCol];

      for (let r = startRow; r <= endRow; r++) {
        if (!updated[r]) continue;
        for (let c = startCol; c <= endCol; c++) {
          const field = COLUMN_FIELD_BY_INDEX[c];
          if (!field) continue;
          if (r === startRow && c === startCol) {
            (updated[r] as any)[field] = combined;
          } else {
            (updated[r] as any)[field] = "";
          }
        }
        // Recompute amount for every affected row since qty/price may have just been cleared or combined.
        const q = parseFloat(String(updated[r].qty || "")) || 0;
        const p = parseFloat(String(updated[r].price || "").replace(/,/g, "")) || 0;
        updated[r].amount = q * p;
      }

      // If the anchor column isn't one of the free-text columns (e.g. merging just SL or Amount cells),
      // there's nothing to combine textually, which is fine — the merge still applies visually.
      void anchorField;

      return updated;
    });

    const newRegion: MergedRegion = {
      id: generateUUID(),
      startRow,
      endRow,
      startCol,
      endCol,
    };
    setMergedRegions((prev) => [...prev, newRegion]);

    // Collapse selection down to the new anchor cell so the highlight matches the merged block.
    setSelectionStart({ rowIndex: startRow, colIndex: startCol });
    setSelectionEnd({ rowIndex: endRow, colIndex: endCol });
    setSelectedCell({ rowIndex: startRow, colIndex: startCol });
    setSelectedRowIndex(startRow);
  };

  // Remove whichever merged region covers (rowIndex, colIndex), restoring its cells to
  // normal individually-editable state. Content stays wherever it currently sits (in the
  // anchor cell) rather than being redistributed, since there's no reliable way to guess
  // which of several original cells a combined value belongs back to.
  const unmergeRegionAt = (rowIndex: number, colIndex: number) => {
    const region = getMergeRegionAt(rowIndex, colIndex);
    if (!region) return;
    setMergedRegions((prev) => prev.filter((m) => m.id !== region.id));
  };

  // True if the current drag selection exactly matches the bounds of the given region
  // (used to decide whether "toggle" should unmerge vs. attempt a fresh merge).
  const hasRangeSelectionMatchingRegion = (region: MergedRegion) => {
    if (!selectionStart || !selectionEnd) return false;
    const startRow = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const endRow = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const startCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const endCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);
    return (
      startRow === region.startRow &&
      endRow === region.endRow &&
      startCol === region.startCol &&
      endCol === region.endCol
    );
  };

  // Merge if the current selection isn't already merged; unmerge if it is. Used by both the
  // toolbar button and the context-menu item so either always does "the right thing next".
  const toggleMergeSelectedRangeV2 = () => {
    if (!selectionStart || !selectionEnd) return;
    const { rowIndex, colIndex } = selectionStart;
    const existing = getMergeRegionAt(rowIndex, colIndex);
    if (existing && hasRangeSelectionMatchingRegion(existing)) {
      unmergeRegionAt(rowIndex, colIndex);
    } else if (existing) {
      // Selection starts inside a merge but doesn't exactly match it — unmerge that region first.
      unmergeRegionAt(rowIndex, colIndex);
    } else {
      mergeSelectedRange();
    }
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    setRows((prevRows) => {
      if (direction === 'up' && index === 0) return prevRows;
      if (direction === 'down' && index === prevRows.length - 1) return prevRows;

      const updated = [...prevRows];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      
      const temp = updated[index];
      updated[index] = updated[swapIndex];
      updated[swapIndex] = temp;

      return updated.map((r, i) => ({
        ...r,
        sl: i + 1
      }));
    });
  };

  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!selectionStart || !selectionEnd) {
      return selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
    }
    const minRow = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const maxRow = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const minCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const maxCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);

    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
  };

  // True when the current drag/selection spans more than a single cell
  const hasRangeSelection = () => {
    if (!selectionStart || !selectionEnd) return false;
    return selectionStart.rowIndex !== selectionEnd.rowIndex || selectionStart.colIndex !== selectionEnd.colIndex;
  };

  const handleCellMouseDown = (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
    if (e.button !== 0) return; // Only left click

    const isActive = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;

    setIsSelecting(true);
    setSelectionStart({ rowIndex, colIndex });
    setSelectionEnd({ rowIndex, colIndex });
    setSelectedCell({ rowIndex, colIndex });
    setSelectedRowIndex(rowIndex);

    if (!isActive) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      e.preventDefault(); // Prevents cursor focus so drag-select can start smoothly
    }
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelecting) {
      setSelectionEnd({ rowIndex, colIndex });
    }
  };

  const handleCellMouseUp = (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
    setIsSelecting(false);
    
    // Only auto-focus the textarea if this was a single-cell click, not the end of a drag
    const isSingleCell = selectionStart && selectionStart.rowIndex === rowIndex && selectionStart.colIndex === colIndex;
    if (isSingleCell && !hasRangeSelection()) {
      if (colIndex >= 0 && colIndex <= 3) {
        const textarea = document.querySelector(`[data-row="${rowIndex}"][data-col="${colIndex}"]`) as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.focus();
        }
      }
    }
  };

  const getCellClassName = (rowIndex: number, colIndex: number, baseClasses: string) => {
    const isSelected = isCellSelected(rowIndex, colIndex);
    const isActive = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
    
    let highlightClass = "";
    if (isActive) {
      highlightClass = "outline outline-2 outline-emerald-600 outline-offset-[-2px] bg-emerald-50/15 z-10 relative";
    } else if (isSelected) {
      highlightClass = "outline outline-1 outline-emerald-400 outline-offset-[-1px] bg-emerald-50/25 z-10 relative shadow-3xs";
    }
    
    return `${baseClasses} ${highlightClass}`;
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setSelectedCell({ rowIndex, colIndex });
    setSelectionStart({ rowIndex, colIndex });
    setSelectionEnd({ rowIndex, colIndex });
    const textarea = document.querySelector(`[data-row="${rowIndex}"][data-col="${colIndex}"]`) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.focus();
    }
  };

  const clearSpecificCell = (rowIndex: number, colIndex: number) => {
    let field: "desc" | "qty" | "unit" | "price" | null = null;
    if (colIndex === 0) field = "desc";
    else if (colIndex === 1) field = "qty";
    else if (colIndex === 2) field = "unit";
    else if (colIndex === 3) field = "price";
    
    if (field) {
      handleRowChange(rowIndex, field, "");
    }
  };

  const handleCellContextMenu = (e: React.MouseEvent, idx: number, colIdx: number) => {
    e.preventDefault();

    // Preserve an existing multi-cell selection if the right-click happened inside it;
    // otherwise collapse selection down to the single cell that was right-clicked.
    const clickedInsideRange = isCellSelected(idx, colIdx);
    if (!clickedInsideRange) {
      setSelectionStart({ rowIndex: idx, colIndex: colIdx });
      setSelectionEnd({ rowIndex: idx, colIndex: colIdx });
    }
    setSelectedRowIndex(idx);
    setSelectedCell({ rowIndex: idx, colIndex: colIdx });
    
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 260;
    const menuHeight = 320;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    if (x < 0) x = 10;
    if (y < 0) y = 10;

    setContextMenu({
      visible: true,
      x,
      y,
      rowIndex: idx,
      colIndex: colIdx,
    });
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);
  const calculatedGrandTotal = docType === "quotation" ? grandTotal : (grandTotal + (grandTotal * vatPercent) / 100 + transportation);

  // Helper to convert number to words in Indian numbering system (Lakhs, Crores) with "Taka Only" appended at the end
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Taka Only";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const convertTwoDigits = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      const digit = n % 10;
      const ten = Math.floor(n / 10);
      return tens[ten] + (digit ? " " + ones[digit] : "");
    };

    const convertThreeDigits = (n: number): string => {
      const hundred = Math.floor(n / 100);
      const rem = n % 100;
      let word = "";
      if (hundred > 0) {
        word = ones[hundred] + " Hundred";
      }
      if (rem > 0) {
        word += (word ? " and " : "") + convertTwoDigits(rem);
      }
      return word;
    };

    const convertIndian = (n: number): string => {
      if (n === 0) return "";
      
      let words = "";
      
      // Crores (1,00,00,000)
      const crores = Math.floor(n / 10000000);
      let rem = n % 10000000;
      if (crores > 0) {
        words += (crores >= 100 ? convertIndian(crores) : convertTwoDigits(crores)) + " Crore ";
      }
      
      // Lakhs (1,00,00,000) -> 1,00,000 is 1 Lakh
      const lakhs = Math.floor(rem / 100000);
      rem = rem % 100000;
      if (lakhs > 0) {
        words += convertTwoDigits(lakhs) + " Lakh ";
      }
      
      // Thousands (1,000)
      const thousands = Math.floor(rem / 1000);
      rem = rem % 1000;
      if (thousands > 0) {
        words += convertTwoDigits(thousands) + " Thousand ";
      }
      
      // Remaining less than 1,000
      if (rem > 0) {
        words += convertThreeDigits(rem);
      }
      
      return words.trim();
    };

    const fixedStr = num.toFixed(2);
    const [integerStr, decimalStr] = fixedStr.split(".");
    const integerPart = parseInt(integerStr, 10);
    const decimalPart = parseInt(decimalStr, 10);

    let result = "";
    if (integerPart === 0) {
      result = "Zero";
    } else {
      result = convertIndian(integerPart);
    }

    if (decimalPart > 0) {
      result += " and " + convertTwoDigits(decimalPart) + " Paisa";
    }

    return result.trim() + " Taka Only";
  };

  // Keyboard Navigation: allow moving through inputs using arrow keys (Excel style)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number, colIndex: number) => {
    const { key } = e;
    let targetRow = rowIndex;
    let targetCol = colIndex;

    const selectionStart = e.currentTarget.selectionStart;
    const selectionEnd = e.currentTarget.selectionEnd;
    const valueLength = e.currentTarget.value.length;

    if (key === "ArrowUp") {
      targetRow = rowIndex - 1;
    } else if (key === "ArrowDown") {
      targetRow = rowIndex + 1;
    } else if (key === "ArrowLeft") {
      // Navigate left if cursor is at the beginning
      if (selectionStart === 0 && selectionEnd === 0) {
        targetCol = colIndex - 1;
      } else {
        return;
      }
    } else if (key === "ArrowRight") {
      // Navigate right if cursor is at the end
      if (selectionStart === valueLength && selectionEnd === valueLength) {
        targetCol = colIndex + 1;
      } else {
        return;
      }
    } else if (key === "Enter") {
      targetRow = rowIndex + 1;
    } else {
      return;
    }

    e.preventDefault();

    const targetElement = document.querySelector(
      `[data-row="${targetRow}"][data-col="${targetCol}"]`
    ) as HTMLInputElement | HTMLTextAreaElement | null;

    if (targetElement) {
      targetElement.focus();
      if (typeof targetElement.select === "function") {
        targetElement.select();
      }
    }
  };

  // Excel style pasting: parses tabs as columns and newlines as rows, respecting double quotes
  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    startRowIndex: number,
    startColIndex: number
  ) => {
    const clipboardData = e.clipboardData.getData("text");
    if (!clipboardData) return;

    // TSV state-machine parser to handle double quotes, internal cell newlines, and tabs
    const parseTSV = (text: string): string[][] => {
      const result: string[][] = [];
      let row: string[] = [];
      let cell = "";
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
          if (char === '"') {
            if (nextChar === '"') {
              // Escaped double quote: "" -> "
              cell += '"';
              i++; // Skip next quote
            } else {
              // End of quoted cell
              inQuotes = false;
            }
          } else {
            cell += char;
          }
        } else {
          if (char === '"') {
            // Start of quoted cell
            inQuotes = true;
          } else if (char === '\t') {
            // End of column
            row.push(cell);
            cell = "";
          } else if (char === '\r') {
            // Carriage return: handle trailing \n
            if (nextChar === '\n') {
              row.push(cell);
              result.push(row);
              row = [];
              cell = "";
              i++; // Skip \n
            } else {
              row.push(cell);
              result.push(row);
              row = [];
              cell = "";
            }
          } else if (char === '\n') {
            // Newline
            row.push(cell);
            result.push(row);
            row = [];
            cell = "";
          } else {
            cell += char;
          }
        }
      }

      if (cell !== "" || row.length > 0) {
        row.push(cell);
        result.push(row);
      }

      // Clean up empty trailing row which is common when copying from Excel
      if (
        result.length > 1 &&
        result[result.length - 1].length === 1 &&
        result[result.length - 1][0] === ""
      ) {
        result.pop();
      }

      return result;
    };

    // If clipboard has tabs or newlines, we parse it as Excel TSV
    if (clipboardData.includes("\t") || clipboardData.includes("\n") || clipboardData.includes("\r")) {
      e.preventDefault();
      const parsedGrid = parseTSV(clipboardData);

      if (parsedGrid.length === 0) return;

      // Case 1: Single cell paste (1 row, 1 col)
      if (parsedGrid.length === 1 && parsedGrid[0].length === 1) {
        const parsedVal = parsedGrid[0][0];
        const textarea = e.currentTarget as HTMLTextAreaElement;
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const currentValue = textarea.value;
        const newValue = currentValue.substring(0, start) + parsedVal + currentValue.substring(end);
        
        const fieldMap = ["desc", "qty", "unit", "price"] as const;
        const field = fieldMap[startColIndex];
        handleRowChange(startRowIndex, field, newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + parsedVal.length;
        }, 0);
        return;
      }

      // Case 2: Multi-cell paste
      setRows((prevRows) => {
        const updated = [...prevRows];
        
        parsedGrid.forEach((cols, rOffset) => {
          const rIndex = startRowIndex + rOffset;
          
          // If we run out of rows, append a new row
          if (rIndex >= updated.length) {
            updated.push({
              sl: updated.length + 1,
              desc: "",
              qty: "",
              unit: "",
              price: "",
              amount: 0,
            });
          }

          const targetRow = { ...updated[rIndex] };

          // Loop through each copied column
          cols.forEach((cellValue, cOffset) => {
            const cIndex = startColIndex + cOffset;
            
            if (cIndex === 0) {
              targetRow.desc = cellValue;
            } else if (cIndex === 1) {
              targetRow.qty = cellValue;
            } else if (cIndex === 2) {
              targetRow.unit = cellValue;
            } else if (cIndex === 3) {
              targetRow.price = cellValue;
            }
          });

          // Re-calculate row amount
          const q = parseFloat(String(targetRow.qty || "")) || 0;
          const p = parseFloat(String(targetRow.price || "").replace(/,/g, "")) || 0;
          targetRow.amount = q * p;

          updated[rIndex] = targetRow;
        });

        return updated;
      });
    }
  };

  // --- DOWNLOAD EXCEL FUNCTION ---
  const downloadExcel = (filename: string) => {
    const titleText = docType === "invoice" ? "COMILLA TRADERS - INVOICE" : "COMILLA TRADERS - QUOTATION";
    const data = [
      [titleText],
      ["Messers:", messers],
      ["Address:", address],
    ];

    if (docType === "invoice") {
      data.push(["Invoice No.:", invoiceNo]);
    }
    data.push(["Challan No.:", challanNo]);
    data.push(["Date:", dateVal]);
    data.push(["Requisition No.:", requisitionNo]);
    if (docType === "invoice") {
      data.push(["PO Number:", poNumber]);
    }
    data.push([]);
    data.push(["SL", "Description of Marine Items / Spare Parts", "Qty", "Unit", "Price", "Amount"]);

    rows.forEach((row, idx) => {
      data.push([
        (idx + 1).toString(),
        row.desc,
        row.qty,
        row.unit,
        row.price,
        row.amount > 0 ? row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"
      ]);
    });

    data.push([]);
    
    if (docType === "invoice") {
      const vatAmount = (grandTotal * vatPercent) / 100;
      const calculatedGrandTotal = grandTotal + vatAmount + transportation;
      data.push(["", "", "", "", "Sub Total", grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
      data.push(["", "", "", "", `VAT (${vatPercent}%)`, vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
      data.push(["", "", "", "", "Transportation", transportation.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
      data.push(["", "", "", "", "GRAND TOTAL", calculatedGrandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
    } else {
      data.push(["", "", "", "", "TOTAL", grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, docType === "invoice" ? "Invoice" : "Quotation");

    XLSX.writeFile(wb, filename);
  };

  // --- PDF DOWNLOAD FUNCTION ---
  const downloadPDF = async () => {
    if (!sheetRef.current) return;

    const loadingToast = document.createElement('div');
    loadingToast.style.position = 'fixed';
    loadingToast.style.top = '20px';
    loadingToast.style.left = '50%';
    loadingToast.style.transform = 'translateX(-50%)';
    loadingToast.style.background = '#111';
    loadingToast.style.color = '#fff';
    loadingToast.style.padding = '12px 24px';
    loadingToast.style.borderRadius = '8px';
    loadingToast.style.zIndex = '10000';
    loadingToast.textContent = 'Generating PDF...';
    document.body.appendChild(loadingToast);

    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
      
      const identifier = docType === "invoice" ? (invoiceNo || "NEW") : (challanNo || "NEW");
      const prefix = docType === "invoice" ? "Invoice" : "Quotation";
      const filename = `${prefix}_${identifier.replace(/[\/\\?%*:|"<>\s]/g, "_")}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again or use Print → Save as PDF.");
    } finally {
      document.body.removeChild(loadingToast);
    }
  };

  // --- DIRECT DOWNLOAD HANDLER (Quick Download) ---
  const handleQuickDownload = () => {
    const identifier = docType === "invoice" ? (invoiceNo || "NEW") : (challanNo || "NEW");
    const prefix = docType === "invoice" ? "Invoice" : "Quotation";
    const filename = `${prefix}_${identifier.replace(/[\/\\?%*:|"<>\s]/g, "_")}.xlsx`;
    downloadExcel(filename);
  };

  const handleSaveClick = () => {
    // Generate default filename
    const identifier = docType === "invoice" ? (invoiceNo || "NEW") : (challanNo || "NEW");
    const prefix = docType === "invoice" ? "Invoice" : "Quotation";
    const defaultName = `${prefix}_${identifier.replace(/[\/\\?%*:|"<>\s]/g, "_")}`;
    setSaveFilename(defaultName);
    setIsSaveModalOpen(true);
  };

  const confirmSaveExcel = async () => {
    let finalName = saveFilename.trim();
    if (!finalName) finalName = docType === "invoice" ? "Invoice" : "Quotation";
    if (!finalName.endsWith(".xlsx")) {
      finalName += ".xlsx";
    }

    if (saveMethod === "custom" && "showSaveFilePicker" in window) {
      try {
        const titleText = docType === "invoice" ? "COMILLA TRADERS - INVOICE" : "COMILLA TRADERS - QUOTATION";
        const data = [
          [titleText],
          ["Messers:", messers],
          ["Address:", address],
        ];

        if (docType === "invoice") {
          data.push(["Invoice No.:", invoiceNo]);
        }
        data.push(["Challan No.:", challanNo]);
        data.push(["Date:", dateVal]);
        data.push(["Requisition No.:", requisitionNo]);
        if (docType === "invoice") {
          data.push(["PO Number:", poNumber]);
        }
        data.push([]);
        data.push(["SL", "Description of Marine Items / Spare Parts", "Qty", "Unit", "Price", "Amount"]);

        rows.forEach((row, idx) => {
          data.push([
            (idx + 1).toString(),
            row.desc,
            row.qty,
            row.unit,
            row.price,
            row.amount > 0 ? row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"
          ]);
        });

        data.push([]);
        
        if (docType === "invoice") {
          const vatAmount = (grandTotal * vatPercent) / 100;
          const calculatedGrandTotal = grandTotal + vatAmount + transportation;
          data.push(["", "", "", "", "Sub Total", grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
          data.push(["", "", "", "", `VAT (${vatPercent}%)`, vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
          data.push(["", "", "", "", "Transportation", transportation.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
          data.push(["", "", "", "", "GRAND TOTAL", calculatedGrandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
        } else {
          data.push(["", "", "", "", "TOTAL", grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, docType === "invoice" ? "Invoice" : "Quotation");

        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: finalName,
          types: [{
            description: "Excel Spreadsheet",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
            }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setIsSaveModalOpen(false);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          alert("Error saving file: " + err.message);
        }
      }
    } else {
      // Default download
      downloadExcel(finalName);
      setIsSaveModalOpen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const safeSelectedRowIndex = Math.max(0, Math.min(selectedRowIndex, rows.length - 1));

  // Column configuration used to iterate real grid columns (-1 = SL ... 4 = Amount)
  // when rendering the table with merge-aware colSpan/rowSpan.
  const GRID_COLUMNS = [-1, 0, 1, 2, 3, 4];

  return (
    <div className="quotation-container relative min-h-screen flex flex-col items-center bg-[#f1f5f9] py-5 overflow-x-auto text-[#000] font-sans antialiased">
      {/* Screen Toolbar - Compact Version */}
      <div className="top-toolbar no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] mb-3 flex flex-col md:flex-row justify-between items-center gap-2 px-3 sm:px-0 z-10">
        {/* Left Side: Mode Selector & Auto-Save */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-300 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => setDocType("quotation")}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                docType === "quotation"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Quotation
            </button>
            <button
              type="button"
              onClick={() => setDocType("invoice")}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                docType === "invoice"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Invoice
            </button>
          </div>

          {/* Auto-Save Toggle - Compact */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs shrink-0">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => {
                  setAutoSaveEnabled(e.target.checked);
                  localStorage.setItem("comilla_autosave_enabled", String(e.target.checked));
                }}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Auto</span>
            </label>
            {lastSavedTime && (
              <span className="text-[8px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden sm:inline">{lastSavedTime}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons - Compact */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
          <button 
            onClick={startNewDoc} 
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
            title="Start a fresh blank sheet"
          >
            <FilePlus className="h-3 w-3" />
            <span className="hidden sm:inline">NEW</span>
          </button>
          
          {currentDocId && (
            <>
              <button 
                onClick={duplicateCurrentDoc} 
                className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
                title="Save a duplicated copy"
              >
                <Copy className="h-3 w-3" />
                <span className="hidden sm:inline">DUPE</span>
              </button>
              <button 
                onClick={() => deleteSavedDoc(currentDocId)} 
                className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
                title="Delete this sheet"
              >
                <Trash2 className="h-3 w-3 text-rose-500" />
                <span className="hidden sm:inline">DEL</span>
              </button>
            </>
          )}

          <button 
            onClick={() => saveCurrentDocToApp()} 
            disabled={saveStatus === "saving"}
            className={`${
              saveStatus === "saved" 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : saveStatus === "error" 
                ? "bg-rose-600 hover:bg-rose-700" 
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1 disabled:opacity-85`}
            title="Save to Cloud Database"
          >
            {saveStatus === "saving" ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">SAVING</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">SAVED</span>
              </>
            ) : saveStatus === "error" ? (
              <>
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">FAILED</span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                <span className="hidden sm:inline">SAVE</span>
              </>
            )}
          </button>
          
          {/* DOWNLOAD BUTTON - Direct download to device */}
          <button 
            onClick={handleQuickDownload} 
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] py-1 px-3 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            title="Download Excel file directly to your device"
          >
            <Download className="h-3.5 w-3.5" />
            <span>DOWNLOAD</span>
          </button>

          {/* NEW PDF DOWNLOAD BUTTON */}
          <button 
            onClick={downloadPDF} 
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1 px-3 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            title="Download PDF file directly to your device"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
          
          <button 
            onClick={handleSaveClick} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
            title="Save Excel with custom options"
          >
            <Save className="h-3 w-3" />
            <span className="hidden sm:inline">SAVE AS</span>
          </button>
          
          <button 
            onClick={handlePrint} 
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1 px-2.5 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
          >
            <Printer className="h-3 w-3" />
            <span className="hidden sm:inline">PRINT</span>
          </button>
        </div>
      </div>

      {/* Editing State Banner */}
      {currentDocId && (
        <div className="no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] mb-2 px-3 sm:px-0 z-10 animate-in fade-in slide-in-from-top-2 duration-250">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex items-center justify-between text-xs text-indigo-950 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-indigo-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider shrink-0 shadow-xs">
                Editing
              </span>
              <span className="font-bold text-slate-800 truncate text-[11px]" title={savedDocs.find(d => d.id === currentDocId)?.name || "Active Sheet"}>
                {savedDocs.find(d => d.id === currentDocId)?.name || "Active Sheet"}
              </span>
            </div>
            <button
              type="button"
              onClick={resetSheetFields}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 px-2 py-1 rounded transition-all cursor-pointer uppercase tracking-wider shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Excel / Google Sheets Style Full App Layout Toolbar - Compact */}
      <div className="excel-editor-container no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] bg-[#f8f9fa] border border-slate-300 rounded-lg shadow-md mb-3 overflow-hidden text-slate-800 z-10">
        {/* Menu Bar: File */}
        <div className="flex flex-wrap items-center gap-1 bg-[#f8f9fa] border-b border-slate-200 px-2 py-1 text-xs select-none">
          <div className="font-semibold text-[11px] text-emerald-700 mr-2 font-mono flex items-center gap-1">
            <span className="bg-emerald-700 text-white font-black text-[8px] px-1 py-0.5 rounded-xs leading-none shadow-xs">田</span>
            <span className="font-extrabold tracking-tight font-sans text-[10px]">ComillaSheets</span>
          </div>
          
          {/* File Dropdown */}
          <div className="relative group">
            <button className="px-1.5 py-0.5 hover:bg-slate-200 rounded-md cursor-pointer transition-all font-semibold text-slate-700 text-[10px]">File</button>
            <div className="hidden group-hover:block absolute left-0 top-full bg-white border border-slate-200 shadow-xl rounded-md py-1 w-48 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
              <button onClick={startNewDoc} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] text-slate-700 font-bold">
                <FilePlus className="h-3 w-3 text-slate-400" /> New Sheet
              </button>
              <button onClick={saveCurrentDocToApp} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] text-slate-700 font-bold">
                <Save className="h-3 w-3 text-slate-400" /> Save to Cloud
              </button>
              <button onClick={handleQuickDownload} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] text-slate-700 font-bold">
                <Download className="h-3 w-3 text-emerald-600" /> Download Excel
              </button>
              <button onClick={downloadPDF} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] text-slate-700 font-bold">
                <Download className="h-3 w-3 text-rose-600" /> Download PDF
              </button>
              <button onClick={handleSaveClick} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] text-slate-700 font-bold">
                <Save className="h-3 w-3 text-blue-600" /> Save As...
              </button>
              <button onClick={handlePrint} className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 text-[10px] text-slate-700 font-bold border-t border-slate-100">
                <Printer className="h-3 w-3 text-slate-400" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Merge/Unmerge action */}
          <button
            type="button"
            onClick={toggleMergeSelectedRangeV2}
            title="Merge or unmerge the selected cells"
            className="ml-1 px-1.5 py-0.5 hover:bg-emerald-100 rounded-md cursor-pointer transition-all font-bold text-emerald-700 text-[10px] flex items-center gap-1 border border-emerald-200 bg-emerald-50"
          >
            <Heading className="h-3 w-3" />
            <span className="hidden sm:inline">
              {(() => {
                if (!selectionStart) return "Merge";
                const existing = getMergeRegionAt(selectionStart.rowIndex, selectionStart.colIndex);
                return existing ? "Unmerge" : "Merge";
              })()}
            </span>
          </button>

          {/* Right-aligned Quick-access Buttons */}
          <div className="ml-auto flex items-center gap-1">
            <button 
              onClick={handleQuickDownload}
              title="Download Excel file directly to your device"
              className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-md transition-all cursor-pointer flex items-center gap-0.5 font-bold text-[8px] shadow-3xs"
            >
              <Download className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">DOWNLOAD</span>
            </button>
            <button 
              onClick={downloadPDF}
              title="Download PDF file directly to your device"
              className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-md transition-all cursor-pointer flex items-center gap-0.5 font-bold text-[8px] shadow-3xs"
            >
              <Download className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button 
              onClick={handleSaveClick}
              title="Save Excel with custom filename and location"
              className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-md transition-all cursor-pointer flex items-center gap-0.5 font-bold text-[8px] shadow-3xs"
            >
              <Save className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">SAVE AS</span>
            </button>
            <button 
              onClick={handlePrint}
              title="Print or Save as PDF"
              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 rounded-md transition-all cursor-pointer flex items-center gap-0.5 font-bold text-[8px] shadow-3xs"
            >
              <Printer className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">PRINT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standard A4 Printable Sheet */}
      <div ref={sheetRef} className="sheet relative w-full max-w-[210mm] sm:w-[210mm] print:w-[210mm] min-h-[297mm] bg-white p-4 sm:p-[12mm] print:p-[12mm] shadow-lg box-border z-10 mx-auto">
        {/* Aligned Watermark Logo inside the Document Sheet */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none">
          <img 
            src="https://i.ibb.co.com/3mNycQXx/1.png" 
            alt="Watermark" 
            referrerPolicy="no-referrer"
            className="w-[70%] opacity-[0.045] object-contain select-none max-w-[500px]"
            style={{ printColorAdjust: "exact" }}
          />
        </div>

        <table className="print-outer-layout-table w-full border-none p-0 m-0 relative z-10">
          <thead className="print:table-header-group">
            <tr>
              <td className="border-none p-0 m-0">
                {/* Business Header with Details and Logo */}
                <div className="business-header border-b-2 border-black pb-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-black text-left">
                  {/* Left Side: Brand Logo and Title */}
                  <div className="flex items-center gap-4">
                    <div className="logo-container h-28 w-28 sm:h-32 sm:w-32 print:h-32 print:w-32 shrink-0 rounded-full border-2 border-slate-300 overflow-hidden bg-black flex items-center justify-center shadow-sm">
                      <img
                        src="https://i.ibb.co.com/gFBkpt8B/Chat-GPT-Image-Apr-23-2026-01-10-13-PM.png"
                        alt="Comilla Traders Logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h1 className="text-[22pt] font-black tracking-tight leading-none text-black">
                        COMILLA TRADERS
                      </h1>
                      <p className="text-[9pt] font-extrabold text-slate-700 tracking-wider uppercase mt-1.5">
                        Ship Chandler, Marine Supplier & General Merchant
                      </p>
                      <p className="text-[7.5pt] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Mechanical & Electrical Marine Engineering Services
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Contact Details */}
                  <div className="contact-details text-right text-[7.5pt] text-slate-800 space-y-0.5 leading-tight sm:block hidden print:block">
                    <p className="font-bold whitespace-nowrap">
                      Office: <span className="font-medium whitespace-nowrap">Jubilee Road, Chattogram, Bangladesh</span>
                    </p>
                    <p className="font-bold whitespace-nowrap">
                      Helplines: <span className="font-medium font-mono whitespace-nowrap">01819315746, 01712-900431</span>
                    </p>
                    <p className="font-bold whitespace-nowrap">
                      Official Email: <span className="font-medium whitespace-nowrap">comillatraders@gmail.com</span>
                    </p>
                    <p className="font-bold text-[7pt] tracking-widest text-indigo-700 uppercase whitespace-nowrap">
                      CHATTOGRAM &bull; BANGLADESH
                    </p>
                  </div>
                  
                  {/* Mobile Right Side */}
                  <div className="text-center text-[8pt] text-slate-800 space-y-0.5 leading-tight sm:hidden print:hidden">
                    <p>Jubilee Road, Chattogram &bull; Hotlines: 01819315746</p>
                    <p>comillatraders@gmail.com</p>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-none p-0 m-0">
                {/* Big Letterhead / Document Title */}
                <div className="doc-title text-center text-[15pt] font-black uppercase tracking-[8px] my-2">
                  {docType === "invoice" ? "Invoice" : "Quotation"}
                </div>

                {/* Meta Details Grid */}
                <div className="meta-grid grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 text-left text-[9pt] mb-4">
                  {/* Left Column: Client Details */}
                  <div className="meta-box space-y-2 border border-black p-3 bg-slate-50/30 rounded-xs">
                    <div>
                      <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Messers:</label>
                      <input 
                        type="text" 
                        value={messers}
                        onChange={(e) => setMessers(e.target.value)}
                        className="w-full border-b border-dotted border-slate-400 focus:border-black font-bold text-[9.5pt] outline-none bg-transparent py-0.5 no-print print:hidden"
                      />
                      <div className="hidden print:block font-bold text-[9.5pt] border-b border-dotted border-black min-h-[20px] py-0.5 break-words whitespace-pre-wrap leading-tight">
                        {messers || " "}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Address:</label>
                      <textarea 
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border-b border-dotted border-slate-400 focus:border-black text-[9pt] outline-none bg-transparent resize-none leading-tight py-0.5 no-print print:hidden"
                      />
                      <div className="hidden print:block text-[9pt] border-b border-dotted border-black min-h-[40px] py-0.5 break-words whitespace-pre-wrap leading-tight">
                        {address || " "}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Invoice/Quotation Details */}
                  <div className="meta-box meta-box-inner-grid grid grid-cols-2 gap-2 border border-black p-3 bg-slate-50/30 rounded-xs">
                    {docType === "invoice" ? (
                      <>
                        <div className="meta-inner-field col-span-1">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Invoice No.:</label>
                          <input 
                            type="text" 
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                            className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                          />
                        </div>
                        <div className="meta-inner-field col-span-1">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Challan No.:</label>
                          <input 
                            type="text" 
                            value={challanNo}
                            onChange={(e) => setChallanNo(e.target.value)}
                            className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                          />
                        </div>
                        <div className="meta-inner-field col-span-1 relative">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Date:</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={dateVal}
                              onChange={(e) => setDateVal(e.target.value)}
                              className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                            />
                            <button
                              type="button"
                              onClick={triggerDatePicker}
                              className="no-print print:hidden p-0.5 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                              title="Select Date"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            ref={dateRef}
                            type="date"
                            onChange={handleDatePickerChange}
                            className="absolute invisible w-0 h-0 opacity-0 pointer-events-none"
                          />
                        </div>
                        <div className="meta-inner-field col-span-1">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">PO Number:</label>
                          <input 
                            type="text" 
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                          />
                        </div>
                        <div className="meta-inner-field col-span-2">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Requisition No.:</label>
                          <input 
                            type="text" 
                            value={requisitionNo}
                            onChange={(e) => setRequisitionNo(e.target.value)}
                            className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="meta-inner-field col-span-1">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Challan No.:</label>
                          <input 
                            type="text" 
                            value={challanNo}
                            onChange={(e) => setChallanNo(e.target.value)}
                            className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                          />
                        </div>
                        <div className="meta-inner-field col-span-1 relative">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Date:</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={dateVal}
                              onChange={(e) => setDateVal(e.target.value)}
                              className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                            />
                            <button
                              type="button"
                              onClick={triggerDatePicker}
                              className="no-print print:hidden p-0.5 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                              title="Select Date"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            ref={dateRef}
                            type="date"
                            onChange={handleDatePickerChange}
                            className="absolute invisible w-0 h-0 opacity-0 pointer-events-none"
                          />
                        </div>
                        <div className="meta-inner-field col-span-2">
                          <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Requisition No.:</label>
                          <input 
                            type="text" 
                            value={requisitionNo}
                            onChange={(e) => setRequisitionNo(e.target.value)}
                            className="w-full border-b border-dotted border-slate-400 focus:border-black font-mono text-[9pt] outline-none bg-transparent py-0.5"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

        {/* Compact Table */}
        <div className="w-full overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="main-table w-[650px] sm:w-full border-collapse border-[1.5px] border-black table-fixed text-[9pt]">
          <thead>
            <tr className="bg-slate-50 text-[8pt]">
              <th className="w-[4%] border border-black py-1 text-center font-bold">SL</th>
              <th className="w-[44%] border border-black py-1 text-left px-2 font-bold">Description</th>
              <th className="w-[8%] border border-black py-1 text-center font-bold">Qty</th>
              <th className="w-[22%] border border-black py-1 text-center font-bold">Unit</th>
              <th className="w-[10%] border border-black py-1 text-center font-bold">Price</th>
              <th className="w-[12%] border border-black py-1 text-center font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr 
                key={idx} 
                className={`group hover:bg-slate-50/50 transition-colors ${
                  idx === safeSelectedRowIndex 
                    ? "bg-emerald-50/10" 
                    : ""
                }`}
              >
                {GRID_COLUMNS.map((colIndex) => {
                  const { region, isAnchor } = getMergeInfo(idx, colIndex);

                  // Covered (non-anchor) cell of a merged region: render nothing, the
                  // anchor cell's colSpan/rowSpan already occupies this grid position.
                  if (region && !isAnchor) {
                    return null;
                  }

                  const colSpan = region ? region.endCol - region.startCol + 1 : 1;
                  const rowSpan = region ? region.endRow - region.startRow + 1 : 1;

                  // --- SL column ---
                  if (colIndex === -1) {
                    return (
                      <td
                        key={colIndex}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        onMouseDown={(e) => handleCellMouseDown(e, idx, -1)}
                        onMouseEnter={() => handleCellMouseEnter(idx, -1)}
                        onMouseUp={(e) => handleCellMouseUp(e, idx, -1)}
                        onClick={() => handleCellClick(idx, -1)}
                        onContextMenu={(e) => handleCellContextMenu(e, idx, -1)}
                        className={getCellClassName(idx, -1, `border border-black text-center font-mono text-[8.5pt] align-top py-1 transition-all cursor-pointer select-none ${
                          idx === safeSelectedRowIndex
                            ? "bg-emerald-50/30 text-slate-800"
                            : "bg-slate-50/30 text-slate-800"
                        }`)}
                      >
                        {idx + 1}
                      </td>
                    );
                  }

                  // --- Description column ---
                  if (colIndex === 0) {
                    return (
                      <td
                        key={colIndex}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        onMouseDown={(e) => handleCellMouseDown(e, idx, 0)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                        onMouseUp={(e) => handleCellMouseUp(e, idx, 0)}
                        onClick={() => handleCellClick(idx, 0)}
                        onContextMenu={(e) => handleCellContextMenu(e, idx, 0)}
                        className={getCellClassName(idx, 0, `border border-black text-left px-1.5 text-[8.5pt] align-top py-1 break-all whitespace-normal transition-all cursor-text ${region ? "bg-amber-50/10" : ""}`)}
                      >
                        <textarea
                          value={row.desc}
                          onFocus={() => {
                            setSelectedRowIndex(idx);
                            setSelectedCell({ rowIndex: idx, colIndex: 0 });
                          }}
                          onChange={(e) => {
                            handleRowChange(idx, "desc", e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              const targetElement = document.querySelector(
                                `[data-row="${idx + 1}"][data-col="0"]`
                              ) as HTMLElement | null;
                              if (targetElement) {
                                targetElement.focus();
                              }
                            } else {
                              handleKeyDown(e, idx, 0);
                            }
                          }}
                          onPaste={(e) => handlePaste(e, idx, 0)}
                          data-row={idx}
                          data-col={0}
                          rows={1}
                          style={{ height: "auto", resize: "none" }}
                          placeholder={region ? "Merged Cell(s) - Excel style" : undefined}
                          className={`w-full text-left border-none outline-none bg-transparent px-0 text-slate-800 text-[8.5pt] leading-tight block overflow-hidden py-0.5 whitespace-pre-wrap break-all no-print print:hidden ${region ? "font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:italic" : ""}`}
                        />
                        <div className="hidden print:block whitespace-pre-wrap break-words text-slate-900 leading-tight py-0.5 text-[8.5pt]">
                          {row.desc || " "}
                        </div>
                      </td>
                    );
                  }

                  // --- Qty column ---
                  if (colIndex === 1) {
                    return (
                      <td
                        key={colIndex}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        onMouseDown={(e) => handleCellMouseDown(e, idx, 1)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                        onMouseUp={(e) => handleCellMouseUp(e, idx, 1)}
                        onClick={() => handleCellClick(idx, 1)}
                        onContextMenu={(e) => handleCellContextMenu(e, idx, 1)}
                        className={getCellClassName(idx, 1, "border border-black text-center font-mono text-[9pt] align-top py-1 transition-all cursor-text")}
                      >
                        <textarea
                          value={row.qty}
                          onFocus={() => {
                            setSelectedRowIndex(idx);
                            setSelectedCell({ rowIndex: idx, colIndex: 1 });
                          }}
                          onChange={(e) => {
                            handleRowChange(idx, "qty", e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                          onPaste={(e) => handlePaste(e, idx, 1)}
                          data-row={idx}
                          data-col={1}
                          rows={1}
                          style={{ height: "auto", resize: "none" }}
                          className={`w-full text-center border-none outline-none bg-transparent px-0 font-mono text-slate-800 align-top overflow-hidden py-0.5 whitespace-pre-wrap break-all no-print print:hidden ${
                            row.qty.length > 6 ? "text-[7.5pt]" : "text-[9pt]"
                          }`}
                        />
                        <div className="hidden print:block whitespace-pre-wrap break-words text-center font-mono text-slate-900 py-0.5 text-[9pt]">
                          {row.qty || " "}
                        </div>
                      </td>
                    );
                  }

                  // --- Unit column ---
                  if (colIndex === 2) {
                    return (
                      <td
                        key={colIndex}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        onMouseDown={(e) => handleCellMouseDown(e, idx, 2)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                        onMouseUp={(e) => handleCellMouseUp(e, idx, 2)}
                        onClick={() => handleCellClick(idx, 2)}
                        onContextMenu={(e) => handleCellContextMenu(e, idx, 2)}
                        className={getCellClassName(idx, 2, "border border-black text-center text-[9pt] align-top py-1 transition-all cursor-text")}
                      >
                        <textarea
                          value={row.unit}
                          onFocus={() => {
                            setSelectedRowIndex(idx);
                            setSelectedCell({ rowIndex: idx, colIndex: 2 });
                          }}
                          onChange={(e) => {
                            handleRowChange(idx, "unit", e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                          onPaste={(e) => handlePaste(e, idx, 2)}
                          data-row={idx}
                          data-col={2}
                          rows={1}
                          style={{ height: "auto", resize: "none" }}
                          className={`w-full text-center border-none outline-none bg-transparent px-0 text-slate-800 align-top overflow-hidden py-0.5 whitespace-pre-wrap break-all no-print print:hidden ${
                            row.unit.length > 6 ? "text-[7.5pt]" : "text-[9pt]"
                          }`}
                        />
                        <div className="hidden print:block whitespace-pre-wrap break-words text-center text-slate-900 py-0.5 text-[9pt]">
                          {row.unit || " "}
                        </div>
                      </td>
                    );
                  }

                  // --- Price column ---
                  if (colIndex === 3) {
                    return (
                      <td
                        key={colIndex}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        onMouseDown={(e) => handleCellMouseDown(e, idx, 3)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                        onMouseUp={(e) => handleCellMouseUp(e, idx, 3)}
                        onClick={() => handleCellClick(idx, 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, idx, 3)}
                        className={getCellClassName(idx, 3, "border border-black text-center font-mono text-[9pt] align-top py-1 transition-all cursor-text")}
                      >
                        <textarea
                          value={row.price}
                          onFocus={() => {
                            setSelectedRowIndex(idx);
                            setSelectedCell({ rowIndex: idx, colIndex: 3 });
                          }}
                          onChange={(e) => {
                            handleRowChange(idx, "price", e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                          onPaste={(e) => handlePaste(e, idx, 3)}
                          data-row={idx}
                          data-col={3}
                          rows={1}
                          style={{ height: "auto", resize: "none" }}
                          className={`w-full text-center border-none outline-none bg-transparent px-0 font-mono text-slate-800 align-top overflow-hidden py-0.5 whitespace-pre-wrap break-all no-print print:hidden ${
                            row.price.length > 8 ? "text-[7.5pt]" : "text-[9pt]"
                          }`}
                        />
                        <div className="hidden print:block whitespace-pre-wrap break-words text-center font-mono text-slate-900 py-0.5 text-[9pt]">
                          {row.price || " "}
                        </div>
                      </td>
                    );
                  }

                  // --- Amount column (colIndex === 4) ---
                  return (
                    <td
                      key={colIndex}
                      colSpan={colSpan}
                      rowSpan={rowSpan}
                      onMouseDown={(e) => handleCellMouseDown(e, idx, 4)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                      onMouseUp={(e) => handleCellMouseUp(e, idx, 4)}
                      onClick={() => handleCellClick(idx, 4)}
                      onContextMenu={(e) => handleCellContextMenu(e, idx, 4)}
                      className={getCellClassName(idx, 4, "border border-black text-right pr-2 font-mono text-[9pt] font-semibold text-slate-800 align-top py-1 transition-all cursor-pointer")}
                    >
                      <div className={`whitespace-normal break-all leading-tight ${
                        row.amount > 0 && row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }).length > 12
                          ? "text-[7.5pt]"
                          : "text-[9pt]"
                      }`}>
                        {row.amount > 0 ? row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Quotation Footer & Closing Box */}
        <div className="closing-wrap mt-2.5">
          <table className="closing-row w-full border-collapse border-2 border-black table-fixed mt-2.5 bg-white text-black z-10 relative">
            <tbody>
              {docType === "quotation" ? (
                <tr className="align-stretch">
                  {/* Amount in Words (Compact, on the left) */}
                  <td className="amount-words-container w-1/2 border-r-2 border-black p-2 bg-slate-50/50 text-left align-middle">
                    <span className="font-extrabold text-[7pt] text-slate-700 uppercase tracking-wider block mb-0.5">
                      Amount in Words:
                    </span>
                    <span className="text-[8.5pt] font-mono italic text-black font-black uppercase leading-tight">
                      {numberToWords(calculatedGrandTotal)}
                    </span>
                  </td>
                  {/* Total Amount (Right side) */}
                  <td className="w-1/2 p-0 align-stretch">
                    <div className="flex flex-row items-stretch h-full min-h-[40px] w-full">
                      <div className="total-lbl bg-slate-50 w-[170px] shrink-0 pr-2 text-right border-r-2 border-black text-[9pt] font-bold uppercase flex items-center justify-end">
                        TOTAL
                      </div>
                      <div className="total-val flex-grow text-right pr-4 text-[10pt] font-mono font-black flex items-center justify-end px-2 py-1 leading-tight">
                        {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Row 1: Sub Total */}
                  <tr className="align-stretch">
                    {/* Amount in Words (rowspan 4 on the left half) */}
                    <td rowSpan={4} className="amount-words-container w-1/2 border-r-2 border-black p-3 bg-slate-50/50 text-left align-middle">
                      <span className="font-extrabold text-[7.5pt] text-slate-700 uppercase tracking-wider block mb-1">
                        Amount in Words:
                      </span>
                      <span className="text-[9.5pt] font-mono italic text-black font-black uppercase leading-tight">
                        {numberToWords(calculatedGrandTotal)}
                      </span>
                    </td>
                    {/* Sub Total Value */}
                    <td className="w-1/2 p-0 border-b border-black align-stretch">
                      <div className="flex flex-row items-stretch h-full w-full">
                        <div className="total-lbl bg-slate-50 w-[170px] shrink-0 pr-2 py-1.5 text-right border-r border-black font-bold uppercase text-[8pt] flex items-center justify-end">
                          Sub Total
                        </div>
                        <div className="total-val flex-grow text-right pr-3 font-mono font-bold py-1.5 flex items-center justify-end">
                          {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: VAT */}
                  <tr className="align-stretch">
                    <td className="p-0 border-b border-black align-stretch">
                      <div className="flex flex-row items-stretch h-full w-full">
                        <div className="total-lbl bg-slate-50 w-[170px] shrink-0 pr-2 py-1.5 text-right border-r border-black font-bold uppercase text-[8pt] flex items-center justify-end gap-1">
                          <span>VAT</span>
                          <span className="no-print print:hidden flex items-center bg-slate-200 border border-slate-300 rounded px-1 text-[8px] font-mono font-bold text-slate-700">
                            <input
                              type="number"
                              value={vatPercent}
                              onChange={(e) => setVatPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-8 bg-transparent text-center focus:outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                            />
                            %
                          </span>
                          <span className="hidden print:inline font-mono">({vatPercent}%)</span>
                        </div>
                        <div className="total-val flex-grow text-right pr-3 font-mono font-bold py-1.5 flex items-center justify-end">
                          {((grandTotal * vatPercent) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: Transportation charges */}
                  <tr className="align-stretch">
                    <td className="p-0 border-b border-black align-stretch">
                      <div className="flex flex-row items-stretch h-full w-full">
                        <div className="total-lbl bg-slate-50 w-[170px] shrink-0 pr-2 py-1.5 text-right border-r border-black font-bold uppercase text-[8pt] flex items-center justify-end gap-1">
                          <span>Transportation</span>
                          <span className="no-print print:hidden flex items-center bg-slate-200 border border-slate-300 rounded px-1 text-[8px] font-mono font-bold text-slate-700">
                            <input
                              type="number"
                              value={transportation === 0 ? "" : transportation}
                              placeholder="0"
                              onChange={(e) => setTransportation(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-12 bg-transparent text-center focus:outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                            />
                          </span>
                        </div>
                        <div className="total-val flex-grow text-right pr-3 font-mono font-bold py-1.5 flex items-center justify-end">
                          {transportation.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: Grand Total */}
                  <tr className="align-stretch">
                    <td className="p-0 bg-slate-100 align-stretch">
                      <div className="flex flex-row items-stretch h-full w-full">
                        <div className="bg-slate-200 w-[170px] shrink-0 pr-2 py-2 text-right border-r border-black font-extrabold uppercase text-[8.5pt] flex items-center justify-end">
                          Grand Total
                        </div>
                        <div className="total-val flex-grow text-right pr-3 font-mono font-black py-2 text-[9.5pt] flex items-center justify-end">
                          {(grandTotal + (grandTotal * vatPercent) / 100 + transportation).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="sig-section mt-8 flex flex-row justify-between gap-6 sm:gap-10">
            <div className="sig-box w-full sm:w-[220px] print:w-[220px] text-center flex flex-col justify-end h-[90px]">
              <div className="sig-line border-t-[1.5px] border-black pt-1.5 text-[9pt] font-bold">
                Receiver's Signature
              </div>
            </div>
            <div className="sig-box w-full sm:w-[220px] print:w-[220px] text-center flex flex-col justify-between h-[90px] relative">
              <div className="sig-title text-[9pt] font-bold text-black">For Comilla Traders</div>
              
              {/* Centered Transparent Stamp Image overlaying the signature line */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none pb-1">
                <img 
                  src="https://i.ibb.co.com/jZswrtn6/image-4-removebg-preview.png"
                  alt="Comilla Traders Stamp"
                  referrerPolicy="no-referrer"
                  className="w-[110px] h-[110px] object-contain select-none"
                  style={{ printColorAdjust: "exact" }}
                />
              </div>

              <div className="sig-line border-t-[1.5px] border-black pt-1.5 text-[9pt] font-bold relative z-20">
                Authorized Signature
              </div>
            </div>
          </div>
        </div>

              </td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* Saved Documents Panel - Hidden while printing */}
      <div className="saved-docs-panel no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] mt-6 bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden p-6 text-black">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Online Saved Documents</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Online DB ({savedDocs.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved invoices & quotations are stored securely in your online Cloud database.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={startNewDoc}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            <span>CREATE NEW SHEET</span>
          </button>
        </div>

        {/* Saved List */}
        {savedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <FileText className="h-10 w-10 text-slate-300 stroke-[1.5]" />
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider mt-3">No Saved Documents Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Use the <strong className="text-indigo-600">"SAVE ONLINE"</strong> button in the toolbar above or turn on <strong className="text-emerald-600">"Auto-Save"</strong> to store drafts here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Document Name</th>
                  <th className="px-4 py-3 font-semibold text-center w-24">Type</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Last Updated</th>
                  <th className="px-4 py-3 font-semibold text-right pr-6">Grand Total</th>
                  <th className="px-4 py-3 text-right pr-4 w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {savedDocs.map((doc) => {
                  const isActive = currentDocId === doc.id;
                  const docRowsTotal = doc.rows.reduce((sum: number, r: any) => sum + r.amount, 0);
                  const docGrandTotal = doc.docType === "quotation" 
                    ? docRowsTotal 
                    : (docRowsTotal + (docRowsTotal * doc.vatPercent) / 100 + doc.transportation);
                  
                  return (
                    <tr 
                      key={doc.id} 
                      onClick={() => loadSavedDoc(doc)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isActive ? "bg-indigo-50/30 hover:bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="inline-flex items-center bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.2 rounded-sm tracking-wide">
                              EDITING
                            </span>
                          )}
                          <span className="truncate max-w-[250px] sm:max-w-[350px] block" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase border ${
                          doc.docType === "quotation"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-slate-100 border-slate-200 text-slate-800"
                        }`}>
                          {doc.docType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">
                        {doc.dateVal}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {new Date(doc.updatedAt).toLocaleDateString()} {new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right pr-6 font-mono font-bold text-slate-900">
                        {docGrandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right pr-4 space-x-1.5 no-print" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => renameSavedDoc(doc.id, e)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          title="Rename Document"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteSavedDoc(doc.id, e)}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save As Excel Dialog Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 text-[#000]">
            {/* Header */}
            <div className="bg-slate-950 px-6 py-4 text-white flex items-center gap-2.5">
              <Download className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm tracking-wide">Save As Excel Spreadsheet</h3>
                <p className="text-[10px] text-slate-400">Rename your maritime quotation worksheet</p>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filename
                </label>
                <div className="flex rounded-lg border border-slate-300 focus-within:border-indigo-500 shadow-sm overflow-hidden bg-slate-50">
                  <input
                    type="text"
                    value={saveFilename}
                    onChange={(e) => setSaveFilename(e.target.value)}
                    placeholder="Enter filename..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none font-sans"
                    autoFocus
                  />
                  <span className="bg-slate-100 border-l border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-500 flex items-center">
                    .xlsx
                  </span>
                </div>
              </div>

              {/* Folder Location Selection */}
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Save Location / Folder
                </label>
                <div className="space-y-2">
                  {/* Default Download */}
                  <label className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    saveMethod === "default" 
                      ? "bg-slate-50 border-slate-900 shadow-xs" 
                      : "bg-white border-slate-200 hover:bg-slate-50/50"
                  }`}>
                    <input
                      type="radio"
                      name="saveLocation"
                      value="default"
                      checked={saveMethod === "default"}
                      onChange={() => setSaveMethod("default")}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Default Downloads Folder</p>
                      <p className="text-[10px] text-slate-500">
                        Saves instantly to your browser's default downloads location.
                      </p>
                    </div>
                  </label>

                  {/* Custom Folder/Location Selection */}
                  <label className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    saveMethod === "custom" 
                      ? "bg-slate-50 border-slate-900 shadow-xs" 
                      : "bg-white border-slate-200 hover:bg-slate-50/50"
                  }`}>
                    <input
                      type="radio"
                      name="saveLocation"
                      value="custom"
                      checked={saveMethod === "custom"}
                      onChange={() => setSaveMethod("custom")}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Select Folder on My Device</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Interactive
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Opens a system folder dialog allowing you to save the file in any directory.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Compatibility notice */}
                {saveMethod === "custom" && !("showSaveFilePicker" in window) && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg leading-snug">
                    ⚠️ Your browser doesn't fully support the native folder/file system picker API. It will automatically fallback to standard download.
                  </div>
                )}
              </div>
              
              <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>The file will contain all marine items, descriptions, quantities, and correct price calculations.</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:border-slate-400 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSaveExcel}
                className="px-5 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors shadow hover:shadow-md cursor-pointer"
              >
                Save File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Style Custom Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div 
          className="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 w-64 z-[9999] select-none text-xs font-sans text-slate-700 animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Section: Clear Selected Cell */}
          {contextMenu.colIndex !== undefined && contextMenu.colIndex >= 0 && contextMenu.colIndex <= 3 && (
            <>
              <button 
                onClick={() => {
                  clearSpecificCell(contextMenu.rowIndex, contextMenu.colIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold text-slate-900"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  Clear Cell (
                  {contextMenu.colIndex === 0 ? "Description" : 
                   contextMenu.colIndex === 1 ? "Qty" : 
                   contextMenu.colIndex === 2 ? "Unit" : 
                   contextMenu.colIndex === 3 ? "Price" : ""}
                  )
                </span>
              </button>
              <div className="my-1 border-t border-slate-100"></div>
            </>
          )}

          {/* Section: Merge/Unmerge — acts on the exact drag-selected cell range (mergedRegions),
              not the whole row. If only a single cell is selected, right-click there after
              dragging across multiple cells first to enable a real merge. */}
          <button 
            onClick={() => {
              toggleMergeSelectedRangeV2();
              setContextMenu(null);
            }}
            disabled={!hasRangeSelection() && !getMergeRegionAt(contextMenu.rowIndex, contextMenu.colIndex)}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-2.5">
              <Heading className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {getMergeRegionAt(contextMenu.rowIndex, contextMenu.colIndex)
                  ? "Unmerge Cells"
                  : "Merge Selected Cells"}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">⌘M</span>
          </button>
          {!hasRangeSelection() && !getMergeRegionAt(contextMenu.rowIndex, contextMenu.colIndex) && (
            <div className="px-3.5 pb-1.5 -mt-0.5 text-[9.5px] text-slate-400 leading-snug">
              Drag across multiple cells first, then right-click to merge them.
            </div>
          )}

          <div className="my-1 border-t border-slate-100"></div>

          {/* Section: Row insertion */}
          <button 
            onClick={() => {
              insertRow(contextMenu.rowIndex, 'above');
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600" />
            <span>Insert Row Above</span>
          </button>
          <button 
            onClick={() => {
              insertRow(contextMenu.rowIndex, 'below');
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600" />
            <span>Insert Row Below</span>
          </button>

          <div className="my-1 border-t border-slate-100"></div>

          {/* Section: Move rows */}
          <button 
            onClick={() => {
              if (contextMenu.rowIndex > 0) {
                moveRow(contextMenu.rowIndex, 'up');
                setContextMenu(null);
              }
            }}
            disabled={contextMenu.rowIndex === 0}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 font-bold"
          >
            <MoveUp className="h-3.5 w-3.5 text-slate-500" />
            <span>Move Row Up</span>
          </button>
          <button 
            onClick={() => {
              if (contextMenu.rowIndex < rows.length - 1) {
                moveRow(contextMenu.rowIndex, 'down');
                setContextMenu(null);
              }
            }}
            disabled={contextMenu.rowIndex === rows.length - 1}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 font-bold"
          >
            <MoveDown className="h-3.5 w-3.5 text-slate-500" />
            <span>Move Row Down</span>
          </button>

          <div className="my-1 border-t border-slate-100"></div>

          {/* Section: Clear and Delete */}
          <button 
            onClick={() => {
              clearSpecificRow(contextMenu.rowIndex);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Clear Row Content</span>
          </button>
          <button 
            onClick={() => {
              deleteSpecificRow(contextMenu.rowIndex);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center gap-2.5 font-bold border-t border-rose-50 mt-1"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            <span>Delete Row</span>
          </button>
        </div>
      )}

    </div>
  );
}</FILE>
```
