"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const inputClass =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium";

export const selectClass =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-pointer font-medium";

export const textareaClass =
  "w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium";

export function Field({
  label,
  children,
  className,
  error,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-xs font-bold text-slate-800">{label}</label>}
      {children}
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className={cn("sm:max-w-lg bg-white text-slate-900 border border-slate-300 shadow-2xl", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">{title}</DialogTitle>}
            {description && <DialogDescription className="text-xs text-slate-600 font-medium">{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="py-2 space-y-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "ghost" | "danger" | "outline" | "brand";
}

export function PrimaryButton({
  tone = "primary",
  className,
  children,
  ...props
}: PrimaryButtonProps) {
  const toneClasses = {
    primary: "bg-indigo-600 text-white font-semibold shadow-xs hover:bg-indigo-700",
    brand: "bg-indigo-600 text-white font-semibold shadow-xs hover:bg-indigo-700",
    ghost: "border border-slate-300 bg-white text-slate-800 font-semibold hover:bg-slate-100 hover:text-slate-950 shadow-2xs",
    danger: "border border-red-300 bg-red-50 text-red-700 font-semibold hover:bg-red-100 shadow-2xs",
    outline: "border border-slate-300 bg-transparent text-slate-800 font-semibold hover:bg-slate-100",
  }[tone];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        toneClasses,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
