"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useOnlinePresence() {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // No shared key — each socket connection is its own entry in presenceState
    const room = supabase.channel("ai-hq-presence");

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState<{ user_id: string }>();
        // Each value is an array of presence records for that socket
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
          }
        }
      });

    return () => {
      room.untrack();
      supabase.removeChannel(room);
    };
  }, []);

  return { onlineIds };
}
