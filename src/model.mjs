export const normalize = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function directText(text){return String(text).replace(/\{[^}]*\}/g,'').replace(/\s+([,.;:!?])/g,'$1').replace(/ {2,}/g,' ').trim();}
export function fieldsOf(text) { return [...new Set([...text.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]))]; }
export function fillTemplate(text, values) {
  for (const field of fieldsOf(text)) {
    const value = String(values[field] ?? '').trim();
    if (!value || /[{}\r\n]/.test(value)) throw new Error(`Preencha o campo ${field}.`);
    if (field === 'X' && !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) throw new Error('Use uma área como 12,50 ou 1.250,00.');
    if (field === 'X' && Number(value.replaceAll('.','').replace(',','.')) <= 0) throw new Error('A área deve ser maior que zero.');
  }
  return text.replace(/\{([^}]+)\}/g, (_, k) => String(values[k]).trim());
}
export function filterCatalog(items, query, category, favorites, onlyFavorites) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter(i => (!category || i.category === category) && (!onlyFavorites || favorites.includes(i.key)) && terms.every(t=>normalize(i.category+' '+i.text).includes(t)));
}
