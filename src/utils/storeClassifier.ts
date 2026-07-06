export type StoreType = string;

export interface StoreMetadata {
  id: StoreType;
  label: string;
  icon: string;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  description: string;
}

export let STORES: StoreMetadata[] = [
  {
    id: "1",
    label: "Inventory 1",
    icon: "Anchor",
    bg: "bg-sky-50",
    border: "border-sky-200/80",
    text: "text-sky-700",
    badgeBg: "bg-sky-100 text-sky-800 border-sky-200",
    description: "Inventory 1 primary item storage."
  },
  {
    id: "2",
    label: "Inventory 2",
    icon: "Settings",
    bg: "bg-indigo-50",
    border: "border-indigo-200/80",
    text: "text-indigo-700",
    badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Inventory 2 item storage."
  },
  {
    id: "3",
    label: "Inventory 3",
    icon: "Bed",
    bg: "bg-emerald-50",
    border: "border-emerald-200/80",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Inventory 3 item storage."
  },
  {
    id: "4",
    label: "Inventory 4",
    icon: "ShieldAlert",
    bg: "bg-rose-50",
    border: "border-rose-200/80",
    text: "text-rose-700",
    badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
    description: "Inventory 4 item storage."
  }
];

export function setDynamicStores(activeInventories?: string[]) {
  const defaultCount = 4;
  const count = activeInventories && activeInventories.length > 0 ? activeInventories.length : defaultCount;
  
  const presetColors = [
    { bg: "bg-sky-50", border: "border-sky-200/80", text: "text-sky-700", badgeBg: "bg-sky-100 text-sky-800 border-sky-200", icon: "Anchor" },
    { bg: "bg-indigo-50", border: "border-indigo-200/80", text: "text-indigo-700", badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: "Settings" },
    { bg: "bg-emerald-50", border: "border-emerald-200/80", text: "text-emerald-700", badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "Bed" },
    { bg: "bg-rose-50", border: "border-rose-200/80", text: "text-rose-700", badgeBg: "bg-rose-100 text-rose-800 border-rose-200", icon: "ShieldAlert" },
    { bg: "bg-violet-50", border: "border-violet-200/80", text: "text-violet-700", badgeBg: "bg-violet-100 text-violet-800 border-violet-200", icon: "Layers" },
    { bg: "bg-amber-50", border: "border-amber-200/80", text: "text-amber-700", badgeBg: "bg-amber-100 text-amber-800 border-amber-200", icon: "Layers" },
    { bg: "bg-teal-50", border: "border-teal-200/80", text: "text-teal-700", badgeBg: "bg-teal-100 text-teal-800 border-teal-200", icon: "Layers" },
    { bg: "bg-fuchsia-50", border: "border-fuchsia-200/80", text: "text-fuchsia-700", badgeBg: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200", icon: "Layers" },
    { bg: "bg-cyan-50", border: "border-cyan-200/80", text: "text-cyan-700", badgeBg: "bg-cyan-100 text-cyan-800 border-cyan-200", icon: "Layers" },
    { bg: "bg-orange-50", border: "border-orange-200/80", text: "text-orange-700", badgeBg: "bg-orange-100 text-orange-800 border-orange-200", icon: "Layers" },
  ];

  STORES.length = 0;
  
  for (let i = 0; i < count; i++) {
    const id = (i + 1).toString() as StoreType;
    let label = `Inventory ${i + 1}`;
    if (activeInventories && activeInventories[i]) {
      const rawName = activeInventories[i];
      // Format cleanly: e.g. "INVENTORY 5" -> "Inventory 5"
      label = rawName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
    
    const color = presetColors[i % presetColors.length];
    STORES.push({
      id,
      label,
      icon: color.icon,
      bg: color.bg,
      border: color.border,
      text: color.text,
      badgeBg: color.badgeBg,
      description: `${label} item storage.`
    });
  }
}

export function classifyItem(chutuoCode: string, description: string, inventoryNo?: number): StoreType {
  if (inventoryNo) {
    return inventoryNo.toString();
  }
  return "1";
}

export function cleanDescription(desc: string): string {
  if (!desc) return "";
  return desc.trim();
}

export function formatStorePrefix(desc: string, store: StoreType): string {
  return desc.trim();
}
