import React, { useState } from "react";
import { Bell, CheckCircle2, ExternalLink, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHrms } from "../../lib/hrmsContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useHrms();
  const [filterType, setFilterType] = useState("ALL");
  const navigate = useNavigate();

  const filtered = notifications.filter(
    (n) => filterType === "ALL" || n.type.toUpperCase() === filterType
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight flex items-center gap-3">
            <span>Notifications Center</span>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            System announcements, approval requests, and statutory compliance reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={markAllNotificationsRead}
            variant="outline"
            size="md"
            leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["ALL", "LEAVE", "ATTENDANCE", "PAYROLL", "SYSTEM"].map((type) => {
          const count =
            type === "ALL"
              ? notifications.length
              : notifications.filter((n) => n.type.toUpperCase() === type).length;
          const isActive = filterType === type;

          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-gray-950 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:text-gray-950 hover:bg-gray-100 border border-gray-200/80"
              }`}
            >
              <span>{type}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 text-gray-400">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">No Notifications</p>
              <p className="text-xs text-gray-400 mt-0.5">
                There are no alerts matching the selected category.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  markNotificationRead(item.id);
                  if (item.link) navigate(item.link);
                }}
                className={`p-4 sm:p-4.5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                  !item.isRead
                    ? "bg-white hover:bg-gray-50/80 font-medium"
                    : "bg-gray-50/40 hover:bg-gray-50/80"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      !item.isRead
                        ? "bg-gray-950 text-white shadow-xs"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2
                        className={`text-xs ${
                          !item.isRead ? "font-bold text-gray-950" : "font-semibold text-gray-800"
                        }`}
                      >
                        {item.title}
                      </h2>
                      <Badge variant="neutral" size="sm">
                        {item.type}
                      </Badge>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
                      {item.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-gray-400 font-mono">{item.timestamp}</span>
                  {item.link && <ExternalLink className="w-3.5 h-3.5 text-gray-400" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
