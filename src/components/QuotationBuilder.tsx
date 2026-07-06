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
      // Lakhs (1,00,000)
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
    } else if (key === "ArrowLeft" && selectionStart === 0 && selectionEnd === 0) {
      targetCol = colIndex - 1;
    } else if (key === "ArrowRight" && selectionStart === valueLength && selectionEnd === valueLength) {
      targetCol = colIndex + 1;
    } else if (key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      targetRow = rowIndex + 1;
    } else {
      return;
    }

    if (targetRow >= 0 && targetRow < rows.length && targetCol >= 0 && targetCol <= 3) {
      e.preventDefault();
      handleCellClick(targetRow, targetCol);
    }
  };

  const exportToExcel = () => {
    const data = rows.map((r) => ({
      SL: r.sl,
      Description: r.desc,
      Quantity: r.qty,
      Unit: r.unit,
      Price: r.price,
      Amount: r.amount,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, docType === "quotation" ? "Quotation" : "Invoice");
    XLSX.writeFile(workbook, `${docType}_export_${dateVal.replace(/\//g, "-")}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 print:bg-white print:text-black print:p-0">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:space-y-0">
        {/* Navigation & Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">Comilla Traders Engine</h1>
            {saveStatus === "saving" && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded animate-pulse">Auto-saving...</span>}
            {saveStatus === "saved" && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Saved online</span>}
            {saveStatus === "error" && <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">Backup locally</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={startNewDoc} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <FilePlus className="h-4 w-4" /> New Sheet
            </button>
            <button onClick={() => saveCurrentDocToApp()} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm">
              <Save className="h-4 w-4" /> Manual Save
            </button>
            <button onClick={duplicateCurrentDoc} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button onClick={exportToExcel} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm">
              <Download className="h-4 w-4" /> Export Excel
            </button>
            <button onClick={handleDownloadPDF} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm">
              <FileText className="h-4 w-4" /> Download PDF
            </button>
            <button onClick={handlePrint} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <Printer className="h-4 w-4" /> Print Setup
            </button>
          </div>
        </div>

        {/* Live Main Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print:block">
          {/* Main Editing Sheet Canvas Workspace */}
          <div className="lg:col-span-3 bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 min-h-[1056px] relative flex flex-col justify-between">
            {/* Main content body */}
            <div>
              {/* Sheet Header Layout */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Comilla Traders</h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Dealers in: All kinds of Electric Motors, Water Pumps & Hardware goods.</p>
                  <p className="text-xs text-slate-500">123 Nawabpur Road, Dhaka-1100, Bangladesh</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="relative group mb-1 print:hidden">
                    <select 
                      value={docType} 
                      onChange={(e) => setDocType(e.target.value as any)} 
                      className="appearance-none font-black text-2xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 pr-8 pl-3 py-1 rounded-lg border border-emerald-200 uppercase tracking-wide cursor-pointer focus:outline-hidden transition"
                    >
                      <option value="quotation">Quotation</option>
                      <option value="invoice">Bill / Invoice</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-700 pointer-events-none group-hover:scale-110 transition" />
                  </div>
                  <h3 className="hidden print:block font-black text-2xl text-slate-900 uppercase tracking-wide mb-1">
                    {docType === "quotation" ? "Quotation" : "Bill / Invoice"}
                  </h3>
                  <div className="flex items-center gap-1 text-sm font-bold text-slate-700 relative group cursor-pointer" onClick={triggerDatePicker}>
                    <Calendar className="h-4 w-4 text-slate-500 group-hover:text-emerald-600 transition print:hidden" />
                    <span>Date:</span>
                    <span className="border-b border-dashed border-slate-400 group-hover:border-emerald-600 px-1 font-black text-slate-900 transition">{dateVal}</span>
                    <input 
                      ref={dateRef}
                      type="date" 
                      onChange={handleDatePickerChange}
                      className="absolute opacity-0 pointer-events-none w-0 h-0" 
                    />
                  </div>
                </div>
              </div>

              {/* Meta Fields Grid Section */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 min-w-[70px]">Messes:</span>
                    <input 
                      type="text" 
                      value={messers} 
                      onChange={(e) => setMessers(e.target.value)}
                      placeholder="Customer/Business Name" 
                      className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-400 rounded px-2 py-1 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-hidden transition print:bg-transparent print:border-none print:p-0 print:font-bold"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-700 min-w-[70px] pt-1">Address:</span>
                    <textarea 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Delivery or Billing Address" 
                      rows={2}
                      className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-400 rounded px-2 py-1 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-hidden resize-none transition print:bg-transparent print:border-none print:p-0"
                    />
                  </div>
                </div>
                <div className="space-y-2 border-l border-slate-200 pl-4 print:border-none print:pl-0">
                  {docType === "invoice" ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">Invoice No:</span>
                      <input 
                        type="text" 
                        value={invoiceNo} 
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        placeholder="CT-2026-XXXX" 
                        className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-bold print:bg-transparent print:border-none print:p-0"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">Challan No:</span>
                      <input 
                        type="text" 
                        value={challanNo} 
                        onChange={(e) => setChallanNo(e.target.value)}
                        placeholder="Optional Challan Reference" 
                        className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-medium print:bg-transparent print:border-none print:p-0"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 min-w-[110px]">Requisition No:</span>
                    <input 
                      type="text" 
                      value={requisitionNo} 
                      onChange={(e) => setRequisitionNo(e.target.value)}
                      placeholder="Req reference number" 
                      className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-medium print:bg-transparent print:border-none print:p-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 min-w-[110px]">P.O. Number:</span>
                    <input 
                      type="text" 
                      value={poNumber} 
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Purchase Order Link" 
                      className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-medium print:bg-transparent print:border-none print:p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Excel-Style Structured Table Grid */}
              <div className="border border-slate-300 rounded-lg overflow-hidden shadow-xs relative print:border-slate-400">
                <table className="w-full text-left border-collapse table-fixed select-none">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-wider border-b border-slate-300 print:bg-slate-200 print:text-black">
                      <th className="w-[6%] text-center border-r border-slate-300 py-2.5 print:border-slate-400">S.L.</th>
                      <th className="w-[50%] px-3 border-r border-slate-300 py-2.5 print:border-slate-400">Description of Goods</th>
                      <th className="w-[10%] text-center border-r border-slate-300 py-2.5 print:border-slate-400">Qty</th>
                      <th className="w-[10%] text-center border-r border-slate-300 py-2.5 print:border-slate-400">Unit</th>
                      <th className="w-[11%] text-right px-3 border-r border-slate-300 py-2.5 print:border-slate-400">Price (৳)</th>
                      <th className="w-[13%] text-right px-3 py-2.5">Amount (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      // Column 0: Description
                      const descMerge = getMergeInfo(idx, 0);
                      // Column 1: Qty
                      const qtyMerge = getMergeInfo(idx, 1);
                      // Column 2: Unit
                      const unitMerge = getMergeInfo(idx, 2);
                      // Column 3: Price
                      const priceMerge = getMergeInfo(idx, 3);

                      return (
                        <tr key={row.sl} className="border-b border-slate-200 hover:bg-slate-50/50 group/row print:border-slate-300 print:hover:bg-transparent">
                          {/* SL Column */}
                          <td 
                            className="text-center font-bold text-xs text-slate-500 bg-slate-50/50 border-r border-slate-200 py-0.5 print:bg-transparent print:border-r-slate-300"
                          >
                            {row.sl}
                          </td>

                          {/* Description Input Cell */}
                          {(!descMerge.region || descMerge.isAnchor) && (
                            <td 
                              colSpan={descMerge.isAnchor ? (descMerge.region!.endCol - descMerge.region!.startCol + 1) : 1}
                              rowSpan={descMerge.isAnchor ? (descMerge.region!.endRow - descMerge.region!.startRow + 1) : 1}
                              onMouseDown={(e) => handleCellMouseDown(e, idx, 0)}
                              onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                              onMouseUp={(e) => handleCellMouseUp(e, idx, 0)}
                              onContextMenu={(e) => handleCellContextMenu(e, idx, 0)}
                              onClick={() => handleCellClick(idx, 0)}
                              className={getCellClassName(idx, 0, "p-0 border-r border-slate-200 align-top transition-colors duration-150 print:border-r-slate-300")}
                            >
                              <textarea
                                data-row={idx}
                                data-col={0}
                                value={row.desc}
                                onChange={(e) => handleRowChange(idx, "desc", e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                                rows={1}
                                className="w-full bg-transparent resize-none px-3 py-1.5 text-sm font-medium text-slate-900 focus:outline-hidden block leading-relaxed placeholder:text-slate-300 print:placeholder:text-transparent print:py-1"
                                placeholder="..."
                              />
                            </td>
                          )}

                          {/* Quantity Input Cell */}
                          {(!qtyMerge.region || qtyMerge.isAnchor) && (
                            <td 
                              colSpan={qtyMerge.isAnchor ? (qtyMerge.region!.endCol - qtyMerge.region!.startCol + 1) : 1}
                              rowSpan={qtyMerge.isAnchor ? (qtyMerge.region!.endRow - qtyMerge.region!.startRow + 1) : 1}
                              onMouseDown={(e) => handleCellMouseDown(e, idx, 1)}
                              onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                              onMouseUp={(e) => handleCellMouseUp(e, idx, 1)}
                              onContextMenu={(e) => handleCellContextMenu(e, idx, 1)}
                              onClick={() => handleCellClick(idx, 1)}
                              className={getCellClassName(idx, 1, "p-0 border-r border-slate-200 align-top transition-colors duration-150 text-center print:border-r-slate-300")}
                            >
                              <input
                                type="text"
                                data-row={idx}
                                data-col={1}
                                value={row.qty}
                                onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                                className="w-full bg-transparent text-center px-1 py-1.5 text-sm font-bold text-slate-900 focus:outline-hidden block print:py-1"
                                placeholder="0"
                              />
                            </td>
                          )}

                          {/* Unit Input Cell */}
                          {(!unitMerge.region || unitMerge.isAnchor) && (
                            <td 
                              colSpan={unitMerge.isAnchor ? (unitMerge.region!.endCol - unitMerge.region!.startCol + 1) : 1}
                              rowSpan={unitMerge.isAnchor ? (unitMerge.region!.endRow - unitMerge.region!.startRow + 1) : 1}
                              onMouseDown={(e) => handleCellMouseDown(e, idx, 2)}
                              onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                              onMouseUp={(e) => handleCellMouseUp(e, idx, 2)}
                              onContextMenu={(e) => handleCellContextMenu(e, idx, 2)}
                              onClick={() => handleCellClick(idx, 2)}
                              className={getCellClassName(idx, 2, "p-0 border-r border-slate-200 align-top transition-colors duration-150 text-center print:border-r-slate-300")}
                            >
                              <input
                                type="text"
                                data-row={idx}
                                data-col={2}
                                value={row.unit}
                                onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                                className="w-full bg-transparent text-center px-1 py-1.5 text-sm font-medium text-slate-600 focus:outline-hidden block print:py-1"
                                placeholder="pcs"
                              />
                            </td>
                          )}

                          {/* Price Input Cell */}
                          {(!priceMerge.region || priceMerge.isAnchor) && (
                            <td 
                              colSpan={priceMerge.isAnchor ? (priceMerge.region!.endCol - priceMerge.region!.startCol + 1) : 1}
                              rowSpan={priceMerge.isAnchor ? (priceMerge.region!.endRow - priceMerge.region!.startRow + 1) : 1}
                              onMouseDown={(e) => handleCellMouseDown(e, idx, 3)}
                              onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                              onMouseUp={(e) => handleCellMouseUp(e, idx, 3)}
                              onContextMenu={(e) => handleCellContextMenu(e, idx, 3)}
                              onClick={() => handleCellClick(idx, 3)}
                              className={getCellClassName(idx, 3, "p-0 border-r border-slate-200 align-top transition-colors duration-150 text-right print:border-r-slate-300")}
                            >
                              <input
                                type="text"
                                data-row={idx}
                                data-col={3}
                                value={row.price}
                                onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                                className="w-full bg-transparent text-right px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-hidden block print:py-1"
                                placeholder="0.00"
                              />
                            </td>
                          )}

                          {/* Calculated Amount Cell */}
                          <td className="text-right px-3 py-1.5 text-sm font-black text-slate-900 bg-slate-50/20 align-top tracking-wide print:bg-transparent print:py-1">
                            {row.amount > 0 ? row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Append Tool Buttons Row */}
              <div className="flex justify-between items-center mt-3 print:hidden">
                <div className="flex gap-1.5">
                  <button onClick={addRow} className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md flex items-center gap-1.5 transition">
                    <Plus className="h-3.5 w-3.5 text-slate-500" /> Add Row
                  </button>
                  <button onClick={removeRow} className="px-2.5 py-1 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-300 text-rose-600 rounded-md flex items-center gap-1.5 transition">
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" /> Pop Row
                  </button>
                </div>
                {hasRangeSelection() && (
                  <button 
                    onClick={toggleMergeSelectedRangeV2}
                    className="px-3 py-1 text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md flex items-center gap-1.5 animate-fade-in shadow-xs"
                  >
                    <Heading className="h-3.5 w-3.5" />
                    Merge / Break Selected Range Cells
                  </button>
                )}
              </div>
            </div>

            {/* Calculations Breakdown and Totals Bottom Section */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start print:grid-cols-3">
                <div className="md:col-span-2 space-y-3 print:col-span-2">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount in Words:</div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 text-sm font-black text-slate-800 leading-relaxed capitalize print:bg-transparent print:border-none print:p-0 print:text-black">
                    {numberToWords(calculatedGrandTotal)}
                  </div>
                  
                  {/* Notes / Terms Condition Block */}
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-slate-500">Terms & Conditions:</div>
                    <p className="text-[11px] text-slate-500 leading-normal print:text-slate-600">
                      1. Warranty covers manufacturing defects only. 2. Goods once sold cannot be returned or exchanged. 
                      3. Prices quoted are valid for 7 business days from date of issue.
                    </p>
                  </div>
                </div>

                {/* Mathematical Sums Breakdown Column block */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-sm print:bg-transparent print:border-none print:p-0">
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900 tracking-wide">৳{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  
                  {docType === "invoice" && (
                    <>
                      <div className="flex justify-between items-center text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 print:hidden">
                          <span>VAT:</span>
                          <input 
                            type="number" 
                            value={vatPercent} 
                            onChange={(e) => setVatPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-12 bg-white border border-slate-300 rounded text-center font-bold text-xs py-0.5"
                          />
                          <span>%</span>
                        </div>
                        <span className="hidden print:inline">VAT ({vatPercent}%):</span>
                        <span className="font-bold text-slate-900">৳{((grandTotal * vatPercent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 print:hidden">
                          <span>Carriage:</span>
                          <input 
                            type="number" 
                            value={transportation} 
                            onChange={(e) => setTransportation(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-20 bg-white border border-slate-300 rounded text-right font-bold text-xs py-0.5 px-1.5"
                          />
                        </div>
                        <span className="hidden print:inline">Carriage / Transport:</span>
                        <span className="font-bold text-slate-900">৳{transportation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  <div className="border-t border-slate-300/80 my-1"></div>
                  <div className="flex justify-between items-center text-slate-900">
                    <span className="font-black text-xs uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded print:bg-transparent print:p-0 print:text-black">Grand Total:</span>
                    <span className="font-black text-base text-emerald-700 tracking-wide print:text-black">৳{calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Authorized Corporate Footer Signoff Signatures Row */}
              <div className="flex justify-between items-end mt-16 text-xs font-bold text-slate-700 px-2">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1.5"></div>
                  <p className="text-slate-500">Customer's Signature</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-10 print:text-slate-500">For Comilla Traders</p>
                  <div className="w-40 border-b border-slate-900 mb-1.5"></div>
                  <p className="text-slate-900 font-black">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Document Repository Panel Log list */}
          <div className="space-y-4 print:hidden">
            {/* Auto Save Toggle Configuration Panel Card */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-slate-200">Real-time Auto-Save</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoSaveEnabled}
                    onChange={(e) => {
                      setAutoSaveEnabled(e.target.checked);
                      localStorage.setItem("comilla_autosave_enabled", String(e.target.checked));
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              {lastSavedTime && (
                <div className="text-[11px] text-slate-400 mt-2 text-right font-medium">
                  Last synced: <span className="text-slate-200 font-bold">{lastSavedTime}</span>
                </div>
              )}
            </div>

            {/* Cloud Document Vault Database List Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-700/50 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-sm font-black tracking-wide text-slate-200 uppercase flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-400" /> Cloud Database
                </h3>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-600 text-slate-300">{savedDocs.length} sheets</span>
              </div>
              <div className="divide-y divide-slate-700 max-h-[640px] overflow-y-auto custom-scrollbar">
                {savedDocs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-medium">No saved documents found in online storage.</div>
                ) : (
                  savedDocs.map((docItem) => (
                    <div 
                      key={docItem.id}
                      onClick={() => loadSavedDoc(docItem)}
                      className={`p-3.5 text-left cursor-pointer transition flex items-start justify-between gap-2 group ${currentDocId === docItem.id ? "bg-emerald-950/40 border-l-4 border-emerald-500" : "hover:bg-slate-700/50"}`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${currentDocId === docItem.id ? "text-emerald-400" : "text-slate-200 group-hover:text-white"}`}>{docItem.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <span className={`uppercase font-black px-1 rounded-sm text-[9px] ${docItem.docType === "invoice" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>{docItem.docType}</span>
                          <span>•</span>
                          <span>{new Date(docItem.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition gap-0.5">
                        <button 
                          onClick={(e) => renameSavedDoc(docItem.id, e)} 
                          title="Rename document"
                          className="p-1 hover:bg-slate-600 text-slate-400 hover:text-white rounded transition"
                        >
                          <Heading className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={(e) => deleteSavedDoc(docItem.id, e)} 
                          title="Delete document permanent"
                          className="p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Interactive Context Menu Popover Portal */}
      {contextMenu?.visible && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 py-1.5 w-[240px] z-50 text-xs animate-scale-up-context"
        >
          <div className="px-3.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-1 flex justify-between items-center">
            <span>Cell Actions (R{contextMenu.rowIndex + 1})</span>
            {hasRangeSelection() && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Multi</span>}
          </div>

          {/* Section: Merge Toggles */}
          <button 
            onClick={() => {
              toggleMergeSelectedRangeV2();
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 font-bold text-slate-700"
          >
            <Heading className="h-3.5 w-3.5 text-slate-500" />
            <span>Merge / Unmerge Selection</span>
          </button>
          
          <div className="my-1 border-t border-slate-100"></div>

          {/* Section: Row Manipulation shifts */}
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
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>Insert Row Below</span>
          </button>

          <div className="my-1 border-t border-slate-100"></div>

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
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Delete Entire Row</span>
          </button>
        </div>
      )}
    </div>
  );
}
