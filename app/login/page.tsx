"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, Users, Headphones, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "telecaller">("telecaller");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Pre-check role authorization to show clear role warning if user attempts privilege elevation
      const checkRes = await fetch("/api/auth/validate-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const checkData = await checkRes.json();
      if (!checkData.ok && checkData.warning) {
        setError(checkData.warning);
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        role,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.startsWith("Access Denied")) {
          setError(result.error);
        } else {
          setError("Invalid email or password.");
        }
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { id: "admin", label: "Admin", icon: Shield },
    { id: "manager", label: "Manager", icon: Users },
    { id: "telecaller", label: "Telecaller", icon: Headphones },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0f0f1a] flex-col items-center justify-center px-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-cyan-600/10 blur-3xl" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-16">
            <span className="text-4xl font-black tracking-tight text-white">
              Lead<span className="text-indigo-400">.</span><span className="text-indigo-400">OS</span>
            </span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Close more deals,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              faster than ever.
            </span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-12">
            Your entire lead pipeline — calls, follow-ups, campaigns, and fees — unified in one intelligent workspace.
          </p>

          <div className="grid grid-cols-3 gap-6">
            {[
              { value: "3×", label: "Faster follow-up" },
              { value: "98%", label: "Data accuracy" },
              { value: "40+", label: "Integrations" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-black text-white mb-1">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-gray-300 text-sm leading-relaxed">
              &ldquo;Lead.OS completely transformed how our team handles leads. We&apos;ve never been more organized.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold">
                R
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Rahul Sharma</div>
                <div className="text-gray-500 text-xs">Head of Sales, TechVentures</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="lg:hidden mb-8">
          <span className="text-3xl font-black tracking-tight text-gray-900">
            Lead<span className="text-indigo-500">.</span><span className="text-indigo-500">OS</span>
          </span>
        </div>

        <div className={`w-full max-w-md transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Sign in with your email and password to access your dashboard
            </p>
          </div>

          {/* Error / Role Warning */}
          {error && (
            <div
              className={cn(
                "mb-5 flex items-start gap-3 rounded-xl px-4 py-3.5 border text-sm transition-all",
                error.startsWith("Access Denied")
                  ? "bg-amber-50/90 border-amber-200 text-amber-900 shadow-2xs"
                  : "bg-red-50 border-red-100 text-red-600"
              )}
            >
              {error.startsWith("Access Denied") ? (
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              ) : (
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1">
                {error.startsWith("Access Denied") && (
                  <div className="font-bold text-amber-950 mb-0.5">Role Permission Warning</div>
                )}
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotHelp(!showForgotHelp)}
                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium transition cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {showForgotHelp && (
                <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900 transition-all">
                  <Info className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-indigo-950">Password Recovery</div>
                    <p className="leading-relaxed text-indigo-800 text-[11px]">
                      Please contact your system Administrator. Administrators can instantly generate or reset your password directly from the <strong>Admin Panel → Team Directory</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-12 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? (
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ── Role Selection in Form ── */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Sign In As
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((r) => {
                  const Icon = r.icon;
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as any)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs ring-1 ring-indigo-200"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-white"
                      )}
                    >
                      <Icon className={cn("size-4", isSelected ? "text-indigo-600" : "text-gray-400")} />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Please wait…
                </span>
              ) : (
                `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)} →`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
