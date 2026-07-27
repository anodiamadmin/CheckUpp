"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api/client";
import { useSessionStore } from "@/lib/state/session-store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ClinicianShellProps {
  children: ReactNode;
}

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
    matcher: (pathname: string) => pathname === "/app",
  },
  {
    href: "/app/patients",
    label: "Patients",
    icon: Users,
    matcher: (pathname: string) => pathname.startsWith("/app/patients"),
  },
  {
    href: "/app/admin",
    label: "Admin",
    icon: Building2,
    adminOnly: true,
    matcher: (pathname: string) => pathname.startsWith("/app/admin"),
  },
  {
    href: "/app/profile",
    label: "Profile",
    icon: UserRoundCog,
    matcher: (pathname: string) => pathname.startsWith("/app/profile"),
  },
];

const getInitials = (name: string | null, email: string | null) => {
  const source = (name || email || "CU").trim();
  if (!source) return "CU";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const sectionTitle = (pathname: string) => {
  if (pathname.startsWith("/app/admin")) return "Admin";
  if (pathname.startsWith("/app/patients")) return "Patients";
  if (pathname.startsWith("/app/profile")) return "Clinician Profile";
  return "Dashboard";
};

const NavContent = ({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: string | null;
  onNavigate?: () => void;
}) => (
  <nav className="space-y-2">
    {navItems.filter((item) => !item.adminOnly || role === "ADMIN").map((item) => {
      const active = item.matcher(pathname);
      const Icon = item.icon;

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            active
              ? "bg-primary/15 text-primary ring-1 ring-primary/20"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
          <span>{item.label}</span>
        </Link>
      );
    })}
  </nav>
);

export const ClinicianShell = ({ children }: ClinicianShellProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const clearSession = useSessionStore((state) => state.clearSession);
  const refreshToken = useSessionStore((state) => state.refreshToken);
  const userEmail = useSessionStore((state) => state.userEmail);
  const userName = useSessionStore((state) => state.userName);
  const role = useSessionStore((state) => state.role);

  const initials = useMemo(() => getInitials(userName, userEmail), [userName, userEmail]);

  const handleSignOut = async () => {
    try {
      await apiRequest("/auth/logout", z.unknown(), {
        method: "POST",
        body: refreshToken ? { refreshToken } : {},
      });
      toast.success("Signed out successfully.");
    } catch {
      toast.info("Local session cleared.");
    } finally {
      clearSession();
      router.replace("/auth/sign-in");
    }
  };

  return (
    <div className="h-svh overflow-hidden bg-background">
      <div className="flex h-full w-full">
        <aside className="hidden h-svh w-72 shrink-0 border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur md:flex">
          <div className="flex h-full w-full flex-col px-4 py-5">
            <div className="mb-6 border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-base font-semibold tracking-tight text-foreground">CheckUpp</p>
                  <p className="text-xs text-muted-foreground">Clinician Portal</p>
                </div>
              </div>
            </div>

            <NavContent pathname={pathname} role={role} />

            <div className="mt-auto space-y-3 border border-border/80 bg-card/80 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>Secure clinical workspace</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Data access is audited and restricted by relationship + consent.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-20 border-b border-border/80 bg-background/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger className={cn(buttonVariants({ size: "icon-sm", variant: "outline" }), "md:hidden")}>
                    <Menu className="size-4" />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-r border-sidebar-border p-0">
                    <SheetHeader className="border-b border-border/80 p-4 text-left">
                      <SheetTitle className="text-base">CheckUpp Clinician</SheetTitle>
                    </SheetHeader>
                    <div className="p-4">
                      <NavContent pathname={pathname} role={role} onNavigate={() => setMobileOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
                <div>
                  <h1 className="text-sm font-semibold text-foreground md:text-base">
                    {sectionTitle(pathname)}
                  </h1>
                  <p className="text-xs text-muted-foreground">Mobile-aligned CheckUpp workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Badge
                  variant="outline"
                  className="hidden border border-primary/25 bg-primary/10 text-primary sm:inline-flex"
                >
                  {role ?? "CLINICIAN"}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-auto gap-2 rounded-full px-2 py-1"
                    )}
                  >
                    <Avatar className="size-8 border border-border/70">
                      <AvatarFallback className="bg-primary/15 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium text-foreground">{userName || "Clinician"}</p>
                      <p className="truncate text-xs text-muted-foreground">{userEmail ?? "No email"}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/app/profile")}>
                      <UserRoundCog className="mr-2 size-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="w-full space-y-4">
              {children}
              <Separator className="mt-8" />
              <p className="pb-4 text-center text-xs text-muted-foreground">
                CheckUpp Clinician Platform • PHI access events are audited
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
