import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ClinicianShell } from "@/components/layout/clinician-shell";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <ClinicianShell>{children}</ClinicianShell>
    </AuthGuard>
  );
}
