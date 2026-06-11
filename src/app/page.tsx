// app/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  return (
    <div>
      <h1>Bem-vindo ao tax-hub</h1>
    </div>
  );
}
