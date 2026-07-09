import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
