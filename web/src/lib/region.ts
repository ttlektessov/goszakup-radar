/**
 * Derives a Kazakhstan region from a procuring organization's name.
 * The lots search results have no region field, but government customer names
 * almost always contain their oblast or city. Oblast patterns are checked
 * before city names (e.g. "Алматинской области" → oblast, not the city Алматы).
 * Returns a display label, or null if nothing matches.
 */
const RULES: Array<{ label: string; pattern: RegExp }> = [
  // Oblasts (more specific — check first)
  { label: "Абайская обл.", pattern: /Абайск|област[ьи]\s+Абай/i },
  { label: "Акмолинская обл.", pattern: /Акмолинск/i },
  { label: "Актюбинская обл.", pattern: /Актюбинск/i },
  { label: "Алматинская обл.", pattern: /Алматинск/i },
  { label: "Атырауская обл.", pattern: /Атырауск/i },
  { label: "Восточно-Казахстанская обл.", pattern: /Восточно[-\s]?Казахстанск|\bВКО\b/i },
  { label: "Жамбылская обл.", pattern: /Жамбылск/i },
  { label: "Жетысуская обл.", pattern: /Жет[іы]су/i },
  { label: "Западно-Казахстанская обл.", pattern: /Западно[-\s]?Казахстанск|\bЗКО\b/i },
  { label: "Карагандинская обл.", pattern: /Карагандинск/i },
  { label: "Костанайская обл.", pattern: /Костанайск/i },
  { label: "Кызылординская обл.", pattern: /Кызылордин/i },
  { label: "Мангистауская обл.", pattern: /Манг[иы]стауск/i },
  { label: "Северо-Казахстанская обл.", pattern: /Северо[-\s]?Казахстанск|\bСКО\b/i },
  { label: "Павлодарская обл.", pattern: /Павлодарск/i },
  { label: "Туркестанская обл.", pattern: /Туркестанск/i },
  { label: "Улытауская обл.", pattern: /Ұлытау|Улытау/i },
  // Cities of republican significance (after oblasts)
  { label: "г. Астана", pattern: /Астан[ауые]|Нур[-\s]?Султан|Нұр[-\s]?Сұлтан/i },
  { label: "г. Алматы", pattern: /Алматы/i },
  { label: "г. Шымкент", pattern: /Шымкент|Чимкент/i },

  // Oblast capitals / major cities named without the oblast adjective.
  // (Oblast-adjective rules above win first when present; these catch city-only names.)
  { label: "Акмолинская обл.", pattern: /Кокшетау|Степногорск/i },
  { label: "Актюбинская обл.", pattern: /Актобе/i },
  { label: "Алматинская обл.", pattern: /Конаев|Қонаев|Капшагай|Капчагай/i },
  { label: "Атырауская обл.", pattern: /Атырау/i },
  { label: "Восточно-Казахстанская обл.", pattern: /Усть[-\s]?Каменогорск|Риддер/i },
  { label: "Абайская обл.", pattern: /Семей(?![а-яё])|Курчатов/i },
  { label: "Жамбылская обл.", pattern: /Тараз/i },
  { label: "Жетысуская обл.", pattern: /Талдыкорган|Текели/i },
  { label: "Западно-Казахстанская обл.", pattern: /Уральск/i },
  { label: "Карагандинская обл.", pattern: /Караганд[аеуы]|Темиртау|Балхаш|Шахтинск|Сарань/i },
  { label: "Костанайская обл.", pattern: /Костанай|Рудн[ыо]|Лисаковск/i },
  { label: "Кызылординская обл.", pattern: /Кызылорд/i },
  { label: "Мангистауская обл.", pattern: /Актау|Жанаозен/i },
  { label: "Павлодарская обл.", pattern: /Павлодар|Экибастуз/i },
  { label: "Северо-Казахстанская обл.", pattern: /Петропавловск/i },
  { label: "Туркестанская обл.", pattern: /Туркестан|Кентау/i },
  { label: "Улытауская обл.", pattern: /Жезказган|Жезқазған|Сатпаев|Сәтбаев/i },
];

export function extractRegion(...texts: Array<string | null | undefined>): string | null {
  const hay = texts.filter(Boolean).join(" ");
  for (const { label, pattern } of RULES) {
    if (pattern.test(hay)) return label;
  }
  return null;
}
