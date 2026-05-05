"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useOnlinePresence() {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const room = supabase.channel("ai-hq-presence", {
      config: { presence: { key: "users" } },
    });

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState<{ user_id: string }>();
        const ids = Object.values(state).flat().map((p) => p.user_id);
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await room.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        }
      });

    return () => { supabase.removeChannel(room); };
  }, []);

  return { onlineIds };
}
