"use client";
import { useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useChatMessages } from "@/hooks/useChatMessages";

const agentColors: Record<string, string> = {
  claude:  "bg-accent text-white",
  minimax: "bg-blue text-white",
  chatgpt: "bg-green text-white",
  ceo:     "bg-ink-3 text-white",
};

const agentLabels: Record<string, string> = {
  claude:  "CL",
  minimax: "MM",
  chatgpt: "GP",
  ceo:     "CE",
};

const quickActions = [
  "Дай статус по всем проектам",
  "Создай ТЗ для MiniMax: ",
  "Идея для виралки: ",
];

export function Cabinet() {
  const { messages, addMessage } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const { sendMessage: saveMessageToDB } = useChatMessages();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const senderName = profile?.full_name
    ? profile.full_name.split(" ")[0]
    : "CEO";

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userInput = inputValue.trim();

    await saveMessageToDB(userInput, "ceo", senderName);
    addMessage({ sender: "ceo", senderName, content: userInput });
    setInputValue("");
    setIsTyping(true);

    try {
      const allMessages = [
        ...messages,
        { sender: "ceo", senderName, content: userInput },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!response.ok || !response.body) throw new Error("Нет ответа от сервера");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      const messageId = `claude-${Date.now()}`;

      addMessage({ id: messageId, sender: "claude", senderName: "Claude", content: "" });
      setIsTyping(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              useStore.setState((state) => ({
                messages: state.messages.map((m) =>
                  m.id === messageId ? { ...m, content: fullText } : m
                ),
              }));
            }
          } catch {}
        }
      }

      if (fullText) await saveMessageToDB(fullText, "claude", "Claude");
    } catch (err: unknown) {
      setIsTyping(false);
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      addMessage({
        sender: "claude",
        senderName: "Claude",
        content: `Ошибка: ${msg}. Проверьте API ключ в настройках.`,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="w-[360px] bg-bg-2 border-l border-line flex flex-col h-full shrink-0">
      <div className="px-5 pt-5 pb-4 border-b border-line">
        <div className="text-[15px] font-semibold text-ink mb-0.5">Claude</div>
        <div className="font-mono text-[10px] text-ink-3 tracking-[0.1em] uppercase">
          CEO → AI · прямой канал
        </div>
      </div>

      <div ref={feedRef} className="chat-feed flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-msg-in rounded-lg p-3 ${
              msg.sender === "ceo"
                ? "bg-accent/8 border border-accent/20"
                : "bg-panel border border-line"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold shrink-0 ${agentColors[msg.sender]}`}>
                {agentLabels[msg.sender]}
              </div>
              <span className="text-[12px] font-semibold text-ink">{msg.senderName}</span>
              <span className="ml-auto font-mono text-[10px] text-ink-3">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="text-[13px] leading-relaxed text-ink-2 whitespace-pre-wrap">
              {msg.content || <span className="text-ink-3 italic">Печатает...</span>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="animate-msg-in bg-panel border border-line rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${agentColors.claude}`}>
                CL
              </div>
              <span className="text-[12px] font-semibold text-ink">Claude</span>
            </div>
            <span className="flex items-center gap-2 text-[13px] text-ink-3">
              <Loader2 size={13} className="animate-spin text-accent" />
              Думаю...
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line p-4 bg-bg-2">
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setInputValue(action)}
              className="font-mono text-[10px] bg-panel border border-line px-2 py-1 rounded text-ink-2 transition-colors hover:border-accent/40 hover:text-accent"
            >
              {action.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 bg-panel border border-line rounded-lg px-3 py-2.5 transition-colors focus-within:border-accent/50">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите задачу..."
            rows={2}
            className="flex-1 bg-transparent border-none text-ink text-[13px] resize-none outline-none placeholder:text-ink-3 leading-relaxed min-h-[40px] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !inputValue.trim()}
            className="bg-accent text-white w-7 h-7 rounded-md flex items-center justify-center transition-all hover:bg-accent-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
