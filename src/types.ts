import { StoreType } from "./utils/storeClassifier";

export interface InventoryItem {
  chutuoCode: string;
  description: string;
  quantity: number;
  unitCostBDT: number;
  amount: number;
  store?: StoreType;
  inventoryNo?: number;
  srNo?: string | number;
}

export interface IssueCartItem {
  chutuoCode: string;
  description: string;
  quantity: number;
  unitCostBDT: number;
  availableStock: number;
  store?: StoreType;
  inventoryNo?: number;
}

export interface AddCartItem {
  chutuoCode: string;
  description: string;
  quantity: number;
  unitCostBDT: number;
  currentStock: number;
  store?: StoreType;
  inventoryNo?: number;
}

export interface NewItemRow {
  id: number;
  code: string;
  description: string;
  qty: number;
  unitCostBDT: number;
  store?: StoreType;
  inventoryNo?: number;
}

export interface Transaction {
  date: string;
  chutuoCode: string;
  description: string;
  qtyChanged: string | number;
  department?: string;
  doneBy?: string;
  remarks?: string;
  inventoryNo?: number;
}

export interface StatsData {
  inventory: InventoryItem[];
  issued: Transaction[];
  addUnits: Transaction[];
  newItems: Transaction[];
}
