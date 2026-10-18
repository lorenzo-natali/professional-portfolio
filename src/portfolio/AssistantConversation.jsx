import { Send } from "lucide-react";
import { AssistantAnswerBody } from "./assistantMarkdown.jsx";
import {
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_QUESTION_MAX_LENGTH,
  ASSISTANT_UNAVAILABLE_MESSAGE,
  DEVELOPMENT_PREVIEW_LABEL,
  canSendAssistantQuestion,
  clampAssistantQuestion,
  resolveVerifiedSignals,
} from "./assistantChatModel.js";

/**
 * Chat presentation for the Portfolio Assistant modal.
 * Callers own the transcript. This component never fetches.
 *
 * @param {{
 *   messages?: Array<{ id: string, role: "user" | "assistant", text: string, developmentOnly?: boolean, signalIds?: string[] }>,
 *   draft: string,
 *   onDraftChange: (value: string) => void,
 *   onSend: () => void,
 *   onSignalClick?: (event: import("react").MouseEvent<HTMLAnchorElement>, signal: { id: string, label: string, href: string, target?: { type?: string, id?: string } }) => void,
 *   signalMap?: Record<string, { label?: string, href?: string, target?: { type?: string, id?: string } }>,
 *   status?: "idle" | "loading" | "unavailable" | "error",
 *   unavailableMessage?: string,
 *   errorMessage?: string,
 *   composerRef?: import("react").Ref<HTMLTextAreaElement>,
 * }} props
 */
export function AssistantConversation({
  messages = [],
  draft,
  onDraftChange,
  onSend,
  onSignalClick,
  signalMap,
  status = "idle",
  unavailableMessage = "",
  errorMessage = ASSISTANT_ERROR_MESSAGE,
  composerRef,
}) {
  const locked = status === "loading";
  const sendable = canSendAssistantQuestion(draft) && !locked;

  const onComposerKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!sendable) return;
    onSend();
  };

  return (
    <div data-assistant-panel="chat" className="flex min-h-0 flex-1 flex-col">
      <div
        data-assistant-transcript
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={locked}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5"
      >
        {messages.map((message) => {
          const related =
            message.role === "assistant"
              ? resolveVerifiedSignals(message.signalIds, signalMap)
              : [];
          const isUser = message.role === "user";
          return (
            <article
              key={message.id}
              data-assistant-message-role={message.role}
              className={`w-fit max-w-[85%] break-words rounded-lg border px-3 py-2.5 text-sm leading-6 ${
                isUser
                  ? "ml-auto border-slate-700 bg-slate-900/50 text-slate-200"
                  : "mr-auto border-cyan-400/15 bg-slate-900/25 text-slate-300"
              }`}
            >
              {message.developmentOnly ? (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {DEVELOPMENT_PREVIEW_LABEL}
                </p>
              ) : null}
              {isUser ? (
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
              ) : (
                <AssistantAnswerBody text={message.text} />
              )}
              {related.length > 0 ? (
                <div className="mt-2.5 border-t border-slate-800/70 pt-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Explore related portfolio content
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {related.map((signal) => (
                      <a
                        key={signal.id}
                        href={signal.href}
                        onClick={(event) => onSignalClick?.(event, signal)}
                        className="text-xs font-medium text-cyan-200/80 underline decoration-cyan-400/25 underline-offset-4 transition hover:text-cyan-100 hover:decoration-cyan-300/60"
                      >
                        {signal.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {status === "loading" ? (
          <p role="status" className="text-sm leading-6 text-slate-500">
            Preparing a response…
          </p>
        ) : null}

        {status === "unavailable" ? (
          <p role="status" className="max-w-xl text-sm leading-6 text-slate-400">
            {unavailableMessage || ASSISTANT_UNAVAILABLE_MESSAGE}
          </p>
        ) : null}

        {status === "error" ? (
          <p role="alert" className="max-w-xl text-sm leading-6 text-slate-400">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div
        data-assistant-composer
        className="shrink-0 border-t border-cyan-400/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
      >
        <label htmlFor="assistant-question" className="sr-only">
          Your question
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            ref={composerRef}
            id="assistant-question"
            rows={2}
            maxLength={ASSISTANT_QUESTION_MAX_LENGTH}
            value={draft}
            disabled={locked}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Ask me something..."
            aria-describedby="assistant-question-count"
            onChange={(event) => onDraftChange(clampAssistantQuestion(event.target.value))}
            onKeyDown={onComposerKeyDown}
            className="max-h-32 min-h-[2.75rem] w-full min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-2.5 text-[16px] leading-6 text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/35 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!sendable}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-3 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-transparent disabled:text-slate-600"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </button>
        </div>
        <p id="assistant-question-count" className="mt-1.5 text-right text-[11px] leading-4 text-slate-500">
          {draft.length}/{ASSISTANT_QUESTION_MAX_LENGTH}
        </p>
      </div>
    </div>
  );
}
