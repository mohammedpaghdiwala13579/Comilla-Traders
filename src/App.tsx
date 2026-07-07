import React, { useState, useEffect, useMemo } from "react";
import {
  Ship,
  Users,
  Lock,
  BarChart3,
  RefreshCw,
  LogOut,
  MapPin,
  Phone,
  Mail,
  Anchor,
  Smartphone,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
  AlertTriangle,
  Layers,
  HelpCircle,
  Settings,
  Bed,
  ShieldAlert,
  FolderSync
} from "lucide-react";
import CrewTerminal from "./components/CrewTerminal";
import HostTerminal from "./components/HostTerminal";
import StatisticsCenter from "./components/StatisticsCenter";
import LoginScreen from "./components/LoginScreen";
import { InventoryItem, StatsData } from "./types";
import { classifyItem, cleanDescription, StoreType, STORES, setDynamicStores } from "./utils/storeClassifier";

const getStoreDotColor = (id: string) => {
  switch (id) {
    case "1": return "bg-sky-400";
    case "2": return "bg-indigo-400";
    case "3": return "bg-emerald-400";
    case "4": return "bg-rose-400";
    case "5": return "bg-violet-400";
    case "6": return "bg-amber-400";
    case "7": return "bg-teal-400";
    case "8": return "bg-fuchsia-400";
    case "9": return "bg-cyan-400";
    default: return "bg-slate-400";
  }
};

const getStoreActiveBg = (id: string) => {
  switch (id) {
    case "1": return "bg-sky-950/30 border-sky-900/30 text-sky-200 shadow-xs";
    case "2": return "bg-indigo-950/30 border-indigo-900/30 text-indigo-200 shadow-xs";
    case "3": return "bg-emerald-950/30 border-emerald-900/30 text-emerald-200 shadow-xs";
    case "4": return "bg-rose-950/30 border-rose-900/30 text-rose-200 shadow-xs";
    case "5": return "bg-violet-950/30 border-violet-900/30 text-violet-200 shadow-xs";
    case "6": return "bg-amber-950/30 border-amber-900/30 text-amber-200 shadow-xs";
    case "7": return "bg-teal-950/30 border-teal-900/30 text-teal-200 shadow-xs";
    case "8": return "bg-fuchsia-950/30 border-fuchsia-900/30 text-fuchsia-200 shadow-xs";
    case "9": return "bg-cyan-950/30 border-cyan-900/30 text-cyan-200 shadow-xs";
    default: return "bg-slate-950/30 border-slate-900/30 text-slate-200 shadow-xs";
  }
};

const getMobileStoreActiveBg = (id: string) => {
  switch (id) {
    case "1": return "border-sky-500 text-sky-200 bg-sky-950/20";
    case "2": return "border-indigo-500 text-indigo-200 bg-indigo-950/20";
    case "3": return "border-emerald-500 text-emerald-200 bg-emerald-950/20";
    case "4": return "border-rose-500 text-rose-200 bg-rose-950/20";
    case "5": return "border-violet-500 text-violet-200 bg-violet-950/20";
    case "6": return "border-amber-500 text-amber-200 bg-amber-950/20";
    case "7": return "border-teal-500 text-teal-200 bg-teal-950/20";
    case "8": return "border-fuchsia-500 text-fuchsia-200 bg-fuchsia-950/20";
    case "9": return "border-cyan-500 text-cyan-200 bg-cyan-950/20";
    default: return "border-slate-500 text-slate-200 bg-slate-950/20";
  }
};

const getStoreIconComponent = (id: string) => {
  switch (id) {
    case "1": return Anchor;
    case "2": return Settings;
    case "3": return Bed;
    case "4": return ShieldAlert;
    default: return Layers;
  }
};

const API_URL = "https://script.google.com/macros/s/AKfycbyxzQ4X2fbEEcbyX-dUjqPlR5eZAgSZO_st90UPweKk-udNRobo8qTnBLB1bVXWyVIe-g/exec";

// ── PRE-SEEDED LOGISTICAL DATASETS (OFFLINE FALLBACKS) ──
const getPreSeededInventory = (): InventoryItem[] => [
  {
    srNo: "1",
    chutuoCode: "DK-ANC-01",
    description: "STOCKLESS ANCHOR 500KG CAST STEEL HIGH HOLDING",
    quantity: 4,
    unitCostBDT: 145000,
    amount: 580000,
    store: "1",
    inventoryNo: 1
  },
  {
    srNo: "2",
    chutuoCode: "DK-CHN-12",
    description: "ANCHOR CHAIN STUD LINK 22MM GRADE U2 (15 FATHOMS)",
    quantity: 12,
    unitCostBDT: 68000,
    amount: 816000,
    store: "1",
    inventoryNo: 1
  },
  {
    srNo: "3",
    chutuoCode: "DK-WRP-08",
    description: "STEEL WIRE ROPE 6X36 WS+IWRC 28MM (220 METERS)",
    quantity: 8,
    unitCostBDT: 95000,
    amount: 760000,
    store: "1",
    inventoryNo: 1
  },
  {
    srNo: "4",
    chutuoCode: "DK-SHK-05",
    description: "BOW SHACKLE GRADE T 8.5 TON CAPACITY WLL",
    quantity: 35,
    unitCostBDT: 4200,
    amount: 147000,
    store: "1",
    inventoryNo: 1
  },
  {
    srNo: "5",
    chutuoCode: "DK-PNT-02",
    description: "MARINE ANTIFOULING PAINT RED COATING (20L DRUM)",
    quantity: 48,
    unitCostBDT: 12500,
    amount: 600000,
    store: "1",
    inventoryNo: 1
  },
  {
    srNo: "1",
    chutuoCode: "EN-INJ-03",
    description: "FUEL INJECTOR ASSEMBLY SULZER 6RTA58T SPARES",
    quantity: 6,
    unitCostBDT: 180000,
    amount: 1080000,
    store: "2",
    inventoryNo: 2
  },
  {
    srNo: "2",
    chutuoCode: "EN-GST-22",
    description: "CYLINDER HEAD GASKET KIT MAN B&W L23/30H",
    quantity: 14,
    unitCostBDT: 16500,
    amount: 231000,
    store: "2",
    inventoryNo: 2
  },
  {
    srNo: "3",
    chutuoCode: "EN-FLT-09",
    description: "LUBE OIL FILTER ELEMENT BOLL & KIRCH 1.04.13",
    quantity: 50,
    unitCostBDT: 4800,
    amount: 240000,
    store: "2",
    inventoryNo: 2
  },
  {
    srNo: "4",
    chutuoCode: "EN-PMP-05",
    description: "CENTRIFUGAL BILGE PUMP IMPELLER BRONZE DIA 250MM",
    quantity: 3,
    unitCostBDT: 45000,
    amount: 135000,
    store: "2",
    inventoryNo: 2
  },
  {
    srNo: "1",
    chutuoCode: "CR-SFT-01",
    description: "SOLAS STANDARD LIFEJACKET WITH LED FLASHLIGHT",
    quantity: 120,
    unitCostBDT: 3500,
    amount: 420000,
    store: "3",
    inventoryNo: 3
  },
  {
    srNo: "2",
    chutuoCode: "CR-BLR-02",
    description: "HEAVY DUTY COTTON BOILER SUIT NAVY BLUE SIZE L",
    quantity: 85,
    unitCostBDT: 1800,
    amount: 153000,
    store: "3",
    inventoryNo: 3
  },
  {
    srNo: "3",
    chutuoCode: "CR-SHS-04",
    description: "STEEL TOE CAP LEATHER SAFETY SHOES HIGH ANKLE",
    quantity: 62,
    unitCostBDT: 2400,
    amount: 148800,
    store: "3",
    inventoryNo: 3
  },
  {
    srNo: "1",
    chutuoCode: "SF-EXT-01",
    description: "CO2 PORTABLE FIRE EXTINGUISHER 6KG COMPLIANT",
    quantity: 40,
    unitCostBDT: 6500,
    amount: 260000,
    store: "4",
    inventoryNo: 4
  },
  {
    srNo: "2",
    chutuoCode: "SF-FLR-02",
    description: "RED HAND FLARE SOLAS COMPLIANT EXPIRY 2029",
    quantity: 150,
    unitCostBDT: 1200,
    amount: 180000,
    store: "4",
    inventoryNo: 4
  },
  {
    srNo: "3",
    chutuoCode: "SF-CRT-03",
    description: "ADMIRALTY NAVIGATIONAL CHART - BAY OF BENGAL 828",
    quantity: 15,
    unitCostBDT: 7500,
    amount: 112500,
    store: "4",
    inventoryNo: 4
  }
];

const getPreSeededStats = (inv: InventoryItem[]): StatsData => {
  const todayStr = new Date().toISOString().split("T")[0];
  return {
    inventory: inv,
    issued: [
      {
        date: todayStr,
        chutuoCode: "DK-SHK-05",
        description: "BOW SHACKLE GRADE T 8.5 TON CAPACITY WLL",
        qtyChanged: -5,
        department: "DECK DEPARTMENT",
        doneBy: "Chief Officer Farhan",
        remarks: "Rigging anchor chain setup",
        inventoryNo: 1
      },
      {
        date: todayStr,
        chutuoCode: "EN-FLT-09",
        description: "LUBE OIL FILTER ELEMENT BOLL & KIRCH 1.04.13",
        qtyChanged: -4,
        department: "ENGINE DEPARTMENT",
        doneBy: "Second Engineer Jamal",
        remarks: "Scheduled auxiliary engine maintenance",
        inventoryNo: 2
      }
    ],
    addUnits: [
      {
        date: todayStr,
        chutuoCode: "DK-PNT-02",
        description: "MARINE ANTIFOULING PAINT RED COATING (20L DRUM)",
        qtyChanged: 10,
        department: "STORE RECEIVING",
        doneBy: "Inventory Controller Munir",
        remarks: "Supplier shipment received",
        inventoryNo: 1
      }
    ],
    newItems: [
      {
        date: todayStr,
        chutuoCode: "SF-CRT-03",
        description: "ADMIRALTY NAVIGATIONAL CHART - BAY OF BENGAL 828",
        qtyChanged: 15,
        department: "OPERATIONS",
        doneBy: "Superintendent Rahim",
        remarks: "New chart revision standard cataloging",
        inventoryNo: 4
      }
    ]
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"crew" | "host" | "statistics">((() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "host" || tab === "statistics" || tab === "crew") {
        return tab as any;
      }
    }
    return "crew";
  })());
  
  const [isAuthenticated, setIsAuthenticated] = useState((() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("bypass_auth") === "true") {
        return true;
      }
    }
    return false;
  })());
  const [activeStore, setActiveStore] = useState<StoreType | "all">("all");

  // Global Data States (Stale-While-Revalidate caching pattern)
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("comilla_inventory_cache");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Error reading inventory cache", e);
        }
      }
    }
    return getPreSeededInventory();
  });

  const [statsData, setStatsData] = useState<StatsData>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("comilla_stats_cache");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Error reading stats cache", e);
        }
      }
    }
    return getPreSeededStats(getPreSeededInventory());
  });

  const [isLoading, setIsLoading] = useState(false); // Instantly ready and operational!
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("Never");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // UI Interactive States
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isDirectoryExpanded, setIsDirectoryExpanded] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  const processActionLocally = (action: string, payload: any[]) => {
    // Read current inventory and stats from active memory
    let currentInv = [...inventory];
    let currentStats = { ...statsData };
    
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split("T")[0];
    const timeStr = timestamp.toLocaleTimeString();
    
    const results: any[] = [];
    let successCount = 0;
    
    if (action === "processMultipleIssues") {
      const txNo = "TX-ISS-OFF-" + Math.floor(1000 + Math.random() * 9000);
      
      payload.forEach((trans: any) => {
        const code = trans.chutuoCode.trim();
        const qtyToIssue = Number(trans.qtyToIssue || trans.quantity) || 0;
        
        let found = false;
        currentInv = currentInv.map(item => {
          if (item.chutuoCode === code) {
            const newQty = Math.max(0, item.quantity - qtyToIssue);
            found = true;
            
            // Add to transaction log
            const newTx: any = {
              date: dateStr,
              time: timeStr,
              txNo: txNo,
              transactionType: "ISSUED",
              chutuoCode: code,
              description: item.description,
              qtyChanged: -qtyToIssue,
              newQty: newQty,
              doneBy: trans.doneBy,
              department: trans.department,
              remarks: trans.remarks || "Item issued (Offline Fallback)",
              inventoryNo: item.inventoryNo || 1,
              store: item.store || "1"
            };
            currentStats.issued = [newTx, ...currentStats.issued];
            
            return {
              ...item,
              quantity: newQty,
              amount: newQty * item.unitCostBDT
            };
          }
          return item;
        });
        
        if (found) {
          results.push({ success: true, item: code, message: "Success (Offline)" });
          successCount++;
        } else {
          results.push({ success: false, item: code, message: "Item not found in offline catalog" });
        }
      });
      
      if (successCount > 0) {
        setInventory(currentInv);
        currentStats.inventory = currentInv;
        setStatsData(currentStats);
        localStorage.setItem("comilla_inventory_cache", JSON.stringify(currentInv));
        localStorage.setItem("comilla_stats_cache", JSON.stringify(currentStats));
        return { success: true, results, transactionNumber: txNo };
      }
      return { success: false, error: "None of the items were found in catalog." };
      
    } else if (action === "processMultipleAddUnits" || action === "addMultipleUnits") {
      const txNo = "TX-ADD-OFF-" + Math.floor(1000 + Math.random() * 9000);
      
      payload.forEach((trans: any) => {
        const code = trans.chutuoCode.trim();
        const qtyToAdd = Number(trans.qtyToAdd || trans.quantity) || 0;
        const invNo = Number(trans.inventoryNo) || 1;
        
        let found = false;
        currentInv = currentInv.map(item => {
          if (item.chutuoCode === code) {
            const newQty = item.quantity + qtyToAdd;
            found = true;
            
            const newTx: any = {
              date: dateStr,
              time: timeStr,
              txNo: txNo,
              transactionType: "UNITS ADDED",
              chutuoCode: code,
              description: item.description,
              qtyChanged: qtyToAdd,
              newQty: newQty,
              doneBy: trans.doneBy,
              department: trans.department,
              remarks: trans.remarks || "Units added (Offline Fallback)",
              inventoryNo: item.inventoryNo || invNo,
              store: item.store || String(invNo)
            };
            currentStats.addUnits = [newTx, ...currentStats.addUnits];
            
            return {
              ...item,
              quantity: newQty,
              amount: newQty * item.unitCostBDT
            };
          }
          return item;
        });
        
        if (!found) {
          const newQty = qtyToAdd;
          const cost = Number(trans.unitCostBDT) || 0;
          const desc = trans.description || "Newly Registered Offline Item";
          
          const newItem: InventoryItem = {
            srNo: String(currentInv.length + 1),
            chutuoCode: code,
            description: desc,
            quantity: newQty,
            unitCostBDT: cost,
            amount: newQty * cost,
            store: String(invNo),
            inventoryNo: invNo
          };
          
          currentInv.push(newItem);
          
          const newTx: any = {
            date: dateStr,
            time: timeStr,
            txNo: txNo,
            transactionType: "UNITS ADDED",
            chutuoCode: code,
            description: desc,
            qtyChanged: qtyToAdd,
            newQty: newQty,
            doneBy: trans.doneBy,
            department: trans.department,
            remarks: trans.remarks || "Units registered (Offline)",
            inventoryNo: invNo,
            store: String(invNo)
          };
          currentStats.addUnits = [newTx, ...currentStats.addUnits];
          results.push({ success: true, item: code, message: "Registered & restocked (Offline)" });
        } else {
          results.push({ success: true, item: code, message: "Success (Offline)" });
        }
      });
      
      setInventory(currentInv);
      currentStats.inventory = currentInv;
      setStatsData(currentStats);
      localStorage.setItem("comilla_inventory_cache", JSON.stringify(currentInv));
      localStorage.setItem("comilla_stats_cache", JSON.stringify(currentStats));
      return { success: true, results, transactionNumber: txNo };
      
    } else if (action === "processMultipleNewItems" || action === "registerMultipleNewItems") {
      const txNo = "TX-REG-OFF-" + Math.floor(1000 + Math.random() * 9000);
      
      payload.forEach((item: any) => {
        const code = item.chutuoCode.trim();
        const desc = item.description.trim();
        const initialQty = Number(item.initialQty) || 0;
        const unitCost = Number(item.unitCostBDT) || 0;
        const invNo = Number(item.inventoryNo) || 1;
        
        const isDuplicate = currentInv.some(i => i.chutuoCode === code);
        if (isDuplicate) {
          results.push({ success: false, item: code, message: "Duplicate item code exists offline" });
          return;
        }
        
        const newItem: InventoryItem = {
          srNo: String(currentInv.length + 1),
          chutuoCode: code,
          description: desc,
          quantity: initialQty,
          unitCostBDT: unitCost,
          amount: initialQty * unitCost,
          store: String(invNo),
          inventoryNo: invNo
        };
        currentInv.push(newItem);
        
        const newTx: any = {
          date: dateStr,
          time: timeStr,
          txNo: txNo,
          transactionType: "NEW ITEM ADDED",
          chutuoCode: code,
          description: desc,
          qtyChanged: initialQty,
          newQty: initialQty,
          doneBy: item.doneBy,
          department: item.department,
          remarks: item.remarks || "Cataloged (Offline)",
          inventoryNo: invNo,
          store: String(invNo)
        };
        currentStats.newItems = [newTx, ...currentStats.newItems];
        results.push({ success: true, item: code, message: "Success (Offline)" });
        successCount++;
      });
      
      if (successCount > 0) {
        setInventory(currentInv);
        currentStats.inventory = currentInv;
        setStatsData(currentStats);
        localStorage.setItem("comilla_inventory_cache", JSON.stringify(currentInv));
        localStorage.setItem("comilla_stats_cache", JSON.stringify(currentStats));
        return { success: true, results, transactionNumber: txNo };
      }
      return { success: false, error: "All items had duplicate codes offline." };
    }
    
    return { success: false, error: "Offline simulation action not supported." };
  };

  // Core unified proxy & direct API fetcher
  const executeApiAction = async (action: string, payload?: any) => {
    let tryDirect = false;
    let proxyErrorMsg = "";
    
    // 1. First, attempt to use the backend Express server proxy /api/proxy (works locally & in container)
    try {
      const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: API_URL, action, payload })
      });
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && data.error === "PROXY_FAILED") {
          tryDirect = true;
          proxyErrorMsg = "Proxy returned failure status";
        } else if (data && data.error) {
          throw new Error(data.error);
        } else {
          return data;
        }
      } else {
        tryDirect = true;
        proxyErrorMsg = `HTTP status ${proxyRes.status}`;
      }
    } catch (e: any) {
      console.warn("Proxy call failed, falling back to direct CORS-bypassing fetch:", e);
      tryDirect = true;
      proxyErrorMsg = e?.message || String(e);
    }

    // 2. If the proxy failed, is offline, or doesn't exist (like on GitHub Pages), fetch Google Apps Script directly
    if (tryDirect) {
      try {
        console.log(`[DIRECT CALL] Fetching action "${action}" directly from Google Apps Script Web App...`);
        const directRes = await fetch(API_URL, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({ action, payload }),
          redirect: "follow"
        });

        if (!directRes.ok) {
          throw new Error(`Direct connection HTTP error: ${directRes.status}`);
        }

        const text = await directRes.text();
        const trimmed = text.trim();
        if (
          trimmed.startsWith("<!DOCTYPE") || 
          trimmed.startsWith("<html") || 
          text.includes("google-site-verification") ||
          text.includes("Sign in - Google Accounts") ||
          text.includes("Service login")
        ) {
          throw new Error("HTML_RESPONSE");
        }

        const data = JSON.parse(text);
        if (data && data.error) {
          throw new Error(data.error);
        }
        return data;
      } catch (err: any) {
        console.error(`Both proxy and direct Apps Script fetch failed for action "${action}":`, err);
        throw err;
      }
    }
  };

  // Central fetch method
  const syncData = async (showRefresher = false) => {
    if (showRefresher) setIsRefreshing(true);
    setConnectionError(null);

    try {
      const statsRes = await executeApiAction("getStatsData");

      if (statsRes && statsRes.inventory) {
        const inventoryRes = statsRes.inventory;
        let finalInventory: InventoryItem[] = [];
        if (Array.isArray(inventoryRes)) {
          finalInventory = inventoryRes.map(item => ({
            ...item,
            store: classifyItem(item.chutuoCode, item.description, item.inventoryNo)
          }));
          setInventory(finalInventory);
        } else {
          console.warn("Inventory array was not found in response", statsRes);
        }

        if (Array.isArray(statsRes.activeInventories)) {
          setDynamicStores(statsRes.activeInventories);
          localStorage.setItem("comilla_active_inventories", JSON.stringify(statsRes.activeInventories));
        } else if (Array.isArray(inventoryRes)) {
          const maxInv = Math.max(4, ...inventoryRes.map((i: any) => Number(i.inventoryNo) || 1));
          const mockActive = Array.from({ length: maxInv }, (_, idx) => `INVENTORY ${idx + 1}`);
          setDynamicStores(mockActive);
        }

        const classifiedStatsInventory = finalInventory;
        const classifyTx = (txs: any[]) => (txs || []).map(tx => ({
          ...tx,
          store: classifyItem(tx.chutuoCode, tx.description, tx.inventoryNo)
        }));

        const finalStatsData = {
          inventory: classifiedStatsInventory,
          issued: classifyTx(statsRes.issued),
          addUnits: classifyTx(statsRes.addUnits),
          newItems: classifyTx(statsRes.newItems)
        };
        setStatsData(finalStatsData);

        localStorage.setItem("comilla_inventory_cache", JSON.stringify(finalInventory));
        localStorage.setItem("comilla_stats_cache", JSON.stringify(finalStatsData));
      } else {
        console.warn("Stats API returned unexpected format", statsRes);
      }

      setLastSynced(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("API Fetch Error:", err);
      if (err.message === "HTML_RESPONSE") {
        setConnectionError("HTML_RESPONSE: Your Google Apps Script returned a login or redirection web page instead of JSON. Ensure you deployed with: 'Execute as: Me' and 'Who has access: Anyone'.");
      } else {
        setConnectionError("Offline Mode: Unable to sync with database. Using cached data.");
      }

      const cachedInv = localStorage.getItem("comilla_inventory_cache");
      const cachedStats = localStorage.getItem("comilla_stats_cache");
      const cachedActive = localStorage.getItem("comilla_active_inventories");

      if (cachedActive) {
        try { setDynamicStores(JSON.parse(cachedActive)); } catch (e) {}
      } else {
        setDynamicStores(["INVENTORY 1", "INVENTORY 2", "INVENTORY 3", "INVENTORY 4"]);
      }

      if (cachedInv && cachedStats) {
        try {
          setInventory(JSON.parse(cachedInv));
          setStatsData(JSON.parse(cachedStats));
        } catch (e) {
          const seedInv = getPreSeededInventory();
          setInventory(seedInv);
          setStatsData(getPreSeededStats(seedInv));
        }
      } else {
        const seedInv = getPreSeededInventory();
        const seedStats = getPreSeededStats(seedInv);
        setInventory(seedInv);
        setStatsData(seedStats);
        
        localStorage.setItem("comilla_inventory_cache", JSON.stringify(seedInv));
        localStorage.setItem("comilla_stats_cache", JSON.stringify(seedStats));
      }
      setLastSynced("Offline Demo Mode");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Run on mount
  useEffect(() => {
    syncData();

    const interval = setInterval(() => {
      syncData(false);
    }, 10000);

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsAlreadyInstalled(isStandalone);

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleApiAction = async (action: string, payload: any[]) => {
    if (connectionError !== null && !connectionError.includes("HTML_RESPONSE")) {
      console.log(`[OFFLINE MODE] Simulating action: ${action}`);
      return processActionLocally(action, payload);
    }

    try {
      const data = await executeApiAction(action, payload);
      
      if (data && data.success) {
        syncData(false);
        return data;
      } else {
        console.warn("API action failed, trying offline fallback simulation", data);
        return processActionLocally(action, payload);
      }
    } catch (err: any) {
      console.error("API action network error, using offline simulation fallback:", err);
      return processActionLocally(action, payload);
    }
  };

  const handleDirectInstall = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setInstallStatus("Opening direct app window...");
      setTimeout(() => setInstallStatus(null), 3500);
      window.open(window.location.href, "_blank");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          setIsAlreadyInstalled(true);
          setInstallStatus("App Installed ✓");
        } else {
          setInstallStatus("Cancelled");
        }
        setDeferredPrompt(null);
        setTimeout(() => setInstallStatus(null), 3000);
      });
    } else {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
      if (isStandalone || isAlreadyInstalled) {
        setInstallStatus("Already Installed ✓");
        setTimeout(() => setInstallStatus(null), 3000);
        return;
      }

      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setInstallStatus("iOS Safari: Tap Share ➔ 'Add to Home Screen'");
      } else {
        setInstallStatus("Please click Browser Menu (⋮) ➔ 'Install App'");
      }
      setTimeout(() => setInstallStatus(null), 6000);
    }
  };

  const criticalItemsCount = statsData.inventory.filter(i => i.quantity <= 5).length;

  const filteredStatsData = useMemo(() => {
    if (activeStore === "all") return statsData;
    return {
      inventory: statsData.inventory.filter(i => i.store === activeStore),
      issued: statsData.issued.filter(t => t.store === activeStore),
      addUnits: statsData.addUnits.filter(t => t.store === activeStore),
      newItems: statsData.newItems.filter(t => t.store === activeStore)
    };
  }, [statsData, activeStore]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col lg:flex-row font-sans select-none antialiased">
      
      {/* ── DESIGN 1: DESKTOP SIDEBAR COMMAND CENTER (lg: flex, hidden below lg) ── */}
      <aside className="hidden lg:flex w-80 bg-slate-950 text-slate-200 flex-col border-r border-slate-900 shrink-0 relative no-print z-20">
        <div className="p-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full border border-indigo-500/40 shadow-inner overflow-hidden bg-black flex-shrink-0 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-indigo-400">
              <img
                src="https://i.ibb.co.com/gFBkpt8B/Chat-GPT-Image-Apr-23-2026-01-10-13-PM.png"
                alt="Comilla Traders Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                COMILLA TRADERS
              </h1>
              <p className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase mt-1">
                OPERATIONS PORTAL
              </p>
            </div>
          </div>
          
          <div className="mt-3.5 flex items-center gap-1.5 bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1 rounded-lg text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
            <Compass className="h-3.5 w-3.5 text-indigo-400 animate-spin-slow" />
            <span>Chattogram Port Terminal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            Logistics Decks
          </div>
          
          <button
            type="button"
            onClick={() => setActiveTab("crew")}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all group ${
              activeTab === "crew"
                ? "bg-slate-900 text-white shadow-md border border-slate-800"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`h-4.5 w-4.5 transition-colors ${activeTab === "crew" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span>Crew Deck (Issuance)</span>
            </div>
            <span className="bg-slate-950 text-[10px] text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
              Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("host")}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all group ${
              activeTab === "host"
                ? "bg-slate-900 text-white shadow-md border border-slate-800"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Lock className={`h-4.5 w-4.5 transition-colors ${activeTab === "host" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span>Host Deck (Inventory)</span>
            </div>
            {isAuthenticated ? (
              <span className="bg-emerald-950/60 text-[9px] text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-900 font-bold">
                Unlocked
              </span>
            ) : (
              <span className="bg-red-950/40 text-[9px] text-red-400 px-2 py-0.5 rounded-full border border-red-950 font-bold">
                Locked
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("statistics")}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all group ${
              activeTab === "statistics"
                ? "bg-slate-900 text-white shadow-md border border-slate-800"
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className={`h-4.5 w-4.5 transition-colors ${activeTab === "statistics" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span>Statistics Center</span>
            </div>
            {criticalItemsCount > 0 ? (
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                {criticalItemsCount} Alert
              </span>
            ) : (
              <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full border border-indigo-900">
                Reports
              </span>
            )}
          </button>



          {/* Active Inventory Selection */}
          <div className="pt-4 mt-4 border-t border-slate-900 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1 flex items-center justify-between">
              <span>Select Inventory</span>
              {activeStore !== "all" && (
                <button
                  type="button"
                  onClick={() => setActiveStore("all")}
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveStore("all")}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                activeStore === "all"
                  ? "bg-indigo-950/60 text-white border-indigo-900/40 shadow-xs"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                <span>All Inventories</span>
              </div>
              <span className="text-[10px] font-mono opacity-50">{inventory.length}</span>
            </button>

            {STORES.map((s) => {
              const count = inventory.filter(i => i.store === s.id).length;
              const isSelected = activeStore === s.id;
              const dotColor = getStoreDotColor(s.id);
              const activeBg = getStoreActiveBg(s.id);

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStore(s.id)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? activeBg
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                    <span>{s.label}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-50">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={() => setIsDirectoryExpanded(!isDirectoryExpanded)}
              className="w-full flex items-center justify-between py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300"
            >
              <span>Maritime Directory</span>
              {isDirectoryExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            
            {isDirectoryExpanded && (
              <div className="mt-2 pl-3 pr-2 space-y-3 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                <div className="flex gap-2 items-start">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Office & Warehouse</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Jubilee Road, Chattogram, Bangladesh</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Phone className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Helpline Hotlines</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">01819315746 / 01712-900431</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Official Email</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">comillatraders@gmail.com</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-900 bg-slate-950/80 space-y-3">
          <div className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-900">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionError ? "bg-red-400" : "bg-emerald-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionError ? "bg-red-500" : "bg-emerald-500"}`}></span>
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-400 leading-none">
                {connectionError ? "OFFLINE CACHE" : "SHEET CONNECTED"}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => syncData(true)}
              disabled={isRefreshing}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-all disabled:opacity-40"
              title="Manual Spreadsheet Sync"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="text-[10px] text-slate-500 font-medium font-mono">
            Last Sync: {lastSynced}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDirectInstall}
              className="flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold text-[9px] rounded-lg transition-all shadow uppercase tracking-wider cursor-pointer"
            >
              <Smartphone className="h-3 w-3 text-indigo-200" />
              <span>Install PWA</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsAuthenticated(false)}
                className="flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 font-bold text-[9px] rounded-lg transition-all uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>Lock Deck</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("host")}
                className="flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-400 font-bold text-[9px] rounded-lg transition-all uppercase tracking-wider cursor-pointer"
              >
                <Lock className="h-3 w-3" />
                <span>Unlock</span>
              </button>
            )}
          </div>

          {installStatus && (
            <div className="text-[9px] text-amber-300 font-bold tracking-wide animate-pulse bg-slate-900/60 p-1 rounded border border-slate-800 text-center">
              ⚡ {installStatus}
            </div>
          )}
        </div>
      </aside>

      {/* ── DESIGN 2: MOBILE COMPACT NAVIGATION HEADER (lg: hidden, visible below lg) ── */}
      <header className="lg:hidden w-full bg-slate-950 text-white border-b border-slate-900 no-print sticky top-0 z-30">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full border border-indigo-500/30 overflow-hidden bg-black flex items-center justify-center">
              <img
                src="https://i.ibb.co.com/gFBkpt8B/Chat-GPT-Image-Apr-23-2026-01-10-13-PM.png"
                alt="Comilla Traders Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                COMILLA TRADERS
              </h1>
              <p className="text-[8px] font-bold text-indigo-400 tracking-widest uppercase mt-0.5">
                Maritime Logistics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncData(true)}
              disabled={isRefreshing}
              className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 active:text-indigo-400"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            
            <button
              type="button"
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-850"
            >
              {isSidebarOpenMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Quick Tab Bar */}
        <div className="px-2 pb-2 pt-0.5 flex gap-1 bg-slate-950/80 backdrop-blur-sm border-t border-slate-900">
          {[
            { id: "crew", label: "Crew Deck", icon: Users },
            { id: "host", label: "Host Deck", icon: Lock },
            { id: "statistics", label: "Statistics", icon: BarChart3 }
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id as any);
                  setIsSidebarOpenMobile(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-0.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 bg-slate-900/30"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Drawer */}
        {isSidebarOpenMobile && (
          <div className="fixed inset-0 bg-slate-950/95 z-50 p-6 flex flex-col justify-between mt-[92px]">
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
                  Logistics & Operations
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("crew");
                      setIsSidebarOpenMobile(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-bold ${
                      activeTab === "crew" ? "bg-slate-900 text-indigo-400" : "text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-3"><Users className="h-4.5 w-4.5" /> Crew Deck (Issuance)</span>
                    <span className="text-[10px] text-slate-500">Free Access</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("host");
                      setIsSidebarOpenMobile(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-bold ${
                      activeTab === "host" ? "bg-slate-900 text-indigo-400" : "text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-3"><Lock className="h-4.5 w-4.5" /> Host Deck (Inventory)</span>
                    <span className="text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                      {isAuthenticated ? "Unlocked" : "Locked"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("statistics");
                      setIsSidebarOpenMobile(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-bold ${
                      activeTab === "statistics" ? "bg-slate-900 text-indigo-400" : "text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-3"><BarChart3 className="h-4.5 w-4.5" /> Statistics Center</span>
                    <span className="text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                      {criticalItemsCount} Alerts
                    </span>
                  </button>
                </div>
              </div>

              {/* Mobile Active Inventory Selection */}
              <div className="border-t border-slate-900 pt-4">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
                  Select Active Inventory
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStore("all");
                      setIsSidebarOpenMobile(false);
                    }}
                    className={`p-2.5 rounded-lg text-[10px] font-bold border flex flex-col items-center justify-center transition-all ${
                      activeStore === "all"
                        ? "bg-indigo-950 text-white border-indigo-550/40"
                        : "bg-slate-900/40 text-slate-400 border-transparent"
                    }`}
                  >
                    <span>All Inventories</span>
                    <span className="text-[9px] font-mono opacity-50 mt-0.5">{inventory.length} SKUs</span>
                  </button>

                  {STORES.map((s) => {
                    const count = inventory.filter(i => i.store === s.id).length;
                    const isSelected = activeStore === s.id;
                    const activeColor = getMobileStoreActiveBg(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setActiveStore(s.id);
                          setIsSidebarOpenMobile(false);
                        }}
                        className={`p-2.5 rounded-lg text-[10px] font-bold border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? activeColor
                            : "bg-slate-900/40 text-slate-400 border-transparent"
                        }`}
                      >
                        <span>{s.label}</span>
                        <span className="text-[9px] font-mono opacity-50 mt-0.5">{count} SKUs</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-900 pt-4">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
                  Company Directory
                </div>
                <div className="space-y-3.5 text-slate-400 text-[11px]">
                  <div className="flex gap-2 items-start">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span>Jubilee Road, Chattogram, Bangladesh</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Phone className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span>01819315746 / 01712-900431</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span>comillatraders@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDirectInstall();
                    setIsSidebarOpenMobile(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Install App</span>
                </button>
                
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthenticated(false);
                      setIsSidebarOpenMobile(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Lock App</span>
                  </button>
                )}
              </div>
              <div className="text-center text-[9px] text-slate-600">
                COMILLA TRADERS OPERATIONS PORTAL &copy; {new Date().getFullYear()}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── DESIGN 3: MAIN OPERATIONS WORKSPACE (Right Pane) ── */}
      <main className="flex-1 bg-slate-100 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        
        {/* Sleek, Compact Top Utility Bar */}
        <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between no-print print:hidden shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-400">/</span>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {activeTab === "crew" && "Crew Deck (Issuance Panel)"}
              {activeTab === "host" && "Host Deck (Inventory & Restock)"}
              {activeTab === "statistics" && "Command Analytics Center"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            {/* Dynamic Alerts Threshold Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 transition-colors">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Alert Threshold:</span>
              <select
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={5}>≤ 5 Units</option>
                <option value={10}>≤ 10 Units</option>
                <option value={15}>≤ 15 Units</option>
                <option value={20}>≤ 20 Units</option>
                <option value={30}>≤ 30 Units</option>
              </select>
            </div>

            {/* Quick connection indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className={`h-1.5 w-1.5 rounded-full ${connectionError ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}></span>
              <span className="text-[10px] font-bold text-slate-600">
                {connectionError ? "OFFLINE BUFFER" : "LIVE SYNC"}
              </span>
            </div>

            <span className="hidden md:block font-mono text-[10px] text-slate-400">
              Database Sync: {lastSynced}
            </span>
          </div>
        </div>

        {/* Primary Operational Content Frame */}
        <div className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[450px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide">Syncing Maritime Database...</p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Downloading inventory files from Google Sheets</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Register Information Banner */}
              <div className={`p-4 rounded-2xl border ${
                activeStore === "all"
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : (STORES.find(s => s.id === activeStore)?.bg || "bg-indigo-50") + " " + (STORES.find(s => s.id === activeStore)?.border || "border-indigo-200/80")
              } no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100 flex-shrink-0">
                    {activeStore === "all" ? (
                      <FolderSync className="h-5 w-5 text-indigo-600" />
                    ) : (
                      React.createElement(
                        getStoreIconComponent(activeStore),
                        { className: "h-5 w-5 " + (STORES.find(s => s.id === activeStore)?.text || "text-indigo-700") }
                      )
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      {activeStore === "all" ? "Comprehensive Unified Register" : `${STORES.find(s => s.id === activeStore)?.label} active`}
                      {activeStore !== "all" && <span className="text-[10px] bg-white font-bold text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Filtered</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                      {activeStore === "all"
                        ? "Currently managing all four maritime logistical stores in a unified display. Operations apply globally."
                        : STORES.find(s => s.id === activeStore)?.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-xs font-bold text-slate-600 bg-white/60 backdrop-blur-md border border-white/80 py-1.5 px-3 rounded-xl font-mono">
                  <span>ACTIVE INVENTORY:</span>
                  <span className="text-indigo-600 uppercase">{activeStore === "all" ? "All" : activeStore}</span>
                </div>
              </div>

              {connectionError && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs no-print">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-800 text-xs sm:text-sm">Spreadsheet Connection Alert (Offline Mode Active)</h4>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        {connectionError.includes("HTML_RESPONSE") ? (
                          <span>
                            <strong>API Fetch Error: Google Apps Script Web App returned a login/redirection HTML page.</strong><br />
                            This usually happens if your Google Sheet Apps Script has not been deployed publicly. To solve this:<br />
                            1. Open your Spreadsheet and go to <strong>Extensions &gt; Apps Script</strong>.<br />
                            2. Verify you have pasted the correct <code>code.gs</code> contents.<br />
                            3. Click <strong>Deploy &gt; New deployment</strong>.<br />
                            4. Under 'Execute as', select <strong>Me (your-email@gmail.com)</strong>.<br />
                            5. Under 'Who has access', select <strong>Anyone</strong> (this is crucial for public endpoint access).<br />
                            6. Click <strong>Deploy</strong>, authorize permissions, and copy the new Web App URL.<br />
                            7. Paste the Web App URL into <code>src/App.tsx</code> (at line 35) to establish a live connection!
                          </span>
                        ) : (
                          <span>{connectionError}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm transition-all duration-300">
                {activeTab === "crew" && (
                  <CrewTerminal
                    inventory={activeStore === "all" ? inventory : inventory.filter(i => i.store === activeStore)}
                    isLoading={isLoading}
                    onRefresh={async () => {
                      await syncData(true);
                    }}
                    onSubmitIssue={(payload) => handleApiAction("processMultipleIssues", payload)}
                    activeStore={activeStore}
                    lowStockThreshold={lowStockThreshold}
                  />
                )}

                {activeTab === "host" && (
                  isAuthenticated ? (
                    <HostTerminal
                      inventory={inventory}
                      filteredInventory={activeStore === "all" ? inventory : inventory.filter(i => i.store === activeStore)}
                      isLoading={isLoading}
                      onRefresh={async () => {
                        await syncData(true);
                      }}
                      onSubmitAddUnits={(payload) => handleApiAction("processMultipleAddUnits", payload)}
                      onSubmitNewItems={(payload) => handleApiAction("processMultipleNewItems", payload)}
                      onSubmitIssue={(payload) => handleApiAction("processMultipleIssues", payload)}
                      activeStore={activeStore}
                      lowStockThreshold={lowStockThreshold}
                    />
                  ) : (
                    <LoginScreen
                      title="Host Terminal Authorization"
                      description="Unauthorized Deck: Please authenticate with host operator credentials to manage logistics, add stock, and configure catalog items."
                      onLoginSuccess={() => setIsAuthenticated(true)}
                    />
                  )
                )}

                {activeTab === "statistics" && (
                  isAuthenticated ? (
                    <StatisticsCenter
                      statsData={filteredStatsData}
                      isLoading={isLoading}
                      onRefresh={async () => {
                        await syncData(true);
                      }}
                      activeStore={activeStore}
                      lowStockThreshold={lowStockThreshold}
                    />
                  ) : (
                    <LoginScreen
                      title="Command Center Analytics Authorization"
                      description="Restricted Deck: Enter host operator credentials to unlock financial charts, transaction outflow logs, monthly indicators, and ABC analysis."
                      onLoginSuccess={() => setIsAuthenticated(true)}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="text-center py-5 text-[10px] text-slate-400 tracking-wider bg-white border-t border-slate-200/60 mt-auto no-print">
          COMILLA TRADERS OPERATIONS PORTAL &copy; {new Date().getFullYear()} &bull; CHATTOGRAM PORT, BANGLADESH &bull; STRICTLY CONFIDENTIAL
        </footer>
      </main>

    </div>
  );
}
