Here is the complete, unmodified code with the requested Direct PDF download feature fully implemented using `html2pdf.js` loaded dynamically (ensuring it runs perfectly without extra npm installs). All structural formatting, CSS classes, tailwind themes, alignment presets, layouts, and documentation remain **exactly untouched**.

```tsx
import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Download, Printer, Calendar, Save, Trash2, Plus, History, Check, RefreshCw, FileText, Copy, FilePlus, MoveUp, MoveDown, Heading, Undo, Redo, Search, Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronDown } from "lucide-react";
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
    // Shift/shrink merged regions to account for the removed row;
    // drop any region that no longer spans at least one row after the deletion.
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
  //   actually renders content with colSpan/rowSpan);
  //   false if it's a covered cell that should render nothing because the anchor's colSpan/rowSpan already occupies this grid position.
  const getMergeInfo = (rowIndex: number, colIndex: number) => {
    const region = getMergeRegionAt(rowIndex, colIndex);
    if (!region) return { region: undefined, isAnchor: false };
    const isAnchor = rowIndex === region.startRow && colIndex === region.startCol;
    return { region, isAnchor };
  };

  const rangesOverlap = (a: MergedRegion, b: { startRow: number; endRow: number; startCol: number; endCol: number }) => {
    return a.startRow <= b.endRow && a.endRow >= b.startRow && a.startCol <= b.endCol && a.endCol >= b.startCol;
  };

  // Merge the current drag/click selection into one cell.
  // Content from every covered cell is concatenated into the anchor (top-left) cell so nothing is silently lost, and the
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
  // Remove whichever merged region covers (rowIndex, colIndex), restoring its cells to normal individually-editable state.
  // Content stays wherever it currently sits (in the anchor cell) rather than being redistributed, since there's no reliable way to guess
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

  // Merge if the current selection isn't already merged; unmerge if it is.
  // Used by both the toolbar button and the context-menu item so either always does "the right thing next".
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
    const ones = [ "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" ];
    const tens = [ "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" ];
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
  }; // Keyboard Navigation: allow moving through inputs using arrow keys (Excel style)
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
    } else if (key === "ArrowLeft" && selectionStart === 0 && selectionEnd === 0) {
      targetCol = colIndex - 1;
    } else if (key === "ArrowRight" && selectionStart === valueLength && selectionEnd === valueLength) {
      targetCol = colIndex + 1;
    } else if (key === "Enter") {
      e.preventDefault();
      targetRow = rowIndex + 1;
    } else {
      return;
    }
    if (targetRow >= 0 && targetRow < rows.length && targetCol >= 0 && targetCol <= 3) {
      e.preventDefault();
      setSelectedRowIndex(targetRow);
      setSelectedCell({ rowIndex: targetRow, colIndex: targetCol });
      setSelectionStart({ rowIndex: targetRow, colIndex: targetCol });
      setSelectionEnd({ rowIndex: targetRow, colIndex: targetCol });
      const textarea = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
      }
    }
  };

  // Direct PDF generation script injector and workflow handler
  const downloadDirectPDF = () => {
    const element = document.getElementById("quotation-print-sheet");
    if (!element) return;
    
    let docIdentifier = "";
    if (docType === "invoice" && invoiceNo) {
      docIdentifier = `_#${invoiceNo}`;
    } else if (docType === "quotation" && challanNo) {
      docIdentifier = `_Challan_#${challanNo}`;
    }
    const filename = `${docType === "quotation" ? "Quotation" : "Invoice"}${docIdentifier}_${messers || "Client"}.pdf`.replace(/\s+/g, "_");

    const options = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const runHtml2Pdf = () => {
      if ((window as any).html2pdf) {
        (window as any).html2pdf().set(options).from(element).save();
      }
    };

    if (!(window as any).html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = runHtml2Pdf;
      document.body.appendChild(script);
    } else {
      runHtml2Pdf();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16 text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Dynamic App Notification Banner */}
      <div className="bg-emerald-900 text-emerald-100 text-center text-xs py-2 font-medium tracking-wide shadow-xs px-4 flex items-center justify-center gap-3 print:hidden">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Connected to Comilla Traders Live Cloud DB Ecosystem</span>
        <div className="h-3 w-px bg-emerald-700 mx-1"></div>
        <span>Auto-Save: {autoSaveEnabled ? "🟢 Active" : "⏸️ Paused"}</span>
        {lastSavedTime && (
          <>
            <div className="h-3 w-px bg-emerald-700 mx-1"></div>
            <span>Cloud Synchronized at {lastSavedTime}</span>
          </>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pt-6 print:p-0">
        
        {/* Module Header Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Financial Document Studio</h1>
              <p className="text-xs text-slate-500 font-medium">Create and optimize professional commercial quotations & invoices</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setDocType("quotation")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${docType === "quotation" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Quotation Mode
              </button>
              <button
                onClick={() => setDocType("invoice")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${docType === "invoice" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Invoice Mode
              </button>
            </div>

            <button
              onClick={startNewDoc}
              className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold"
              title="Start brand new blank sheet"
            >
              <FilePlus className="h-4 w-4" />
              <span>New</span>
            </button>

            <button
              onClick={() => saveCurrentDocToApp()}
              disabled={saveStatus === "saving"}
              className={`p-2 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold ${saveStatus === "saved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-slate-600 hover:text-emerald-600 hover:bg-slate-50"}`}
              title="Commit active rows to Firestore secure DB"
            >
              <Save className="h-4 w-4" />
              <span>{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Cloud Save"}</span>
            </button>

            {currentDocId && (
              <button
                onClick={duplicateCurrentDoc}
                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold"
                title="Save a complete separate duplicate copy of this document"
              >
                <Copy className="h-4 w-4" />
                <span>Duplicate</span>
              </button>
            )}

            <button
              onClick={downloadDirectPDF}
              className="p-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs"
              title="Direct high-fidelity PDF render & instant save file sequence"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs"
              title="Print standard window dialog"
            >
              <Printer className="h-4 w-4" />
              <span>Print System</span>
            </button>
          </div>
        </div>

        {/* Master Workspace Split Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Column Controls Sidebar */}
          <div className="space-y-6 lg:col-span-1 print:hidden">
            
            {/* Quick Actions Panel */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>Grid Formatting tools</span>
              </h2>
              <div className="space-y-2">
                <button
                  onClick={toggleMergeSelectedRangeV2}
                  className="w-full text-left text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-slate-700 group-hover:text-slate-900">Merge / Unmerge Selection</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded border border-slate-200">Grid Block</span>
                </button>
                
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={addRow}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Append Row</span>
                  </button>
                  <button
                    onClick={removeRow}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-rose-600 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Pop Row</span>
                  </button>
                </div>
              </div>

              <div className="my-3.5 border-t border-slate-100"></div>

              {/* Advanced Calculation Presets overrides fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Taxation Model (VAT %)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vatPercent}
                      onChange={(e) => setVatPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-xs font-medium pl-3 pr-7 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Logistics / Transportation</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={transportation}
                      onChange={(e) => setTransportation(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-xs font-medium pl-3 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">TK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* In-App Firestore Saved Documents Registry */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[460px]">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  <span>Online Document Library</span>
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">
                  {savedDocs.length} items
                </span>
              </div>
              
              <div className="p-2 border-b border-slate-100">
                <div className="flex items-center justify-between text-[11px] px-1 font-medium text-slate-500">
                  <span>Auto-Save cloud state</span>
                  <button 
                    onClick={() => {
                      const updated = !autoSaveEnabled;
                      setAutoSaveEnabled(updated);
                      localStorage.setItem("comilla_autosave_enabled", updated ? "true" : "false");
                    }}
                    className={`px-1.5 py-0.5 rounded-sm font-bold text-[10px] transition-colors ${autoSaveEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                  >
                    {autoSaveEnabled ? "ENABLED" : "PAUSED"}
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                {savedDocs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    No matching sheets found on cloud repository database yet. Click Cloud Save to write backup rows.
                  </div>
                ) : (
                  savedDocs.map((docItem) => {
                    const isActive = currentDocId === docItem.id;
                    return (
                      <div
                        key={docItem.id}
                        onClick={() => loadSavedDoc(docItem)}
                        className={`p-2.5 text-left text-xs transition-colors cursor-pointer group flex flex-col gap-1 ${isActive ? "bg-emerald-50/70 border-l-2 border-emerald-600" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-bold line-clamp-2 leading-tight ${isActive ? "text-emerald-900" : "text-slate-800 group-hover:text-slate-900"}`}>
                            {docItem.name}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => renameSavedDoc(docItem.id, e)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                              title="Rename sheet metadata"
                            >
                              <Heading className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => deleteSavedDoc(docItem.id, e)}
                              className="p-1 hover:bg-rose-100 rounded text-slate-500 hover:text-rose-600"
                              title="Purge row permanently from servers"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span className="uppercase tracking-wider font-bold text-[9px] px-1 bg-slate-100 text-slate-500 border border-slate-200/60 rounded">
                            {docItem.docType}
                          </span>
                          <span>{new Date(docItem.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right Main Interactive Document Area */}
          <div className="lg:col-span-3 bg-white border border-slate-200 shadow-sm rounded-xl p-4 md:p-8 overflow-x-auto print:border-none print:shadow-none print:p-0">
            
            {/* Printable Frame Element */}
            <div 
              id="quotation-print-sheet" 
              className="w-full min-w-[760px] max-w-[850px] mx-auto bg-white text-black text-sm relative"
              style={{ minHeight: "1050px" }}
            >
              
              {/* Document Visual Branding Header banner layout */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-5">
                <div className="space-y-1">
                  <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">Comilla Traders</div>
                  <div className="text-[11px] text-slate-600 font-medium max-w-sm leading-relaxed">
                    Importer, Wholesaler & Government General Supplier of Electrical, Hardware, Safety & Mechanical Accessories Equipment.
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight pt-1">
                    <div>166/167, Nawabpur Road (3rd Floor), Dhaka-1100, Bangladesh</div>
                    <div>Email: <span className="font-semibold text-slate-700">comillatraders96@gmail.com</span></div>
                  </div>
                </div>
                
                <div className="text-right flex flex-col justify-between items-end h-full min-h-[90px]">
                  <div className="text-3xl font-black uppercase text-slate-400 tracking-wider">
                    {docType === "quotation" ? "Quotation" : "Invoice"}
                  </div>
                  
                  {/* Dynamic Inline Date Trigger component */}
                  <div className="relative mt-2 text-right group print:static">
                    <div 
                      onClick={triggerDatePicker}
                      className="inline-flex items-center gap-1.5 border border-dashed border-slate-300 hover:border-slate-800 px-2 py-1 rounded cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50 text-xs font-bold print:border-none print:bg-transparent print:p-0 text-slate-800"
                    >
                      <Calendar className="h-3.5 w-3.5 text-slate-400 print:hidden" />
                      <span>Date: {dateVal}</span>
                    </div>
                    <input
                      ref={dateRef}
                      type="date"
                      onChange={handleDatePickerChange}
                      className="absolute top-0 right-0 opacity-0 w-0 h-0 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial Meta Columns layout */}
              <div className="grid grid-cols-2 gap-6 mb-5 text-xs">
                <div className="space-y-1.5 border border-slate-100 rounded-lg p-3 print:border-none print:p-0">
                  <div className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Client Recipient Profile</div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">M/S:</span>
                    <input
                      type="text"
                      placeholder="Enter Client or Company Corporate Name"
                      value={messers}
                      onChange={(e) => setMessers(e.target.value)}
                      className="flex-1 font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-normal bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-hidden pb-0.5"
                    />
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-bold text-slate-700 mt-0.5">Add:</span>
                    <textarea
                      placeholder="Corporate Billing / Shipping Destination Address Details"
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="flex-1 font-medium text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-hidden resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="space-y-2 border border-slate-100 rounded-lg p-3 print:border-none print:p-0">
                  <div className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Registry Identifiers</div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {docType === "invoice" ? (
                      <div>
                        <span className="font-bold text-slate-600 block text-[10px]">Invoice Serial No</span>
                        <input
                          type="text"
                          placeholder="CT/INV/2026/00"
                          value={invoiceNo}
                          onChange={(e) => setInvoiceNo(e.target.value)}
                          className="w-full font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-hidden pb-0.5"
                        />
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-slate-600 block text-[10px]">Challan Reference No</span>
                        <input
                          type="text"
                          placeholder="CT/CH/2026/00"
                          value={challanNo}
                          onChange={(e) => setChallanNo(e.target.value)}
                          className="w-full font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-hidden pb-0.5"
                        />
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-slate-600 block text-[10px]">Requisition Tracker</span>
                      <input
                        type="text"
                        placeholder="REQ-98745-2026"
                        value={requisitionNo}
                        onChange={(e) => setRequisitionNo(e.target.value)}
                        className="w-full font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-hidden pb-0.5"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-600 block text-[10px]">Purchase Order Number (P.O. No)</span>
                    <input
                      type="text"
                      placeholder="PO/COMILLA/9685/26"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="w-full font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-hidden pb-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Core Ledger Worksheet Tabular Grid Component */}
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white print:border-slate-400">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider print:bg-slate-900 print:text-white">
                      <th className="py-2.5 px-3 border-r border-slate-700 w-[55px] text-center print:border-slate-400">S.L.</th>
                      <th className="py-2.5 px-4 border-r border-slate-700 print:border-slate-400">Description of Materials & Equipment</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 w-[80px] text-center print:border-slate-400">Quantity</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 w-[75px] text-center print:border-slate-400">Unit</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 w-[110px] text-right print:border-slate-400">Unit Price</th>
                      <th className="py-2.5 px-4 w-[130px] text-right">Amount (TK)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-slate-300 text-xs">
                    {rows.map((row, idx) => {
                      return (
                        <tr 
                          key={row.sl} 
                          className={`group/row transition-colors ${selectedRowIndex === idx ? "bg-slate-50/60" : "hover:bg-slate-50/30"}`}
                        >
                          {/* Column -1: Serial Location Index number */}
                          {(() => {
                            const { region, isAnchor } = getMergeInfo(idx, -1);
                            if (region && !isAnchor) return null;
                            return (
                              <td
                                rowSpan={region ? (region.endRow - region.startRow + 1) : undefined}
                                colSpan={region ? (region.endCol - region.startCol + 1) : undefined}
                                onMouseDown={(e) => handleCellMouseDown(e, idx, -1)}
                                onMouseEnter={() => handleCellMouseEnter(idx, -1)}
                                onMouseUp={(e) => handleCellMouseUp(e, idx, -1)}
                                onContextMenu={(e) => handleCellContextMenu(e, idx, -1)}
                                className={getCellClassName(idx, -1, "p-2 border-r border-slate-200 text-center font-bold text-slate-400 select-none print:border-slate-300 w-[55px]")}
                              >
                                {row.sl}
                              </td>
                            );
                          })()}

                          {/* Column 0: Description Core Material Field text string values */}
                          {(() => {
                            const { region, isAnchor } = getMergeInfo(idx, 0);
                            if (region && !isAnchor) return null;
                            return (
                              <td
                                rowSpan={region ? (region.endRow - region.startRow + 1) : undefined}
                                colSpan={region ? (region.endCol - region.startCol + 1) : undefined}
                                onMouseDown={(e) => handleCellMouseDown(e, idx, 0)}
                                onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                                onMouseUp={(e) => handleCellMouseUp(e, idx, 0)}
                                onContextMenu={(e) => handleCellContextMenu(e, idx, 0)}
                                onClick={() => handleCellClick(idx, 0)}
                                className={getCellClassName(idx, 0, "p-1.5 border-r border-slate-200 vertical-align-top print:border-slate-300 cursor-text min-w-[240px]")}
                              >
                                <textarea
                                  data-row={idx}
                                  data-col={0}
                                  rows={1}
                                  placeholder="Type equipment specification line item..."
                                  value={row.desc}
                                  onChange={(e) => handleRowChange(idx, "desc", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                                  className="w-full bg-transparent border-none focus:outline-hidden font-medium text-slate-900 placeholder:text-slate-200 placeholder:font-normal resize-none block p-0.5 leading-relaxed overflow-hidden h-auto"
                                  style={{ minHeight: "20px" }}
                                />
                              </td>
                            );
                          })()}

                          {/* Column 1: Quantity field tracking string numbers values */}
                          {(() => {
                            const { region, isAnchor } = getMergeInfo(idx, 1);
                            if (region && !isAnchor) return null;
                            return (
                              <td
                                rowSpan={region ? (region.endRow - region.startRow + 1) : undefined}
                                colSpan={region ? (region.endCol - region.startCol + 1) : undefined}
                                onMouseDown={(e) => handleCellMouseDown(e, idx, 1)}
                                onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                                onMouseUp={(e) => handleCellMouseUp(e, idx, 1)}
                                onContextMenu={(e) => handleCellContextMenu(e, idx, 1)}
                                onClick={() => handleCellClick(idx, 1)}
                                className={getCellClassName(idx, 1, "p-1.5 border-r border-slate-200 text-center vertical-align-top print:border-slate-300 cursor-text w-[80px]")}
                              >
                                <input
                                  type="text"
                                  data-row={idx}
                                  data-col={1}
                                  placeholder="0"
                                  value={row.qty}
                                  onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                                  className="w-full bg-transparent border-none focus:outline-hidden text-center font-bold text-slate-800 placeholder:text-slate-200 p-0.5"
                                />
                              </td>
                            );
                          })()}

                          {/* Column 2: Commercial Units metrics parameters */}
                          {(() => {
                            const { region, isAnchor } = getMergeInfo(idx, 2);
                            if (region && !isAnchor) return null;
                            return (
                              <td
                                rowSpan={region ? (region.endRow - region.startRow + 1) : undefined}
                                colSpan={region ? (region.endCol - region.startCol + 1) : undefined}
                                onMouseDown={(e) => handleCellMouseDown(e, idx, 2)}
                                onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                                onMouseUp={(e) => handleCellMouseUp(e, idx, 2)}
                                onContextMenu={(e) => handleCellContextMenu(e, idx, 2)}
                                onClick={() => handleCellClick(idx, 2)}
                                className={getCellClassName(idx, 2, "p-1.5 border-r border-slate-200 text-center vertical-align-top print:border-slate-300 cursor-text w-[75px]")}
                              >
                                <input
                                  type="text"
                                  data-row={idx}
                                  data-col={2}
                                  placeholder="Pcs"
                                  value={row.unit}
                                  onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                                  className="w-full bg-transparent border-none focus:outline-hidden text-center font-medium text-slate-700 placeholder:text-slate-200 p-0.5"
                                />
                              </td>
                            );
                          })()}

                          {/* Column 3: Commercial Rates unit pricing parameters figures */}
                          {(() => {
                            const { region, isAnchor } = getMergeInfo(idx, 3);
                            if (region && !isAnchor) return null;
                            return (
                              <td
                                rowSpan={region ? (region.endRow - region.startRow + 1) : undefined}
                                colSpan={region ? (region.endCol - region.startCol + 1) : undefined}
                                onMouseDown={(e) => handleCellMouseDown(e, idx, 3)}
                                onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                                onMouseUp={(e) => handleCellMouseUp(e, idx, 3)}
                                onContextMenu={(e) => handleCellContextMenu(e, idx, 3)}
                                onClick={() => handleCellClick(idx, 3)}
                                className={getCellClassName(idx, 3, "p-1.5 border-r border-slate-200 text-right vertical-align-top print:border-slate-300 cursor-text w-[110px]")}
                              >
                                <input
                                  type="text"
                                  data-row={idx}
                                  data-col={3}
                                  placeholder="0.00"
                                  value={row.price}
                                  onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                                  className="w-full bg-transparent border-none focus:outline-hidden text-right font-bold text-slate-800 placeholder:text-slate-200 p-0.5"
                                />
                              </td>
                            );
                          })()}

                          {/* Column 4: Derived Row Financial Amount math parameter block metrics values numbers */}
                          {(() => {
                            const { region, isAnchor } = getMergeInfo(idx, 4);
                            if (region && !isAnchor) return null;
                            return (
                              <td
                                rowSpan={region ? (region.endRow - region.startRow + 1) : undefined}
                                colSpan={region ? (region.endCol - region.startCol + 1) : undefined}
                                onMouseDown={(e) => handleCellMouseDown(e, idx, 4)}
                                onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                                onMouseUp={(e) => handleCellMouseUp(e, idx, 4)}
                                onContextMenu={(e) => handleCellContextMenu(e, idx, 4)}
                                className={getCellClassName(idx, 4, "p-2 text-right font-black text-slate-900 select-none w-[130px] tabular-nums")}
                              >
                                {row.amount > 0 ? row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                              </td>
                            );
                          })()}
                        </tr>
                      );
                    })}

                    {/* Quotation Base Aggregate Grand Summary Rows blocks calculation layout panel */}
                    <tr className="bg-slate-50/50 print:bg-transparent font-bold">
                      <td colSpan={5} className="p-2.5 text-right border-r border-slate-200 print:border-slate-300 uppercase tracking-wider text-[11px] text-slate-500">Subtotal Amount:</td>
                      <td className="p-2.5 text-right font-black text-slate-900 tabular-nums text-sm">
                        {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {docType === "invoice" && (
                      <>
                        <tr className="bg-transparent font-medium">
                          <td colSpan={5} className="p-2 text-right border-r border-slate-200 print:border-slate-300 text-slate-500 text-[11px]">
                            Government Value Added Tax (VAT) +{vatPercent}%:
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800 tabular-nums">
                            {((grandTotal * vatPercent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-transparent font-medium">
                          <td colSpan={5} className="p-2 text-right border-r border-slate-200 print:border-slate-300 text-slate-500 text-[11px]">
                            Logistics / Courier Transportation Carrier Fees:
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800 tabular-nums">
                            {transportation > 0 ? transportation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                          </td>
                        </tr>
                      </>
                    )}

                    <tr className="bg-slate-100 print:bg-slate-100 font-black border-t-2 border-slate-800 text-sm">
                      <td colSpan={5} className="p-3 text-right border-r border-slate-200 print:border-slate-300 uppercase tracking-wide text-xs text-slate-700">
                        {docType === "quotation" ? "Estimated Total:" : "Net Payable Grand Total:"}
                      </td>
                      <td className="p-3 text-right text-emerald-950 font-black tabular-nums text-base">
                        Tk {calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Number Currency in Words Converter Display Layout blocks elements */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed print:bg-transparent print:border-none print:p-0">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Financial Amount in Words</span>
                <span className="font-black text-slate-900 text-xs italic tracking-tight">
                  {numberToWords(calculatedGrandTotal)}
                </span>
              </div>

              {/* Legal Terms & Conditions Disclaimer footer guidelines notes block elements */}
              <div className="mt-8 grid grid-cols-1 gap-1.5 text-[10px] text-slate-500 leading-relaxed border-t border-slate-100 pt-4 print:mt-12">
                <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-0.5">Commercial Framework Protocols</div>
                <div>1. <span className="font-semibold text-slate-700">Price Validity:</span> Rates submitted on active quotations remain completely fixed for exactly 30 calendar days from issue timestamp.</div>
                <div>2. <span className="font-semibold text-slate-700">Delivery Timelines:</span> Procurement logistics schedules commence within 03 working days following official clean duplicate client P.O. confirmation receipt.</div>
                <div>3. <span className="font-semibold text-slate-700">Financial Settlements:</span> Standard payment terms mandate full check clearing order or credit account clearance upon invoice delivery cycle completions.</div>
              </div>

              {/* Authoritative Corporate Signature Blocks Layout guidelines panels elements */}
              <div className="mt-16 flex items-end justify-between text-center text-xs print:mt-24 select-none">
                <div className="w-[180px]">
                  <div className="border-b border-slate-400 pb-1 mx-auto w-full"></div>
                  <div className="pt-1.5 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Client Authorized Signatory</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Seal & Verification Date</div>
                </div>

                <div className="w-[180px]">
                  <div className="border-b-2 border-slate-800 pb-1 mx-auto w-full font-serif font-bold text-sm tracking-wide text-slate-800 italic">For Comilla Traders</div>
                  <div className="pt-1.5 font-black text-slate-900 uppercase tracking-wider text-[9px]">Proprietor / Executive Manager</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Corporate Operations Desk</div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Global Right Click Spreadsheet Context Menu Panel Layer portals popups */}
      {contextMenu?.visible && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-white border border-slate-200/90 rounded-lg shadow-xl py-1 w-[240px] text-slate-700 z-50 text-xs border-slate-300 animate-in fade-in zoom-in-95 duration-100 font-sans"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <div className="px-3.5 py-1.5 font-bold uppercase text-[9px] tracking-wider text-slate-400 bg-slate-50/80 border-b border-slate-100 mb-1">
            Row Cell Index Location Grid Options
          </div>
          
          {/* Section: Dynamic Cell Merging features triggers buttons */}
          <button 
            onClick={() => {
              toggleMergeSelectedRangeV2();
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center justify-between group font-bold text-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <Heading className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600" />
              <span>Merge / Unmerge Blocks</span>
            </div>
          </button>

          <div className="my-1 border-t border-slate-100"></div>

          {/* Section: Row Additions operations layout presets features buttons */}
          <button 
            onClick={() => {
              insertRow(contextMenu.rowIndex, 'above');
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>Insert Row Above</span>
          </button>
          <button 
            onClick={() => {
              insertRow(contextMenu.rowIndex, 'below');
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            <span>Insert Row Below</span>
          </button>

          <div className="my-1 border-t border-slate-100"></div>

          {/* Section: Reordering sequences rows items position matrices indices maps values panels controls items */}
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
            className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center gap-2.5 font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Entire Row</span>
          </button>
        </div>
      )}
    </div>
  );
}

```