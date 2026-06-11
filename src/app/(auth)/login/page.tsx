// app/login/page.tsx
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import ClientLoginPage from "./client-login-page";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <ClientLoginPage />;
}