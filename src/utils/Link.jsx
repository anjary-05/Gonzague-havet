import { isHttpUrl } from "./format.js";

// Seul le SDK peut agir : un lien externe est confié à `actions.openMedia`.
export function safeExternalLink(url, actions, label, children, className, key = undefined) {
  const safe = isHttpUrl(url);
  return (
    <a
      key={key}
      className={className}
      href={safe ? url : undefined}
      target={safe ? "_blank" : undefined}
      rel="noopener noreferrer"
      aria-label={label}
      aria-disabled={safe ? undefined : true}
      onClick={(event) => {
        event.preventDefault();
        if (safe && typeof actions?.openMedia === "function") actions.openMedia(url);
      }}
    >
      {children}
    </a>
  );
}
