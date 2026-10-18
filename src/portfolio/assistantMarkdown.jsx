/**
 * Small Markdown subset for assistant answers.
 * Renders React elements only. Model text is never assigned to innerHTML.
 */

const SAFE_ORIGIN = "https://lorenzo-natali.github.io";

/**
 * Allow http(s), a same-site path, or a hash. Reject every other scheme.
 * @param {string} raw
 * @returns {string | null}
 */
export function safeAssistantHref(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || /[\u0000-\u001F\u007F]/.test(value) || value.startsWith("//")) return null;

  const scheme = /^([a-zA-Z][a-zA-Z\d+.-]*):/.exec(value);
  if (scheme && !/^https?$/i.test(scheme[1])) return null;

  try {
    const url = new URL(value, SAFE_ORIGIN);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (scheme) return url.href;
    if (value.startsWith("#") || /^\/(?!\/)/.test(value)) return value;
    return null;
  } catch {
    return null;
  }
}

function createKeys() {
  let n = 0;
  return { next: () => `md-${n++}` };
}

/**
 * @param {string} source
 * @param {{ next: () => string }} keys
 * @returns {Array<string | import("react").ReactElement>}
 */
function parseInline(source, keys) {
  /** @type {Array<string | import("react").ReactElement>} */
  const nodes = [];
  let buffer = "";
  const pushText = () => {
    if (!buffer) return;
    nodes.push(buffer);
    buffer = "";
  };

  let i = 0;
  while (i < source.length) {
    const link = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(source.slice(i));
    if (link) {
      pushText();
      const href = safeAssistantHref(link[2]);
      const label = parseInline(link[1], keys);
      if (href) {
        nodes.push(
          <a
            key={keys.next()}
            href={href}
            rel="noreferrer noopener"
            className="font-medium text-cyan-200/80 underline decoration-cyan-400/25 underline-offset-4"
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(...label);
      }
      i += link[0].length;
      continue;
    }

    if (source.startsWith("**", i) || source.startsWith("__", i)) {
      const marker = source.slice(i, i + 2);
      const end = source.indexOf(marker, i + 2);
      const inner = end === -1 ? "" : source.slice(i + 2, end);
      if (end !== -1 && inner.length > 0) {
        pushText();
        nodes.push(
          <strong key={keys.next()} className="font-semibold">
            {parseInline(inner, keys)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    if (source[i] === "*" && source[i + 1] !== "*") {
      const end = source.indexOf("*", i + 1);
      const inner = end === -1 ? "" : source.slice(i + 1, end);
      if (end !== -1 && inner.length > 0 && !/^\s|\s$/.test(inner)) {
        pushText();
        nodes.push(<em key={keys.next()}>{parseInline(inner, keys)}</em>);
        i = end + 1;
        continue;
      }
    }

    if (source[i] === "_" && source[i + 1] !== "_" && (i === 0 || !/\w/.test(source[i - 1]))) {
      const end = source.indexOf("_", i + 1);
      const inner = end === -1 ? "" : source.slice(i + 1, end);
      const next = end === -1 ? "" : source[end + 1] || "";
      if (end !== -1 && inner.length > 0 && !/^\s|\s$/.test(inner) && !/\w/.test(next)) {
        pushText();
        nodes.push(<em key={keys.next()}>{parseInline(inner, keys)}</em>);
        i = end + 1;
        continue;
      }
    }

    buffer += source[i];
    i += 1;
  }

  pushText();
  return nodes;
}

/**
 * @param {string} text
 * @returns {Array<{ kind: "p", lines: string[] } | { kind: "ul" | "ol", items: string[] }>}
 */
function parseBlocks(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  /** @type {Array<{ kind: "p", lines: string[] } | { kind: "ul" | "ol", items: string[] }>} */
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i += 1;
      continue;
    }

    const unordered = /^[-*+]\s+/.test(lines[i]);
    const ordered = /^\d+\.\s+/.test(lines[i]);
    if (unordered || ordered) {
      const kind = unordered ? "ul" : "ol";
      /** @type {string[]} */
      const items = [];
      while (i < lines.length) {
        const match = (kind === "ul" ? /^[-*+]\s+(.*)$/ : /^\d+\.\s+(.*)$/).exec(lines[i]);
        if (!match) break;
        items.push(match[1]);
        i += 1;
      }
      blocks.push({ kind, items });
      continue;
    }

    /** @type {string[]} */
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ kind: "p", lines: paragraph });
  }

  return blocks;
}

/**
 * @param {{ text?: string }} props
 */
export function AssistantAnswerBody({ text = "" }) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;
  const keys = createKeys();

  const rendered = blocks.map((block) => {
    if (block.kind === "ul" || block.kind === "ol") {
      const List = block.kind;
      return (
        <List
          key={keys.next()}
          className={block.kind === "ul" ? "my-0 list-disc pl-5" : "my-0 list-decimal pl-5"}
        >
          {block.items.map((item) => (
            <li key={keys.next()}>{parseInline(item, keys)}</li>
          ))}
        </List>
      );
    }

    return (
      <p key={keys.next()}>
        {block.lines.map((line, index) => (
          <span key={keys.next()}>
            {index > 0 ? <br /> : null}
            {parseInline(line, keys)}
          </span>
        ))}
      </p>
    );
  });

  return <div className="space-y-1.5 break-words leading-6">{rendered}</div>;
}
