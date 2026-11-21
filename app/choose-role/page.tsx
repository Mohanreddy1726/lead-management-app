"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, Users, Headphones, CheckCircle2, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    id: "admin",
    title: "Administrator",
    badge: "Full Access",
    icon: Shield,
    color: "indigo",
    description:
      "Complete control over system settings, user permissions, team assignments, integrations, and audit logs.",
    features: ["Manage telecallers & teams", "Configure automation rules", "Audit logs & compliance", "System settings"],
  },
  {
    id: "manager",
    title: "Manager",
    badge: "Pipeline & Team",
    icon: Users,
    color: "violet",
    description:
      "Supervise daily operations, distribute leads, track telecaller targets, and analyze conversion funnels.",
    features: ["Lead allocation & round-robin", "Team performance analytics", "Campaign ROI tracking", "Pipeline management"],
  },
  {
    id: "telecaller",
    title: "Telecaller",
    badge: "Operations",
    icon: Headphones,
    color: "emerald",
    description:
      "Call prospective students, log conversation outcomes, manage follow-up calendars, and update journey stages.",
    features: ["Lead calling & notes", "Follow-up reminders", "Communication & notes", "Document status update"],
  },
];

export default function ChooseRolePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>("telecaller");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleConfirmRole = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update role. Please try again.");
        setLoading(false);
        return;
      }

      // Update the client session with the new role
      await update({ role: selectedRole });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500 animate-pulse">Loading Lead.OS…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              Lead<span className="text-indigo-600">.</span>
              <span className="text-indigo-600">OS</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Select Your Role
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Welcome, <strong>{session?.user?.name || session?.user?.email}</strong>! Please choose
            your role to configure your Lead.OS workspace and permissions.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700 text-center">
            {error}
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 bg-white",
                  isSelected
                    ? "border-indigo-600 shadow-md ring-2 ring-indigo-100 -translate-y-0.5"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="size-5 text-indigo-600" />
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {role.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{role.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {role.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  {role.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="size-1 rounded-full bg-indigo-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Selected:{" "}
            <span className="font-semibold text-slate-800 capitalize">{selectedRole}</span>. You can
            switch roles or permissions anytime in Settings.
          </div>
          <button
            onClick={handleConfirmRole}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-70 transition-all"
          >
            {loading ? (
              <span>Saving role…</span>
            ) : (
              <>
                <span>Continue to Dashboard</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
