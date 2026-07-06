import React, { useState, useEffect, useRef } from "react";
import { Search, PlusCircle, Trash2, Plus, Minus, Send, CheckCircle, AlertCircle, RefreshCw, Sparkles, FolderPlus, ShoppingCart } from "lucide-react";
import { InventoryItem, AddCartItem, NewItemRow, IssueCartItem } from "../types";
import { cleanDescription, formatStorePrefix, StoreType, STORES } from "../utils/storeClassifier";

interface HostTerminalProps {
  inventory: InventoryItem[];
  filteredInventory?: InventoryItem[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onSubmitAddUnits: (payload: any[]) => Promise<{ success: boolean; error?: string }>;
  onSubmitNewItems: (payload: any[]) => Promise<{ success: boolean; error?: string }>;
  onSubmitIssue: (payload: any[]) => Promise<{ success: boolean; error?: string }>;
  activeStore?: string;
  lowStockThreshold?: number;
}

export default function HostTerminal({
  inventory,
  filteredInventory,
  isLoading,
  onRefresh,
  onSubmitAddUnits,
  onSubmitNewItems,
  onSubmitIssue,
  activeStore,
  lowStockThreshold = 5,
}: HostTerminalProps) {
  // Sub-tabs inside Host Terminal: "restock", "register", or "issue"
  const [hostTab, setHostTab] = useState<"restock" | "register" | "issue">("restock");

  // RESTOCK (Add Units) State
  const [restockSearch, setRestockSearch] = useState("");
  const [showRestockDropdown, setShowRestockDropdown] = useState(false);
  const [restockCart, setRestockCart] = useState<AddCartItem[]>([]);
  const [restockAddedBy, setRestockAddedBy] = useState("");
  const [restockDept, setRestockDept] = useState("");
  const [restockRemarks, setRestockRemarks] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockMessage, setRestockMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // REGISTER (New Items) State
  const [newRows, setNewRows] = useState<NewItemRow[]>([{ id: 1, code: "", description: "", qty: 0, unitCostBDT: 0 }]);
  const [rowCounter, setRowCounter] = useState(2);
  const [registerAddedBy, setRegisterAddedBy] = useState("");
  const [registerDept, setRegisterDept] = useState("");
  const [registerRemarks, setRegisterRemarks] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Bulk Import Register States
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // ISSUANCE (Issue Units) State
  const [issueSearch, setIssueSearch] = useState("");
  const [showIssueDropdown, setShowIssueDropdown] = useState(false);
  const [issueCart, setIssueCart] = useState<IssueCartItem[]>([]);
  const [issueDoneBy, setIssueDoneBy] = useState("");
  const [issueDept, setIssueDept] = useState("");
  const [issueRemarks, setIssueRemarks] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueMessage, setIssueMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const restockDropdownRef = useRef<HTMLDivElement>(null);
  const issueDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (restockDropdownRef.current && !restockDropdownRef.current.contains(event.target as Node)) {
        setShowRestockDropdown(false);
      }
      if (issueDropdownRef.current && !issueDropdownRef.current.contains(event.target as Node)) {
        setShowIssueDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Restock Handlers ---
  const handleRestockSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestockSearch(e.target.value);
    setShowRestockDropdown(true);
  };

  const filteredRestockItems = restockSearch.trim()
    ? (filteredInventory || inventory)
        .filter(
          (item) =>
            item.chutuoCode.toLowerCase().includes(restockSearch.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(restockSearch.toLowerCase()))
        )
        .slice(0, 15)
    : [];

  const handleAddToRestockCart = (item: InventoryItem) => {
    const existing = restockCart.find((c) => c.chutuoCode === item.chutuoCode);
    if (existing) {
      setRestockCart(
        restockCart.map((c) =>
          c.chutuoCode === item.chutuoCode ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setRestockCart([
        ...restockCart,
        {
          chutuoCode: item.chutuoCode,
          description: item.description,
          quantity: 1,
          unitCostBDT: item.unitCostBDT,
          currentStock: item.quantity,
          inventoryNo: item.inventoryNo,
        } as any,
      ]);
    }
    setRestockSearch("");
    setShowRestockDropdown(false);
  };

  const handleUpdateRestockQty = (idx: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setRestockCart(
      restockCart.map((c, i) => (i === idx ? { ...c, quantity: validQty } : c) as any)
    );
  };

  const handleRemoveRestockItem = (idx: number) => {
    setRestockCart(restockCart.filter((_, i) => i !== idx));
  };

  const handleClearRestockCart = () => {
    setRestockCart([]);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restockCart.length === 0) {
      setRestockMessage({ text: "Restock list is empty! Search and add items to increase stock.", type: "error" });
      return;
    }

    setRestockLoading(true);
    setRestockMessage(null);

    const payload = restockCart.map((item) => ({
      chutuoCode: item.chutuoCode,
      qtyToAdd: (item as any).quantity || 1,
      doneBy: restockAddedBy.trim(),
      department: restockDept.trim(),
      remarks: restockRemarks.trim(),
      inventoryNo: item.inventoryNo,
    }));

    try {
      const res = await onSubmitAddUnits(payload);
      if (res.success) {
        setRestockMessage({
          text: `✅ Stock added successfully for ${payload.length} item(s).`,
          type: "success",
        });
        setRestockCart([]);
        setRestockAddedBy("");
        setRestockDept("");
        setRestockRemarks("");
        await onRefresh();
      } else {
        setRestockMessage({ text: `❌ Error: ${res.error || "Could not add stock"}`, type: "error" });
      }
    } catch (err) {
      setRestockMessage({ text: "❌ Connection issue. Failed to submit restock.", type: "error" });
    } finally {
      setRestockLoading(false);
    }
  };

  // --- Register New Items Handlers ---
  const handleBulkParse = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split("\n");
    const parsedRows: NewItemRow[] = [];
    let currentCounter = rowCounter;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Split by tab or comma
      const parts = trimmed.includes("\t") ? trimmed.split("\t") : trimmed.split(",");
      if (parts.length >= 2) {
        const code = parts[0]?.trim() || "";
        const description = parts[1]?.trim() || "";
        const qty = parseInt(parts[2]?.trim() || "0") || 0;
        const unitCostBDT = parseFloat(parts[3]?.trim() || "0") || 0;
        const store = (parts[4]?.trim() || (activeStore === "all" ? "1" : activeStore)) as any;

        parsedRows.push({
          id: currentCounter++,
          code,
          description,
          qty,
          unitCostBDT,
          store,
        });
      }
    });

    if (parsedRows.length > 0) {
      setRowCounter(currentCounter);
      // Replace the default blank row if it's the only one
      if (newRows.length === 1 && newRows[0].code === "" && newRows[0].description === "") {
        setNewRows(parsedRows);
      } else {
        setNewRows([...newRows, ...parsedRows]);
      }
      setBulkText("");
      setIsBulkOpen(false);
    }
  };

  const handleAddNewRow = () => {
    const defaultStore = activeStore === "all" ? "1" : activeStore;
    setNewRows([...newRows, { id: rowCounter, code: "", description: "", qty: 0, unitCostBDT: 0, store: defaultStore as any }]);
    setRowCounter(rowCounter + 1);
  };

  const handleRemoveNewRow = (id: number) => {
    if (newRows.length === 1) {
      const defaultStore = activeStore === "all" ? "1" : activeStore;
      setNewRows([{ id: 1, code: "", description: "", qty: 0, unitCostBDT: 0, store: defaultStore as any }]);
      return;
    }
    setNewRows(newRows.filter((row) => row.id !== id));
  };

  const handleUpdateRow = (id: number, field: keyof NewItemRow, val: any) => {
    setNewRows(
      newRows.map((row) => {
        if (row.id === id) {
          if (field === "qty") {
            return { ...row, qty: Math.max(0, parseInt(val) || 0) };
          }
          if (field === "unitCostBDT") {
            return { ...row, unitCostBDT: Math.max(0, parseFloat(val) || 0) };
          }
          return { ...row, [field]: val };
        }
        return row;
      })
    );
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validPayload = newRows.filter((row) => row.code.trim() !== "" && row.description.trim() !== "");

    if (validPayload.length === 0) {
      setRegisterMessage({ text: "Please enter at least one item with a valid IMPA code and description.", type: "error" });
      return;
    }

    setRegisterLoading(true);
    setRegisterMessage(null);

    const payload = validPayload.map((row) => {
      const rowStore = row.store || (activeStore === "all" ? "1" : activeStore) as StoreType;
      const formattedDesc = formatStorePrefix(row.description.trim(), rowStore);
      return {
        chutuoCode: row.code.trim(),
        description: formattedDesc,
        initialQty: row.qty,
        unitCostBDT: row.unitCostBDT,
        doneBy: registerAddedBy.trim(),
        department: registerDept.trim(),
        remarks: registerRemarks.trim(),
        inventoryNo: Number(rowStore),
      };
    });

    try {
      const res = await onSubmitNewItems(payload);
      if (res.success) {
        setRegisterMessage({
          text: `✅ ${payload.length} new item(s) successfully registered to catalog.`,
          type: "success",
        });
        setNewRows([{ id: 1, code: "", description: "", qty: 0, unitCostBDT: 0 }]);
        setRegisterAddedBy("");
        setRegisterDept("");
        setRegisterRemarks("");
        await onRefresh();
      } else {
        setRegisterMessage({ text: `❌ Error: ${res.error || "Could not register new items"}`, type: "error" });
      }
    } catch (err) {
      setRegisterMessage({ text: "❌ Connection error. Failed to register new items.", type: "error" });
    } finally {
      setRegisterLoading(false);
    }
  };

  // --- Issue Handlers ---
  const handleIssueSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIssueSearch(e.target.value);
    setShowIssueDropdown(true);
  };

  const filteredIssueItems = issueSearch.trim()
    ? (filteredInventory || inventory)
        .filter(
          (item) =>
            item.chutuoCode.toLowerCase().includes(issueSearch.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(issueSearch.toLowerCase()))
        )
        .slice(0, 15)
    : [];

  const handleAddToIssueCart = (item: InventoryItem) => {
    const existing = issueCart.find((c) => c.chutuoCode === item.chutuoCode);
    if (existing) {
      setIssueCart(
        issueCart.map((c) =>
          c.chutuoCode === item.chutuoCode ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setIssueCart([
        ...issueCart,
        {
          chutuoCode: item.chutuoCode,
          description: item.description,
          quantity: 1,
          unitCostBDT: item.unitCostBDT,
          availableStock: item.quantity,
          inventoryNo: item.inventoryNo,
        },
      ]);
    }
    setIssueSearch("");
    setShowIssueDropdown(false);
  };

  const handleUpdateIssueQty = (idx: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setIssueCart(
      issueCart.map((c, i) => (i === idx ? { ...c, quantity: validQty } : c))
    );
  };

  const handleRemoveIssueItem = (idx: number) => {
    setIssueCart(issueCart.filter((_, i) => i !== idx));
  };

  const handleClearIssueCart = () => {
    setIssueCart([]);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issueCart.length === 0) {
      setIssueMessage({ text: "Issue cart is empty! Search and add items to issue.", type: "error" });
      return;
    }

    setIssueLoading(true);
    setIssueMessage(null);

    // Apply "Host " prefix to the name, similar to Crew's "Crew " prefix
    const rawName = issueDoneBy.trim();
    const finalIssuedByName = rawName !== "" ? `Host ${rawName}` : "";

    const payload = issueCart.map((item) => ({
      chutuoCode: item.chutuoCode,
      qtyToIssue: item.quantity,
      doneBy: finalIssuedByName,
      department: issueDept.trim(),
      remarks: issueRemarks.trim(),
      inventoryNo: item.inventoryNo,
    }));

    try {
      const res = await onSubmitIssue(payload);
      if (res.success) {
        setIssueMessage({
          text: `✅ ${payload.length} item(s) issued successfully. Issued by: ${finalIssuedByName || "(not specified)"}`,
          type: "success",
        });
        setIssueCart([]);
        setIssueDoneBy("");
        setIssueDept("");
        setIssueRemarks("");
        await onRefresh();
      } else {
        setIssueMessage({ text: `❌ Error: ${res.error || "Could not complete issuance"}`, type: "error" });
      }
    } catch (err) {
      setIssueMessage({ text: "❌ Connection issue. Failed to submit issuance.", type: "error" });
    } finally {
      setIssueLoading(false);
    }
  };

  const totalIssueQty = issueCart.reduce((sum, item) => sum + item.quantity, 0);

  const totalRestockQty = restockCart.reduce((sum, item) => sum + ((item as any).quantity || 0), 0);

  return (
    <div className="flex flex-col space-y-6">
      {/* Secondary Sub-Tabs Navigation */}
      <div className="flex flex-wrap md:flex-nowrap bg-slate-100 p-1.5 rounded-2xl w-full max-w-xl mx-auto shadow-sm border border-slate-200 gap-1 md:gap-0">
        <button
          type="button"
          onClick={() => setHostTab("issue")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            hostTab === "issue"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Issue Items</span>
        </button>
        <button
          type="button"
          onClick={() => setHostTab("restock")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            hostTab === "restock"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Units (Restock)</span>
        </button>
        <button
          type="button"
          onClick={() => setHostTab("register")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            hostTab === "register"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Register New Items</span>
        </button>
      </div>

      {/* VIEW: RESTOCK INVENTORY (Add Units) */}
      {hostTab === "restock" && (
        <div className="space-y-6">
          {/* Restock Search Area */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1" ref={restockDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Item to Restock
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={restockSearch}
                    onChange={handleRestockSearchChange}
                    onFocus={() => setShowRestockDropdown(true)}
                    className="w-full bg-white border border-slate-300 rounded-full py-3 pl-12 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    placeholder="Search IMPA code or description to add stock..."
                  />
                </div>

                {/* Dropdown list of matching items */}
                {showRestockDropdown && filteredRestockItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
                    {filteredRestockItems.map((item, idx) => (
                      <div
                        key={`${item.chutuoCode}-${idx}`}
                        onClick={() => handleAddToRestockCart(item)}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors duration-150 flex flex-col md:flex-row md:items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-600 text-sm">
                              {item.chutuoCode}
                            </span>
                            {(() => {
                              const storeMeta = STORES.find(s => s.id === item.store);
                              return storeMeta ? (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${storeMeta.badgeBg}`}>
                                  {storeMeta.label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 font-medium whitespace-normal break-words">
                            {cleanDescription(item.description) || "No description provided"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-600 font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            📦 Current Stock: {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-3 py-1 rounded-full text-xs hover:bg-indigo-100 transition-all cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showRestockDropdown && restockSearch.trim() !== "" && filteredRestockItems.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs z-50 shadow-lg">
                    ✨ No matching items found
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5">
                  <FolderPlus className="h-5 w-5 text-indigo-600 mr-2" />
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider mr-2">
                    To Add
                  </span>
                  <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-full text-xs font-mono">
                    {totalRestockQty}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClearRestockCart}
                  disabled={restockCart.length === 0}
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>

          {/* Restock List Table */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[300px]">
            <div className="hidden lg:grid grid-cols-12 gap-4 bg-slate-50 border-b border-slate-100 p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">
              <div className="col-span-2">IMPA Code</div>
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-center">Qty to Add</div>
              <div className="col-span-2 text-right">Current Stock</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
              {restockCart.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[220px]">
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                    <PlusCircle className="h-7 w-7" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">Restock List is Empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Search and select catalog items above to increase their inventory.
                  </p>
                </div>
              ) : (
                restockCart.map((item, idx) => {
                  const liveItem = inventory.find((inv) => inv.chutuoCode === item.chutuoCode);
                  const currentStock = liveItem ? liveItem.quantity : item.currentStock;
                  const addQty = (item as any).quantity || 1;

                  return (
                    <div
                      key={`${item.chutuoCode}-${idx}`}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/50 transition-colors"
                    >
                      {/* IMPA Code */}
                      <div className="lg:col-span-2">
                        <span className="font-mono font-bold text-slate-800 text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-full inline-block">
                          {item.chutuoCode}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="lg:col-span-5">
                        <p className="font-medium text-slate-800 text-sm break-words line-clamp-2">
                          {cleanDescription(item.description) || "—"}
                        </p>
                      </div>

                      {/* Qty controls */}
                      <div className="lg:col-span-2 flex justify-center">
                        <div className="flex items-center border-2 border-slate-200 rounded-full bg-slate-50/50 overflow-hidden shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleUpdateRestockQty(idx, addQty - 1)}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={addQty}
                            onChange={(e) => handleUpdateRestockQty(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-sm font-mono font-bold bg-transparent border-none text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateRestockQty(idx, addQty + 1)}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Current Stock */}
                      <div className="lg:col-span-2 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2">
                        <span className="lg:hidden text-xs text-slate-400 font-bold uppercase">
                          Current Stock
                        </span>
                        <div className="text-right">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            📦 Current: {currentStock}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="lg:col-span-1 flex justify-end lg:justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRestockItem(idx)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Restock Inputs & Submit */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 rounded-b-3xl">
              <form onSubmit={handleRestockSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Authorized Stock Controller (Added By)
                    </label>
                    <input
                      type="text"
                      value={restockAddedBy}
                      onChange={(e) => setRestockAddedBy(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Department / Office
                    </label>
                    <input
                      type="text"
                      value={restockDept}
                      onChange={(e) => setRestockDept(e.target.value)}
                      placeholder="e.g. Warehouse, Logistics, Admin"
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Remarks / Purchase Reference
                  </label>
                  <textarea
                    value={restockRemarks}
                    onChange={(e) => setRestockRemarks(e.target.value)}
                    placeholder="Enter invoice details, supplier references, or additional notes"
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                  />
                </div>

                {restockMessage && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-2xl text-xs font-medium border ${
                      restockMessage.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {restockMessage.type === "success" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>{restockMessage.text}</div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    * Inventory increments will be applied and synchronized immediately across the entire portal.
                  </span>

                  <button
                    type="submit"
                    disabled={restockCart.length === 0 || restockLoading}
                    className="flex items-center justify-center gap-2 bg-slate-900 border-none text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  >
                    {restockLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Applying Stock...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Stock Additions</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: REGISTER NEW ITEMS */}
      {hostTab === "register" && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-slate-850 font-bold text-sm tracking-wide mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Register New Items to Catalog</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Add products that do not currently exist in the Comilla Traders database. Fill out IMPA codes, descriptions, initial stock values, and unit costs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkOpen(!isBulkOpen)}
                className="flex items-center gap-1.5 self-start sm:self-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 font-bold text-xs py-2 px-4 rounded-full transition-all cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>{isBulkOpen ? "Hide Bulk Import" : "Bulk Import (Excel/CSV)"}</span>
              </button>
            </div>

            {isBulkOpen && (
              <div className="mt-4 p-4 bg-white border border-slate-250 rounded-2xl space-y-3 shadow-xs animate-in fade-in duration-205">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Paste Tab-Separated (Excel) or Comma-Separated (CSV) rows:
                </label>
                <p className="text-[10px] text-slate-400 font-medium">
                  Format: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">IMPA_Code, Description, Initial_Qty, Unit_Cost_BDT</code> (one item per line)
                </p>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="e.g.&#10;750101, Globe Valve Brass 2inch, 10, 4500&#10;750102, Ball Valve Steel 1inch, 25, 2300"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-y"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setBulkText(""); setIsBulkOpen(false); }}
                    className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs py-1.5 px-4 rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkParse}
                    className="bg-slate-900 border-none text-white hover:bg-slate-800 font-bold text-xs py-1.5 px-4 rounded-full shadow-sm cursor-pointer"
                  >
                    Add Parsed Items
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[300px]">
            {/* Headers for editable table */}
            <div className="hidden lg:grid grid-cols-12 gap-4 bg-slate-50 border-b border-slate-100 p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">
              <div className="col-span-2">IMPA Code *</div>
              <div className="col-span-4">Description *</div>
              <div className="col-span-2">Store Dept *</div>
              <div className="col-span-1 text-center">Initial Qty</div>
              <div className="col-span-2 text-right pr-4">Unit Cost (BDT)</div>
              <div className="col-span-1 text-center">Remove</div>
            </div>

            {/* Editable grid rows */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[360px]">
              {newRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl items-center"
                >
                  <div className="lg:col-span-2">
                    <span className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      IMPA Code *
                    </span>
                    <input
                      type="text"
                      placeholder="IMPA Code"
                      value={row.code}
                      onChange={(e) => handleUpdateRow(row.id, "code", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-full py-2 px-4 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="lg:col-span-4">
                    <span className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      Description *
                    </span>
                    <input
                      type="text"
                      placeholder="Description"
                      value={row.description}
                      onChange={(e) => handleUpdateRow(row.id, "description", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-full py-2 px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <span className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      Store Dept *
                    </span>
                    <select
                      value={row.store || (activeStore === "all" ? "1" : activeStore)}
                      onChange={(e) => handleUpdateRow(row.id, "store", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-full py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    >
                      {STORES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-1">
                    <span className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      Initial Qty
                    </span>
                    <input
                      type="number"
                      placeholder="Initial Qty"
                      value={row.qty || ""}
                      onChange={(e) => handleUpdateRow(row.id, "qty", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-full py-2 px-4 text-xs text-center text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="lg:col-span-2 pr-2">
                    <span className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                      Unit Cost (৳)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Cost (৳)"
                      value={row.unitCostBDT || ""}
                      onChange={(e) => handleUpdateRow(row.id, "unitCostBDT", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-full py-2 px-4 text-xs text-right text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="lg:col-span-1 flex justify-end lg:justify-center pt-1 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveNewRow(row.id)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="lg:hidden font-bold text-[10px] uppercase text-red-500">Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Row Button */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={handleAddNewRow}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-full py-2 px-5 text-xs font-bold text-slate-700 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4 text-indigo-600" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Submission Section */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 rounded-b-3xl">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Authorized Controller (Registered By)
                    </label>
                    <input
                      type="text"
                      value={registerAddedBy}
                      onChange={(e) => setRegisterAddedBy(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Department / Office
                    </label>
                    <input
                      type="text"
                      value={registerDept}
                      onChange={(e) => setRegisterDept(e.target.value)}
                      placeholder="e.g. Warehouse, Purchasing, Accounts"
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Overall Registration Remarks
                  </label>
                  <textarea
                    value={registerRemarks}
                    onChange={(e) => setRegisterRemarks(e.target.value)}
                    placeholder="Enter any additional remarks regarding this new catalog entry batch"
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                  />
                </div>

                {registerMessage && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-2xl text-xs font-medium border ${
                      registerMessage.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {registerMessage.type === "success" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>{registerMessage.text}</div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    * Items must have a valid IMPA code and description. Leaving a row blank skips it.
                  </span>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="flex items-center justify-center gap-2 bg-slate-900 border-none text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  >
                    {registerLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Registering Catalog...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Register Catalog Items</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ISSUE UNITS (Host Issuance) */}
      {hostTab === "issue" && (
        <div className="space-y-6">
          {/* Issue Search Area */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1" ref={issueDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Item to Issue
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={handleIssueSearchChange}
                    onFocus={() => setShowIssueDropdown(true)}
                    className="w-full bg-white border border-slate-300 rounded-full py-3 pl-12 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    placeholder="Search IMPA code or description to issue..."
                  />
                </div>

                {/* Dropdown list of matching items */}
                {showIssueDropdown && filteredIssueItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
                    {filteredIssueItems.map((item, idx) => (
                      <div
                        key={`${item.chutuoCode}-${idx}`}
                        onClick={() => handleAddToIssueCart(item)}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors duration-150 flex flex-col md:flex-row md:items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-600 text-sm">
                              {item.chutuoCode}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                              {item.unitCostBDT ? `৳${Number(item.unitCostBDT).toLocaleString()}` : "N/A"}
                            </span>
                            {(() => {
                              const storeMeta = STORES.find(s => s.id === item.store);
                              return storeMeta ? (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${storeMeta.badgeBg}`}>
                                  {storeMeta.label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 font-medium whitespace-normal break-words">
                            {cleanDescription(item.description) || "No description provided"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              item.quantity <= lowStockThreshold
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : item.quantity <= (lowStockThreshold * 3)
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}
                          >
                            📦 {item.quantity} in Stock
                          </span>
                          <button
                            type="button"
                            className="bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-3 py-1 rounded-full text-xs hover:bg-indigo-100 transition-all cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showIssueDropdown && issueSearch.trim() !== "" && filteredIssueItems.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs z-50 shadow-lg">
                    ✨ No matching items found
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5">
                  <ShoppingCart className="h-5 w-5 text-indigo-600 mr-2" />
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider mr-2">
                    To Issue
                  </span>
                  <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-full text-xs font-mono">
                    {totalIssueQty}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearIssueCart}
                  disabled={issueCart.length === 0}
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>

          {/* Issue Cart Area */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[300px]">
            {/* Headers for editable table */}
            <div className="hidden lg:grid grid-cols-12 gap-4 bg-slate-50 border-b border-slate-100 p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">
              <div className="col-span-2">IMPA Code</div>
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-center">Qty to Issue</div>
              <div className="col-span-2 text-right">Available Stock / Cost</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* Editable grid rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[420px]">
              {issueCart.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[220px]">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">Issue Cart is Empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Search and add marine equipment above to issue units from host operator panel.
                  </p>
                </div>
              ) : (
                issueCart.map((item, idx) => {
                  const liveItem = inventory.find((inv) => inv.chutuoCode === item.chutuoCode);
                  const liveStock = liveItem ? liveItem.quantity : item.availableStock;
                  const isOverStock = item.quantity > liveStock;

                  return (
                    <div
                      key={`${item.chutuoCode}-${idx}`}
                      className={`grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 items-center transition-colors ${
                        isOverStock ? "bg-red-50/50" : "hover:bg-slate-50/50"
                      }`}
                    >
                      {/* IMPA Code */}
                      <div className="lg:col-span-2">
                        <span className="font-mono font-bold text-indigo-600 text-sm bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block">
                          {item.chutuoCode}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="lg:col-span-5">
                        <p className="font-medium text-slate-800 text-sm break-words line-clamp-2">
                          {cleanDescription(item.description) || "—"}
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="lg:col-span-2 flex justify-center">
                        <div className="flex items-center border border-slate-200 rounded-full bg-slate-50/50 overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleUpdateIssueQty(idx, item.quantity - 1)}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateIssueQty(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-sm font-mono font-bold bg-transparent border-none text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateIssueQty(idx, item.quantity + 1)}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Stock and Price details */}
                      <div className="lg:col-span-2 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2">
                        <span className="lg:hidden text-xs text-slate-400 font-bold uppercase">
                          Stock / Cost
                        </span>
                        <div className="text-right flex flex-wrap items-center gap-1.5 justify-end">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              liveStock <= lowStockThreshold
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : liveStock <= (lowStockThreshold * 3)
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}
                          >
                            📦 {liveStock} Available
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            ৳{item.unitCostBDT ? Number(item.unitCostBDT).toLocaleString() : "—"}
                          </span>
                        </div>
                        {isOverStock && (
                          <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 mt-1">
                            <AlertCircle className="h-3 w-3" /> Over Stock Limit
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1 flex justify-end lg:justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIssueItem(idx)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Inputs panel & Submit button at the bottom */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 rounded-b-3xl">
              <form onSubmit={handleIssueSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Issued To / Done By (Host/Crew Name)
                    </label>
                    <input
                      type="text"
                      value={issueDoneBy}
                      onChange={(e) => setIssueDoneBy(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Department / Office
                    </label>
                    <input
                      type="text"
                      value={issueDept}
                      onChange={(e) => setIssueDept(e.target.value)}
                      placeholder="e.g. Deck, Engine, Logistics, Admin"
                      className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Remarks / Vessel Reference
                  </label>
                  <textarea
                    value={issueRemarks}
                    onChange={(e) => setIssueRemarks(e.target.value)}
                    placeholder="Enter vessel name, invoice reference, or issue reasons"
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                  />
                </div>

                {issueMessage && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-2xl text-xs font-medium border ${
                      issueMessage.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {issueMessage.type === "success" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>{issueMessage.text}</div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    * Issuance transactions automatically post real-time updates to the Google Sheets backend.
                  </span>

                  <button
                    type="submit"
                    disabled={issueCart.length === 0 || issueLoading}
                    className="flex items-center justify-center gap-2 bg-slate-900 border-none text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  >
                    {issueLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Processing Submission...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Host Issuance</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
