"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  notificationCount?: number;
  user?: HeaderUser;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
}

export function Header({
  breadcrumbs = [],
  notificationCount = 0,
  user,
  onThemeToggle,
  isDarkMode = false,
}: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-12 flex items-center px-4 gap-3 border-b border-[var(--border)] bg-[var(--background)] shrink-0">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {breadcrumbs.map((item, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight size={13} className="shrink-0 text-[var(--muted-foreground)]" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "text-sm truncate transition-colors",
                  i === breadcrumbs.length - 1
                    ? "text-[var(--foreground)] font-medium"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "text-sm truncate",
                  i === breadcrumbs.length - 1
                    ? "text-[var(--foreground)] font-medium"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Search */}
      <div
        className={cn(
          "relative flex items-center transition-all duration-200",
          searchFocused ? "w-64" : "w-44"
        )}
      >
        <Search
          size={13}
          className="absolute left-2.5 text-[var(--muted-foreground)] pointer-events-none"
        />
        <Input
          placeholder="Search..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="h-7 pl-7 pr-12 text-xs bg-[var(--secondary)] border-transparent focus:border-[var(--border)] focus:bg-[var(--background)]"
        />
        <kbd className="absolute right-2 pointer-events-none hidden sm:flex h-4 select-none items-center gap-0.5 rounded border border-[var(--border)] bg-[var(--muted)] px-1 text-[10px] font-mono text-[var(--muted-foreground)]">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 relative">
              <Bell size={15} />
              {notificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--destructive)] text-[var(--destructive-foreground)] text-[9px] font-bold flex items-center justify-center leading-none">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        {onThemeToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onThemeToggle}
                className="h-7 w-7"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDarkMode ? "Light mode" : "Dark mode"}</TooltipContent>
          </Tooltip>
        )}

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full p-0">
                <Avatar className="w-6 h-6">
                  {user.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user.name ?? user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{user.name ?? "User"}</span>
                  <span className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="flex items-center gap-2">
                  <User size={13} />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings size={13} />
                  Settings
                </Link>
              </DropdownMenuItem>
              {onThemeToggle && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onThemeToggle} className="flex items-center gap-2">
                    {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
                    {isDarkMode ? "Light mode" : "Dark mode"}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/auth/signout"
                  className="flex items-center gap-2 text-[var(--destructive)]"
                >
                  <LogOut size={13} />
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
