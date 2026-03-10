"use client";

interface PriceCellProps {
  price: number | null;
  currency: string | null;
  fallback?: string;
}

export function PriceCell({ price, currency, fallback = "—" }: PriceCellProps) {
  if (price == null) return <span className="text-zinc-600">{fallback}</span>;
  return (
    <span className="text-zinc-300">
      {currency === "USD" ? "$" : ""}
      {price.toFixed(2)}
    </span>
  );
}
