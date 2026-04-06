export interface BookingExperienceItem {
  id: string;
  name: string;
  qty: number;
  price?: number;
}

const EXPERIENCE_MARKER = "[EXPERIENCES_JSON]";

const toPositiveInt = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

const normalizeItems = (items: BookingExperienceItem[]): BookingExperienceItem[] => {
  return items
    .map((item) => ({
      id: String(item.id || "").trim(),
      name: String(item.name || "").trim(),
      qty: toPositiveInt(item.qty),
      price: typeof item.price === "number" && Number.isFinite(item.price) ? item.price : undefined,
    }))
    .filter((item) => item.id && item.name && item.qty > 0);
};

export const extractBookingExperienceData = (specialRequests?: string | null): {
  note: string;
  items: BookingExperienceItem[];
} => {
  const source = (specialRequests || "").trim();
  if (!source) {
    return { note: "", items: [] };
  }

  const markerIndex = source.indexOf(EXPERIENCE_MARKER);
  if (markerIndex < 0) {
    return { note: source, items: [] };
  }

  const note = source.slice(0, markerIndex).trim();
  const rawJson = source.slice(markerIndex + EXPERIENCE_MARKER.length).trim();
  if (!rawJson) {
    return { note, items: [] };
  }

  try {
    const parsed = JSON.parse(rawJson) as { items?: BookingExperienceItem[] };
    const items = normalizeItems(Array.isArray(parsed?.items) ? parsed.items : []);
    return { note, items };
  } catch {
    return { note: source, items: [] };
  }
};

export const buildSpecialRequestsWithExperiences = (
  note: string,
  items: BookingExperienceItem[],
): string => {
  const cleanNote = note.trim();
  const normalizedItems = normalizeItems(items);

  if (normalizedItems.length === 0) {
    return cleanNote;
  }

  const payload = JSON.stringify({ items: normalizedItems });
  if (!cleanNote) {
    return `${EXPERIENCE_MARKER}${payload}`;
  }
  return `${cleanNote}\n\n${EXPERIENCE_MARKER}${payload}`;
};

export const formatExperienceSelectionText = (items: BookingExperienceItem[]): string => {
  const normalizedItems = normalizeItems(items);
  if (normalizedItems.length === 0) {
    return "";
  }

  const lines = normalizedItems.map((item) => {
    const money = typeof item.price === "number" ? ` (~${item.price.toLocaleString("vi-VN")}đ)` : "";
    return `- ${item.name} x${item.qty}${money}`;
  });

  return ["Dịch vụ thêm:", ...lines].join("\n");
};

export const buildDisplaySpecialRequests = (specialRequests?: string | null): string => {
  const { note, items } = extractBookingExperienceData(specialRequests);
  const extrasText = formatExperienceSelectionText(items);

  if (!note && !extrasText) {
    return "";
  }
  if (!note) {
    return extrasText;
  }
  if (!extrasText) {
    return note;
  }
  return `${note}\n\n${extrasText}`;
};
