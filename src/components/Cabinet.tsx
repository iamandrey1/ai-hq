"use client";
import { useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useChatMessages } from "@/hooks/useChatMessages";

const agentColors: Record<string, string> = {
  claude: "bg-accent text-bg",
  minimax: "bg-blue",
  chatgpt: "bg-[#4a7d5a] text-ink",
  ceo: "bg-ink-2 text-bg",
};

const agentLabels: Record<string, string> = {
  claude: "CL",
  minimax: "MM",
  chatgpt: "GP",
  ceo: "JO",
};

const quickActions = [
  "Дай статус по всем проектам",
  "Создай ТЗ для MiniMax: ",
  "Сгенерируй промт для ChatGPT: ",
  "Идея для виралки: ",
];

export function Cabinet() {
  const { messages, addMessage } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const { sendMessage: saveMessageToDB } = useChatMessages();

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const senderName = profile?.full_name 
    ? profile.full_name.split(" ")[0] + (profile.role === "ceo" ? " (CEO)" : "")
    : "Jo (CEO)";

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userInput = inputValue.trim();
    
    // Save to Supabase and add to local store
    await saveMessageToDB(userInput, "ceo", senderName);
    addMessage({
      sender: "ceo",
      senderName: senderName,
      content: userInput,
    });
    
    setInputValue("");
    setIsTyping(true);

    try {
      const allMessages = [
        ...messages,
        { sender: "ceo", senderName: senderName, content: userInput },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Нет ответа от сервера");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Create placeholder for Claude response
      addMessage({
        id: `claude-${Date.now()}`,
        sender: "claude",
        senderName: "Claude",
        content: "",
      });
      setIsTyping(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              useStore.setState((state) => ({
                messages: state.messages.map((m) =>
                  m.id === `claude-${Date.now()}` ? { ...m, content: fullText } : m
                ),
              }));
            }
          } catch {}
        }
      }

      // Save Claude response to Supabase
      if (fullText) {
        await saveMessageToDB(fullText, "claude", "Claude");
      }
    } catch (err: any) {
      setIsTyping(false);
      addMessage({
        sender: "claude",
        senderName: "Claude",
        content: `⚠️ Ошибка: ${err?.message || "Неизвестная ошибка"}. Проверьте API ключ в настройках.`,
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
    <aside className="w-[380px] bg-bg-2 border-l border-line flex flex-col h-full shrink-0">
      <div className="px-5 pt-5 pb-4 border-b border-line">
        <div className="font-display text-[17px] font-medium mb-0.5">Поручения Claude</div>
        <div className="font-mono text-[10px] text-ink-3 tracking-[0.1em] uppercase">
          Прямой канал · CEO → AI
</div>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-msg-in rounded-xl p-3 ${
              msg.sender === "ceo"
                ? "bg-accent/8 border border-accent/20"
                : msg.sender === "minimax"
                ? "bg-panel border border-blue/30 border-l-2 border-l-blue"
                : "bg-panel border border-line"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] text-ink-3">
              <div
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${agentColors[msg.sender]}`}
              >
                {agentLabels[msg.sender]}
              </div>
              <b className="text-ink font-semibold text-xs font-body normal-case tracking-normal">
                {msg.senderName}
              </b>
              <span className="ml-auto">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="text-[13px] leading-relaxed text-ink-2 whitespace-pre-wrap">
              {msg.content || (
                <span className="text-ink-3 italic">Печатает...</span>
              )}
            </div>
            {msg.delegated && (
              <div className="mt-2 p-2 bg-panel-2 rounded text-[10px] text-ink-3 flex items-center gap-1.5">
                <span style={{ color: "var(--accent)" }}>→</span>
                Делегировано:{" "}
                {msg.delegated === "minimax" ? "MiniMax Agent" : "ChatGPT"}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="animate-msg-in bg-panel border border-line rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] text-ink-3">
              <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${agentColors.claude}`}>
                CL
              </div>
              <b className="text-ink font-semibold text-xs font-body">Claude</b>
            </div>
            <span className="flex items-center gap-2 text-[13px] text-ink-3">
              <Loader2 size={14} className="animate-spin text-accent" />
              Думаю...
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-line p-4 bg-bg-2">
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setInputValue(action)}
              className="font-mono text-[10px] bg-panel border border-line px-2.5 py-1 rounded-full text-ink-2 cursor-pointer transition-all hover:border-accent hover:text-accent"
            >
              #{action.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 bg-panel border border-line rounded-xl px-3 py-2.5 transition-colors focus-within:border-accent">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите задачу — Claude её распределит и доведёт до результата..."
            rows={2}
            className="flex-1 bg-transparent border-none text-ink text-[13px] resize-none outline-none placeholder:text-ink-3 leading-relaxed min-h-[40px] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !inputValue.trim()}
            className="bg-accent text-bg w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center transition-all hover:scale-105 hover:bg-accent-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}