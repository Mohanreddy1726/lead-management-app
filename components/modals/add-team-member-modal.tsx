"use client";

import React, { useState, useEffect } from "react";
import { Modal, Field, inputClass, PrimaryButton } from "@/components/modals/modal";
import { addTeamMember } from "@/services/api";
import type { TeamMember, Branch } from "@/data/types";
import { useBranch } from "@/context/BranchContext";
import { useRole } from "@/context/RoleContext";
import { toast } from "sonner";
import { UserPlus, Shield, Headphones, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  onMemberAdded?: (member: TeamMember) => void;
  defaultRole?: "Manager" | "Telecaller";
}

const MBBS_TEAMS = [
  "Hyderabad Team",
  "Warangal Team",
  "Vijayawada Team",
  "Bangalore Team",
  "Chennai Team",
];

const MASTERS_TEAMS = [
  "Masters Global Team",
  "Vijayawada Masters Team",
  "Hyderabad Masters Team",
  "Masters STEM Team",
];

export function AddTeamMemberModal({
  open,
  onClose,
  onMemberAdded,
  defaultRole = "Telecaller",
}: AddTeamMemberModalProps) {
  const { branch: globalBranch, canSwitchBranch } = useBranch();
  const { currentRole, actualRole } = useRole();

  // Role and branch permissions
  // If user is a manager (or acting as a manager without admin privilege),
  // they can only add telecallers, and only to their specific division.
  const isManagerUser = actualRole === "manager" || (!canSwitchBranch && currentRole === "manager");
  const isBranchLocked = !canSwitchBranch;

  const [memberBranch, setMemberBranch] = useState<Branch>(globalBranch);
  const [role, setRole] = useState<"Manager" | "Telecaller">(isManagerUser ? "Telecaller" : defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const availableTeams = memberBranch === "masters" ? MASTERS_TEAMS : MBBS_TEAMS;
  const [team, setTeam] = useState(availableTeams[0]);

  const [callTarget, setCallTarget] = useState(role === "Manager" ? 500 : 250);
  const [qualifiedTarget, setQualifiedTarget] = useState(role === "Manager" ? 180 : 80);
  const [applicationsTarget, setApplicationsTarget] = useState(role === "Manager" ? 50 : 25);
  const [admissionsTarget, setAdmissionsTarget] = useState(role === "Manager" ? 18 : 8);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const active = isBranchLocked ? globalBranch : globalBranch;
      setMemberBranch(active);
      const teams = active === "masters" ? MASTERS_TEAMS : MBBS_TEAMS;
      setTeam(teams[0]);
      if (isManagerUser) {
        setRole("Telecaller");
      }
    }
  }, [open, globalBranch, isBranchLocked, isManagerUser]);

  const handleBranchChange = (newBranch: Branch) => {
    if (isBranchLocked) {
      toast.warning(`You are scoped to the ${globalBranch.toUpperCase()} division only.`);
      return;
    }
    setMemberBranch(newBranch);
    const teams = newBranch === "masters" ? MASTERS_TEAMS : MBBS_TEAMS;
    setTeam(teams[0]);
  };

  const handleRoleChange = (newRole: "Manager" | "Telecaller") => {
    if (isManagerUser && newRole === "Manager") {
      toast.error("Managers can only add telecallers to their own team.");
      return;
    }
    setRole(newRole);
    if (newRole === "Manager") {
      setCallTarget(500);
      setQualifiedTarget(180);
      setApplicationsTarget(50);
      setAdmissionsTarget(18);
    } else {
      setCallTarget(250);
      setQualifiedTarget(80);
      setApplicationsTarget(25);
      setAdmissionsTarget(8);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required";
    if (!email.trim()) {
      errs.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (phone.trim().length < 8) {
      errs.phone = "Please enter a valid phone number";
    }
    if (!password.trim()) {
      errs.password = "Login password is required";
    } else if (password.trim().length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const targets = [
        { label: role === "Manager" ? "Team Calls" : "Calls", done: 0, target: Number(callTarget) || 250 },
        { label: "Qualified leads", done: 0, target: Number(qualifiedTarget) || 80 },
        { label: "Applications", done: 0, target: Number(applicationsTarget) || 25 },
        { label: "Admissions", done: 0, target: Number(admissionsTarget) || 8 },
      ];

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role,
          phone: phone.trim(),
          branch: memberBranch,
          team,
          targets,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create team member account");
      }

      const created = addTeamMember(data.member);

      toast.success(
        `${role} ${created.name} added!`,
        {
          description: `Login account created for ${created.email}. They can now sign in at /login with their password.`,
          duration: 6000,
        }
      );
      if (onMemberAdded) onMemberAdded(created);

      // Reset
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setErrors({});
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add team member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Team Member"
      description="Add a manager or telecaller scoped to MBBS Abroad or Masters Abroad with initial quota targets."
      className="sm:max-w-xl"
      footer={
        <>
          <PrimaryButton
            type="button"
            tone="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </PrimaryButton>
          <PrimaryButton
            type="button"
            tone="primary"
            onClick={handleSubmit}
            disabled={loading}
            className="gap-1.5"
          >
            <UserPlus className="size-3.5" />
            {loading ? "Adding…" : `Add ${role}`}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Division / Vertical Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-foreground">
              Program Division *
            </label>
            {isBranchLocked && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                <Lock className="size-3" /> Locked to your assigned division
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isBranchLocked && globalBranch !== "mbbs"}
              onClick={() => handleBranchChange("mbbs")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition cursor-pointer ${
                memberBranch === "mbbs"
                  ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600"
                  : isBranchLocked
                  ? "opacity-40 cursor-not-allowed border-border"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="text-xl">🩺</div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  MBBS Abroad
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Kazakhstan, Georgia, Russia
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={isBranchLocked && globalBranch !== "masters"}
              onClick={() => handleBranchChange("masters")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition cursor-pointer ${
                memberBranch === "masters"
                  ? "border-purple-600 bg-purple-50/60 ring-1 ring-purple-600"
                  : isBranchLocked
                  ? "opacity-40 cursor-not-allowed border-border"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="text-xl">🎓</div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  Masters Abroad
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Germany, USA, UK (Meta Leads)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Role Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-foreground">
              Select Role
            </label>
            {isManagerUser && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Lock className="size-3" /> Managers can only add telecallers
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isManagerUser}
              onClick={() => handleRoleChange("Manager")}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                isManagerUser
                  ? "opacity-40 cursor-not-allowed border-border"
                  : "cursor-pointer"
              } ${
                role === "Manager"
                  ? "border-violet-600 bg-violet-50/50 dark:bg-violet-950/20 ring-1 ring-violet-600"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div
                className={`mt-0.5 rounded-md p-1.5 ${
                  role === "Manager"
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Shield className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Manager
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Oversees {memberBranch === "masters" ? "Masters" : "MBBS"} telecallers & pipeline
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("Telecaller")}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition cursor-pointer ${
                role === "Telecaller"
                  ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div
                className={`mt-0.5 rounded-md p-1.5 ${
                  role === "Telecaller"
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Headphones className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Telecaller
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Calls {memberBranch === "masters" ? "Masters" : "MBBS"} leads & follow-ups
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name *" error={errors.name}>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Branch / Team *">
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className={inputClass}
            >
              {availableTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email Address *" error={errors.email}>
            <input
              type="email"
              placeholder="e.g. member@leados.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Phone Number *" error={errors.phone}>
            <input
              type="tel"
              placeholder="+91 98480 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Account Login Password */}
        <Field label="Account Login Password *" error={errors.password}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="•••••••• (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            The team member will use this password and their email to sign into Lead.OS.
          </p>
        </Field>

        {/* Targets Configuration */}
        <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-3">
          <div className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Monthly Target Quotas</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Editable later
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Field label="Calls Target">
              <input
                type="number"
                min={0}
                value={callTarget}
                onChange={(e) => setCallTarget(Number(e.target.value))}
                className={inputClass}
              />
            </Field>

            <Field label="Qualified Leads">
              <input
                type="number"
                min={0}
                value={qualifiedTarget}
                onChange={(e) => setQualifiedTarget(Number(e.target.value))}
                className={inputClass}
              />
            </Field>

            <Field label="Applications">
              <input
                type="number"
                min={0}
                value={applicationsTarget}
                onChange={(e) => setApplicationsTarget(Number(e.target.value))}
                className={inputClass}
              />
            </Field>

            <Field label="Admissions">
              <input
                type="number"
                min={0}
                value={admissionsTarget}
                onChange={(e) => setAdmissionsTarget(Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
