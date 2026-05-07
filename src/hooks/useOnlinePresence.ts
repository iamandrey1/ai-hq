"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Module-level singleton: один presence-канал на вкладку, чтобы все компоненты
// видели одно и то же состояние и Vova не "залипал" в онлайн при бэкграунд-табе.
let channel: RealtimeChannel | null = null;
let initStarted = false;
let cachedIds: string[] = [];
const listeners = new Set<(ids: string[]) => void>();
let heartbeat: ReturnType<typeof setInterval> | null = null;
let visHandler: (() => void) | null = null;

async function updateLastSeen() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
  } catch {}
}

function notify() {
  for (const l of listeners) l(cachedIds);
}

function ensureChannel() {
  if (initStarted) return;
  initStarted = true;
  const supabase = createClient();
  // Stable channel name — все клиенты в одной комнате
  const room = supabase.channel("ai-hq-presence", {
    config: { presence: { key: "" } },
  });
  channel = room;

  const syncIds = () => {
    const state = room.presenceState<{ user_id: string }>();
    const ids = Object.values(state)
      .flat()
      .map((p) => p.user_id)
      .filter(Boolean);
    cachedIds = [...new Set(ids)];
    notify();
  };

  room
    .on("presence", { event: "sync" }, syncIds)
    .on("presence", { event: "join" }, syncIds)
    .on("presence", { event: "leave" }, syncIds)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await room.track({ user_id: user.id, online_at: new Date().toISOString() });
          await updateLastSeen();
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = setInterval(updateLastSeen, 30_000);
        }
      }
    });

  if (typeof document !== "undefined") {
    visHandler = () => {
      if (document.visibilityState === "visible") updateLastSeen();
    };
    document.addEventListener("visibilitychange", visHandler);
  }

  // Гарантированный leave при закрытии вкладки
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      try { room.untrack(); } catch {}
    });
  }
}

export function useOnlinePresence() {
  const [onlineIds, setOnlineIds] = useState<string[]>(cachedIds);

  useEffect(() => {
    ensureChannel();
    listeners.add(setOnlineIds);
    setOnlineIds(cachedIds);
    return () => {
      listeners.delete(setOnlineIds);
    };
  }, []);

  return { onlineIds };
}
