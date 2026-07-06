import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Package,
  FileText,
  Users,
  LineChart,
  Grid,
  Filter,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  Printer,
  ExternalLink,
  X,
  Download,
  Info
} from "lucide-react";
import { StatsData, InventoryItem, Transaction } from "../types";
import { cleanDescription, STORES } from "../utils/storeClassifier";

// ── POLAR TO CARTESIAN FOR PIE/DOUGHNUT ARC ──
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

interface StatisticsCenterProps {
  statsData: StatsData;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  activeStore?: string;
  lowStockThreshold?: number;
}

export default function StatisticsCenter({ statsData, isLoading, onRefresh, activeStore, lowStockThreshold = 5 }: StatisticsCenterProps) {
  const [subTab, setSubTab] = useState<"overview" | "inventory" | "issuance" | "buyers" | "trends" | "abc">("overview");

  // Filter States
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [tempFromDate, setTempFromDate] = useState("");
  const [tempToDate, setTempToDate] = useState("");
  const [tempDeptFilter, setTempDeptFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [restockTargetQty, setRestockTargetQty] = useState<number>(20);

  const hasPendingChanges = tempFromDate !== fromDate || tempToDate !== toDate || tempDeptFilter !== deptFilter;

  const applyFilters = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setDeptFilter(tempDeptFilter);
  };

  // Print Fallback Modal States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSectionName, setPrintSectionName] = useState("");

  const handlePrint = (section?: string) => {
    const isIframe = () => {
      try {
        return window.self !== window.self.top;
      } catch (e) {
        return true;
      }
    };

    if (isIframe()) {
      setPrintSectionName(section || subTab);
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentDataCSV = (section?: string) => {
    const activeSection = section || subTab;
    if (activeSection === "inventory") {
      const headers = ["IMPA Code", "Description", "In Stock", "Unit Cost (BDT)", "Total Valuation (BDT)"];
      const rows = filteredInventory.map(item => [
        item.chutuoCode,
        item.description,
        item.quantity,
        item.unitCostBDT,
        item.amount
      ]);
      downloadCSV(headers, rows, `comilla-traders-inventory-catalog.csv`);
    } else if (activeSection === "issuance" || activeSection === "buyers") {
      const headers = ["Date", "IMPA Code", "Description", "Issued To / Done By", "Department", "Qty Issued", "Remarks"];
      const rows = filteredIssued.map(item => [
        new Date(item.timestamp || item.date).toLocaleDateString(),
        item.chutuoCode,
        item.description,
        item.doneBy,
        item.department,
        Math.abs(Number(item.qtyChanged)),
        item.remarks || ""
      ]);
      downloadCSV(headers, rows, `comilla-traders-${activeSection}-report.csv`);
    } else if (activeSection === "abc") {
      const headers = ["Rank", "IMPA Code", "Description", "Valuation (BDT)", "Cumulative Pct", "Class"];
      const rows = abcAnalysis.classified.map((item, idx) => [
        idx + 1,
        item.chutuoCode,
        item.description,
        item.amount,
        `${item.cumPct.toFixed(1)}%`,
        item.class
      ]);
      downloadCSV(headers, rows, `comilla-traders-abc-pareto-analysis.csv`);
    } else {
      const totalValuation = filteredInventory.reduce((sum, item) => sum + item.amount, 0);
      const totalQty = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
      const headers = ["Metric", "Value"];
      const rows = [
        ["Total Registered Items", filteredInventory.length],
        ["Total Inventory Valuation", `৳${Math.round(totalValuation).toLocaleString()}`],
        ["Total Quantity In-Stock", totalQty],
        ["Critical Low Stock Items count", filteredInventory.filter(i => i.quantity <= 10).length]
      ];
      downloadCSV(headers, rows, `comilla-traders-overview-summary.csv`);
    }
  };

  const formatCostBDT = (cost: number) => `৳${Math.round(cost || 0).toLocaleString()}`;

  // Build local inventory mapping
  const inventoryMap = useMemo(() => {
    const map: Record<string, InventoryItem> = {};
    statsData.inventory.forEach((i) => {
      map[i.chutuoCode] = i;
    });
    return map;
  }, [statsData.inventory]);

  // Derived metrics calculators
  const valueOf = (r: Transaction) => {
    const inv = inventoryMap[r.chutuoCode];
    const qty = Math.abs(parseInt(r.qtyChanged as string) || 0);
    return qty * (inv ? inv.unitCostBDT : 0);
  };

  const qtyOf = (r: Transaction) => Math.abs(parseInt(r.qtyChanged as string) || 0);

  const buyerOf = (r: Transaction) => {
    const rem = (r.remarks || "").trim();
    return rem && rem !== "Item issued" && rem !== "-" ? rem : r.doneBy || "N/A";
  };

  // Get unique departments list for filters
  const departments = useMemo(() => {
    const depts = new Set<string>();
    statsData.issued.forEach((r) => r.department && depts.add(r.department.trim()));
    return Array.from(depts).sort();
  }, [statsData.issued]);

  // Filtering Logic
  const filteredIssued = useMemo(() => {
    return statsData.issued.filter((r) => {
      if (fromDate && new Date(r.date) < new Date(fromDate)) return false;
      if (toDate && new Date(r.date) > new Date(toDate)) return false;
      if (deptFilter && r.department?.toLowerCase() !== deptFilter.toLowerCase()) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCode = r.chutuoCode.toLowerCase().includes(query);
        const matchesDesc = r.description?.toLowerCase().includes(query);
        const matchesBuyer = buyerOf(r).toLowerCase().includes(query);
        if (!matchesCode && !matchesDesc && !matchesBuyer) return false;
      }
      return true;
    });
  }, [statsData.issued, fromDate, toDate, deptFilter, searchQuery, inventoryMap]);

  const filteredAdded = useMemo(() => {
    return statsData.addUnits.filter((r) => {
      if (fromDate && new Date(r.date) < new Date(fromDate)) return false;
      if (toDate && new Date(r.date) > new Date(toDate)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !r.chutuoCode.toLowerCase().includes(query) &&
          !r.description?.toLowerCase().includes(query)
        )
          return false;
      }
      return true;
    });
  }, [statsData.addUnits, fromDate, toDate, searchQuery]);

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    
    // Format as YYYY-MM-DD
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setTempToDate(formatDate(to));
    setTempFromDate(formatDate(from));
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setDeptFilter("");
    setTempFromDate("");
    setTempToDate("");
    setTempDeptFilter("");
    setSearchQuery("");
  };

  const filteredInventory = useMemo(() => {
    return statsData.inventory.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCode = item.chutuoCode.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        return matchesCode || matchesDesc;
      }
      return true;
    });
  }, [statsData.inventory, searchQuery]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    const totalInventoryValue = filteredInventory.reduce((sum, item) => sum + item.amount, 0);
    const totalIssuedValue = filteredIssued.reduce((sum, item) => sum + valueOf(item), 0);
    const totalRestocksCount = filteredAdded.length;
    const criticalItemsCount = filteredInventory.filter((item) => item.quantity <= lowStockThreshold).length;

    return {
      totalInventoryValue,
      totalIssuedValue,
      totalRestocksCount,
      criticalItemsCount,
    };
  }, [filteredInventory, filteredIssued, filteredAdded, inventoryMap]);

  const deadStockItems = useMemo(() => {
    const issuedCodes = new Set(filteredIssued.map((r) => r.chutuoCode));
    return filteredInventory.filter((item) => item.quantity > 0 && !issuedCodes.has(item.chutuoCode));
  }, [filteredInventory, filteredIssued]);

  const reorderForecast = useMemo(() => {
    const underStockedItems = filteredInventory.filter((item) => item.quantity < restockTargetQty);
    const totalItemsToOrder = underStockedItems.length;
    const totalUnitsToOrder = underStockedItems.reduce((sum, item) => sum + (restockTargetQty - item.quantity), 0);
    const totalRequiredBudget = underStockedItems.reduce((sum, item) => sum + (restockTargetQty - item.quantity) * item.unitCostBDT, 0);

    return {
      underStockedItems,
      totalItemsToOrder,
      totalUnitsToOrder,
      totalRequiredBudget,
    };
  }, [filteredInventory, restockTargetQty]);

  // --- SVG BAR CHART FOR HIGH VALUE ITEMS ---
  const highValueItemsData = useMemo(() => {
    return [...filteredInventory]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredInventory]);

  const highValueChart = useMemo(() => {
    if (highValueItemsData.length === 0) return null;
    const maxVal = Math.max(...highValueItemsData.map((d) => d.amount), 1);
    const height = 180;
    const width = 450;
    const barWidth = 32;
    const gap = 18;
    const paddingLeft = 60;
    const paddingBottom = 25;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = 15 + (height - 15 - paddingBottom) * (1 - ratio);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - 20}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[9px] font-semibold"
              >
                {Math.round((maxVal * ratio) / 1000)}k
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {highValueItemsData.map((item, idx) => {
          const barHeight = ((height - 15 - paddingBottom) * item.amount) / maxVal;
          const x = paddingLeft + idx * (barWidth + gap) + 5;
          const y = height - paddingBottom - barHeight;

          return (
            <g key={`${item.chutuoCode}-${idx}`} className="group cursor-pointer">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill="url(#barGradient)"
                rx="4"
                className="transition-all duration-300 hover:fill-indigo-500"
              />
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[8px] font-bold"
              >
                {item.chutuoCode}
              </text>
              {/* Tooltip on hover */}
              <title>{`${item.chutuoCode}: ৳${Math.round(item.amount).toLocaleString()}`}</title>
            </g>
          );
        })}

        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
      </svg>
    );
  }, [highValueItemsData]);

  // --- SVG DOUGHNUT CHART FOR STOCK HEALTH ---
  const stockHealthChart = useMemo(() => {
    const items = filteredInventory;
    const critical = items.filter((i) => i.quantity <= lowStockThreshold).length;
    const low = items.filter((i) => i.quantity > lowStockThreshold && i.quantity <= (lowStockThreshold * 3)).length;
    const healthy = items.filter((i) => i.quantity > (lowStockThreshold * 3)).length;
    const total = critical + low + healthy || 1;

    const data = [
      { label: `Critical (≤${lowStockThreshold})`, count: critical, color: "#ef4444" },
      { label: `Low (${lowStockThreshold}-${lowStockThreshold * 3})`, count: low, color: "#f59e0b" },
      { label: `Healthy (>${lowStockThreshold * 3})`, count: healthy, color: "#10b981" },
    ];

    let currentAngle = 0;
    const size = 150;
    const radius = 55;
    const cx = size / 2;
    const cy = size / 2;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="relative w-36 h-36">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
            {data.map((slice, idx) => {
              const angle = (slice.count / total) * 360;
              if (angle === 0) return null;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle = endAngle;

              // If single slice takes up whole doughnut
              if (angle >= 359.9) {
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="14"
                  />
                );
              }

              const pathData = describeArc(cx, cy, radius, startAngle, endAngle);
              return (
                <path
                  key={idx}
                  d={pathData}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  className="transition-all hover:stroke-[16px] cursor-pointer"
                >
                  <title>{`${slice.label}: ${slice.count} items (${Math.round((slice.count / total) * 100)}%)`}</title>
                </path>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold text-slate-800">{total}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SKUs</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {data.map((slice, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }}></span>
              <span className="text-xs font-semibold text-slate-600">{slice.label}:</span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {slice.count} ({Math.round((slice.count / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [filteredInventory]);

  // --- SVG LINE/AREA CHART FOR ISSUED VALUE TREND ---
  const issuedTrendChartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    filteredIssued.forEach((r) => {
      byDate[r.date] = (byDate[r.date] || 0) + valueOf(r);
    });
    return Object.keys(byDate)
      .sort()
      .map((date) => ({ date, value: byDate[date] }));
  }, [filteredIssued, inventoryMap]);

  const issuedTrendChart = useMemo(() => {
    if (issuedTrendChartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400 text-xs">
          No transactions in filtered date range.
        </div>
      );
    }
    const maxVal = Math.max(...issuedTrendChartData.map((d) => d.value), 1000);
    const height = 150;
    const width = 500;
    const paddingLeft = 55;
    const paddingBottom = 20;
    const rightPadding = 20;

    const usableWidth = width - paddingLeft - rightPadding;
    const usableHeight = height - 15 - paddingBottom;

    // Create line points coordinate
    const points = issuedTrendChartData.map((d, idx) => {
      const x = paddingLeft + (idx / (issuedTrendChartData.length - 1 || 1)) * usableWidth;
      const y = 15 + usableHeight * (1 - d.value / maxVal);
      return { x, y, value: d.value, date: d.date };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : "";

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#areaFillGradient)" />}

        {/* Axis & gridlines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = 15 + usableHeight * (1 - ratio);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - rightPadding}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[9px] font-semibold"
              >
                ৳{Math.round((maxVal * ratio) / 1000)}k
              </text>
            </g>
          );
        })}

        {/* Sparkline path */}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

        {/* Interactive dots */}
        {points.length < 50 &&
          points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-white stroke-indigo-500 stroke-2 hover:r-6 cursor-pointer transition-all duration-150"
            >
              <title>{`${p.date}: ৳${Math.round(p.value).toLocaleString()}`}</title>
            </circle>
          ))}

        <defs>
          <linearGradient id="areaFillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  }, [issuedTrendChartData]);

  // --- DEPARTMENTS AND BUYERS CALCULATORS ---
  const buyersAnalytics = useMemo(() => {
    const buyersMap: Record<string, { count: number; qty: number; val: number; last: string }> = {};
    const deptsMap: Record<string, number> = {};

    filteredIssued.forEach((r) => {
      const b = buyerOf(r);
      const d = (r.department || "N/A").trim();
      const val = valueOf(r);

      // Buyers
      if (!buyersMap[b]) {
        buyersMap[b] = { count: 0, qty: 0, val: 0, last: r.date };
      }
      buyersMap[b].qty += qtyOf(r);
      buyersMap[b].val += val;
      buyersMap[b].count += 1;
      if (new Date(r.date) > new Date(buyersMap[b].last)) {
        buyersMap[b].last = r.date;
      }

      // Departments
      deptsMap[d] = (deptsMap[d] || 0) + val;
    });

    const sortedBuyers = Object.entries(buyersMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.val - a.val);

    const sortedDepts = Object.entries(deptsMap)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);

    return {
      buyers: sortedBuyers,
      depts: sortedDepts,
    };
  }, [filteredIssued, inventoryMap]);

  // --- SVG BAR CHART FOR TOP BUYERS ---
  const topBuyersChart = useMemo(() => {
    const data = buyersAnalytics.buyers.slice(0, 5);
    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-slate-400 text-xs">No buyer data available.</div>;
    }
    const maxVal = Math.max(...data.map((d) => d.val), 1);
    const width = 450;
    const height = 150;
    const paddingLeft = 85;
    const paddingRight = 20;
    const paddingBottom = 10;
    const rowHeight = 25;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {data.map((d, idx) => {
          const y = idx * rowHeight + 10;
          const barWidth = ((width - paddingLeft - paddingRight) * d.val) / maxVal;

          return (
            <g key={d.name} className="group">
              <text
                x={paddingLeft - 10}
                y={y + 14}
                textAnchor="end"
                className="fill-slate-600 font-sans font-bold text-[9px] truncate"
              >
                {d.name.length > 12 ? `${d.name.slice(0, 11)}..` : d.name}
              </text>
              <rect
                x={paddingLeft}
                y={y + 4}
                width={Math.max(barWidth, 2)}
                height={12}
                fill="#0f766e"
                rx="3"
                className="transition-all hover:fill-teal-500 cursor-pointer"
              >
                <title>{`${d.name}: ৳${Math.round(d.val).toLocaleString()}`}</title>
              </rect>
              <text
                x={paddingLeft + barWidth + 6}
                y={y + 14}
                className="fill-slate-400 font-mono text-[8px] font-bold"
              >
                ৳{Math.round(d.val / 1000)}k
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [buyersAnalytics.buyers]);

  // --- SVG BAR CHART FOR TRENDS (In vs Out Value) ---
  const monthlyTrendsData = useMemo(() => {
    const monthly: Record<string, { inV: number; outV: number; count: number }> = {};
    const processTx = (r: Transaction, type: "in" | "out") => {
      const month = (r.date || "").substring(0, 7); // YYYY-MM
      if (!month) return;
      if (!monthly[month]) monthly[month] = { inV: 0, outV: 0, count: 0 };
      const val = valueOf(r);
      if (type === "in") monthly[month].inV += val;
      else monthly[month].outV += val;
      monthly[month].count++;
    };

    filteredIssued.forEach((r) => processTx(r, "out"));
    filteredAdded.forEach((r) => processTx(r, "in"));

    return Object.entries(monthly)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }, [filteredIssued, filteredAdded, inventoryMap]);

  const monthlyTrendsChart = useMemo(() => {
    if (monthlyTrendsData.length === 0) {
      return <div className="flex items-center justify-center h-full text-slate-400 text-xs">No monthly trend data.</div>;
    }
    const maxVal = Math.max(...monthlyTrendsData.map((d) => Math.max(d.inV, d.outV)), 1000);
    const height = 160;
    const width = 450;
    const paddingLeft = 55;
    const paddingBottom = 25;
    const rightPadding = 20;

    const usableWidth = width - paddingLeft - rightPadding;
    const colWidth = usableWidth / monthlyTrendsData.length;
    const barWidth = colWidth * 0.35;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Horizontal grids */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = 10 + (height - 10 - paddingBottom) * (1 - ratio);
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - rightPadding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="fill-slate-400 font-mono text-[8px] font-bold">
                ৳{Math.round((maxVal * ratio) / 1000)}k
              </text>
            </g>
          );
        })}

        {monthlyTrendsData.map((d, idx) => {
          const xBase = paddingLeft + idx * colWidth;
          const outH = ((height - 10 - paddingBottom) * d.outV) / maxVal;
          const inH = ((height - 10 - paddingBottom) * d.inV) / maxVal;

          return (
            <g key={d.month}>
              {/* Out (Red) */}
              <rect
                x={xBase + colWidth * 0.12}
                y={height - paddingBottom - outH}
                width={barWidth}
                height={Math.max(outH, 2)}
                fill="#f87171"
                rx="3"
                className="transition-colors hover:fill-red-500 cursor-pointer"
              >
                <title>{`Issued Out: ৳${Math.round(d.outV).toLocaleString()}`}</title>
              </rect>
              {/* In (Green) */}
              <rect
                x={xBase + colWidth * 0.12 + barWidth + 4}
                y={height - paddingBottom - inH}
                width={barWidth}
                height={Math.max(inH, 2)}
                fill="#34d399"
                rx="3"
                className="transition-colors hover:fill-emerald-500 cursor-pointer"
              >
                <title>{`Added In: ৳${Math.round(d.inV).toLocaleString()}`}</title>
              </rect>
              {/* Label */}
              <text
                x={xBase + colWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[8px] font-bold"
              >
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [monthlyTrendsData]);

  // --- ABC PARETO ANALYSIS CALCULATOR ---
  const abcAnalysis = useMemo(() => {
    const sorted = [...filteredInventory]
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const totalVal = sorted.reduce((sum, item) => sum + item.amount, 0);

    let cum = 0;
    const classified = sorted.map((item, idx) => {
      cum += item.amount;
      const pct = totalVal > 0 ? (cum / totalVal) * 100 : 0;
      let classification: "A" | "B" | "C" = "C";
      if (pct <= 70) classification = "A";
      else if (pct <= 95) classification = "B";

      return {
        ...item,
        cumPct: pct,
        rank: idx + 1,
        class: classification,
      };
    });

    return {
      classified,
      totalVal,
    };
  }, [filteredInventory]);

  const abcParetoChart = useMemo(() => {
    const data = abcAnalysis.classified.slice(0, 15);
    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-slate-400 text-xs">No active inventory value to analyze.</div>;
    }
    const height = 150;
    const width = 500;
    const paddingLeft = 55;
    const paddingBottom = 20;
    const rightPadding = 45;

    const usableWidth = width - paddingLeft - rightPadding;
    const usableHeight = height - 15 - paddingBottom;

    // Line points for cumulative percentage
    const points = data.map((d, idx) => {
      const x = paddingLeft + (idx / (data.length - 1 || 1)) * usableWidth;
      const y = 15 + usableHeight * (1 - d.cumPct / 100);
      return { x, y, pct: d.cumPct, code: d.chutuoCode };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grids and Axes */}
        {[0, 20, 40, 60, 80, 100].map((val) => {
          const y = 15 + usableHeight * (1 - val / 100);
          return (
            <g key={val}>
              <line x1={paddingLeft} y1={y} x2={width - rightPadding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="fill-slate-400 font-mono text-[8px] font-bold">
                {val}%
              </text>
            </g>
          );
        })}

        {/* Pareto Curve line */}
        <path d={linePath} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />

        {/* Points */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="4.5"
            className="fill-rose-50 stroke-rose-600 stroke-2 hover:r-6 cursor-pointer transition-all"
          >
            <title>{`${p.code}: Cumulative ${p.pct.toFixed(1)}%`}</title>
          </circle>
        ))}
      </svg>
    );
  }, [abcAnalysis.classified]);

  return (
    <div className="flex flex-col space-y-6">
      {/* Printable Report Header */}
      <div className="print-only-header text-center border-b pb-6 mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">COMILLA TRADERS</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
          {activeStore && activeStore !== "all" 
            ? `${activeStore.toUpperCase()} STORE REGISTER ANALYTICS REPORT` 
            : "OPERATIONS PORTAL - ANALYTICS REPORT"}
        </p>
        <div className="flex justify-between text-xs text-slate-400 font-mono mt-4 border-t pt-4">
          <span>REPORT SECTION: {subTab.toUpperCase()}</span>
          <span>DATE GENERATED: {new Date().toLocaleString()}</span>
          <span>FILTER: {fromDate || toDate ? `Range: [${fromDate || "Start"} to ${toDate || "End"}]` : "All Time"} {deptFilter ? `| Department: ${deptFilter}` : ""}</span>
        </div>
      </div>

      {/* Filters Dashboard Panel */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm no-print">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4 justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-grow max-w-4xl">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> From Date
              </span>
              <input
                type="date"
                value={tempFromDate}
                onChange={(e) => setTempFromDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-full px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> To Date
              </span>
              <input
                type="date"
                value={tempToDate}
                onChange={(e) => setTempToDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-full px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" /> Department
              </span>
              <select
                value={tempDeptFilter}
                onChange={(e) => setTempDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-full px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all w-full"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Duration Presets */}
            <div className="flex flex-col gap-1.5 sm:col-span-3 md:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset(7)}
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(30)}
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(90)}
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  90D
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap xl:self-end">
            {/* SEARCH / APPLY BUTTON */}
            <button
              type="button"
              onClick={applyFilters}
              className={`text-xs font-bold px-5 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                hasPendingChanges
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 ring-4 ring-indigo-500/20 border border-indigo-600"
                  : "bg-slate-900 text-white hover:bg-slate-800 border border-slate-900"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search Duration</span>
              {hasPendingChanges && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 rounded-full transition-all cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handlePrint()}
              className="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 px-4 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Tabs Menu */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-2xl mx-auto shadow-sm border border-slate-200 overflow-x-auto gap-1 no-print">
        {[
          { id: "overview", label: "Overview", icon: Grid },
          { id: "inventory", label: "Inventory", icon: Package },
          { id: "issuance", label: "Issuance", icon: FileText },
          { id: "buyers", label: "Buyers", icon: Users },
          { id: "trends", label: "Trends", icon: TrendingUp },
          { id: "abc", label: "ABC Analysis", icon: LineChart },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                subTab === item.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW: OVERVIEW */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* Section Header with Print Option */}
          <div className="flex justify-between items-center no-print bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Grid className="h-4 w-4 text-slate-400" />
              <span>Overview Dashboard</span>
            </h2>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Overview</span>
            </button>
          </div>
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Valuation",
                val: formatCostBDT(kpiData.totalInventoryValue),
                sub: `${filteredInventory.length} Filtered SKUs (of ${statsData.inventory.length})`,
              },
              {
                label: "Issued Valuation",
                val: formatCostBDT(kpiData.totalIssuedValue),
                sub: `${filteredIssued.length} Filtered Transactions`,
              },
              {
                label: "Added Stock events",
                val: kpiData.totalRestocksCount,
                sub: "Warehouse Restocks",
              },
              {
                label: "Critical Low SKUs",
                val: kpiData.criticalItemsCount,
                sub: "Items with ≤ 5 stock limit",
                accent: kpiData.criticalItemsCount > 0,
              },
            ].map((k, idx) => (
              <div
                key={idx}
                className={`bg-white border p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm transition-all relative overflow-hidden ${
                  k.accent ? "border-red-200 bg-red-50/10" : "border-slate-200/80"
                }`}
              >
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{k.label}</div>
                <div 
                  className={`text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-black mt-1 sm:mt-2 truncate ${k.accent ? "text-red-600" : "text-slate-800"}`}
                  title={String(k.val)}
                >
                  {k.val}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 truncate">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Inventory Chart */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-[280px]">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1">
                High Value Inventory Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">Top 8 items by catalog asset valuation</p>
              <div className="flex-1 min-h-0 relative flex items-center justify-center">
                {highValueChart}
              </div>
            </div>

            {/* Critical low items list */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-[280px]">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1 text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Critical Stock Alerts (Quantity ≤ {lowStockThreshold})</span>
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">Equipments requiring immediate restock attention</p>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                {filteredInventory.filter((i) => i.quantity <= lowStockThreshold).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    All catalog items are adequately stocked!
                  </div>
                ) : (
                  filteredInventory
                    .filter((i) => i.quantity <= lowStockThreshold)
                    .sort((a, b) => a.quantity - b.quantity)
                    .map((item, idx) => (
                      <div key={`${item.chutuoCode}-${idx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono font-bold text-slate-800 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full">
                          {item.chutuoCode}
                        </span>
                        <span className="flex-1 truncate text-slate-500 font-medium">{cleanDescription(item.description)}</span>
                        <span className={`font-bold font-mono px-2.5 py-0.5 rounded-full ${item.quantity <= 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                          📦 {item.quantity} Qty
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* MORE USABLE AND BETTER ANALYTICS FEATURES ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FEATURE 1: DEAD STOCK / INACTIVE INVENTORY DETECTOR */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-[280px]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" />
                  <span>Inactive & Dead Stock Detector</span>
                </h3>
                <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {deadStockItems.length} SKUs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">Positive stock items with ZERO issuances during selected dates</p>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                {deadStockItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No inactive items found in this period.
                  </div>
                ) : (
                  deadStockItems
                    .sort((a, b) => b.amount - a.amount)
                    .map((item, idx) => (
                      <div key={`${item.chutuoCode}-${idx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono font-bold text-slate-800 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full">
                          {item.chutuoCode}
                        </span>
                        <span className="flex-1 truncate text-slate-500 font-medium">{cleanDescription(item.description)}</span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-slate-800 block">
                            📦 {item.quantity} Qty
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {formatCostBDT(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Capital Locked:</span>
                  <span className="font-black text-slate-800 font-mono">৳{deadStockItems.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const headers = ["IMPA Code", "Description", "Stock Level", "Value BDT"];
                    const rows = deadStockItems.map(item => [item.chutuoCode, item.description, item.quantity, item.amount]);
                    downloadCSV(headers, rows, "comilla-traders-dead-stock-report.csv");
                  }}
                  className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-[10px] px-3 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3" />
                  <span>Download Dead Stock Report</span>
                </button>
              </div>
            </div>

            {/* FEATURE 2: INTERACTIVE REORDER TARGET FORECASTER */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-auto lg:h-[280px]">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <span>Reorder Target Forecast Estimator</span>
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">Simulate restock target levels to estimate BDT cost and volume</p>

              <div className="space-y-3 flex-1 flex flex-col">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500">Target Inventory per SKU:</span>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-0.5 rounded-full font-mono">
                      {restockTargetQty} Units
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[10, 20, 30, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRestockTargetQty(val)}
                        className={`flex-1 text-xs py-1.5 font-bold rounded-xl border transition-all cursor-pointer ${
                          restockTargetQty === val
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SKUs Under Limit / Total Units to Buy */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-tight">
                      SKUs Under Limit
                    </span>
                    <span className="text-base font-black text-slate-800 font-mono block mt-1">
                      {reorderForecast.underStockedItems.length}
                    </span>
                  </div>
                  <div className="text-center border-l border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-tight">
                      Total Units to Buy
                    </span>
                    <span className="text-base font-black text-slate-800 font-mono block mt-1">
                      {reorderForecast.totalUnitsToOrder.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Estimated Budget */}
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    Estimated Budget
                  </span>
                  <span className="text-base font-black text-indigo-600 font-mono">
                    ৳{reorderForecast.totalRequiredBudget.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const headers = ["IMPA Code", "Description", "Current Qty", "Target Qty", "Units Needed", "Unit Cost BDT", "Estimated Cost BDT"];
                    const rows = reorderForecast.underStockedItems.map(item => {
                      const needed = restockTargetQty - item.quantity;
                      return [
                        item.chutuoCode,
                        item.description,
                        item.quantity,
                        restockTargetQty,
                        needed,
                        item.unitCostBDT,
                        needed * item.unitCostBDT
                      ];
                    });
                    downloadCSV(headers, rows, `comilla-traders-reorder-forecast-target-${restockTargetQty}.csv`);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer mt-auto"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Reorder Forecast List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: INVENTORY ANALYTICS */}
      {subTab === "inventory" && (
        <div className="space-y-6">
          {/* Section Header with Print Option */}
          <div className="flex justify-between items-center no-print bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Package className="h-4 w-4 text-slate-400" />
              <span>Inventory Analytics</span>
            </h2>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Inventory Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col min-h-[280px] lg:h-[280px] justify-center">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-4">Stock Availability Status</h3>
              <div className="flex-1 min-h-0 flex items-center justify-center">{stockHealthChart}</div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col min-h-[280px] lg:h-[280px] justify-center">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-4">Cost Tier Asset Distribution</h3>
              <div className="flex-1 min-h-0 relative flex items-center justify-center">
                <div className="text-center text-slate-400 text-xs">
                  Valuation is automatically calculated based on actual stock rates.
                  <div className="mt-2 font-bold text-slate-700 text-lg">৳{kpiData.totalInventoryValue.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Inventory List Table */}
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Full Registered Catalog</h3>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer no-print"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Catalog</span>
              </button>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3 print-nowrap">IMPA Code</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">In Stock</th>
                    <th className="p-3 text-right print-nowrap">Unit Cost</th>
                    <th className="p-3 text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredInventory.map((item, idx) => (
                    <tr key={`${item.chutuoCode}-${idx}`} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600 print-nowrap">{item.chutuoCode}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{cleanDescription(item.description)}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{item.quantity}</td>
                      <td className="p-3 text-right font-mono text-slate-500 print-nowrap">{formatCostBDT(item.unitCostBDT)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCostBDT(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ISSUANCE LOGS */}
      {subTab === "issuance" && (
        <div className="space-y-6">
          {/* Section Header with Print Option */}
          <div className="flex justify-between items-center no-print bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Issuance Logs & Outflows</span>
            </h2>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Issuance Report</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-[260px]">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1">
              Issued Value Transaction Trend
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">Valuation issued out over filtered dates</p>
            <div className="flex-1 min-h-0 relative flex items-center justify-center">
              {issuedTrendChart}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Issuance Transactions History</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full font-mono border border-indigo-100">
                  {filteredIssued.length} transaction entries
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer no-print"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print History</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 print-nowrap">IMPA</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Issued Qty</th>
                    <th className="p-3 text-right print-nowrap">Unit Cost</th>
                    <th className="p-3 text-right">Total Outflow</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Crew Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredIssued.map((r, idx) => {
                    const inv = inventoryMap[r.chutuoCode];
                    const unitCost = inv ? inv.unitCostBDT : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-500">{r.date}</td>
                        <td className="p-3 font-mono font-bold text-indigo-600 print-nowrap">{r.chutuoCode}</td>
                        <td className="p-3 max-w-xs truncate">{cleanDescription(r.description)}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">{qtyOf(r)}</td>
                        <td className="p-3 text-right font-mono print-nowrap">{formatCostBDT(unitCost)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCostBDT(valueOf(r))}</td>
                        <td className="p-3">{r.department || "N/A"}</td>
                        <td className="p-3">{buyerOf(r)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BUYERS & DEPARTMENTS */}
      {subTab === "buyers" && (
        <div className="space-y-6">
          {/* Section Header with Print Option */}
          <div className="flex-1 justify-between items-center no-print bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              <span>Buyer & Department Analytics</span>
            </h2>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Buyers Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col min-h-[280px] lg:h-[280px]">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1">Top Buyers / Operators</h3>
              <p className="text-[11px] text-slate-400 mb-4">Ranking by absolute outflow values</p>
              <div className="flex-1 min-h-0 relative flex items-center justify-center">
                {topBuyersChart}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col min-h-[280px] lg:h-[280px]">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1">Department Demand Share</h3>
              <p className="text-[11px] text-slate-400 mb-4">Total issued assets consumed by different sectors</p>
              <div className="flex-1 min-h-0 relative flex flex-col justify-center items-start gap-2 max-w-xs mx-auto">
                {buyersAnalytics.depts.length === 0 ? (
                  <div className="text-slate-400 text-xs">No department share data.</div>
                ) : (
                  buyersAnalytics.depts.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 justify-between w-full text-xs font-semibold">
                      <span className="text-slate-600">{d.name}:</span>
                      <span className="font-mono text-slate-800 font-bold">{formatCostBDT(d.val)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Detailed Buyer Operations Log</h3>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer no-print"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Buyers Log</span>
              </button>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Buyer / Operator</th>
                    <th className="p-3 text-center">Transactions Count</th>
                    <th className="p-3 text-center">Total Quantity</th>
                    <th className="p-3 text-right">Total Outflow Value</th>
                    <th className="p-3">Last Active Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {buyersAnalytics.buyers.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">{b.name}</td>
                      <td className="p-3 text-center font-mono">{b.count} times</td>
                      <td className="p-3 text-center font-mono font-bold">{b.qty}</td>
                      <td className="p-3 text-right font-mono font-bold text-teal-800">{formatCostBDT(b.val)}</td>
                      <td className="p-3 font-mono text-slate-500">{b.last}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TRENDS (Monthly In/Out) */}
      {subTab === "trends" && (
        <div className="space-y-6">
          {/* Section Header with Print Option */}
          <div className="flex justify-between items-center no-print bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span>Monthly Trends Analysis</span>
            </h2>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Trends Report</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-[260px]">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1">Inflow vs Outflow Valuation</h3>
            <p className="text-[11px] text-slate-400 mb-4">Monthly comparison of stock additions versus issues</p>
            <div className="flex-1 min-h-0 relative flex items-center justify-center">
              {monthlyTrendsChart}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Monthly Valuation Summary</h3>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer no-print"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Summary</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right">Added Inflow (৳)</th>
                    <th className="p-3 text-right">Issued Outflow (৳)</th>
                    <th className="p-3 text-right">Net Value Change</th>
                    <th className="p-3 text-center">Transactions Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {monthlyTrendsData.map((d, idx) => {
                    const diff = d.inV - d.outV;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-800">{d.month}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{formatCostBDT(d.inV)}</td>
                        <td className="p-3 text-right font-mono text-red-500">{formatCostBDT(d.outV)}</td>
                        <td className={`p-3 text-right font-mono font-bold ${diff >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                          {diff >= 0 ? "+" : ""}
                          {formatCostBDT(diff)}
                        </td>
                        <td className="p-3 text-center font-mono">{d.count} txs</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ABC PARETO ANALYSIS */}
      {subTab === "abc" && (
        <div className="space-y-6">
          {/* Section Header with Print Option */}
          <div className="flex justify-between items-center no-print bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <LineChart className="h-4 w-4 text-slate-400" />
              <span>ABC Pareto Classification</span>
            </h2>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print ABC Report</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-col h-[280px]">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-1">ABC Pareto Cumulative Curve</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Pareto 80/20 Rule: Highlight top key value items that make up 70%-95% of catalog value
            </p>
            <div className="flex-1 min-h-0 relative flex items-center justify-center">
              {abcParetoChart}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800 text-sm">ABC Classified Inventory List</h3>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold items-center">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full">
                  Class A: Top 70% Value
                </span>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full">
                  Class B: Next 25% Value
                </span>
                <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full">
                  Class C: Bottom 5% Value
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer no-print ml-2"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print ABC List</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3 print-nowrap">IMPA Code</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Asset Valuation</th>
                    <th className="p-3 text-center">Cumulative Pct</th>
                    <th className="p-3 text-center">Class Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {abcAnalysis.classified.map((item, idx) => (
                    <tr key={`${item.chutuoCode}-${idx}`} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600 print-nowrap">{item.chutuoCode}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{cleanDescription(item.description)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCostBDT(item.amount)}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{item.cumPct.toFixed(1)}%</td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-3 py-0.5 rounded-full inline-block w-16 text-center ${
                            item.class === "A"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.class === "B"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-50 text-slate-500 border border-slate-200"
                          }`}
                        >
                          Class {item.class}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRINT HELPER MODAL FOR PREVIEW SANDBOX */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <Printer className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-xs uppercase tracking-wider">Print & Export Center</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-xs text-amber-950">
                <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Sandbox Printing Notice</span>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    Direct browser printing is restricted by security policies inside this preview workspace container. Open the app in a new tab to print or save reports as PDF.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                  Selected Report Section
                </h4>
                <p className="text-xs text-slate-700 font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  📁 {printSectionName === "overview" ? "Overview Dashboard Report" : 
                      printSectionName === "inventory" ? "Registered Catalog & Inventory" :
                      printSectionName === "issuance" ? "Issuance Logs & Outflows" :
                      printSectionName === "buyers" ? "Buyers & Departments Log" :
                      printSectionName === "trends" ? "Monthly Inflow/Outflow Trends" :
                      printSectionName === "abc" ? "ABC Pareto Classification" : "Analytics Report"}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  Recommended Solution
                </h4>
                
                {/* Main Action: Open in New Tab */}
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowPrintModal(false)}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-full text-xs shadow-md hover:-translate-y-0.5 transition-all w-full text-center cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in New Tab to Print</span>
                </a>
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  Opens a direct tab outside the sandbox. You can click <strong>Print</strong> or press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono border border-slate-200">Ctrl + P</kbd> (Mac: <kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono border border-slate-200">⌘ + P</kbd>) to save as PDF or Print!
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-3">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                  Alternative Actions
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {/* CSV Export Option */}
                  <button
                    type="button"
                    onClick={() => {
                      exportCurrentDataCSV(printSectionName);
                      setShowPrintModal(false);
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>Download CSV</span>
                  </button>

                  {/* Force direct print fallback */}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.print();
                      } catch (e) {
                        console.error(e);
                      }
                      setShowPrintModal(false);
                    }}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>Try Direct Print</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
