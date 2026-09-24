import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { productImage, type Product } from "@/types/api";
import { formatMoney } from "@/utils/format";

export function ProductImage({ product, className }: { product?: Product | undefined; className?: string }) {
  const src = productImage(product);
  return src ? (
    <img src={src} alt={product?.name ?? ""} loading="lazy" className={`h-full w-full object-cover ${className ?? ""}`} />
  ) : (
    <div className={`grid h-full w-full place-items-center bg-surface mesh-grid ${className ?? ""}`}>
      <ImageOff className="size-5 text-muted-foreground" aria-hidden />
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to="/products/$id" params={{ id: product.id }} className="group panel block overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden border-b bg-surface">
        <ProductImage product={product} className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="p-3.5">
        <p className="eyebrow truncate">{product.category?.name ?? product.sku}</p>
        <h3 className="mt-1 line-clamp-1 text-sm font-medium">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-sm font-semibold">{formatMoney(product.priceInCents)}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{product.sku}</span>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="panel overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3.5"><Skeleton className="h-2.5 w-1/3" /><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3.5 w-1/4" /></div>
    </div>
  );
}
