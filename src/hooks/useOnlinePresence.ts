"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

async function updateLastSeen() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
  } catch {}
}

export function useOnlinePresence() {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const room = supabase.channel(`ai-hq-presence-${Date.now()}`);
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState<{ user_id: string }>();
        const ids = Object.values(state)
          .flat()
          .map((p) => p.user_id)
          .filter(Boolean);
        setOnlineIds([...new Set(ids)]);
      })
      .on("presence", { event: "leave" }, () => {
        const state = room.presenceState<{ user_id: string }>();
        const ids = Object.values(state)
          .flat()
          .map((p) => p.user_id)
          .filter(Boolean);
        setOnlineIds([...new Set(ids)]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await room.track({ user_id: user.id });
            await updateLastSeen();
            heartbeat = setInterval(updateLastSeen, 30_000);
          }
        }
      });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") updateLastSeen();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (heartbeat) clearInterval(heartbeat);
      room.untrack();
      supabase.removeChannel(room);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return { onlineIds };
}
