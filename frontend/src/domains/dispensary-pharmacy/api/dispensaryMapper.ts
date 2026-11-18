export function formatStockStatus(stock: number): { label: string; variant: "success" | "warning" | "danger" } {
  if (stock <= 0) return { label: "Out of Stock", variant: "danger" };
  if (stock < 10) return { label: "Low Stock", variant: "warning" };
  return { label: "In Stock", variant: "success" };
}
