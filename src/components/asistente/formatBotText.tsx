/** Formatea mensajes del bot para lectura rápida. */
export function formatBotText(text: string) {
  const urlPattern = /(https?:\/\/[^\s]+|[\w-]+\.(?:es|com|menu|net|org)(?:\/[^\s]*)?)/gi;
  const segments: Array<{ type: "text" | "url"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(urlPattern.source, urlPattern.flags);
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "url", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return <span className="leading-relaxed">{text}</span>;
  }

  return (
    <span className="leading-relaxed">
      {segments.map((seg, i) =>
        seg.type === "url" ? (
          <span key={i} className="font-medium">
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </span>
  );
}
