"use client";

import { useTheme } from "next-themes";
import { Check, LaptopMinimal, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const items = [
  {
    id: "light",
    label: "Light",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    icon: Moon,
  },
  {
    id: "system",
    label: "System",
    icon: LaptopMinimal,
  },
] as const;

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), className)}
      >
        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {items.map((item) => {
          const Icon = item.icon;
          const active = theme === item.id;

          return (
            <DropdownMenuItem
              key={item.id}
              className="cursor-pointer"
              onClick={() => setTheme(item.id)}
            >
              <Icon className="mr-2 size-4" />
              {item.label}
              {active ? <Check className="ml-auto size-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
