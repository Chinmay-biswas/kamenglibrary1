"use client";

import { useState } from "react";

type NotificationItem = { id: string; title: string; body: string; read: boolean; createdAt: string };

export function NotificationList({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);

  async function markRead(id: string) {
    const response = await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) return;
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  if (!notifications.length) return <div className="empty-state"><strong>Nothing needs your attention.</strong><span>Seat reminders and attendance checks will appear here.</span></div>;
  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <article className={`notification-item ${notification.read ? "is-read" : ""}`} key={notification.id}>
          <div><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString()}</small></div>
          {!notification.read && <button className="text-button" onClick={() => markRead(notification.id)}>Mark read</button>}
        </article>
      ))}
    </div>
  );
}
