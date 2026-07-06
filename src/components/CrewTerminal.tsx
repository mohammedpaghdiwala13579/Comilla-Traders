import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, Send, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { InventoryItem, IssueCartItem } from "../types";
import { cleanDescription, STORES } from "../utils/storeClassifier";

interface CrewTerminalProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onSubmitIssue: (payload: any[]) => Promise<{ success: boolean; error?: string }>;
  activeStore?: string;
  lowStockThreshold?: number;
}

export default function CrewTerminal({ 
  inventory, 
  isLoading, 
  onRefresh, 
  onSubmitIssue, 
  activeStore,
  lowStockThreshold = 5
}: CrewTerminalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState<IssueCartItem[]>([]);
  const [issuedBy, setIssuedBy] = useState("");
  const [department, setDepartment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-populate department state based on activeStore
  useEffect(() => {
    if (activeStore && activeStore !== "all") {
      setDepartment(activeStore.charAt(0).toUpperCase() + activeStore.slice(1));
    } else {
      setDepartment("");
    }
  }, [activeStore]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  // Filter items based on search term
  const filteredItems = searchTerm.trim()
    ? inventory
        .filter(
          (item) =>
            item.chutuoCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 15)
    : [];

  const handleAddToCart = (item: InventoryItem) => {
    const existing = cart.find((c) => c.chutuoCode === item.chutuoCode);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.chutuoCode === item.chutuoCode ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([
        ...cart,
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
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleUpdateQty = (idx: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setCart(cart.map((c, i) => (i === idx ? { ...c, quantity: validQty } : c)));
  };

  const handleRemoveItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setMessage({ text: "Your issue cart is empty! Please search and add items.", type: "error" });
      return;
    }

    setSubmitLoading(true);
    setMessage(null);

    // Apply "Crew " prefix to the name, as requested by guidelines and previous code
    const rawName = issuedBy.trim();
    const finalIssuedByName = rawName !== "" ? `Crew ${rawName}` : "";

    const payload = cart.map((item) => ({
      chutuoCode: item.chutuoCode,
      qtyToIssue: item.quantity,
      doneBy: finalIssuedByName,
      department: department.trim(),
      remarks: remarks.trim(),
      inventoryNo: item.inventoryNo,
    }));

    try {
      const res = await onSubmitIssue(payload);
      if (res.success) {
        setMessage({
          text: `✅ ${payload.length} item(s) issued successfully. Issued by: ${finalIssuedByName || "(not specified)"}`,
          type: "success",
        });
        setCart([]);
        setIssuedBy("");
        setDepartment("");
        setRemarks("");
        // Refresh inventory from server to reflect new quantities
        await onRefresh();
      } else {
        setMessage({ text: `❌ Error: ${res.error || "Server issue, please try again"}`, type: "error" });
      }
    } catch (err) {
      setMessage({ text: "❌ Failed to submit. Please check connection.", type: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Search and Header Section */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Search Inventory
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-white border border-slate-300 rounded-full py-3 pl-12 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                placeholder="Type IMPA code or description..."
              />
            </div>

            {/* Dropdown list of matching items */}
            {showDropdown && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <div
                    key={`${item.chutuoCode}-${idx}`}
                    onClick={() => handleAddToCart(item)}
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
                        {/* Dynamic Category Badge */}
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

            {showDropdown && searchTerm.trim() !== "" && filteredItems.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs z-50 shadow-lg">
                ✨ No items match "{searchTerm}"
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5">
              <ShoppingCart className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider mr-2">
                Cart
              </span>
              <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-full text-xs font-mono">
                {totalCartQty}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[300px]">
        <div className="hidden lg:grid grid-cols-12 gap-4 bg-slate-50 border-b border-slate-100 p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">
          <div className="col-span-2">IMPA Code</div>
          <div className="col-span-5">Description</div>
          <div className="col-span-2 text-center">Qty to Issue</div>
          <div className="col-span-2 text-right">Available Stock / Cost</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[420px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[220px]">
              <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <p className="font-bold text-slate-700 text-sm">Crew Cart is Empty</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Search and add marine equipments above to create an issuance transaction.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => {
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
                        onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                        className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                        className="w-12 text-center text-sm font-mono font-bold bg-transparent border-none text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                        className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
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
                      onClick={() => handleRemoveItem(idx)}
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

        {/* Inputs panel & Submit button at the bottom */}
        <div className="bg-slate-50 border-t border-slate-100 p-5 rounded-b-3xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Issued To / Done By (Crew Name)
                </label>
                <input
                  type="text"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  placeholder="Enter crew member name"
                  className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Deck, Engine, Galley, Saloon"
                  className="w-full bg-white border border-slate-200 rounded-full py-2.5 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Remarks / Vessel Info
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Vessel name, purchase order details, or additional remarks"
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
              />
            </div>

            {message && (
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl text-xs font-medium border ${
                  message.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div>{message.text}</div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-400 font-medium">
                * Issuance transactions automatically post real-time updates to the Google Sheets backend.
              </span>

              <button
                type="submit"
                disabled={cart.length === 0 || submitLoading}
                className="flex items-center justify-center gap-2 bg-slate-900 border-none text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
              >
                {submitLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Submission...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Crew Issuance</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
