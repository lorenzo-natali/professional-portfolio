import { Fragment, useLayoutEffect, useRef } from "react";
import { Send } from "lucide-react";
import { AssistantAnswerBody } from "./assistantMarkdown.jsx";
import { BeyondCvEasterEggCard } from "./BeyondCvEasterEggCard.jsx";
import {
  ASSISTANT_COUNTER_REVEAL_AT,
  ASSISTANT_ERROR_MESSAGE,
  ASSISTANT_QUESTION_MAX_LENGTH,
  ASSISTANT_UNAVAILABLE_MESSAGE,
  ASSISTANT_WELCOME_MESSAGE,
  DEVELOPMENT_PREVIEW_LABEL,
  canSendAssistantQuestion,
  clampAssistantQuestion,
  resolveVerifiedSignals,
} from "./assistantChatModel.js";

const COMPOSER_MAX_HEIGHT = 128;
const COMPOSER_MIN_HEIGHT = 48;
const STICK_THRESHOLD = 48;

/**
 * @param {HTMLElement} element
 */
function scrollTranscriptToEnd(element) {
  element.scrollTop = element.scrollHeight;
}

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
 *   beyondCv?: { messageId: string, lang: "en" | "it", state: "offered" | "unlocked", mobile: boolean } | null,
 *   onBeyondCvAccept?: () => void,
 *   onBeyondCvDismiss?: () => void,
 *   onBeyondCvLaunch?: () => void,
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
  beyondCv = null,
  onBeyondCvAccept,
  onBeyondCvDismiss,
  onBeyondCvLaunch,
}) {
  const transcriptRef = useRef(null);
  const stickRef = useRef(true);
  const previousCountRef = useRef(messages.length);
  const locked = status === "loading";
  const sendable = canSendAssistantQuestion(draft) && !locked;
  const showCounter = draft.length >= ASSISTANT_COUNTER_REVEAL_AT;

  const onComposerKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!sendable) return;
    onSend();
  };

  const onTranscriptScroll = () => {
    const element = transcriptRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickRef.current = distance <= STICK_THRESHOLD;
  };

  useLayoutEffect(() => {
    const field = composerRef?.current;
    if (!field) return;
    field.style.height = "0px";
    const next = Math.min(Math.max(field.scrollHeight, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT);
    field.style.height = `${next}px`;
  }, [composerRef, draft]);

  useLayoutEffect(() => {
    const element = transcriptRef.current;
    if (!element) return;
    const previousCount = previousCountRef.current;
    const last = messages[messages.length - 1];
    const userJustSent = messages.length > previousCount && last?.role === "user";
    previousCountRef.current = messages.length;
    if (!userJustSent && !stickRef.current) return;
    scrollTranscriptToEnd(element);
    stickRef.current = true;
  }, [messages, status]);

  return (
    <div data-assistant-panel="chat" className="flex min-h-0 flex-1 flex-col">
      <div
        ref={transcriptRef}
        data-assistant-transcript
        onScroll={onTranscriptScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5"
      >
        <div data-assistant-welcome className="mb-4 max-w-[42rem]">
          <p className="assistant-text text-sm leading-6">{ASSISTANT_WELCOME_MESSAGE}</p>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={locked}
          className="space-y-3"
        >
          {messages.map((message) => {
            const related =
              message.role === "assistant"
                ? resolveVerifiedSignals(message.signalIds, signalMap)
                : [];
            const isUser = message.role === "user";
            return (
              <Fragment key={message.id}>
              <article
                data-assistant-message-role={message.role}
                className={`w-fit max-w-[min(85%,42rem)] break-words rounded-lg px-3 py-2.5 text-sm leading-6 ${
                  isUser
                    ? "assistant-bubble-user ml-auto"
                    : "assistant-bubble-ai mr-auto"
                }`}
              >
                {message.developmentOnly ? (
                  <p className="assistant-muted mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    {DEVELOPMENT_PREVIEW_LABEL}
                  </p>
                ) : null}
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                ) : (
                  <AssistantAnswerBody text={message.text} />
                )}
                {related.length > 0 ? (
                  <div className="assistant-divider mt-2.5 border-t pt-2.5">
                    <p className="assistant-muted mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
                      Explore related portfolio content
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {related.map((signal) => (
                        <a
                          key={signal.id}
                          href={signal.href}
                          onClick={(event) => onSignalClick?.(event, signal)}
                          className="assistant-link text-xs font-medium underline underline-offset-4 transition"
                        >
                          {signal.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
              {beyondCv && beyondCv.messageId === message.id ? (
                <BeyondCvEasterEggCard
                  lang={beyondCv.lang}
                  state={beyondCv.state}
                  mobile={beyondCv.mobile}
                  onAccept={() => onBeyondCvAccept?.()}
                  onDismiss={() => onBeyondCvDismiss?.()}
                  onLaunch={() => onBeyondCvLaunch?.()}
                />
              ) : null}
              </Fragment>
            );
          })}

          {status === "loading" ? (
            <p role="status" className="assistant-muted text-sm leading-6">
              Preparing a response…
            </p>
          ) : null}

          {status === "unavailable" ? (
            <p role="status" className="assistant-text max-w-xl text-sm leading-6">
              {unavailableMessage || ASSISTANT_UNAVAILABLE_MESSAGE}
            </p>
          ) : null}

          {status === "error" ? (
            <p role="alert" className="assistant-text max-w-xl text-sm leading-6">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      <div data-assistant-composer className="shrink-0 px-3 py-2 sm:px-4">
        <label htmlFor="assistant-question" className="sr-only">
          Your question
        </label>
        <div className="assistant-composer flex items-end gap-1 rounded-xl border py-1 pl-1 pr-1">
          <textarea
            ref={composerRef}
            id="assistant-question"
            rows={1}
            maxLength={ASSISTANT_QUESTION_MAX_LENGTH}
            value={draft}
            disabled={locked}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Ask me something..."
            aria-describedby="assistant-question-count"
            onChange={(event) => onDraftChange(clampAssistantQuestion(event.target.value))}
            onKeyDown={onComposerKeyDown}
            className="max-h-32 min-h-12 w-full min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-[16px] leading-6 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!sendable}
            aria-label="Send"
            data-assistant-send
            className="assistant-send mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border focus-visible:outline-none"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p
          id="assistant-question-count"
          className={showCounter ? "assistant-muted mt-1.5 text-right text-[11px] leading-4" : "sr-only"}
        >
          {draft.length}/{ASSISTANT_QUESTION_MAX_LENGTH}
        </p>
      </div>
    </div>
  );
}
