// Layout dédié à l'onboarding : plein écran, sans sidebar/header de l'app.
// Volontairement HORS du groupe (app) pour qu'aucune logique de redirection
// "onboarding incomplet → /onboarding" ne s'y applique (la boucle devient
// structurellement impossible). Le gate vit dans le middleware (updateSession),
// l'auth est vérifiée par le middleware + la page elle-même.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
