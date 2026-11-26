// Interpréteur Markdown sûr, sans dépendance et sans HTML brut.
//
// Le parseur produit un arbre de blocs (paragraphes, titres, listes, code,
// citations, tableaux, images) puis un arbre inline (gras, italique, code,
// liens, barré). `MarkdownView` le transforme en éléments React : le texte est
// donc systématiquement échappé par React, et aucune chaîne n'est injectée via
// `dangerouslySetInnerHTML`.
//
// Contraintes du template : aucun accès réseau, aucun `eval`, aucune exécution
// de HTML arbitraire. Les URL sont revalidées au rendu (`isSafeMediaUrl`).

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!>~|]/;
const BLANK = /^\s*$/;

function normalizeSource(source) {
  return String(source ?? "").replace(/\r\n?/g, "\n");
}

function isEscaped(source, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function countRun(source, index, char) {
  let size = 0;
  while (source[index + size] === char) size += 1;
  return size;
}

function findUnescaped(source, marker, from) {
  let index = from;
  while (index < source.length) {
    const found = source.indexOf(marker, index);
    if (found === -1) return -1;
    if (!isEscaped(source, found)) return found;
    index = found + marker.length;
  }
  return -1;
}

// Fermeture d'un marqueur simple : on ignore les runs plus longs (`**`, `__`).
function findSingleClose(source, marker, from) {
  let index = from;
  while (index < source.length) {
    const found = source.indexOf(marker, index);
    if (found === -1) return -1;
    if (
      !isEscaped(source, found)
      && source[found - 1] !== marker
      && source[found + 1] !== marker
    ) {
      return found;
    }
    index = found + 1;
  }
  return -1;
}

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'") || (first === "(" && last === ")")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function splitDestination(inside) {
  const trimmed = String(inside ?? "").trim();
  if (trimmed.startsWith("<")) {
    const end = trimmed.indexOf(">");
    if (end !== -1) {
      const url = trimmed.slice(1, end).trim();
      const rest = trimmed.slice(end + 1).trim();
      return { url, title: rest ? stripQuotes(rest) : "" };
    }
  }
  const match = /^(\S+)(?:\s+([\s\S]+))?$/.exec(trimmed);
  if (!match) return { url: trimmed, title: "" };
  return { url: match[1], title: match[2] ? stripQuotes(match[2]) : "" };
}

// `[label](url "title")` — `start` pointe sur le crochet ouvrant.
function matchLink(source, start) {
  if (source[start] !== "[") return null;
  let depth = 0;
  let closeBracket = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        closeBracket = index;
        break;
      }
    }
  }
  if (closeBracket === -1 || source[closeBracket + 1] !== "(") return null;

  let parens = 0;
  let closeParen = -1;
  for (let index = closeBracket + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "(") parens += 1;
    else if (char === ")") {
      parens -= 1;
      if (parens === 0) {
        closeParen = index;
        break;
      }
    }
  }
  if (closeParen === -1) return null;

  const destination = splitDestination(source.slice(closeBracket + 2, closeParen));
  return {
    label: source.slice(start + 1, closeBracket),
    url: destination.url,
    title: destination.title,
    end: closeParen + 1,
  };
}

function matchEmphasis(source, index) {
  const candidates = [
    { marker: "***", wrap: ["strong", "em"] },
    { marker: "___", wrap: ["strong", "em"] },
    { marker: "**", wrap: ["strong"] },
    { marker: "__", wrap: ["strong"] },
    { marker: "~~", wrap: ["del"] },
    { marker: "*", wrap: ["em"] },
    { marker: "_", wrap: ["em"] },
  ];

  for (const candidate of candidates) {
    const { marker } = candidate;
    if (!source.startsWith(marker, index)) continue;

    const single = marker === "*" || marker === "_";
    if (single && source[index + 1] === marker) continue;
    if (single && /[A-Za-z0-9]/.test(source[index - 1] ?? "")) continue;

    const from = index + marker.length;
    const closing = single
      ? findSingleClose(source, marker, from)
      : findUnescaped(source, marker, from);
    if (closing === -1 || closing === from) continue;

    const inner = source.slice(from, closing);
    if (inner === "" || /^\s|\s$/.test(inner)) continue;

    if (marker === "_" || marker === "__") {
      const after = source[closing + marker.length] ?? "";
      if (/[A-Za-z0-9]/.test(after)) continue;
    }

    const children = parseInline(inner);
    let node = { type: "text", value: inner };
    for (let level = candidate.wrap.length - 1; level >= 0; level -= 1) {
      node = {
        type: candidate.wrap[level],
        children: level === candidate.wrap.length - 1 ? children : [node],
      };
    }
    return { node, end: closing + marker.length };
  }
  return null;
}

function parseInline(source) {
  const text = normalizeSource(source);
  const nodes = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer !== "") {
      nodes.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (index < text.length) {
    const char = text[index];

    if (char === "\\" && text[index + 1] === "\n") {
      flush();
      nodes.push({ type: "br" });
      index += 2;
      continue;
    }

    if (char === "\\" && index + 1 < text.length && ESCAPABLE.test(text[index + 1])) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }

    if (char === "\n") {
      if (/ {2,}$/.test(buffer)) {
        buffer = buffer.replace(/ +$/, "");
        flush();
        nodes.push({ type: "br" });
      } else {
        buffer = `${buffer.replace(/ +$/, "")} `;
      }
      index += 1;
      continue;
    }

    if (char === "`") {
      const run = countRun(text, index, "`");
      const closing = findUnescaped(text, "`".repeat(run), index + run);
      if (closing !== -1) {
        flush();
        let value = text.slice(index + run, closing);
        if (value.length > 1 && value.startsWith(" ") && value.endsWith(" ") && value.trim() !== "") {
          value = value.slice(1, -1);
        }
        nodes.push({ type: "code", value });
        index = closing + run;
        continue;
      }
    }

    if (char === "!" && text[index + 1] === "[") {
      const link = matchLink(text, index + 1);
      if (link) {
        flush();
        nodes.push({ type: "image", alt: link.label, url: link.url, title: link.title });
        index = link.end;
        continue;
      }
    }

    if (char === "[") {
      const link = matchLink(text, index);
      if (link) {
        flush();
        nodes.push({ type: "link", url: link.url, title: link.title, children: parseInline(link.label) });
        index = link.end;
        continue;
      }
    }

    if (char === "<") {
      const closing = text.indexOf(">", index + 1);
      if (closing !== -1) {
        const raw = text.slice(index + 1, closing).trim();
        if (/^(https?:\/\/|mailto:)/i.test(raw)) {
          flush();
          nodes.push({
            type: "link",
            url: raw,
            title: "",
            children: [{ type: "text", value: raw.replace(/^mailto:/i, "") }],
          });
          index = closing + 1;
          continue;
        }
      }
    }

    const emphasis = matchEmphasis(text, index);
    if (emphasis) {
      flush();
      nodes.push(emphasis.node);
      index = emphasis.end;
      continue;
    }

    if (char === "h" && /^https?:\/\//i.test(text.slice(index, index + 8))) {
      const match = /^https?:\/\/[^\s<]+/i.exec(text.slice(index));
      if (match) {
        flush();
        let url = match[0];
        const trailing = /[.,;:!?)\]]+$/.exec(url);
        const tail = trailing ? trailing[0] : "";
        if (tail) url = url.slice(0, -tail.length);
        nodes.push({ type: "link", url, title: "", children: [{ type: "text", value: url }] });
        if (tail) buffer += tail;
        index += match[0].length;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  flush();
  return nodes;
}

function splitRow(line) {
  const value = String(line ?? "").trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let buffer = "";
  let inCode = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "\\" && index + 1 < value.length) {
      buffer += value[index + 1];
      index += 1;
      continue;
    }
    if (char === "`") {
      inCode = !inCode;
      buffer += char;
      continue;
    }
    if (char === "|" && !inCode) {
      cells.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += char;
  }
  cells.push(buffer.trim());
  return cells;
}

function isTableDelimiter(line) {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(String(line ?? ""));
}

function isTableStart(lines, index) {
  const header = lines[index];
  const delimiter = lines[index + 1];
  if (typeof header !== "string" || typeof delimiter !== "string") return false;
  if (!header.includes("|")) return false;
  return isTableDelimiter(delimiter);
}

function parseTable(lines, index) {
  const header = splitRow(lines[index]).map((cell) => parseInline(cell));
  const alignment = splitRow(lines[index + 1]).map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return null;
  });
  const rows = [];
  let cursor = index + 2;
  while (cursor < lines.length && !BLANK.test(lines[cursor]) && lines[cursor].includes("|")) {
    const cells = splitRow(lines[cursor]);
    rows.push(header.map((_, column) => parseInline(cells[column] ?? "")));
    cursor += 1;
  }
  return { node: { type: "table", align: alignment, header, rows }, next: cursor };
}

function listMarker(line) {
  return /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(String(line ?? ""));
}

function parseList(lines, index) {
  const first = listMarker(lines[index]);
  const ordered = /\d/.test(first[2][0]);
  const baseIndent = first[1].length;
  const start = ordered ? Number.parseInt(first[2], 10) || 1 : 1;
  const items = [];
  let cursor = index;

  while (cursor < lines.length) {
    const match = listMarker(lines[cursor]);
    if (!match) break;
    const sameLevel = match[1].length === baseIndent;
    const sameKind = /\d/.test(match[2][0]) === ordered;
    if (!sameLevel || !sameKind) break;

    const contentIndent = match[1].length + match[2].length + 1;
    const itemLines = [match[3]];
    cursor += 1;

    while (cursor < lines.length) {
      const line = lines[cursor];
      if (BLANK.test(line)) {
        const next = lines[cursor + 1] ?? "";
        if (BLANK.test(next)) {
          cursor += 1;
          continue;
        }
        const nextIndent = (next.match(/^\s*/) ?? [""])[0].length;
        if (nextIndent >= contentIndent || listMarker(next)) {
          itemLines.push("");
          cursor += 1;
          continue;
        }
        break;
      }

      const indent = (line.match(/^\s*/) ?? [""])[0].length;
      const nested = listMarker(line);
      if (nested && nested[1].length === baseIndent) break;
      if (indent >= contentIndent) {
        itemLines.push(line.slice(contentIndent));
        cursor += 1;
        continue;
      }
      if (!nested && indent > baseIndent) {
        itemLines.push(line.trim());
        cursor += 1;
        continue;
      }
      break;
    }

    let checked = null;
    const task = /^\[([ xX])\]\s+([\s\S]*)$/.exec(itemLines[0]);
    if (task) {
      checked = task[1].toLowerCase() === "x";
      itemLines[0] = task[2];
    }

    items.push({ checked, blocks: parseBlocks(itemLines.join("\n")) });
  }

  return { node: { type: "list", ordered, start, items }, next: cursor };
}

function isBlockStart(lines, index) {
  const line = lines[index];
  if (typeof line !== "string") return false;
  if (/^ {0,3}(#{1,6})\s+/.test(line)) return true;
  if (/^ {0,3}(`{3,}|~{3,})/.test(line)) return true;
  if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) return true;
  if (/^ {0,3}>/.test(line)) return true;
  if (listMarker(line)) return true;
  if (isTableStart(lines, index)) return true;
  if (/^ {4}/.test(line)) return true;
  return false;
}

function parseBlocks(source) {
  const lines = normalizeSource(source).split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (BLANK.test(line)) {
      index += 1;
      continue;
    }

    const fence = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const size = fence[1].length;
      const language = fence[2] || "";
      const content = [];
      index += 1;
      while (index < lines.length) {
        const closing = new RegExp(`^ {0,3}${marker}{${size},}\\s*$`);
        if (closing.test(lines[index])) {
          index += 1;
          break;
        }
        content.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", lang: language, code: content.join("\n") });
      continue;
    }

    const heading = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, inline: parseInline(heading[2]) });
      index += 1;
      continue;
    }

    if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (/^ {0,3}>/.test(line)) {
      const inner = [];
      while (index < lines.length && /^ {0,3}>/.test(lines[index])) {
        inner.push(lines[index].replace(/^ {0,3}>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", blocks: parseBlocks(inner.join("\n")) });
      continue;
    }

    if (isTableStart(lines, index)) {
      const table = parseTable(lines, index);
      blocks.push(table.node);
      index = table.next;
      continue;
    }

    if (listMarker(line)) {
      const list = parseList(lines, index);
      blocks.push(list.node);
      index = list.next;
      continue;
    }

    if (/^ {4}/.test(line)) {
      const content = [];
      while (index < lines.length && (/^ {4}/.test(lines[index]) || BLANK.test(lines[index]))) {
        content.push(lines[index].replace(/^ {4}/, ""));
        index += 1;
      }
      while (content.length > 0 && BLANK.test(content[content.length - 1])) content.pop();
      blocks.push({ type: "code", lang: "", code: content.join("\n") });
      continue;
    }

    const paragraph = [];
    while (index < lines.length && !BLANK.test(lines[index]) && !isBlockStart(lines, index)) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length === 0) {
      paragraph.push(line);
      index += 1;
    }
    blocks.push({ type: "paragraph", inline: parseInline(paragraph.join("\n")) });
  }

  return blocks;
}

function inlineToText(nodes) {
  return (Array.isArray(nodes) ? nodes : []).map((node) => {
    if (node.type === "text") return node.value;
    if (node.type === "code") return node.value;
    if (node.type === "br") return "\n";
    if (node.type === "image") return node.alt || "";
    return inlineToText(node.children);
  }).join("");
}

function blocksToText(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => {
    if (block.type === "heading" || block.type === "paragraph") return inlineToText(block.inline);
    if (block.type === "code") return block.code;
    if (block.type === "blockquote") return blocksToText(block.blocks);
    if (block.type === "list") return block.items.map((item) => blocksToText(item.blocks)).join("\n");
    if (block.type === "table") {
      return [block.header, ...block.rows].map((row) => row.map((cell) => inlineToText(cell)).join(" | ")).join("\n");
    }
    return "";
  }).join("\n");
}

export class MarkdownDocument {
  constructor(source = "", options = {}) {
    this.source = normalizeSource(source);
    this.options = options;
    this.blocks = parseBlocks(this.source);
  }

  get isEmpty() {
    return this.blocks.length === 0;
  }

  get plainText() {
    return blocksToText(this.blocks);
  }

  static parse(source, options = {}) {
    return new MarkdownDocument(source, options);
  }
}

export { parseBlocks, parseInline };
