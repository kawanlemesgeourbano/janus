export function categoryGroups(items) {
  return [...new Set(items.map(i=>i.category))].map((name,index)=>({name,index,number:index+1,id:`category:${name}`,items:items.filter(i=>i.category===name)}));
}
export function categoryShortcut(index,prefix='Control+Shift') {
  return index>=0 && index<10 ? `${prefix}+${(index+1)%10}` : '';
}
export function canonicalShortcut(value) {
  const parts=value.split('+');
  return ['Control','Shift','Alt',...parts.filter(p=>!['Control','Shift','Alt'].includes(p))].filter(p=>parts.includes(p)).join('+');
}
