"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { Message } from "@/types/index";

export function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const addMessage = useStore((state) => state.addMessage);

  // Load messages from Supabase on mount
  useEffect(() => {
    const loadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(50);

        if (data && data.length > 0) {
          const formattedMessages: Message[] = data.map((m) => ({
            id: m.id,
            sender: m.sender,
            senderName: m.sender_name,
            content: m.content,
            timestamp: new Date(m.created_at),
            delegated: m.delegated_to || undefined,
          }));
          setMessages(formattedMessages);
          
          // Sync to local store (avoid duplicates)
          const existingIds = new Set(useStore.getState().messages.map((msg) => msg.id));
          formattedMessages
            .filter((msg) => !existingIds.has(msg.id))
            .forEach((msg) => {
              addMessage({
                id: msg.id,
                sender: msg.sender,
                senderName: msg.senderName,
                content: msg.content,
                delegated: msg.delegated,
              });
            });
        }
      }
      setLoading(false);
    };

    loadMessages();
  }, []);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    let channel: any = null;

    const subscribeToMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      channel = supabase
        .channel("messages-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const newMsg = payload.new as {
              id: string;
              sender: string;
              sender_name: string;
              content: string;
              created_at: string;
              delegated_to?: string;
            };
            
            // Don't add if already in state (own message)
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              
              const formatted: Message = {
                id: newMsg.id,
                sender: newMsg.sender,
                senderName: newMsg.sender_name,
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at),
                delegated: newMsg.delegated_to || undefined,
              };
              
              // Also add to Zustand store
              addMessage({
                id: formatted.id,
                sender: formatted.sender,
                senderName: formatted.senderName,
                content: formatted.content,
                delegated: formatted.delegated,
              });
              
              return [...prev, formatted];
            });
          }
        )
        .subscribe();
    };

    subscribeToMessages();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Send a message and save to Supabase
  const sendMessage = useCallback(
    async (content: string, sender: string, senderName: string, delegated?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Generate UUID without external dependency
      const messageId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const { error } = await supabase.from("messages").insert({
        id: messageId,
        sender,
        sender_name: senderName,
        content,
        delegated_to: delegated || null,
        user_id: user.id,
      });

      if (error) {
        console.error("Failed to save message:", error);
        return null;
      }

      return messageId;
    },
    []
  );

  return { messages, loading, sendMessage };
}
