"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Trash2,
  CalendarClock,
  UserCheck,
  Zap,
  Info,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { getNotifications } from "@/services/api";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(getNotifications());
  const [filter, setFilter] = useState<"all" | "unread" | "lead" | "followup" | "system">("all");

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const leadAlerts = useMemo(() => notifications.filter((n) => n.type === "lead").length, [notifications]);
  const followUpAlerts = useMemo(() => notifications.filter((n) => n.type === "followup").length, [notifications]);

  const filteredItems = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "unread") return !item.read;
      if (filter === "lead") return item.type === "lead";
      if (filter === "followup") return item.type === "followup";
      if (filter === "system") return item.type === "system";
      return true;
    });
  }, [notifications, filter]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification removed");
  };

  const clearAllRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    toast.success("Cleared all read notifications");
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "lead":
        return <UserCheck className="size-4 text-primary" />;
      case "followup":
        return <CalendarClock className="size-4 text-amber-500" />;
      case "system":
        return <Zap className="size-4 text-indigo-500" />;
      default:
        return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Page Header */}
      <PageHeader
        title="Notifications & Activity Feed"
        subtitle="Real-time alerts, lead routing notifications, urgent follow-up nudges, and workflow events."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton tone="ghost" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </PrimaryButton>
            <PrimaryButton tone="ghost" onClick={clearAllRead}>
              <Trash2 className="size-3.5 mr-1" />
              Clear read
            </PrimaryButton>
          </div>
        }
      />

      {/* KPI Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Alerts" value={notifications.length} />
        <StatTile label="Unread Action Items" value={unreadCount} tone={unreadCount > 0 ? "text-amber-500" : "text-success"} />
        <StatTile label="New Lead Alerts" value={leadAlerts} tone="text-primary" />
        <StatTile label="Follow-up Reminders" value={followUpAlerts} tone="text-foreground" />
      </div>

      {/* Notification Stream Panel */}
      <Panel
        title="Recent Alerts"
        description={`${unreadCount} unread items requiring your attention`}
        actions={
          <div className="flex rounded-lg border border-border bg-card p-1 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: `Unread (${unreadCount})` },
              { id: "lead", label: "Leads" },
              { id: "followup", label: "Follow-ups" },
              { id: "system", label: "System" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                  filter === t.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {filteredItems.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex flex-wrap items-start justify-between gap-4 p-4 transition-colors",
                !n.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/30",
              )}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center shrink-0 border",
                  !n.read ? "bg-card border-primary/30 shadow-xs" : "bg-surface-2 border-border",
                )}>
                  {getIcon(n.type)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-xs font-semibold leading-none", !n.read ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="size-2 rounded-full bg-primary" title="Unread" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.detail}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                    <Clock className="size-3" />
                    <span>{formatTimestamp(n.at)}</span>
                    {n.leadId && (
                      <>
                        <span>·</span>
                        <Link
                          href={`/leads/${n.leadId}`}
                          className="font-medium text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          View Lead ({n.leadId}) <ArrowUpRight className="size-3" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => toggleRead(n.id)}
                  title={n.read ? "Mark as unread" : "Mark as read"}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer text-xs"
                >
                  <CheckCircle2 className={cn("size-4", n.read ? "text-muted-foreground" : "text-primary")} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteNotification(n.id)}
                  title="Remove notification"
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}

          {filteredItems.length === 0 && (
            <li className="px-6 py-12 text-center text-sm text-muted-foreground">
              No notifications matching this filter.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
