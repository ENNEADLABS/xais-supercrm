import { ProductForm } from "@/components/products";

export default function NewProductRoute() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouveau produit</h1>
      <ProductForm />
    </div>
  );
}
