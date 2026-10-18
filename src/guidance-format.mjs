// Keep PDF content as text; only known numeric spans receive visual emphasis.
export function guidanceTokens(text){
 const pattern=/\d+(?:[.,]\d+)*(?:\s*(?:m\s*[²2]|%))?|\bm\s*[²2](?![\p{L}\p{N}])/giu;
 const result=[];let cursor=0;
 for(const match of String(text).matchAll(pattern)){
  if(match.index>cursor)result.push({text:text.slice(cursor,match.index),emphasis:false});
  result.push({text:match[0],emphasis:true});cursor=match.index+match[0].length;
 }
 if(cursor<text.length)result.push({text:text.slice(cursor),emphasis:false});
 return result;
}
