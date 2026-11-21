"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarClock,
  PhoneCall,
  GraduationCap,
  FileText,
  Award,
  Sliders,
  GitBranch,
  Headphones,
  Bell,
  Zap,
  History,
  Settings,
  Search,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Target,
  Megaphone,
  RotateCcw,
  Layers,
  BarChart3,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { currentUser, followUps, notifications } from "@/data/mock";
import { useRole, type AppRole } from "@/context/RoleContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "sonner";
import { getLeads, getTeamMembers, store, syncLeadsFromDb, syncTeamFromDb } from "@/services/api";
import { AddLeadModal } from "@/components/modals/add-lead-modal";


interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeTone?: "brand" | "destructive" | "warning";
}

const overdueCount = followUps.filter((f) => f.status === "Overdue").length;
const unreadNotifs = notifications.filter((n) => !n.read).length;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { actualRole, currentRole, availableRoles, switchRole } = useRole();
  const { branch, canSwitchBranch, switchBranch } = useBranch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to central store to react to real-time website lead captures
  useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);
  const leads = getLeads(branch);
  const searchResults = searchQuery.trim()
    ? leads
        .filter((l) =>
          [l.name, l.id, l.phone, l.city, l.course, l.country].some((f) =>
            (f || "").toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
        .slice(0, 6)
    : [];

  // Ingest/hydrate latest leads from MongoDB Atlas on mount & poll every 20s if tab is active
  useEffect(() => {
    syncLeadsFromDb();
    syncTeamFromDb();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncLeadsFromDb();
        syncTeamFromDb();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const userName = session?.user?.name || currentUser.name;
  const userEmail = session?.user?.email || "vennela@leados.com";
  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || currentUser.initials;

  // Navigation configurations based on current active role
  const getNavSections = (): { title: string; items: NavItem[] }[] => {
    if (currentRole === "telecaller") {
      return [
        {
          title: "My Workspace",
          items: [
            { label: "Caller Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Team", href: "/team", icon: Users },
            { label: "My Leads", href: "/leads?view=assigned", icon: UserCheck, badge: 125, badgeTone: "brand" },
            { label: "Today's Follow-ups", href: "/follow-ups", icon: CalendarClock, badge: 12, badgeTone: "destructive" },
            { label: "Call Logs", href: "/calls", icon: PhoneCall },
            { label: "Counselling", href: "/counselling", icon: GraduationCap },
          ],
        },
        {
          title: "Targets & Performance",
          items: [
            { label: "My Targets", href: "/team", icon: Target },
          ],
        },
        {
          title: "System",
          items: [
            { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadNotifs, badgeTone: "warning" },
            { label: "Settings", href: "/settings", icon: Settings },
          ],
        },
      ];
    }

    if (currentRole === "manager") {
      return [
        {
          title: "Main",
          items: [
            { label: "Team Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Team", href: "/team", icon: Users },
            { label: "All Leads", href: "/leads", icon: UserCheck },
            { label: "Follow-ups Queue", href: "/follow-ups", icon: CalendarClock, badge: overdueCount, badgeTone: "destructive" },
            { label: "Calls", href: "/calls", icon: PhoneCall },
            { label: "Counselling", href: "/counselling", icon: GraduationCap },
            { label: "Applications", href: "/applications", icon: FileText },
            { label: "Admissions", href: "/admissions", icon: Award },
          ],
        },
        {
          title: "Operations",
          items: [
            { label: "Lead Operations", href: "/operations", icon: Sliders },
            { label: "Lead Assignment", href: "/assignment", icon: GitBranch },
            { label: "Campaigns", href: "/campaigns", icon: Megaphone },
            { label: "Lead Sources", href: "/sources", icon: Layers },
          ],
        },
        {
          title: "Analytics",
          items: [
            { label: "Pipeline Analytics", href: "/analytics", icon: TrendingUp },
            { label: "Campaign Analytics", href: "/campaign-analytics", icon: Target },
            { label: "Telecaller Analytics", href: "/telecaller-analytics", icon: Headphones },
            { label: "ROI Analysis", href: "/roi-analysis", icon: DollarSign },
            { label: "Reports", href: "/reports", icon: BarChart3 },
          ],
        },
        {
          title: "System",
          items: [
            { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadNotifs, badgeTone: "warning" },
            { label: "Automation", href: "/automation", icon: Zap },
            { label: "Audit Log", href: "/audit", icon: History },
            { label: "Settings", href: "/settings", icon: Settings },
          ],
        },
      ];
    }

    // Default: Admin
    return [
      {
        title: "Main",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Team", href: "/team", icon: Users },
          { label: "Leads", href: "/leads", icon: UserCheck },
          { label: "Follow-ups", href: "/follow-ups", icon: CalendarClock, badge: overdueCount, badgeTone: "destructive" },
          { label: "Calls", href: "/calls", icon: PhoneCall },
          { label: "Counselling", href: "/counselling", icon: GraduationCap },
          { label: "Applications", href: "/applications", icon: FileText },
          { label: "Admissions", href: "/admissions", icon: Award },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Lead Operations", href: "/operations", icon: Sliders },
          { label: "Lead Assignment", href: "/assignment", icon: GitBranch },
          { label: "Campaigns", href: "/campaigns", icon: Megaphone },
          { label: "Lead Sources", href: "/sources", icon: Layers },
        ],
      },
      {
        title: "Analytics",
        items: [
          { label: "Pipeline Analytics", href: "/analytics", icon: TrendingUp },
          { label: "Campaign Analytics", href: "/campaign-analytics", icon: Target },
          { label: "Telecaller Analytics", href: "/telecaller-analytics", icon: Headphones },
          { label: "ROI Analysis", href: "/roi-analysis", icon: DollarSign },
          { label: "Reports", href: "/reports", icon: BarChart3 },
        ],
      },
      {
        title: "System",
        items: [
          { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadNotifs, badgeTone: "warning" },
          { label: "Automation", href: "/automation", icon: Zap },
          { label: "Audit Log", href: "/audit", icon: History },
          { label: "Settings", href: "/settings", icon: Settings },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  const roleMeta: Record<AppRole, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
    admin: { label: "Admin", icon: Shield, tone: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    manager: { label: "Manager", icon: Users, tone: "text-violet-600 bg-violet-50 border-violet-200" },
    telecaller: { label: "Telecaller", icon: Headphones, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">
              Lead<span className="text-indigo-600">.</span>
              <span className="text-indigo-600">OS</span>
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border",
                branch === "masters"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              {branch === "masters" ? "🎓 Masters" : "🩺 MBBS"}
            </span>
          </Link>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
            {currentRole}
          </span>
        </div>

        {/* Navigation list */}
        <div className="p-3 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navSections.map((section) => (
            <div key={section.title} className="mb-5">
              <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const basePath = item.href.split("?")[0];
                  const active =
                    pathname === item.href ||
                    pathname === basePath ||
                    (basePath !== "/" &&
                      basePath !== "/dashboard" &&
                      basePath !== "/analytics" &&
                      pathname.startsWith(`${basePath}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group relative flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                        active
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px] font-semibold leading-tight",
                            item.badgeTone === "destructive" && "bg-rose-100 text-rose-700",
                            item.badgeTone === "warning" && "bg-amber-100 text-amber-700",
                            item.badgeTone === "brand" && "bg-indigo-100 text-indigo-700"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
        {actualRole !== currentRole && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[11px] text-indigo-700">
            <span>Viewing as {currentRole}</span>
            <button
              onClick={() => switchRole(actualRole)}
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              title="Reset to your account role"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="size-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {userInitials}
              </div>
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate capitalize">{currentRole}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl z-50 flex flex-col">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Main Layout Column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className={cn(
            "h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs",
            currentRole === "telecaller" && pathname === "/dashboard" && "hidden md:flex"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            {/* Global Search with interactive Quick Search Dropdown */}
            <div ref={searchRef} className="relative hidden sm:block w-64 md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search leads, phone, course… (Ctrl + K)"
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              {/* Instant Search Results Dropdown */}
              {searchOpen && searchQuery.trim() && (
                <div className="absolute left-0 top-10 w-96 rounded-xl bg-white border border-slate-200 shadow-xl p-2 z-50">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                    <span>Matching Student Leads</span>
                    <span>{searchResults.length} found</span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No matching student leads found
                    </div>
                  ) : (
                    <div className="space-y-1 mt-1">
                      {searchResults.map((sl) => (
                        <Link
                          key={sl.id}
                          href={`/leads/${sl.id}`}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50/60 transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 truncate">
                              {sl.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {sl.id} · {sl.course} ({sl.country})
                            </p>
                          </div>
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {sl.stage}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Entity Toggle Switcher, Notifications & Profile Section with Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* ── MBBS / MASTERS DIVISION TOGGLE SWITCHER (Replaces Add Lead Button) ── */}
            <div className="flex items-center">
              {canSwitchBranch ? (
                <div
                  role="group"
                  aria-label="Select Program Division"
                  className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/90 shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => switchBranch("mbbs")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      branch === "mbbs"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    )}
                  >
                    <span>🩺</span>
                    <span>MBBS Abroad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchBranch("masters")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      branch === "masters"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    )}
                  >
                    <span>🎓</span>
                    <span>Masters Abroad</span>
                  </button>
                </div>
              ) : (
                <div
                  title={`Assigned to ${branch.toUpperCase()} division`}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs",
                    branch === "masters"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}
                >
                  <span>{branch === "masters" ? "🎓" : "🩺"}</span>
                  <span className="capitalize">{branch === "masters" ? "Masters Abroad" : "MBBS Abroad"}</span>
                  <span className="text-[10px] font-normal opacity-70 ml-1">(Assigned)</span>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="size-4.5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* ── TOP RIGHT PROFILE & SWITCHER SECTION ── */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Dedicated Switch Buttons for Admin and Manager */}
              {availableRoles.length > 1 && (
                <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-2xs">
                  {availableRoles.map((r) => {
                    const meta = roleMeta[r];
                    const Icon = meta.icon;
                    const isActive = currentRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          switchRole(r);
                          toast.success(`Switched to ${meta.label} Dashboard`);
                        }}
                        title={`Switch view to ${meta.label} Dashboard`}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                          isActive
                            ? "bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-600"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white"
                        )}
                      >
                        <Icon className={cn("size-3.5", isActive ? "text-white" : "text-slate-500")} />
                        <span className="capitalize">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="size-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {userInitials}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-700 leading-tight">
                      {userName.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize leading-tight">
                      {currentRole}
                    </span>
                  </div>
                  <ChevronDown className="size-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 p-1.5 shadow-lg z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800">{userName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Account:</span>
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 capitalize">
                          {actualRole}
                        </span>
                      </div>
                    </div>

                    {/* Switch Dashboard View Inside Menu */}
                    {availableRoles.length > 1 && (
                      <div className="p-1 border-b border-slate-100">
                        <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Switch Dashboard View
                        </p>
                        <div className="space-y-0.5">
                          {availableRoles.map((r) => {
                            const meta = roleMeta[r];
                            const Icon = meta.icon;
                            const isActive = currentRole === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  switchRole(r);
                                  setUserMenuOpen(false);
                                  toast.success(`Switched to ${meta.label} Dashboard`);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                                  isActive
                                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                                    : "text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <Icon className={cn("size-3.5", isActive ? "text-indigo-600" : "text-slate-400")} />
                                  <span>{meta.label} Dashboard</span>
                                </span>
                                {isActive && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                                    Active
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <Settings className="size-3.5" /> Settings
                  </Link>

                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left cursor-pointer"
                  >
                    <LogOut className="size-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

        {/* Content Area */}
        <main
          className={cn(
            "flex-1 min-w-0",
            currentRole === "telecaller" && pathname === "/dashboard"
              ? "p-0 sm:p-4 lg:p-6"
              : "p-4 sm:p-6 lg:p-8"
          )}
        >
          {children}
        </main>
      </div>

      {/* Global Add Lead Modal */}
      <AddLeadModal
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        onLeadCreated={(newLead) => {
          router.push(`/leads/${newLead.id}`);
        }}
      />
    </div>
  );
}
