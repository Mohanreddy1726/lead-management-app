"use client";

import React, { useState, useEffect } from "react";
import { Modal, Field, inputClass, selectClass, PrimaryButton } from "./modal";
import { createLead, getTelecallers } from "@/services/api";
import { SOURCES } from "@/data/mock";
import type { Lead, LeadSource, Branch } from "@/data/types";
import { useBranch } from "@/context/BranchContext";
import { toast } from "sonner";
import { UserPlus, Sparkles } from "lucide-react";

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  onLeadCreated?: (lead: Lead) => void;
}

const MBBS_COURSES = ["MBBS Abroad", "BDS Abroad", "MD Abroad"];
const MASTERS_COURSES = ["Masters Abroad"];

const MBBS_COUNTRIES = ["Kazakhstan", "Georgia", "Russia", "Kyrgyzstan", "Uzbekistan"];
const MASTERS_COUNTRIES = ["Germany", "USA", "UK", "Canada", "Ireland", "Australia"];

export function AddLeadModal({ open, onClose, onLeadCreated }: AddLeadModalProps) {
  const { branch: activeBranch, canSwitchBranch } = useBranch();
  const [leadBranch, setLeadBranch] = useState<Branch>(activeBranch);

  const availableCourses = leadBranch === "masters" ? MASTERS_COURSES : MBBS_COURSES;
  const availableCountries = leadBranch === "masters" ? MASTERS_COUNTRIES : MBBS_COUNTRIES;
  const branchTelecallers = getTelecallers(leadBranch);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [course, setCourse] = useState(availableCourses[0]);
  const [country, setCountry] = useState(availableCountries[0]);
  const [source, setSource] = useState<LeadSource>(leadBranch === "masters" ? "Meta Ads" : "Manual");
  const [assignedTo, setAssignedTo] = useState("");
  const [parentName, setParentName] = useState("");
  const [neetScore, setNeetScore] = useState<string>("");
  const [budget, setBudget] = useState(leadBranch === "masters" ? "₹30L - ₹40L" : "₹20L - ₹25L");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setLeadBranch(activeBranch);
      const courses = activeBranch === "masters" ? MASTERS_COURSES : MBBS_COURSES;
      const countries = activeBranch === "masters" ? MASTERS_COUNTRIES : MBBS_COUNTRIES;
      setCourse(courses[0]);
      setCountry(countries[0]);
      setBudget(activeBranch === "masters" ? "₹30L - ₹40L" : "₹20L - ₹25L");
      const callers = getTelecallers(activeBranch);
      setAssignedTo(callers[0]?.id || "");
    }
  }, [open, activeBranch]);

  const handleBranchSwitch = (b: Branch) => {
    setLeadBranch(b);
    const courses = b === "masters" ? MASTERS_COURSES : MBBS_COURSES;
    const countries = b === "masters" ? MASTERS_COUNTRIES : MBBS_COUNTRIES;
    setCourse(courses[0]);
    setCountry(countries[0]);
    setBudget(b === "masters" ? "₹30L - ₹40L" : "₹20L - ₹25L");
    const callers = getTelecallers(b);
    setAssignedTo(callers[0]?.id || "");
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Student name is required";
    if (!phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (phone.replace(/\D/g, "").length < 10) {
      errs.phone = "Please enter a valid 10-digit phone number";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCity("Hyderabad");
    setCourse(availableCourses[0]);
    setCountry(availableCountries[0]);
    setSource(leadBranch === "masters" ? "Meta Ads" : "Manual");
    setAssignedTo("");
    setParentName("");
    setNeetScore("");
    setBudget(leadBranch === "masters" ? "₹30L - ₹40L" : "₹20L - ₹25L");
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const created = createLead({
        name: name.trim(),
        phone: phone.trim().startsWith("+91") ? phone.trim() : `+91 ${phone.trim()}`,
        email: email.trim().toLowerCase() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        city: city.trim(),
        branch: leadBranch,
        course,
        country,
        source,
        assignedTo: assignedTo || null,
        parentName: parentName.trim() || undefined,
        neetScore: leadBranch === "mbbs" && neetScore ? parseInt(neetScore, 10) : undefined,
        budget,
        stage: assignedTo ? "Assigned" : "New",
        status: "New",
      });

      toast.success("Lead created successfully", {
        description: `${created.name} (${created.id}) added to ${leadBranch.toUpperCase()} pipeline.`,
      });

      if (onLeadCreated) {
        onLeadCreated(created);
      }

      resetForm();
      onClose();
    } catch {
      toast.error("Failed to create lead. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Lead"
      description="Capture student inquiry details, study abroad preferences and assign an admissions counsellor."
      footer={
        <>
          <PrimaryButton tone="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Save & Add Lead"}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Division Switcher */}
        {canSwitchBranch && (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Program Division
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleBranchSwitch("mbbs")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border-2 text-xs font-bold cursor-pointer transition ${
                  leadBranch === "mbbs"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-400 shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>🩺</span>
                <span>MBBS Abroad</span>
              </button>
              <button
                type="button"
                onClick={() => handleBranchSwitch("masters")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border-2 text-xs font-bold cursor-pointer transition ${
                  leadBranch === "masters"
                    ? "border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>🎓</span>
                <span>Masters Abroad</span>
              </button>
            </div>
          </div>
        )}

        {/* Basic Student Info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Student Full Name *" error={errors.name}>
            <input
              type="text"
              required
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Rohith Varma"
            />
          </Field>

          <Field label="Phone / Mobile Number *" error={errors.phone}>
            <input
              type="tel"
              required
              className={inputClass}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              placeholder="e.g. 98480 12345"
            />
          </Field>

          <Field label="Email Address" error={errors.email}>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="e.g. rohith@gmail.com"
            />
          </Field>

          <Field label="City / Location">
            <input
              type="text"
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Hyderabad, Vijayawada"
            />
          </Field>
        </div>

        {/* Course & Country Preference */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target Course">
            <select
              className={selectClass}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {availableCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Preferred Destination Country">
            <select
              className={selectClass}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Source & Telecaller Assignment */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Acquisition Source">
            <select
              className={selectClass}
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assign to Counsellor">
            <select
              className={selectClass}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Yet to Assign</option>
              {branchTelecallers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.team})
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Additional Optional Profiling */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Academic & Family Details (Optional)
          </p>
          <div className={`grid gap-3 ${leadBranch === "mbbs" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <Field label="Parent / Guardian Name">
              <input
                type="text"
                className={inputClass}
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Suresh Varma"
              />
            </Field>

            {leadBranch === "mbbs" && (
              <Field label="NEET Score">
                <input
                  type="number"
                  min="0"
                  max="720"
                  className={inputClass}
                  value={neetScore}
                  onChange={(e) => setNeetScore(e.target.value)}
                  placeholder="e.g. 420"
                />
              </Field>
            )}

            <Field label="Budget Range">
              <input
                type="text"
                className={inputClass}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={leadBranch === "masters" ? "e.g. ₹35L - ₹45L" : "e.g. ₹20L - ₹25L"}
              />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
