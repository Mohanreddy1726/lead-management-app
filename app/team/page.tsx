"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  Shield,
  Headphones,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  Building,
  Target,
  BarChart2,
  Sparkles,
  Trash2,
  KeyRound,
} from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { useBranch } from "@/context/BranchContext";
import { getTeamMembers, store, formatINR, syncTeamFromDb } from "@/services/api";
import { AddTeamMemberModal } from "@/components/modals/add-team-member-modal";
import { DeleteTeamMemberModal } from "@/components/modals/delete-team-member-modal";
import { ResetPasswordModal } from "@/components/modals/reset-password-modal";
import type { TeamMember, MemberPresence } from "@/data/types";
import { cn } from "@/lib/utils";

const presenceConfig: Record<
  MemberPresence,
  { label: string; dot: string; badge: string }
> = {
  Active: {
    label: "On Duty · Active",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
  },
  "In Call": {
    label: "In Active Call",
    dot: "bg-blue-500",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  Counselling: {
    label: "In Counselling",
    dot: "bg-indigo-500",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400",
  },
  "Follow-up": {
    label: "Follow-up Queue",
    dot: "bg-cyan-500",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-400",
  },
  "On Break": {
    label: "On Break",
    dot: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  Offline: {
    label: "Offline",
    dot: "bg-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400",
  },
};

export default function TeamPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentRole, actualRole } = useRole();
  const { branch } = useBranch();

  // Re-render when data changes via API store
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const allMembers = getTeamMembers(branch);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "Manager" | "Telecaller">("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [presenceFilter, setPresenceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"assigned" | "calls" | "admissions" | "name">("assigned");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [memberToResetPassword, setMemberToResetPassword] = useState<TeamMember | null>(null);

  useEffect(() => {
    syncTeamFromDb();
  }, []);



  // Role visibility logic per user specification:
  // Admin sees Managers and Telecallers
  // Manager sees Telecallers only
  // Telecaller sees Telecallers only
  const visibleMembers = allMembers.filter((m) => {
    if (currentRole === "admin") {
      return true; // Admin sees all
    }
    // Managers & Telecallers see only Telecallers
    return m.role === "Telecaller";
  });

  // Extract unique teams for dropdown filter
  const teamsList = Array.from(new Set(visibleMembers.map((m) => m.team))).sort();

  // Filtered & Sorted items
  const filteredMembers = visibleMembers
    .filter((m) => {
      // Role filter tab (Admin only)
      if (currentRole === "admin" && roleFilter !== "ALL" && m.role !== roleFilter) {
        return false;
      }
      // Branch / Team filter
      if (teamFilter !== "ALL" && m.team !== teamFilter) {
        return false;
      }
      // Presence filter
      if (presenceFilter !== "ALL" && m.presence !== presenceFilter) {
        return false;
      }
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesEmail = m.email.toLowerCase().includes(query);
        const matchesTeam = m.team.toLowerCase().includes(query);
        const matchesActivity = m.currentActivity.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesTeam || matchesActivity;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "assigned") return b.assigned - a.assigned;
      if (sortBy === "calls") return b.callsToday - a.callsToday;
      if (sortBy === "admissions") return b.admissions - a.admissions;
      return a.name.localeCompare(b.name);
    });

  // Summary counts
  const totalManagersCount = visibleMembers.filter((m) => m.role === "Manager").length;
  const totalTelecallersCount = visibleMembers.filter((m) => m.role === "Telecaller").length;
  const activeCount = visibleMembers.filter((m) => m.presence === "Active" || m.presence === "In Call").length;
  const totalCallsToday = visibleMembers.reduce((sum, m) => sum + m.callsToday, 0);
  const totalAssignedLeads = visibleMembers.reduce((sum, m) => sum + m.assigned, 0);
  const totalAdmissions = visibleMembers.reduce((sum, m) => sum + m.admissions, 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Team Directory`}
        subtitle={
          currentRole === "admin"
            ? `Manage ${branch === "masters" ? "Masters" : "MBBS"} branch managers and telecallers, monitor live shifts, quotas, and deep analytics.`
            : `Monitor ${branch === "masters" ? "Masters" : "MBBS"} telecaller activity, daily call outcomes, and conversion milestones.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} of {visibleMembers.length} Active On Duty
            </span>

            {/* Add Team Member button (Admins can add Manager/Telecaller; Managers can add Telecaller) */}
            {(currentRole === "admin" || currentRole === "manager") && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="size-4" />
                {currentRole === "admin" ? "Add Team Member" : "Add Telecaller"}
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Team</span>
            <Users className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {visibleMembers.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            {currentRole === "admin" ? (
              <span>{totalManagersCount} Mgrs · {totalTelecallersCount} Callers</span>
            ) : (
              <span>All Telecaller Agents</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Active Now</span>
            <Activity className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Handling calls & shifts
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Calls Logged Today</span>
            <Phone className="size-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {totalCallsToday}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 flex items-center gap-0.5">
            <TrendingUp className="size-3" />
            <span>High team pace</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Leads in Pipeline</span>
            <Target className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {totalAssignedLeads}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Actively assigned
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Admissions</span>
            <Award className="size-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalAdmissions}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Confirmed students
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Avg Conversion</span>
            <Sparkles className="size-4 text-brand" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {totalAssignedLeads > 0
              ? `${((totalAdmissions / totalAssignedLeads) * 100).toFixed(1)}%`
              : "0%"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Lead to admission
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Admin Role Filter Tabs */}
          {currentRole === "admin" ? (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 text-xs">
              <button
                type="button"
                onClick={() => setRoleFilter("ALL")}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition cursor-pointer",
                  roleFilter === "ALL"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Members ({visibleMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("Manager")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition cursor-pointer",
                  roleFilter === "Manager"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className="size-3.5 text-violet-500" />
                Managers ({totalManagersCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("Telecaller")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition cursor-pointer",
                  roleFilter === "Telecaller"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Headphones className="size-3.5 text-emerald-500" />
                Telecallers ({totalTelecallersCount})
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Headphones className="size-4 text-emerald-500" />
              <span>Telecaller Team Roster ({visibleMembers.length})</span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, branch or activity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Secondary dropdown filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="size-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none cursor-pointer hover:border-primary transition"
          >
            <option value="ALL">All Branches & Teams</option>
            {teamsList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={presenceFilter}
            onChange={(e) => setPresenceFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none cursor-pointer hover:border-primary transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active / On Duty</option>
            <option value="In Call">In Active Call</option>
            <option value="Counselling">In Counselling</option>
            <option value="Follow-up">Follow-up</option>
            <option value="On Break">On Break</option>
            <option value="Offline">Offline</option>
          </select>

          <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none cursor-pointer hover:border-primary transition font-medium"
            >
              <option value="assigned">Most Assigned Leads</option>
              <option value="calls">Most Calls Today</option>
              <option value="admissions">Most Admissions</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Team Member Cards */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          title="No team members found"
          description={
            search || teamFilter !== "ALL" || presenceFilter !== "ALL"
              ? "Try adjusting your search query or filters to find team members."
              : "No team members configured yet."
          }
          action={
            currentRole === "admin" && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
              >
                <UserPlus className="size-3.5" /> Add Team Member
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const isManager = member.role === "Manager";
            const presence = presenceConfig[member.presence] || presenceConfig.Offline;

            // Compute main quota progress
            const mainTarget = member.targets?.[0];
            const targetPct =
              mainTarget && mainTarget.target > 0
                ? Math.min(100, Math.round((mainTarget.done / mainTarget.target) * 100))
                : 0;

            return (
              <div
                key={member.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/50"
              >
                <div>
                  {/* Card Header: Avatar, Info, Role & Presence */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div
                          className={cn(
                            "flex size-12 items-center justify-center rounded-xl font-bold text-sm text-white shadow-xs",
                            isManager
                              ? "bg-gradient-to-br from-violet-600 to-indigo-700"
                              : "bg-gradient-to-br from-emerald-600 to-teal-700"
                          )}
                        >
                          {member.avatarInitials}
                        </div>
                        {/* Live presence indicator */}
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card",
                            presence.dot
                          )}
                        />
                      </div>

                      {/* Name & Role */}
                      <div>
                        <Link
                          href={`/team/${member.id}`}
                          className="font-semibold text-foreground text-sm hover:text-primary transition group-hover:underline flex items-center gap-1"
                        >
                          {member.name}
                          <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                              isManager
                                ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            )}
                          >
                            {isManager ? (
                              <Shield className="size-3" />
                            ) : (
                              <Headphones className="size-3" />
                            )}
                            {member.role}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Building className="size-3" />
                            {member.team}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Admin Quick Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
                          presence.badge
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", presence.dot)} />
                        {presence.label.split(" · ")[0]}
                      </span>

                      {currentRole === "admin" && (
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMemberToResetPassword(member);
                            }}
                            className="rounded-lg p-1 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title={`Reset password for ${member.name}`}
                          >
                            <KeyRound className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMemberToDelete(member);
                            }}
                            className="rounded-lg p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            title={`Delete ${member.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 grid grid-cols-1 gap-1 text-xs text-muted-foreground border-y border-border/50 py-2.5">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                      <span>{member.phone}</span>
                    </div>
                  </div>

                  {/* Current Activity Ticker */}
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                    <Activity className="size-3.5 shrink-0 text-primary animate-pulse" />
                    <span className="truncate text-muted-foreground">
                      {member.currentActivity}
                    </span>
                  </div>

                  {/* Quick KPI Stat Columns */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-border/60 bg-surface-2 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {isManager ? "Team Leads" : "Assigned"}
                      </div>
                      <div className="mt-0.5 text-base font-bold text-foreground">
                        {member.assigned}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface-2 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Calls Today
                      </div>
                      <div className="mt-0.5 text-base font-bold text-indigo-600 dark:text-indigo-400">
                        {member.callsToday}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface-2 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Admissions
                      </div>
                      <div className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {member.admissions}
                      </div>
                    </div>
                  </div>

                  {/* Target Progress Bar */}
                  {mainTarget && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          {mainTarget.label} Quota
                        </span>
                        <span className="font-semibold text-foreground text-numeric">
                          {mainTarget.done} / {mainTarget.target} ({targetPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            targetPct >= 75
                              ? "bg-emerald-500"
                              : targetPct >= 40
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                          )}
                          style={{ width: `${targetPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: View Analytics Button & Admin Actions */}
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Joined {member.joinDate || "Nov 2024"}
                  </span>

                  <div className="flex items-center gap-2">
                    {currentRole === "admin" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setMemberToResetPassword(member)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/60 transition cursor-pointer shadow-2xs"
                          title={`Reset password for ${member.name}`}
                        >
                          <KeyRound className="size-3.5" />
                          <span>Reset Password</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMemberToDelete(member)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 transition cursor-pointer shadow-2xs"
                          title={`Delete ${member.name}`}
                        >
                          <Trash2 className="size-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}

                    <Link
                      href={`/team/${member.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition cursor-pointer shadow-2xs"
                    >
                      <BarChart2 className="size-3.5" />
                      <span>View Analytics</span>
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Team Member Modal (Admin) */}
      <AddTeamMemberModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Team Member Modal (Admin) */}
      <DeleteTeamMemberModal
        open={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        member={memberToDelete}
      />

      {/* Reset Member Password Modal (Admin) */}
      <ResetPasswordModal
        open={Boolean(memberToResetPassword)}
        onClose={() => setMemberToResetPassword(null)}
        member={memberToResetPassword}
      />
    </div>
  );
}
