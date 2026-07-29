import Link from "next/link";

// Acces sur invitation uniquement : le signup public est desactive (cf. config.toml + dashboard Supabase).
// Cette page informe les visiteurs au lieu d'exposer un formulaire de creation de compte.
export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ENNEAD Studio Creator</h1>
          <p className="mt-1 text-sm text-gray-500">Acces sur invitation</p>
        </div>

        <p className="text-sm text-gray-600">
          La creation de compte se fait uniquement sur invitation. Contactez votre administrateur
          pour obtenir un acces.
        </p>

        <Link
          href="/login"
          className="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
