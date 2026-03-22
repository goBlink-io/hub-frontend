"use client";

import { useEffect, useRef, useCallback } from "react";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("bb_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("bb_visitor_id", id);
  }
  return id;
}

interface TrackEvent {
  event: string;
  pageId: string;
  visitorId: string;
  timestamp: string;
}

export function PageviewTracker({ spaceSlug, pageId }: { spaceSlug: string; pageId: string }) {
  const bufferRef = useRef<TrackEvent[]>([]);

  const flush = useCallback(() => {
    const events = bufferRef.current.splice(0);
    if (events.length === 0) return;
    const payload = JSON.stringify({ events });
    const url = `/api/sites/${spaceSlug}/track`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [spaceSlug]);

  useEffect(() => {
    const visitorId = getVisitorId();
    bufferRef.current.push({
      event: "pageview",
      pageId,
      visitorId,
      timestamp: new Date().toISOString(),
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const timer = setTimeout(flush, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timer);
      flush();
    };
  }, [spaceSlug, pageId, flush]);

  return null;
}
