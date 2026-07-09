import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { DashboardShell } from "@/shared/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
