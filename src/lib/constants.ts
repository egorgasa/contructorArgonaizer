export const PRODUCT_TYPES = [
  { value: "organizer", label: "Органайзер", description: "Многосекционный держатель для канцелярии, инструментов, мелочей" },
  { value: "box", label: "Коробка", description: "Контейнер с крышкой или без, для хранения" },
  { value: "tray", label: "Лоток", description: "Плоский поддон с невысокими бортами" },
  { value: "stand", label: "Подставка", description: "Под телефон, ноутбук, чашку, любой предмет" },
  { value: "divider", label: "Разделитель", description: "Перегородка для ящика, полки, шкафа" },
  { value: "custom", label: "Кастомная фигура", description: "Произвольная форма по эскизу или описанию" },
  { value: "other", label: "Другое", description: "Бытовое изделие, не из списка" },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]["value"];

export const SHAPES = [
  { value: "rectangular", label: "Прямоугольная" },
  { value: "round", label: "Круглая" },
  { value: "oval", label: "Овальная" },
  { value: "custom", label: "Кастомная" },
] as const;

export type Shape = (typeof SHAPES)[number]["value"];

export const MATERIALS = [
  { value: "PLA", label: "PLA", hint: "Для дома, не для жары и улицы" },
  { value: "PETG", label: "PETG", hint: "Прочнее PLA, лучше для улицы" },
  { value: "ABS", label: "ABS", hint: "Прочный, но требует уточнения" },
  { value: "TPU", label: "TPU", hint: "Гибкий, эластичный материал" },
  { value: "consult", label: "Не знаю — посоветуйте", hint: "Подберём под ваши условия" },
] as const;

export type Material = (typeof MATERIALS)[number]["value"];

export const COLORS = [
  { value: "white", label: "Белый", hex: "#F5F5F5" },
  { value: "black", label: "Чёрный", hex: "#1F1F1F" },
  { value: "dark_gray", label: "Тёмно-серый", hex: "#3A3A3A" },
  { value: "light_gray", label: "Светло-серый", hex: "#B0B0B0" },
  { value: "red", label: "Красный", hex: "#D63A3A" },
  { value: "orange", label: "Оранжевый", hex: "#EA8A2E" },
  { value: "yellow", label: "Жёлтый", hex: "#F2CB3A" },
  { value: "green", label: "Зелёный", hex: "#3DA85B" },
  { value: "blue", label: "Синий", hex: "#3070C8" },
  { value: "violet", label: "Фиолетовый", hex: "#7B4FCB" },
  { value: "transparent", label: "Прозрачный", hex: "#E7F0FA" },
  { value: "consult", label: "Нужен подбор", hex: "#CCCCCC" },
  // The "custom" entry is a sentinel: its `hex` is a placeholder shown until
  // the user picks a real value via the <input type="color"> control.
  { value: "custom", label: "Свой цвет", hex: "#3B82F6" },
] as const;

export type Color = (typeof COLORS)[number]["value"];

export const STRENGTH_OPTIONS = [
  { value: "decorative", label: "Декоративная" },
  { value: "standard", label: "Стандартная" },
  { value: "reinforced", label: "Усиленная" },
] as const;

export type Strength = (typeof STRENGTH_OPTIONS)[number]["value"];

export const USAGE_ENVIRONMENTS = [
  { value: "indoor", label: "В помещении" },
  { value: "outdoor", label: "На улице" },
  { value: "high_temperature", label: "Высокая температура" },
  { value: "water_contact", label: "Контакт с водой" },
  { value: "load_bearing", label: "Несущая нагрузка" },
  { value: "food_contact", label: "Контакт с пищей" },
] as const;

export type UsageEnvironment = (typeof USAGE_ENVIRONMENTS)[number]["value"];

export const PREFERRED_CONTACT_TIMES = [
  { value: "any", label: "Любое время" },
  { value: "morning", label: "Утро (9:00–12:00)" },
  { value: "day", label: "День (12:00–17:00)" },
  { value: "evening", label: "Вечер (17:00–21:00)" },
] as const;

export type PreferredContactTime = (typeof PREFERRED_CONTACT_TIMES)[number]["value"];

export const REQUEST_STATUSES = [
  { value: "new", label: "Новая", color: "bg-blue-100 text-blue-800" },
  { value: "in_review", label: "На рассмотрении", color: "bg-indigo-100 text-indigo-800" },
  { value: "clarifying", label: "Уточняем детали", color: "bg-amber-100 text-amber-800" },
  { value: "in_modeling", label: "В моделировании", color: "bg-purple-100 text-purple-800" },
  { value: "approved", label: "Согласована", color: "bg-teal-100 text-teal-800" },
  { value: "in_print", label: "В печати", color: "bg-cyan-100 text-cyan-800" },
  { value: "done", label: "Готова", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Отменена", color: "bg-gray-100 text-gray-700" },
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number]["value"];

export const REQUEST_STATUS_VALUES = REQUEST_STATUSES.map((s) => s.value) as RequestStatus[];

// Quote / estimate lifecycle. Intentionally separate from REQUEST_STATUSES:
// a quote has its own state independent of where the request itself sits.
export const QUOTE_STATUSES = [
  { value: "draft", label: "Черновик", color: "bg-gray-100 text-gray-700" },
  { value: "ready", label: "Готово", color: "bg-blue-100 text-blue-800" },
  { value: "sent", label: "Отправлено", color: "bg-indigo-100 text-indigo-800" },
  { value: "accepted", label: "Принято", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Отклонено", color: "bg-red-100 text-red-800" },
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]["value"];

export const QUOTE_STATUS_VALUES = QUOTE_STATUSES.map((s) => s.value) as QuoteStatus[];

// Currencies offered in the quote editor. Free-form strings are accepted on the
// server too, but the UI restricts to this short list.
export const QUOTE_CURRENCIES = ["BYN", "USD", "EUR", "RUB"] as const;

export type QuoteCurrency = (typeof QUOTE_CURRENCIES)[number];

// Hard validation limits.
export const DIMENSION_LIMITS = {
  min: 10,
  max: 300,
} as const;

export const WALL_THICKNESS_LIMITS = {
  min: 1.2,
  max: 5,
  warnBelow: 1.6,
} as const;

export const CORNER_RADIUS_LIMITS = {
  min: 0,
  max: 20,
} as const;

export const SECTIONS_LIMITS = {
  min: 0,
  max: 20,
} as const;

// Wall thickness preset values for the select.
export const WALL_THICKNESS_PRESETS = [1.2, 1.6, 2.0, 2.5, 3.0, 4.0, 5.0] as const;
