import type { ParsedQuickItem } from "../types";

const UNIT_RE = "片|块|份|个|碗|袋|根|颗|克|g|ml|毫升|勺";

export function parseQuickLog(text: string): ParsedQuickItem[] {
  const chunks = text
    .split(/[\n,，、;；]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return chunks.flatMap(parseChunk).filter((item) => item.name.length > 0);
}

function parseChunk(raw: string): ParsedQuickItem[] {
  const chunk = raw.replace(/\s+/g, " ").trim();
  if (!chunk) return [];

  const fraction = chunk.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*/\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${UNIT_RE})?\\s*(.+)$`),
  );
  if (fraction) {
    return [
      {
        amount: Number(fraction[1]),
        ofTotal: Number(fraction[2]),
        unit: guessUnit(fraction[3]),
        name: cleanName(fraction[3]),
      },
    ];
  }

  const leading = chunk.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})?\\s*(.+)$`),
  );
  if (leading) {
    return [
      {
        amount: Number(leading[1]),
        unit: leading[2] || guessUnit(leading[3]),
        name: cleanName(leading[3]),
      },
    ];
  }

  return [{ amount: 1, unit: guessUnit(chunk), name: cleanName(chunk) }];
}

function cleanName(name: string): string {
  return name.replace(/^(的|份|块|片)/, "").trim();
}

function guessUnit(name: string): string {
  if (/吐司|面包|切片/.test(name)) return "片";
  if (/蛋糕|派|塔/.test(name)) return "块";
  if (/蛋/.test(name)) return "个";
  if (/奶|豆浆|咖啡/.test(name)) return "g";
  return "份";
}
