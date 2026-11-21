// components/Logo.tsx
import React from "react";

export default function Logo({ className }: { className?: string }) {
  return (
    <h1 className={`font-display text-primary-600 ${className}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      Lead.OS
    </h1>
  );
}
