"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { Message } from "@/types/index";

export function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const addMessage = useStore((state) => state.addMessage);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        const formatted: Message[] = data.map(m => ({
          id: m.id,
          sender: m.sender,
          senderName: m.sender_name,
          content: m.content,
          timestamp: new Date(m.created_at),
          delegated: m.delegated_to || undefined,
        }));
        setMessages(formatted);
        const existingIds = new Set(useStore.getState().messages.map(msg => msg.id));
        formatted
          .filter(msg => !existingIds.has(msg.id))
          .forEach(msg => addMessage({ id: msg.id, sender: msg.sender, senderName: msg.senderName, content: msg.content, delegated: msg.delegated }));
      }
      setLoading(false);
    };
    load();
  }, [addMessage]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("messages-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const m = payload.new as {
            id: string; sender: string; sender_name: string;
            content: string; created_at: string; delegated_to?: string;
          };
          setMessages(prev => {
            if (prev.some(x => x.id === m.id)) return prev;
            const formatted: Message = {
              id: m.id, sender: m.sender, senderName: m.sender_name,
              content: m.content, timestamp: new Date(m.created_at),
              delegated: m.delegated_to || undefined,
            };
            addMessage({ id: formatted.id, sender: formatted.sender, senderName: formatted.senderName, content: formatted.content, delegated: formatted.delegated });
            return [...prev, formatted];
          });
        })
        .subscribe();
    };

    subscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [addMessage]);

  const sendMessage = useCallback(async (content: string, sender: string, senderName: string, delegated?: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const messageId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });

    const { error } = await supabase.from("messages").insert({
      id: messageId, sender, sender_name: senderName,
      content, delegated_to: delegated || null, user_id: user.id,
    });

    if (error) { console.error("sendMessage:", error); return null; }
    return messageId;
  }, []);

  return { messages, loading, sendMessage };
}
