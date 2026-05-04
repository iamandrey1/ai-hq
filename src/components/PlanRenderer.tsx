"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ExternalLink, CheckSquare, Square } from "lucide-react";

export function PlanRenderer({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="text-ink-3 text-center py-12">
        План для этого проекта ещё не загружен.
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-amber max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
            >
              {children}
              <ExternalLink className="w-3 h-3" />
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-none space-y-1">{children}</ul>
          ),
          li: ({ children, ...props }) => {
            const text = String(children);
            const isCompleted = text.includes("✅") || text.includes("[x]");
            const isUnchecked = text.includes("☐") || text.includes("[ ]");
            
            return (
              <li className="flex items-start gap-2" {...props}>
                {isCompleted ? (
                  <CheckSquare className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                ) : isUnchecked ? (
                  <Square className="w-4 h-4 text-ink-3 mt-1 flex-shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                )}
                <span className={isCompleted ? "text-ink-3 line-through" : ""}>
                  {children}
                </span>
              </li>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-amber-400 mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-amber-300 mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-amber-200 mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-ink-2 mb-3 leading-relaxed">{children}</p>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-obsidian-4 px-1.5 py-0.5 rounded text-amber-300 font-mono text-sm">
                {children}
              </code>
            ) : (
              <code className="block bg-obsidian-4 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-amber-400/50 pl-4 italic text-ink-2">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-obsidian-4 px-4 py-2 text-left text-amber-400 bg-obsidian-3">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-obsidian-4 px-4 py-2 text-ink-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
