export interface InventoryEntry {
  id: string;
  sodaName: string;
  quantity: number;
  sodaId: string | null; // linked rated soda, if any
  createdAt: string;
}
