export function firstNames(name){return String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ');}
export function welcomeKey(config,name,now){return JSON.stringify([config.provider,config.baseUrl,config.model,firstNames(name),now.getFullYear(),now.getMonth(),now.getDate(),now.getHours()]);}
export function welcomeText(value){const text=String(value||'').replace(/[\r\n]+/g,' ').trim().replace(/^["“”']+|["“”']+$/g,'');return text.length>=12&&text.length<=180&&/^[\p{L}¿¡]/u.test(text)&&!/[<>*{}\[\]`]|\b(?:yes|no olá|thinking|analysis)\b/i.test(text)?shortMessage(text):'';}
export function dragSurface({interactive,heading,blank,scrollbar}){return !interactive&&!scrollbar&&(heading||blank);}

export function shortMessage(value){return String(value||'').trim().split(/\s+/).filter(Boolean).slice(0,10).join(' ');}
export function agentLabel(config){return ({gemini:'Gemini',openai:'OpenAI',anthropic:'Claude'})[config.provider]||config.model||'IA';}
export function pickerAction(active,next){return active===next?'close':active?'switch':'open';}
