"use client";

// O layout raiz (src/app/layout.tsx) já envolve tudo num <SessionProvider session={session}>
// com a sessão buscada no servidor (já hidratada, sem round-trip). Esse componente criava um
// SEGUNDO <SessionProvider> aqui dentro, sem passar `session` — como useSession() sempre usa o
// provider mais próximo, o Sidebar passava a depender desse provider "vazio", que dispara um
// novo fetch client-side de /api/auth/session a cada montagem do dashboard. Até esse fetch
// terminar, session.user.name/image ficam undefined — daí o avatar mostrando só "U" às vezes
// (bug reportado pelo usuário). Sem lógica de guarda de verdade aqui (isso é feito em outro
// lugar), então o componente vira só um pass-through.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
