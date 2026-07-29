import { ProductForm } from "@/components/products";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductRoute({ params }: ProductPageProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifier le produit</h1>
      <ProductForm productId={id} />
    </div>
  );
}
