import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Download, Printer, Calendar, Save, Trash2, Plus, History, Check, RefreshCw, FileText, Copy, FilePlus } from "lucide-react";
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
          rows: docRows
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
      rows: sanitizedRows
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
          id: r.id,
          sl: r.sl,
          desc: r.desc,
          qty: r.qty,
          unit: r.unit,
          price: r.price,
          amount: r.amount
        })),
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
        rows: sanitizedRows
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

  // Excel style pasting: parses tabs as columns and newlines as rows
  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    startRowIndex: number,
    startColIndex: number
  ) => {
    const clipboardData = e.clipboardData.getData("text");
    if (!clipboardData) return;

    // Excel copies data as tab-separated values (TSV) for columns and newline for rows
    if (clipboardData.includes("\t") || clipboardData.includes("\n")) {
      e.preventDefault();
      
      const rowsData = clipboardData
        .split(/\r?\n/)
        .map(row => row.split("\t"));

      // If the last row is empty (common when copying from Excel), remove it
      if (rowsData.length > 1 && rowsData[rowsData.length - 1].length === 1 && rowsData[rowsData.length - 1][0] === "") {
        rowsData.pop();
      }

      setRows((prevRows) => {
        const updated = [...prevRows];
        
        // Loop through each copied row
        rowsData.forEach((cols, rOffset) => {
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
            const cleanedVal = cellValue.trim().replace(/^"([\s\S]*)"$/, "$1");
            
            // Map column index to field:
            // 0: desc, 1: qty, 2: unit, 3: price
            if (cIndex === 0) {
              targetRow.desc = cleanedVal;
            } else if (cIndex === 1) {
              targetRow.qty = cleanedVal;
            } else if (cIndex === 2) {
              targetRow.unit = cleanedVal;
            } else if (cIndex === 3) {
              targetRow.price = cleanedVal;
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

    if (saveMethod === "custom" && "showSaveFilePicker" in window) {
      try {
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
      XLSX.writeFile(wb, finalName);
      setIsSaveModalOpen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="quotation-container relative min-h-screen flex flex-col items-center bg-[#f1f5f9] py-5 overflow-x-auto text-[#000] font-sans antialiased">
      {/* Screen Toolbar */}
      <div className="top-toolbar no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] mb-4 flex flex-col md:flex-row justify-between items-center gap-3 px-4 sm:px-0 z-10">
        {/* Left Side: Mode Selector & Auto-Save Control */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-300 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => setDocType("quotation")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                docType === "quotation"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Quotation Mode
            </button>
            <button
              type="button"
              onClick={() => setDocType("invoice")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                docType === "invoice"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Convert to Invoice
            </button>
          </div>

          {/* Auto-Save Toggle Switch */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs shrink-0">
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
              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Auto-Save</span>
            </label>
            {lastSavedTime && (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1.5 transition-all">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Saved {lastSavedTime}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={startNewDoc} 
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-[11px] py-1.5 px-3 sm:px-4 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            title="Start a fresh blank sheet"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span>NEW SHEET</span>
          </button>
          
          {currentDocId && (
            <>
              <button 
                onClick={duplicateCurrentDoc} 
                className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] py-1.5 px-3 sm:px-4 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                title="Save a duplicated copy of this sheet online under a new name"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>DUPLICATE</span>
              </button>
              <button 
                onClick={() => deleteSavedDoc(currentDocId)} 
                className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 font-bold text-[11px] py-1.5 px-3 sm:px-4 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                title="Delete this sheet from the online database"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>DELETE</span>
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
            } text-white font-bold text-[11px] py-1.5 px-3 sm:px-4 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-85`}
            title="Save this sheet directly to the online Cloud database"
          >
            {saveStatus === "saving" ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>SAVED ONLINE!</span>
              </>
            ) : saveStatus === "error" ? (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>SAVE FAILED</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>SAVE ONLINE</span>
              </>
            )}
          </button>
          <button 
            onClick={handleSaveClick} 
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] py-1.5 px-3 sm:px-4 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>SAVE EXCEL</span>
          </button>
          <button 
            onClick={handlePrint} 
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] py-1.5 px-3 sm:px-4 rounded-md shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>PRINT / PDF</span>
          </button>
        </div>
      </div>

      {/* Editing State Banner */}
      {currentDocId && (
        <div className="no-print print:hidden w-full max-w-[210mm] sm:w-[210mm] mb-3 px-4 sm:px-0 z-10 animate-in fade-in slide-in-from-top-2 duration-250">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 sm:p-4 flex items-center justify-between text-xs text-indigo-950 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="bg-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-wider shrink-0 shadow-xs">
                EDITING MODE
              </span>
              <span className="font-bold text-slate-800 truncate" title={savedDocs.find(d => d.id === currentDocId)?.name || "Active Sheet"}>
                {savedDocs.find(d => d.id === currentDocId)?.name || "Active Sheet"}
              </span>
            </div>
            <button
              type="button"
              onClick={resetSheetFields}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 px-2.5 py-1.5 rounded transition-all cursor-pointer uppercase tracking-wider shrink-0"
            >
              Start New / Close
            </button>
          </div>
        </div>
      )}

      {/* Standard A4 Printable Sheet */}
      <div className="sheet relative w-full max-w-[210mm] sm:w-[210mm] print:w-[210mm] min-h-[297mm] bg-white p-4 sm:p-[12mm] print:p-[12mm] shadow-lg box-border z-10 mx-auto">
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
                        className="w-full border-b border-dotted border-slate-400 focus:border-black font-bold text-[9.5pt] outline-none bg-transparent py-0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[7.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-0.5">Address:</label>
                      <textarea 
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border-b border-dotted border-slate-400 focus:border-black text-[9pt] outline-none bg-transparent resize-none leading-tight py-0.5"
                      />
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
              <th className="w-[54%] border border-black py-1 text-left px-2 font-bold">Description</th>
              <th className="w-[8%] border border-black py-1 text-center font-bold">Qty</th>
              <th className="w-[12%] border border-black py-1 text-center font-bold">Unit</th>
              <th className="w-[10%] border border-black py-1 text-center font-bold">Price</th>
              <th className="w-[12%] border border-black py-1 text-center font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.sl} className="group hover:bg-slate-50/50">
                <td className="border border-black text-center font-mono text-[8.5pt] align-top py-1">
                  {idx + 1}
                </td>
                <td className="border border-black text-left px-1.5 text-[8.5pt] align-top py-1 break-all whitespace-normal">
                  <textarea
                    value={row.desc}
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
                    className="w-full text-left border-none outline-none bg-transparent px-0 text-slate-800 text-[8.5pt] leading-tight block overflow-hidden py-0.5 whitespace-pre-wrap break-all"
                  />
                </td>
                <td className="border border-black text-center font-mono text-[9pt] align-top py-1">
                  <textarea
                    value={row.qty}
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
                    className={`w-full text-center border-none outline-none bg-transparent px-0 font-mono text-slate-800 align-top overflow-hidden py-0.5 whitespace-pre-wrap break-all ${
                      row.qty.length > 6 ? "text-[7.5pt]" : "text-[9pt]"
                    }`}
                  />
                </td>
                <td className="border border-black text-center text-[9pt] align-top py-1">
                  <textarea
                    value={row.unit}
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
                    className={`w-full text-center border-none outline-none bg-transparent px-0 text-slate-800 align-top overflow-hidden py-0.5 whitespace-pre-wrap break-all ${
                      row.unit.length > 6 ? "text-[7.5pt]" : "text-[9pt]"
                    }`}
                  />
                </td>
                <td className="border border-black text-center font-mono text-[9pt] align-top py-1">
                  <textarea
                    value={row.price}
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
                    className={`w-full text-center border-none outline-none bg-transparent px-0 font-mono text-slate-800 align-top overflow-hidden py-0.5 whitespace-pre-wrap break-all ${
                      row.price.length > 8 ? "text-[7.5pt]" : "text-[9pt]"
                    }`}
                  />
                </td>
                <td className="border border-black text-right pr-2 font-mono text-[9pt] font-semibold text-slate-800 align-top py-1">
                  <div className={`whitespace-normal break-all leading-tight ${
                    row.amount > 0 && row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }).length > 12
                      ? "text-[7.5pt]"
                      : "text-[9pt]"
                  }`}>
                    {row.amount > 0 ? row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Row Addition Control Bar (Screen only) */}
        <div className="row-ctrl no-print print:hidden w-full mt-3.5 mb-5 flex gap-2">
          <button 
            onClick={addRow} 
            className="bg-[#1e3a8a] text-white hover:bg-[#152e72] font-mono font-bold text-xs py-1.5 px-4 rounded transition-colors cursor-pointer"
          >
            + Add Line
          </button>
          <button 
            onClick={removeRow} 
            className="bg-slate-600 text-white hover:bg-slate-700 font-mono font-bold text-xs py-1.5 px-4 rounded transition-colors cursor-pointer"
          >
            - Remove Line
          </button>
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

    </div>
  );
}
