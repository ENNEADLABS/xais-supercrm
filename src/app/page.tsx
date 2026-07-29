import { redirect } from "next/navigation";

// La page racine redirige vers le dashboard (ou login si non connecte via middleware)
export default function Home() {
  redirect("/dashboard");
}
