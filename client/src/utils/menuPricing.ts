export function menuPricing(name: string): 'soda' | 'manual' | 'fixed' {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/\bviazi karai\b/.test(normalized)) return 'manual';
  if (/^(coca cola|coke|fanta|krest|stoney|sprite|spirit)(\s|$)/.test(normalized)) return 'soda';
  return 'fixed';
}
