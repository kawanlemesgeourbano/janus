import {setupFontPlugin} from './fonts';
import './style.css';
import './radial.css';
import {setupUpdater} from './updater';
import baseCatalog from './catalog.json';
import {parseGuidance,parameterTitles} from './guidance.mjs';
import {guidanceTokens} from './guidance-format.mjs';
import {findGuidanceNote,projectLabel,mergeProjects,validProject,parameterLabel} from './project-ui.mjs';
import {welcomeKey,welcomeText,firstNames,dragSurface,shortMessage,agentLabel,pickerAction} from './interaction-model.mjs';
import {setupPluginsPage,type Layout} from './plugin-manager';
import {RadialView,type RadialFrame} from './radial';
import {moveSelection,PAGE_SIZE} from './radial-model.mjs';
import { greeting, shortcutText, shortcutFromEvent, parseDivergencePages } from './import-model.mjs';
import { categoryGroups, categoryShortcut, canonicalShortcut } from './categories.mjs';
import { setupLogo } from './logo';
import { readPdf } from './pdf';
import { BotEngine } from './avatar';
import { Sound } from './core/sound';
import { directText, filterCatalog, normalize } from './model.mjs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize, PhysicalPosition } from '@tauri-apps/api/window';

type Item = {key:string; category:string; text:string};
type City = {id:string;name:string;source:string;items:Item[];documentText?:string;guidance?:Guidance};
const catalog:City[]=structuredClone(baseCatalog);
type Prefs = {settingsVersion:number;name:string; anchor:string; position?:{x:number;y:number}; lastPosition?:{x:number;y:number}; radialCompact?:boolean; geminiModel:string; autoGreeting:boolean; showHelp:boolean; welcomeAttempt?:string; welcomeCache?:{key:string;text:string}; showDivergences:boolean; showParameters:boolean; showPickerGuidance:boolean; smartTransparency:boolean; customCities:City[]; bindings:Record<string,Record<string,string>>; city:string;  assistant:boolean; sound:boolean; pinned:boolean; opacity:number; divergenceOpacity:number; copyMode:'copy'|'paste'; hover:boolean; shortcuts:boolean; prefix:string};
const native = '__TAURI_INTERNALS__' in window;
const defaults:Prefs = {settingsVersion:11,showHelp:true,autoGreeting:true,showDivergences:true,showParameters:true,showPickerGuidance:true,name:'',anchor:'top-right',smartTransparency:true,customCities:[],bindings:{},city:'',geminiModel:'gemini-flash-latest',assistant:true,sound:true,pinned:true,opacity:96,divergenceOpacity:100,copyMode:'paste',hover:true,shortcuts:true,prefix:'Control+Shift'};
let prefs:Prefs = structuredClone(defaults);
let query = '', category = '', compact = false;
let activePage:'divergences'|'parameters'|'plugins'='divergences';
let copyBusy = false, saveChain = Promise.resolve(), toastTimer = 0;
let animationFrame = 0, lastFrame = performance.now();
const engine = new BotEngine();
let systemName='',lookTarget={x:0,y:0};
let keyIssues:Record<string,string>={};let keyChain=Promise.resolve();
const root = document.querySelector<HTMLDivElement>('#app')!;
document.body.insertAdjacentHTML('beforeend','<svg width="0" height="0" aria-hidden="true" style="position:absolute;pointer-events:none"><defs><filter id="janus-white-key" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -4 -4 -4 0 11.6"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs></svg>');
root.innerHTML = `
<main class="shell">
  <header class="topbar" id="dragbar">
    <button class="mascot" id="mascot" aria-label="Interagir com o Janus" title="Olá!" ><canvas width="160" height="160"></canvas></button>
    <div class="brand" title="Clique para reproduzir · dois cliques no cabeçalho para voltar"><canvas id="logo" role="img" aria-label="Janus animado" tabindex="0"></canvas></div>
    <div class="window-actions"><button id="expand" class="icon" aria-label="Expandir painel" title="Expandir painel">↗</button><button id="pin" class="icon" aria-label="Fixar sobre outras janelas" title="Fixar sobre outras janelas"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6Z M12 15v7"/></svg></button><button id="collapse" class="icon" aria-label="Recolher painel" title="Recolher painel">−</button><button id="close" class="icon" aria-label="Fechar Janus" title="Fechar Janus">×</button></div>
  </header>
  <section class="workspace">
    <button id="radial-return" class="radial-return" hidden>← Voltar ao menu circular</button>
    <div class="city-row"><label for="city">PROJETO ATIVO</label><button id="open-ai" class="local" title="Configurar agente IA"><i></i><span id="ai-badge">Local</span></button></div>
    <div class="city-select"><div class="project-select-wrap"><select id="city" aria-label="Projeto ativo"></select><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></div><button id="edit-city" title="Editar projeto ativo" aria-label="Editar projeto ativo"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-5-5L3 14l-1 6z"/></svg></button><button id="add-city" title="Adicionar projeto ou importar PDF" aria-label="Adicionar projeto ou importar PDF">+</button></div>
    <div class="intro"><h2 id="greeting"></h2><p id="day-message"></p></div>

    <button id="plugins-tab" class="plugins-launch" aria-label="Abrir Plugins+"><span class="plugins-launch-mark" aria-hidden="true">+</span><span>Plugins+</span></button>
    <nav class="tabs" aria-label="Menus do projeto"><button id="all" class="active">Divergências <span id="all-count"></span></button><button id="parameters-tab">Parâmetros <span id="parameters-count"></span></button><button id="settings" class="settings-button" aria-label="Abrir configurações" title="Configurações"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="m9.7 3-.5 2-1.5.9-2-.5-2.3 4 1.5 1.4v1.8L3.4 14l2.3 4 2-.5 1.5.9.5 2h4.6l.5-2 1.5-.9 2 .5 2.3-4-1.5-1.4v-1.8l1.5-1.4-2.3-4-2 .5-1.5-.9-.5-2z"/><circle cx="12" cy="12" r="3"/></svg></button></nav>
    <section id="divergences-page" class="content-page">
    <div class="search-box" id="search-panel" hidden><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Buscar por texto ou categoria…" aria-label="Buscar divergências" autocomplete="off"><kbd data-help>Ctrl Shift F</kbd><button id="close-search" aria-label="Fechar pesquisa">×</button></div>
    <div class="filter-row"><select id="category" aria-label="Filtrar categoria"></select><button id="copy-mode" class="copy-mode" role="switch" aria-checked="true"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 3h13l4 4v14H3V3zM7 3v7h10V3M7 21v-7h10v7"/></svg></span><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5H5v17h14V5h-3M9 2h6v6H9zM8 12h8M8 16h8"/></svg></span></button></div><button id="city-guide" class="guide-link" hidden>Ver orientações do PDF</button>
    <div id="list" class="list" aria-label="Divergências"></div>
    </section><section id="parameters-page" class="content-page" hidden aria-label="Parâmetros do projeto"><div id="parameters-list"></div></section><section id="plugins-page" class="content-page" hidden aria-label="Plugins+"><div class="plugins-page-top"><button id="plugins-back">← Voltar</button><h2>Plugins</h2></div><div id="plugins-content"></div></section>
    <section id="no-active-menu" class="no-active-menu" hidden><span aria-hidden="true">☁</span><p>Nenhum menu ativo por aqui...</p><small>Você pode ativar os menus nas configurações.</small></section><footer><span id="shortcut-hint" data-help></span><img class="gi-logo" src="./gi-logo.jpg" alt="GI Geotecnologia" width="38" height="35" decoding="async"><button id="about" class="release-button" aria-label="Sobre o Janus 1.0a.8">Janus 1.0a.8</button></footer>
  </section>
  <div id="toast" role="status" aria-live="polite"></div>
</main>
<dialog id="preferences" aria-labelledby="settings-title">
 <div class="settings-heading"><div class="dialog-top"><button class="icon dismiss" aria-label="Fechar configurações">×</button></div><h2 id="settings-title">Configurações</h2><p>As preferências são salvas automaticamente.</p></div>
 <nav class="settings-nav" role="tablist" aria-label="Grupos de configurações"><button id="settings-general-tab" role="tab" aria-controls="settings-general" aria-selected="true">Geral</button><button id="settings-window-tab" role="tab" aria-controls="settings-window" aria-selected="false">Janela</button><button id="settings-shortcuts-tab" role="tab" aria-controls="settings-shortcuts" aria-selected="false">Atalhos</button><button id="settings-agent-tab" role="tab" aria-controls="settings-agent" aria-selected="false">Agente IA</button><button id="settings-fonts-tab" role="tab" aria-controls="settings-fonts" aria-selected="false" hidden>Fontes</button></nav>
 <div class="settings-body">
 <section id="settings-general" class="settings-section" role="tabpanel" aria-labelledby="settings-general-tab">
  <div class="setting-card"><h3>Menus do painel</h3><p class="setting-description">Escolha o que aparece no Janus. Os atalhos continuam disponíveis.</p><label class="toggle"><span><strong>Mostrar divergências</strong><small>Lista e filtro das divergências do projeto.</small></span><input id="showDivergences" type="checkbox"></label><label class="toggle"><span><strong>Mostrar parâmetros</strong><small>Critérios e orientações do projeto.</small></span><input id="showParameters" type="checkbox"></label></div><div class="setting-card"><h3>Ajudas do programa</h3><label class="toggle"><span><strong>Mostrar ajudas</strong><small>Exibir dicas de atalhos e descrições ao passar o mouse. Os nomes dos botões continuam acessíveis.</small></span><input id="showHelp" type="checkbox"></label></div><div class="setting-card"><h3>Nome de usuário</h3><label class="field-label" for="user-name">NOME DE EXIBIÇÃO</label><input id="user-name" maxlength="100" placeholder="Usar nome do Windows"><p id="windows-name" class="small"></p></div>
  <div class="setting-card"><h3>Atualizações</h3><label class="toggle"><span><strong>Verificar e baixar ao abrir</strong></span><input id="auto-update" type="checkbox" checked></label><p id="update-status" class="small" role="status">Preparando o atualizador…</p><button id="check-update" class="update-placeholder">Verificar agora</button><button id="apply-update" class="primary" hidden>Atualizar e reabrir</button></div><div class="setting-card"><h3>Personagem e sons</h3><label class="toggle"><span><strong>Personagem animado</strong><small>Desligue para usar apenas a cópia.</small></span><input id="assistant" type="checkbox"></label><label class="toggle"><span><strong>Sons do Janus</strong><small>Reações ao abrir, copiar e conversar.</small></span><input id="sound" type="checkbox"></label></div>
 </section>
 <section id="settings-window" class="settings-section" role="tabpanel" aria-labelledby="settings-window-tab" hidden>
  <div class="setting-card"><h3>Posição habitual</h3><p class="setting-description">Dois cliques no cabeçalho trazem o Janus de volta.</p><label class="field-label" for="anchor">ONDE FICAR</label><select id="anchor"><option value="top-right">Canto superior direito</option><option value="top-left">Canto superior esquerdo</option><option value="bottom-right">Canto inferior direito</option><option value="bottom-left">Canto inferior esquerdo</option><option value="custom">Posição que eu salvei</option></select><div class="position-buttons"><button id="remember-position">Guardar posição atual</button><button id="go-home">Voltar à posição habitual</button></div></div>
  <div class="setting-card"><h3>Comportamento</h3><label class="toggle"><span><strong>Fixar painel</strong><small>Manter sobre as outras janelas.</small></span><input id="pinned" type="checkbox"></label><label class="toggle"><span><strong>Recolher automaticamente</strong><small>Voltar à posição habitual ao sair e expandir com o mouse. Desative para manter aberto, mesmo com o alfinete ativo.</small></span><input id="hover" type="checkbox"></label></div>
  <div class="setting-card"><h3>Aparência</h3><label class="toggle"><span><strong>Transparência inteligente</strong><small>Fundo discreto e textos legíveis.</small></span><input id="smartTransparency" type="checkbox"></label><label class="range-label" for="opacity">Opacidade do painel <output id="opacity-value"></output></label><input id="opacity" type="range" min="0" max="100"><p class="small">Controla o fundo do painel e o logo. Os controles continuam acessíveis.</p><label class="range-label" for="divergenceOpacity">Opacidade dos conteúdos <output id="divergence-opacity-value"></output></label><input id="divergenceOpacity" type="range" min="0" max="100"><p class="small">Controla todos os conteúdos do menu: abas, filtros, textos, parâmetros e orientações. Inclui Plugins e configurações.</p></div>
 </section>
 <section id="settings-shortcuts" class="settings-section" role="tabpanel" aria-labelledby="settings-shortcuts-tab" hidden>
  <div class="setting-card"><h3>Teclado</h3><label class="toggle"><span><strong>Atalhos globais</strong><small id="shortcut-description">Usar mesmo em outro programa.</small></span><input id="shortcuts" type="checkbox"></label><label class="field-label" for="prefix">COMBINAÇÃO DAS CATEGORIAS</label><select id="prefix"><option value="Control+Shift">Ctrl + Shift</option><option value="Alt+Shift">Alt + Shift</option></select><p class="small">1 a 9 abre as categorias 1 a 9; 0 abre a categoria 10. Clique no atalho de um grupo para personalizar.</p><dl class="shortcut-reference"><div><dt>Painel</dt><dd>Ctrl + Shift + D</dd></div><div><dt>Chat</dt><dd>Ctrl + Shift + Espaço</dd></div><div><dt>Pesquisa</dt><dd>Ctrl + Shift + F</dd></div></dl><p id="shortcut-error" class="error" role="alert"></p></div>
  <div class="setting-card"><h3>Menu de seleção</h3><label class="toggle"><span><strong>Mostrar orientações nos atalhos</strong><small>Exibir as instruções abaixo do título ao abrir uma categoria pelo teclado.</small></span><input id="showPickerGuidance" type="checkbox"></label><p class="small">O botão de documento continua disponível no painel.</p></div>
 </section>
 <section id="settings-fonts" class="settings-section" role="tabpanel" aria-labelledby="settings-fonts-tab" hidden></section>
 <section id="settings-agent" class="settings-section" role="tabpanel" aria-labelledby="settings-agent-tab" hidden>
  <div class="setting-card"><h3>Seu agente IA</h3><p class="setting-description">Opcional. Escolha o formato da API, informe o modelo e confirme para testar a conexão.</p><label class="field-label" for="agent-provider">PROVEDOR / FORMATO</label><select id="agent-provider"><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><option value="compatible">API compatível com Chat Completions</option></select><label class="field-label" for="agent-url">URL BASE DA API</label><input id="agent-url" maxlength="500" placeholder="https://seu-provedor.example/v1"><p class="small" id="agent-format-help"></p><label class="field-label" for="agent-key">CHAVE API</label><input id="agent-key" type="password" autocomplete="off" placeholder="Cole a chave do provedor selecionado"><label class="field-label" for="agent-model">MODELO</label><input id="agent-model" maxlength="160" placeholder="Identificador do modelo no provedor"><div class="gemini-actions"><button id="connect-ai" class="primary">Confirmar e conectar</button><button id="remove-ai" class="icon" aria-label="Remover conexão IA" title="Remover conexão IA"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg></button></div><p id="ai-status" class="connection-status" role="status"></p></div>
  <div class="setting-card"><h3>Recepção do Janus</h3><label class="toggle"><span><strong>Recepção criativa com IA</strong><small>O agente cria uma frase meiga conforme o horário. Envia apenas os dois primeiros nomes e o horário, no máximo uma consulta automática por hora; usa a cota da sua API.</small></span><input id="autoGreeting" type="checkbox"></label></div><div class="setting-card setting-card-muted"><h3>Seus dados</h3><p class="small">A conexão e a chave ficam protegidas pelo Gerenciador de Credenciais do Windows. Ao confirmar ou conversar, os dados vão para o provedor escolhido. A cópia e os parâmetros continuam disponíveis sem IA.</p></div>
 </section>
 </div>
</dialog>
<dialog id="info" aria-labelledby="info-title"><div class="dialog-top"><span class="eyebrow">GI GEOTECNOLOGIA</span><button class="icon dismiss" aria-label="Fechar informações">×</button></div><h2 id="info-title">Janus 1.0a.8</h2><p class="about-description">O Janus é um assistente corporativo desenvolvido para otimizar e modernizar o fluxo de trabalho nos setores de cadastramento imobiliário da GI Geotecnologia. Projetado como uma solução centralizada, o software acelera o tratamento de divergências e agiliza a consulta de parâmetros, operando em conjunto com agentes inteligentes que automatizam e dão suporte à execução das demandas operacionais. Com foco em produtividade, o Janus destaca-se por ser uma plataforma altamente customizável. A ferramenta oferece uma ampla gama de atalhos para dar fluidez ao serviço e possui uma arquitetura aberta, permitindo que os próprios usuários desenvolvam e integrem plugins personalizados por meio de uma documentação clara, simples e acessível.</p><p class="release-scope">Plugins+ permite baixar, ativar e desativar o Menu circular. Este primeiro formato personaliza a interface; outros tipos de integração serão adicionados posteriormente.</p><details class="about-credits"><summary>Créditos e informações da versão</summary><p>Personagem geométrico e sons sintetizados próprios do Janus. Código derivado do Coucou de Louis Raillé, sob licença MIT. Consulte os créditos que acompanham o programa.</p><p id="source-note"></p><p>Preferências e projetos ficam em dados/preferencias.json ao lado do executável. As conexões de IA ficam no Gerenciador de Credenciais do Windows.</p></details></dialog>`;
const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const emptyProject:City={id:'',name:'Nenhum projeto',source:'',items:[]};
const city = () => catalog.find(c=>c.id===prefs.city) ?? emptyProject;
let radialLayout:Layout|null=null,radialView:RadialView|null=null,radialShown=false,radialPicker=false,pickerReturnRadial=false;
let radialFrame:RadialFrame|null=null,radialSizing=Promise.resolve(),radialRoute='home',radialTransition=0,radialFolding=false;
async function sizeRadial(frame:RadialFrame,force=false){
 const old=radialFrame;radialFrame=frame;root.style.width=frame.geometry.width+'px';root.style.height=frame.geometry.height+'px';
 if(!native)return;
 if(!force&&old&&old.geometry.width===frame.geometry.width&&old.geometry.height===frame.geometry.height&&JSON.stringify(old.polygons)===JSON.stringify(frame.polygons))return;
 radialSizing=radialSizing.then(async()=>{
  const win=getCurrentWindow(),position=await win.outerPosition(),scale=window.devicePixelRatio||1;
  movingProgrammatically=true;
  try{
   const resized=!old||old.geometry.width!==frame.geometry.width||old.geometry.height!==frame.geometry.height;
   if(resized){await win.setMinSize(null);await win.setSize(new LogicalSize(frame.geometry.width,frame.geometry.height));}
   const x=old?position.x+(old.geometry.cx-frame.geometry.cx)*scale:(prefs.lastPosition?.x??position.x),y=old?position.y+(old.geometry.cy-frame.geometry.cy)*scale:(prefs.lastPosition?.y??position.y);
   if(resized)await invoke('dock_window',{anchor:!old&&prefs.pinned&&prefs.anchor!=='custom'?prefs.anchor:'custom',x:Math.round(x),y:Math.round(y)});await invoke('radial_region',{polygons:frame.polygons});
   const p=await win.outerPosition();prefs.lastPosition={x:p.x,y:p.y};save();
  }finally{movingProgrammatically=false;}
 }).catch(()=>toast('Não foi possível ajustar o menu circular. Use Plugins+ para desativá-lo.',true));
 await radialSizing;
}
async function showRadial(value=false){
 const wasShown=radialShown,wasCompact=compact;
 const transition=++radialTransition;if(value&&radialShown&&!compact&&!radialPicker&&radialRoute==='home'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){radialFolding=true;radialView?.element.classList.add('radial-retract');await new Promise(resolve=>setTimeout(resolve,320));if(transition!==radialTransition)return;}radialFolding=false;radialView?.element.classList.remove('radial-retract');
 if(!radialLayout||!radialView)return;radialRoute='home';root.dataset.radialPage='home';document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());if(chatOpen){chatOpen=false;engine.setActivity(aiBusy?'thinking':'idle');$('janus-chat').hidden=true;root.classList.remove('chatting');}const changed=prefs.radialCompact!==value;prefs.radialCompact=value;compact=value;radialShown=true;radialPicker=false;root.classList.add('radial-mode');root.classList.remove('compact');
 const frame=radialView.main(value,{divergences:groups().length,parameters:guidanceForCity().parameters.filter(s=>s.text.trim()).length},action=>void radialAction(action));
 await sizeRadial(frame);applyLook();if(wasShown&&wasCompact!==value)Sound.play(value?'radialClose':'radialOpen');if(changed)save();
}
async function leaveRadial(){
 if(!radialShown)return;++radialTransition;radialFolding=false;radialShown=false;radialPicker=false;await radialSizing;radialFrame=null;compact=false;root.classList.remove('radial-mode','compact');delete root.dataset.radialPage;root.style.width='';root.style.height='';
 if(native){await invoke('radial_region',{polygons:null});await getCurrentWindow().setMinSize(null);await getCurrentWindow().setSize(new LogicalSize(460,740));await dock(false);}
}
async function radialAction(action:string,settingsSection:SettingsSection='general'){
 if(!radialView)return;if(pickerActive)await closeCategory();++radialTransition;radialFolding=false;radialView.element.classList.remove('radial-retract');
 if(action==='home'){await showRadial(false);return;}
 document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());
 if(action!=='agent'&&chatOpen){chatOpen=false;engine.setActivity(aiBusy?'thinking':'idle');$('janus-chat').hidden=true;root.classList.remove('chatting');}
 radialRoute=action;compact=false;radialShown=true;radialPicker=false;root.dataset.radialPage=action;root.classList.add('radial-mode');root.classList.remove('compact','picking');
 const frame=radialView.main(false,{divergences:groups().length,parameters:guidanceForCity().parameters.filter(s=>s.text.trim()).length},name=>void radialAction(name),true,action);
 await sizeRadial(frame);
 if(action==='settings'){openSettings(settingsSection);return;}
 if(action==='agent'){if(aiConnected)await openChat();else openSettings('agent');return;}
 showPage(action==='parameters'?'parameters':action==='plugins'?'plugins':'divergences');
}
async function changePlugin(layout:Layout|null){
 if(pickerActive)await closeCategory();if(radialShown)await leaveRadial();radialView?.destroy();radialView=null;radialLayout=layout;
 $('radial-return').hidden=!layout;
 if(layout){if(chatOpen)await closeChat();document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());radialView=new RadialView(root,layout,prefs.anchor.endsWith('left'),connectedAgent?agentLabel(connectedAgent):'Agente IA');await showRadial(true);}
}
function paintRadialPicker(focus=false){
 if(!radialView)return;const frame=radialView.picker({title:$('picker-title').textContent||pickerName,items:pickerItems.map(item=>({text:directText(item.text)})),index:pickerIndex,note:categoryNote(pickerName),guidance:prefs.showPickerGuidance,copyMode:prefs.copyMode,
 pick:index=>void pick(index),select:index=>{if(index===pickerIndex)return;pickerIndex=index;paintRadialPicker();},close:()=>void closeCategory(),toggleGuidance:()=>{prefs.showPickerGuidance=!prefs.showPickerGuidance;save();paintRadialPicker();}});
 void sizeRadial(frame);if(focus)radialView.focus(pickerIndex%PAGE_SIZE);
}
function radialKeys(e:KeyboardEvent){
 if(!radialShown||e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return false;
 if(radialPicker){
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key)){e.preventDefault();pickerIndex=moveSelection(pickerIndex,pickerItems.length,e.key);paintRadialPicker(true);return true;}
  if(e.key==='Escape'){e.preventDefault();void closeCategory();return true;}
  if(e.key==='Enter'&&(e.target as HTMLElement).closest('.radial-petal')){e.preventDefault();void pick(pickerIndex);return true;}
 }else{
  if(/^[1-5]$/.test(e.key)&&!compact&&radialRoute==='home'){e.preventDefault();const slot=radialLayout?.slots[Number(e.key)-1];if(slot)void radialAction(slot.action);return true;}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&!compact&&radialRoute==='home'){e.preventDefault();const index=Number((document.activeElement as HTMLElement)?.dataset.radialIndex??-1);radialView?.focus(moveSelection(index,5,e.key));return true;}
  if(e.key==='Escape'){e.preventDefault();void showRadial(true);return true;}
 }return false;
}
const groups=()=>categoryGroups(city().items);
const groupShortcut=(name:string)=>prefs.bindings[prefs.city]?.['category:'+name] ?? categoryShortcut(groups().findIndex((g:any)=>g.name===name),prefs.prefix);
const shortcutLabel = () => prefs.prefix === 'Control+Shift' ? 'Ctrl + Shift' : 'Alt + Shift';
const itemShortcut=(item:Item)=>groupShortcut(item.category);
function refreshGreeting(){const now=new Date(),g=greeting(prefs.name||systemName,now.getHours());$('greeting').textContent=g.title;const cached=prefs.autoGreeting&&connectedAgent&&prefs.welcomeCache?.key===welcomeKey(connectedAgent,prefs.name||systemName,now)?prefs.welcomeCache.text:'';$('day-message').textContent=shortMessage(cached||g.message);$('day-message').title=cached?'Recepção criada pelo seu agente IA':'Recepção local do Janus';void requestWelcome();}
let movingProgrammatically=false,moveTimer=0;
async function dock(home=true){if(!native)return;movingProgrammatically=true;try{const p=home?prefs.position:prefs.lastPosition;await invoke('dock_window',{anchor:home?prefs.anchor:(p?'custom':prefs.anchor),x:p?.x??null,y:p?.y??null});}finally{movingProgrammatically=false;} if(home){const p=await getCurrentWindow().outerPosition();prefs.lastPosition={x:p.x,y:p.y};save();}}


function dragFreeWindow(start:PointerEvent,target:HTMLElement){
 const win=getCurrentWindow(),x=start.screenX,y=start.screenY,scale=window.devicePixelRatio||1;let lastX=x,lastY=y,origin:{x:number;y:number}|null=null,queued=false;
 const place=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!origin||Math.hypot(lastX-x,lastY-y)<3)return;void win.setPosition(new PhysicalPosition(Math.round(origin.x+(lastX-x)*scale),Math.round(origin.y+(lastY-y)*scale))).catch(()=>{});});};
 const ready=win.outerPosition().then(p=>{origin=p;place();}).catch(()=>{});
 const move=(e:PointerEvent)=>{if(e.pointerId!==start.pointerId)return;lastX=e.screenX;lastY=e.screenY;place();};
 const finish=(e:PointerEvent)=>{if(e.pointerId!==start.pointerId)return;lastX=e.screenX;lastY=e.screenY;target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',finish);if(target.hasPointerCapture(start.pointerId))target.releasePointerCapture(start.pointerId);void ready.then(place);};
 target.setPointerCapture(start.pointerId);target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',finish);
}
function setupFreeDragging(){
 document.addEventListener('pointerdown',e=>{if(!native||e.button!==0||e.defaultPrevented)return;const target=e.target as HTMLElement;if(target.closest('#dragbar'))return;const tag=target.tagName.toLowerCase();const interactive=Boolean(target.closest('button,input,select,textarea,a,summary,[role="switch"],[role="tab"],label'));
 const heading=Boolean(target.closest('.settings-heading'));const surfaces=['shell','workspace','intro','tabs','filter-row','content-page','plugins-empty','no-active-menu','chat-transcript','settings-body','setting-card','plugins-page-top','radial-hub'];
 const rect=target.getBoundingClientRect();const scrollbar=(target.scrollHeight>target.clientHeight&&e.clientX>=rect.left+target.clientWidth)||(target.scrollWidth>target.clientWidth&&e.clientY>=rect.top+target.clientHeight);
 if(!dragSurface({interactive,heading,blank:(target===root||tag==='footer'||surfaces.some(c=>target.classList.contains(c)))&&['div','section','main','nav','footer'].includes(tag),scrollbar}))return;
 e.preventDefault();dragFreeWindow(e,target);
 });
}
const helpTitles=new Map<Element,string>();
function applyHelp(){
 root.classList.toggle('no-help',!prefs.showHelp);document.body.classList.toggle('no-help',!prefs.showHelp);
 for(const [element,title] of helpTitles){if(!element.isConnected){helpTitles.delete(element);continue;}if(prefs.showHelp){element.setAttribute('title',title);helpTitles.delete(element);}}
 if(!prefs.showHelp)document.querySelectorAll('[title]').forEach(element=>{helpTitles.set(element,element.getAttribute('title')||'');element.removeAttribute('title');});
}
function setupHelp(){new MutationObserver(()=>applyHelp()).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['title']});applyHelp();}
function toast(message:string, error=false) {
  $('toast').textContent=message; $('toast').classList.add('visible'); $('toast').classList.toggle('bad',error);
  window.clearTimeout(toastTimer); toastTimer=window.setTimeout(()=>$('toast').classList.remove('visible'),4000);
}
function save() {
  const snapshot = structuredClone(prefs);
  saveChain=saveChain.then(async()=>{
    if(native) await invoke('save_settings',{value:snapshot}); else localStorage.setItem('janus.preferences',JSON.stringify(snapshot));
  }).catch(()=>toast('Não foi possível salvar as preferências nesta pasta.',true));
}
type Guidance={parameters:{title:string;text:string}[];notes:Record<string,string>};
const guidanceCache=new Map<string,Guidance>();
function guidanceForCity():Guidance{
 if(city().guidance)return city().guidance!;
 if(!city().documentText)return {parameters:parameterTitles.map((title:string)=>({title,text:''})),notes:{}};
 if(!guidanceCache.has(city().id))guidanceCache.set(city().id,parseGuidance([city().documentText!]));
 return guidanceCache.get(city().id)!;
}
function categoryNote(name:string){return findGuidanceNote(guidanceForCity().notes,name)||'Este projeto ainda não tem orientações cadastradas para esta divergência. Consulte os critérios do projeto.';}
function guidanceBody(text:string,emphasize=false){
 const body=document.createElement('div');body.className='guidance-text';
 for(const line of text.split('\n').filter(line=>line.trim())){const p=document.createElement('p');p.className='guidance-line';
  if(emphasize){for(const token of guidanceTokens(line)){if(token.emphasis){const strong=document.createElement('strong');strong.textContent=token.text;p.append(strong);}else p.append(document.createTextNode(token.text));}}else p.textContent=line;
  body.append(p);
 }return body;
}
function showGuidanceMenu(name:string,text:string,anchor:HTMLElement){
 $('guidance-title').textContent=name;$('guidance-content').replaceChildren(guidanceBody(text));
 const menu=$<HTMLDialogElement>('guidance-menu');menu.style.visibility='hidden';menu.showModal();
 const rect=anchor.getBoundingClientRect(),box=menu.getBoundingClientRect();
 const left=Math.max(10,Math.min(rect.right-box.width,window.innerWidth-box.width-10));
 const below=rect.bottom+8,above=rect.top-box.height-8;
 const top=below+box.height<=window.innerHeight-10?below:Math.max(10,above);
 menu.style.left=`${left}px`;menu.style.top=`${top}px`;menu.style.visibility='visible';
}
function renderParameters(){
 const list=$('parameters-list');list.replaceChildren();
 const sections=guidanceForCity().parameters.filter(section=>section.text.trim());
 $('parameters-count').textContent=String(sections.length);
 if(!sections.length){const p=document.createElement('p');p.className='empty-parameters';p.textContent='Este projeto ainda não tem parâmetros. Use o lápis para cadastrar ou importar um PDF.';list.append(p);return;}
 for(const [index,section] of sections.entries()){const d=document.createElement('details');d.className='parameter-menu';const title=document.createElement('summary');const number=document.createElement('span');number.className='parameter-number';number.textContent=String(index+1).padStart(2,'0');const name=document.createElement('span');name.textContent=parameterLabel(section.title);title.append(number,name);const body=guidanceBody(section.text,true);d.append(title,body);list.append(d);}
}
function showPage(page:typeof activePage,searchOverride=false){
 if(page==='divergences'&&!prefs.showDivergences&&!searchOverride)page=prefs.showParameters?'parameters':'divergences';
 if(page==='parameters'&&!prefs.showParameters)page=prefs.showDivergences?'divergences':'parameters';
 activePage=page;root.classList.toggle('plugins-open',page==='plugins');
 $('all').hidden=!prefs.showDivergences;$('parameters-tab').hidden=!prefs.showParameters;
 for(const [name,id] of [['divergences','divergences-page'],['parameters','parameters-page'],['plugins','plugins-page']] as const)$(id).hidden=page!==name||(name==='divergences'&&!prefs.showDivergences&&!searchOverride)||(name==='parameters'&&!prefs.showParameters);
 $('no-active-menu').hidden=searchOverride||page==='plugins'||prefs.showDivergences||prefs.showParameters;
 $('all').classList.toggle('active',page==='divergences');$('parameters-tab').classList.toggle('active',page==='parameters');$('plugins-tab').classList.toggle('active',page==='plugins');
}
function closeSearch(){$('search-panel').hidden=true;query='';$<HTMLInputElement>('search').value='';renderList();showPage(activePage);}
async function openSearch(){
 if(radialShown)await radialAction('divergences');
 if(pdfBusy)return;if(chatOpen)await closeChat();if(pickerActive)await closeCategory();
 document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());if(!radialShown)await setCompact(false);showPage('divergences',true);$('search-panel').hidden=false;
 if(native){await getCurrentWindow().show();await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}$('search').focus();
}
function renderList() {
 const items=filterCatalog(city().items,query,category,[],false) as Item[];
 $('all-count').textContent=String(groups().length);
 const list=$('list');list.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.className='empty';p.textContent=city().items.length?'Nenhum texto encontrado.':'Nenhum projeto cadastrado. Use o botão + para criar um projeto ou importar seu PDF.';list.append(p);return;}
 for(const g of groups()){
  const visible=items.filter(i=>i.category===g.name);if(!visible.length)continue;
  const group=document.createElement('section');group.className='divergence-group';group.setAttribute('aria-label',`${g.number}. ${g.name}`);
  const header=document.createElement('div');header.className='group-heading';
  const title=document.createElement('h3');title.textContent=`${g.number}. ${g.name}`;
  const shortcut=document.createElement('button');shortcut.className='shortcut-chip';shortcut.textContent=shortcutText(groupShortcut(g.name));shortcut.setAttribute('aria-label',`Atalho da categoria ${g.name}`);shortcut.onclick=()=>editShortcut(g.items[0]);
  const issue=keyIssues[g.id];shortcut.title=issue||'Alterar atalho desta categoria';shortcut.classList.toggle('unavailable',Boolean(issue)||!prefs.shortcuts);
  header.append(title,shortcut);const note=categoryNote(g.name);{const doc=document.createElement('button');doc.className='guidance-document';doc.setAttribute('aria-label',`Orientações: ${g.number}. ${g.name}`);doc.title='Ver orientações';doc.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6"/></svg>';doc.onclick=()=>showGuidanceMenu(g.name,note,doc);header.append(doc);}group.append(header);
  for(const item of visible){const row=document.createElement('button');row.className='sub-divergence';const num=document.createElement('span');num.className='sub-number';num.textContent=`${g.number}.${g.items.findIndex((i:Item)=>i.key===item.key)+1}`;
   const text=document.createElement('span');text.className='divergence-text';text.textContent=directText(item.text);const action=document.createElement('span');action.className='paste-label';action.textContent=prefs.copyMode==='paste'?'Colar':'Copiar';row.setAttribute('aria-label',`${prefs.copyMode==='paste'?'Colar':'Copiar'}: ${directText(item.text)}`);row.append(num,text,action);row.onclick=()=>void choose(item);group.append(row);}
  list.append(group);
 }
}
function setCity() {
  $<HTMLDialogElement>('guidance-menu').close();
  query='';category='';$('search') instanceof HTMLInputElement && ($<HTMLInputElement>('search').value='');
  const select=$<HTMLSelectElement>('category'); select.replaceChildren(new Option('Todas as categorias',''));
  [...new Set(city().items.map(x=>x.category))].forEach(c=>select.add(new Option(c,c)));
  $<HTMLSelectElement>('city').value=prefs.city;
  $('source-note').textContent=`Fonte do projeto ativo: ${city().source}. Nenhuma regra de outro projeto é aplicada automaticamente.`;
  $('city-guide').hidden=!city().documentText;
  renderList();renderParameters();showPage(activePage);
}
async function copyText(text:string) {
 if(copyBusy)return;copyBusy=true;
 try{
  if(native){if(prefs.copyMode==='copy'){await invoke('copy_text',{text});toast('Texto copiado para a área de transferência.');}else{const pasted=await invoke<boolean>('paste_text',{text});toast(pasted?'Texto colado.':'Texto copiado. Use Ctrl + V no campo desejado.');}}
  else{await navigator.clipboard.writeText(text);toast('Texto copiado. Cole no campo desejado.');}
  if(prefs.assistant)engine.triggerEmote('happy');Sound.play('finish');engine.triggerEmote('celebrate');
 }catch{toast('Não foi possível copiar. Tente novamente.',true);Sound.play('error');}
 finally{copyBusy=false;}
}
async function choose(item:Item){await copyText(directText(item.text));}
async function setCompact(value:boolean) {
  if(radialShown&&!radialPicker){await showRadial(value);return;}
  if(value && document.querySelector('dialog[open]'))return;
  $('collapse').setAttribute('aria-label','Recolher painel');$('collapse').title='Recolher painel';const changed=compact!==value;compact=value;root.classList.toggle('compact',compact);if(changed){Sound.play(value?'fold':'expand');if(!value)engine.triggerEmote('happy');}
  if(native) {
    await getCurrentWindow().setMinSize(null);
    await getCurrentWindow().setSize(new LogicalSize(compact?300:460,compact?94:740));
    await dock(true);
  }
}
function animate(now:number) {
  animationFrame=0;
  if((!prefs.assistant&&!chatOpen) || document.hidden)return;
  const canvas=$('mascot').querySelector('canvas')!; const ctx=canvas.getContext('2d')!;
  const dt=Math.min((now-lastFrame)/1000,0.05);lastFrame=now;
  const ease=1-Math.exp(-10*dt);engine.lookX+=(lookTarget.x-engine.lookX)*ease;engine.lookY+=(lookTarget.y-engine.lookY)*ease;
  engine.update(dt);ctx.clearRect(0,0,160,160);engine.draw(ctx,160,160);
  animationFrame=requestAnimationFrame(animate);
}
function applyLook() {
  document.documentElement.style.setProperty('--opacity',String(prefs.opacity/100));
  document.documentElement.style.setProperty('--content-opacity',String(prefs.divergenceOpacity/100));
  root.classList.toggle('smart-transparency',prefs.smartTransparency);applyHelp();
  if(native)void invoke('set_tracking',{enabled:prefs.assistant});
  refreshGreeting();
  $('mascot').hidden=!prefs.assistant&&!chatOpen;Sound.enabled=prefs.sound;
  $('collapse').setAttribute('aria-label',radialShown?'Minimizar Janus':'Recolher painel');$('collapse').title=radialShown?'Minimizar Janus':'Recolher painel';
  $('pin').classList.toggle('selected',prefs.pinned);$('pin').setAttribute('aria-pressed',String(prefs.pinned));
  if((!prefs.assistant&&!chatOpen) || document.hidden){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;}
  else if(!animationFrame){lastFrame=performance.now();animationFrame=requestAnimationFrame(animate);}
  $('opacity-value').textContent=`${prefs.opacity}%`;$('divergence-opacity-value').textContent=`${prefs.divergenceOpacity}%`;
  $('shortcut-hint').textContent=native&&prefs.shortcuts?'Ctrl + Shift + D · abrir / recolher':'Cópia local · seus dados ficam aqui';
}
async function configureKeys() {
  const activeCity=prefs.city;
  const bindings=[{id:'__open',shortcut:'Control+Shift+D'},{id:'__chat',shortcut:'Control+Shift+Space'},{id:'__search',shortcut:'Control+Shift+F'},...groups().map((g:any)=>({id:g.id,shortcut:groupShortcut(g.name)}))];
  const enabled=prefs.shortcuts;
  keyChain=keyChain.then(async()=>{
    if(!native)return;
    const issues=await invoke<{id:string;message:string}[]>('configure_shortcuts',{bindings,enabled});
    if(prefs.city!==activeCity)return;
    keyIssues=Object.fromEntries(issues.map(i=>[i.id,i.message]));
    const special=issues.filter(i=>i.id.startsWith('__')).map(i=>`${i.id==='__chat'?'Chat (Ctrl + Shift + Espaço)':i.id==='__search'?'Pesquisa (Ctrl + Shift + F)':'Painel (Ctrl + Shift + D)'}: ${i.message}`).join(' · ');
    $('shortcut-error').textContent=issues.length?(special||`${issues.length} atalho(s) de categoria indisponível(is). Troque os destacados nos grupos.`):'';
    applyLook();renderList();
  }).catch(e=>{keyIssues=Object.fromEntries(bindings.map(b=>[b.id,'Não foi possível ativar']));$('shortcut-error').textContent=String(e);renderList();});
  await keyChain;
}
type SettingsSection='general'|'window'|'shortcuts'|'agent'|'fonts';
const settingsSections:SettingsSection[]=['general','window','shortcuts','agent','fonts'];
function showSettingsSection(section:SettingsSection){for(const name of settingsSections){$(`settings-${name}`).hidden=name!==section;$(`settings-${name}-tab`).setAttribute('aria-selected',String(name===section));$(`settings-${name}-tab`).tabIndex=name===section?0:-1;}document.querySelector('.settings-body')!.scrollTop=0;}
function setupSettingsNavigation(){for(const name of settingsSections){const tab=$(`settings-${name}-tab`);tab.onclick=()=>showSettingsSection(name);tab.onkeydown=e=>{const visible=settingsSections.filter(s=>!$(`settings-${s}-tab`).hidden);const index=visible.indexOf(name);let next=index;if(e.key==='ArrowRight')next=(index+1)%visible.length;else if(e.key==='ArrowLeft')next=(index+visible.length-1)%visible.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=visible.length-1;else return;e.preventDefault();showSettingsSection(visible[next]);$(`settings-${visible[next]}-tab`).focus();};}}

function openSettings(section:SettingsSection='general') {
  for(const id of ['assistant','sound','pinned','hover','shortcuts','smartTransparency','showPickerGuidance','showDivergences','showParameters','autoGreeting','showHelp'] as const) $<HTMLInputElement>(id).checked=prefs[id];
  $<HTMLInputElement>('opacity').value=String(prefs.opacity);$<HTMLInputElement>('divergenceOpacity').value=String(prefs.divergenceOpacity);$<HTMLSelectElement>('prefix').value=prefs.prefix;
  $<HTMLInputElement>('shortcuts').disabled=!native;$<HTMLSelectElement>('prefix').disabled=!native;
  if(!native) $('shortcut-description').textContent='Disponíveis no aplicativo Windows.';
  $<HTMLInputElement>('user-name').value=prefs.name;
  $('windows-name').textContent=systemName?`Nome do Windows: ${systemName}`:'O Windows não informou um nome de exibição. Você pode preencher acima.';
  $<HTMLSelectElement>('anchor').value=prefs.anchor;
  fillAgentForm();
  showSettingsSection(section);if(radialShown){if(radialRoute!=='settings'&&radialRoute!=='agent'){void radialAction('settings',section);return;}$<HTMLDialogElement>('preferences').show();}else $<HTMLDialogElement>('preferences').showModal();
}
async function boot() {
  const updateProbe=native?await invoke<boolean>('update_is_probe'):false;
  try {
    const saved=native?await invoke<Partial<Prefs>|null>('load_settings'):JSON.parse(localStorage.getItem('janus.preferences')||'null');
    if(saved && typeof saved==='object') {
      if(Array.isArray(saved.customCities))prefs.customCities=saved.customCities.filter(validCity).slice(0,50);
      catalog.splice(0,catalog.length,...mergeProjects(baseCatalog,prefs.customCities));
      if(typeof saved.name==='string')prefs.name=saved.name.slice(0,100);
      if(['top-right','top-left','bottom-left','bottom-right','custom'].includes(saved.anchor))prefs.anchor=saved.anchor;
      if(Number.isFinite(saved.position?.x)&&Number.isFinite(saved.position?.y))prefs.position=saved.position;
      if(typeof saved.geminiModel==='string')prefs.geminiModel=saved.geminiModel;
      if(saved.welcomeCache&&typeof saved.welcomeCache.key==='string'&&saved.welcomeCache.key.length<1000&&typeof saved.welcomeCache.text==='string'&&saved.welcomeCache.text.length<=180)prefs.welcomeCache={key:saved.welcomeCache.key,text:welcomeText(saved.welcomeCache.text)};
      if(typeof saved.welcomeAttempt==='string'&&saved.welcomeAttempt.length<1000)prefs.welcomeAttempt=saved.welcomeAttempt;
      if(Number.isFinite(saved.lastPosition?.x)&&Number.isFinite(saved.lastPosition?.y))prefs.lastPosition=saved.lastPosition;
      if(typeof saved.radialCompact==='boolean')prefs.radialCompact=saved.radialCompact;
      if(saved.bindings&&typeof saved.bindings==='object')for(const c of catalog){const entries=saved.bindings[c.id];if(entries&&typeof entries==='object')prefs.bindings[c.id]=Object.fromEntries(Object.entries(entries).filter(([key,value])=>key.startsWith('category:')&&c.items.some(i=>'category:'+i.category===key)&&typeof value==='string'&&value.length<80) as [string,string][]);}
      for(const k of ['assistant','sound','pinned','hover','shortcuts','smartTransparency','showPickerGuidance','showDivergences','showParameters','autoGreeting','showHelp'] as const) if(typeof saved[k]==='boolean') prefs[k]=saved[k];
      if(!saved.settingsVersion)prefs.sound=true;if(!saved.settingsVersion||saved.settingsVersion<11)prefs.hover=true;
      if(catalog.some(c=>c.id===saved.city))prefs.city=saved.city;
      if(['Control+Shift','Alt+Shift'].includes(saved.prefix))prefs.prefix=saved.prefix;
      if(Number.isFinite(saved.opacity))prefs.opacity=Math.max(0,Math.min(100,saved.opacity));
      if(Number.isFinite(saved.divergenceOpacity))prefs.divergenceOpacity=Math.max(0,Math.min(100,saved.divergenceOpacity));
      if(saved.copyMode==='copy'||saved.copyMode==='paste')prefs.copyMode=saved.copyMode;
    }
  }catch{toast('Preferências não puderam ser lidas. Usando os padrões.',true);}
  if(updateProbe){prefs.sound=false;prefs.autoGreeting=false;}
  if(native&&!updateProbe)systemName=await invoke<string>('display_name').catch(()=>'');
  if(!catalog.some(c=>c.id===prefs.city))prefs.city=catalog[0]?.id||'';
  refreshCities();
  setupEnhancements();setupHelp();setupSettingsNavigation();
  setInterval(refreshGreeting,60000);
  setCity();applyLook();updateCopyMode();
  $('city').onchange=()=>{Sound.play('project');prefs.city=$<HTMLSelectElement>('city').value;setCity();void configureKeys();save();};
  $('search').oninput=()=>{query=$<HTMLInputElement>('search').value;renderList();};
  $('copy-mode').onclick=()=>{Sound.play('toggle');prefs.copyMode=prefs.copyMode==='paste'?'copy':'paste';updateCopyMode();renderList();save();};
  $('category').onchange=()=>{category=$<HTMLSelectElement>('category').value;renderList();};
  $('all').onclick=()=>{Sound.play('navigate');showPage('divergences');};$('parameters-tab').onclick=()=>{Sound.play('navigate');showPage('parameters');};$('plugins-tab').onclick=()=>{Sound.play('navigate');showPage('plugins');};$('plugins-back').onclick=()=>{if(radialLayout)void showRadial(false);else showPage('divergences');};$('close-search').onclick=closeSearch;$('radial-return').onclick=()=>{document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());void showRadial(false);};
  $('settings').onclick=()=>{Sound.play('navigate');openSettings();};$('about').onclick=()=>$<HTMLDialogElement>('info').showModal();
  document.querySelectorAll<HTMLButtonElement>('.dismiss').forEach(b=>b.onclick=()=>{const dialog=b.closest('dialog')!;dialog.close();if(radialShown&&dialog.id==='preferences')void showRadial(false);});
  $('collapse').onclick=()=>{if(radialShown&&native)void getCurrentWindow().minimize();else void setCompact(true);};$('expand').onclick=()=>void setCompact(false);
  $('close').onclick=()=>{if(native)void saveChain.then(()=>getCurrentWindow().close());else toast('No aplicativo Windows, este botão encerra o Janus.');};
  const pin=async()=>{if(native){await getCurrentWindow().setAlwaysOnTop(prefs.pinned);if(radialShown&&prefs.pinned)await dock(true);}applyLook();save();};
  $('pin').onclick=()=>{prefs.pinned=!prefs.pinned;Sound.play(prefs.pinned?'pin':'unpin');engine.triggerEmote('wink');void pin().catch(()=>toast('Não foi possível fixar o painel.',true));};
  for(const id of ['assistant','sound','pinned','hover','smartTransparency'] as const) $(id).onchange=()=>{prefs[id]=$<HTMLInputElement>(id).checked;if(id==='pinned')void pin().catch(()=>toast('Não foi possível fixar o painel.',true));else{if(id==='hover'&&!prefs.hover&&!radialShown&&compact)void setCompact(false);applyLook();if(id==='sound'&&prefs.sound)Sound.play('connected');save();}};
  for(const id of ['showDivergences','showParameters'] as const)$(id).onchange=()=>{prefs[id]=$<HTMLInputElement>(id).checked;showPage(activePage);save();};
  $('showPickerGuidance').onchange=()=>{prefs.showPickerGuidance=$<HTMLInputElement>('showPickerGuidance').checked;save();};
  $('opacity').oninput=()=>{prefs.opacity=Number($<HTMLInputElement>('opacity').value);applyLook();};$('opacity').onchange=save;
  $('divergenceOpacity').oninput=()=>{prefs.divergenceOpacity=Number($<HTMLInputElement>('divergenceOpacity').value);applyLook();};$('divergenceOpacity').onchange=save;
  $('showHelp').onchange=()=>{prefs.showHelp=$<HTMLInputElement>('showHelp').checked;applyHelp();save();};
  $('autoGreeting').onchange=()=>{prefs.autoGreeting=$<HTMLInputElement>('autoGreeting').checked;refreshGreeting();save();};
  for(const id of ['shortcuts','prefix']) $(id).onchange=async()=>{prefs.shortcuts=$<HTMLInputElement>('shortcuts').checked;prefs.prefix=$<HTMLSelectElement>('prefix').value;await configureKeys();save();};
  let lastHeaderPress={time:0,x:0,y:0};
  $('dragbar').onpointerdown=e=>{
    if(!native||e.button!==0||(e.target as HTMLElement).closest('button,.brand'))return;
    const now=performance.now(),doubleClick=now-lastHeaderPress.time<400&&Math.hypot(e.screenX-lastHeaderPress.x,e.screenY-lastHeaderPress.y)<6;
    lastHeaderPress={time:now,x:e.screenX,y:e.screenY};
    if(doubleClick){lastHeaderPress.time=0;void dock(true);}else void getCurrentWindow().startDragging();
  };
  const projectTools=document.createElement('div');projectTools.className='project-tools';projectTools.append($('plugins-tab'),$('settings'));document.querySelector('.tabs')!.append(projectTools);
  window.addEventListener('janus-plugin-imported',()=>{Sound.play('plugin');engine.triggerEmote('celebrate');});
  setupFreeDragging();
  $('dragbar').ondblclick=e=>{if(!native&&!(e.target as HTMLElement).closest('button'))void dock(true);};
  $('mascot').onclick=()=>{if(aiConnected)void openChat();else{engine.slap();Sound.play('slap');}};
  let curiosityTimer=0;$('mascot').onmouseenter=()=>{engine.triggerEmote('love');clearTimeout(curiosityTimer);curiosityTimer=window.setTimeout(()=>{engine.triggerEmote('curious');Sound.play('curious');},2200);};$('mascot').onmouseleave=()=>clearTimeout(curiosityTimer);
  const pointAt=(x:number,y:number)=>{const box=$('mascot').getBoundingClientRect();lookTarget={x:Math.tanh((x-box.x-box.width/2)/300),y:Math.tanh((y-box.y-box.height/2)/300)};};
  if(native)await listen<[number,number]>('janus-cursor',({payload})=>pointAt(payload[0],payload[1]));
  else document.addEventListener('pointermove',e=>pointAt(e.clientX,e.clientY));
  let foldTimer=0;
  root.onmouseenter=()=>{clearTimeout(foldTimer);if((compact||radialFolding)&&(radialShown||prefs.hover))void setCompact(false);};
  root.onmouseleave=()=>{if((radialShown||prefs.hover)&&(!radialShown||radialRoute==='home')&&!compact&&!chatOpen&&!pickerActive&&!document.querySelector('dialog[open]'))foldTimer=window.setTimeout(()=>void setCompact(true),180);};
  document.addEventListener('visibilitychange',()=>{applyLook();});
  document.addEventListener('keydown',e=>{
    if(!native&&e.ctrlKey&&e.shiftKey&&/^Digit[0-9]$/.test(e.code)){const number=Number(e.code.slice(5)),group=groups()[number===0?9:number-1];if(group){e.preventDefault();void requestCategory(group.name);return;}}
    if(!native&&e.ctrlKey&&e.shiftKey&&e.code==='KeyD'){e.preventDefault();void togglePanel();return;}
    if(radialShown&&e.key==='Escape'&&document.querySelector('dialog[open]')){e.preventDefault();document.querySelector<HTMLDialogElement>('dialog[open]')!.close();if(radialRoute==='settings'||radialRoute==='agent')void showRadial(false);return;}
    if(radialKeys(e))return;
    if(e.ctrlKey&&e.shiftKey&&e.code==='Space'){e.preventDefault();void openChat();return;}
    if(!native&&e.ctrlKey&&e.shiftKey&&e.code==='KeyD'){e.preventDefault();void togglePanel();return;}
    if(!native&&e.ctrlKey&&e.shiftKey&&/^Digit[0-9]$/.test(e.code)){e.preventDefault();const n=Number(e.code.slice(-1));const g=groups()[n===0?9:n-1];if(g&&!e.repeat)void requestCategory(g.name);return;}
    if(e.key==='Escape'&&chatOpen){e.preventDefault();void closeChat();return;}
    if(e.ctrlKey&&e.key.toLowerCase()==='f'){e.preventDefault();if(e.shiftKey)void openSearch();return;}
    if(e.key==='Escape'&&!$('search-panel').hidden&&!document.querySelector('dialog[open]')){e.preventDefault();closeSearch();return;}
    if(e.key==='Escape'&&!document.querySelector('dialog[open]'))void setCompact(!compact);
  });
  if(native&&!updateProbe) {
    await getCurrentWindow().setAlwaysOnTop(prefs.pinned);
    await listen<string>('janus-shortcut',async({payload:id})=>{
      if(id==='__open'){await togglePanel();return;}
      if(id==='__chat'){await openChat();return;}
      if(id==='__search'){await openSearch();return;}
      const group=groups().find((g:any)=>g.id===id);
      if(group)await requestCategory(group.name);
    });
    await dock(false);
    await getCurrentWindow().onMoved(({payload:p})=>{if(movingProgrammatically)return;clearTimeout(moveTimer);moveTimer=window.setTimeout(()=>{prefs.lastPosition={x:p.x,y:p.y};save();},200);});
    await getCurrentWindow().onScaleChanged(()=>{if(radialShown&&radialFrame)void sizeRadial(radialFrame,true);});
  }
  if(!updateProbe)setupAI();
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{if((e.ctrlKey&&['p','s'].includes(e.key.toLowerCase()))||e.key==='F7')e.preventDefault();});
  void setupLogo($<HTMLCanvasElement>('logo')).catch(()=>toast('Não foi possível carregar a animação.',true));
  $('logo').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('logo').click();}};
  if(!updateProbe)await configureKeys();applyLook();engine.greet();if(!updateProbe){Sound.setup();Sound.play('wave');save();}
  if(updateProbe)await invoke('update_healthy');else{await setupPluginsPage($('plugins-content'),native,changePlugin);const fontContainer=document.createElement('div');fontContainer.id='font-plugin-card';$('plugins-content').after(fontContainer);const pluginNote=document.createElement('small');pluginNote.className='plugins-note plugins-footer-note';pluginNote.textContent='Arquivos JSON de layout compatíveis. A ativação independe do projeto.';fontContainer.after(pluginNote);await setupFontPlugin(fontContainer,native,enabled=>{$('settings-fonts-tab').hidden=!enabled;if(!enabled&&$('settings-fonts-tab').getAttribute('aria-selected')==='true')showSettingsSection('general');});if(!radialLayout&&prefs.hover)await setCompact(true);if(native)await getCurrentWindow().show();void setupUpdater(native,async()=>{save();await saveChain;});}
}
function validCity(value:any):value is City {return validProject(value);}
function updateCopyMode(){const copying=prefs.copyMode==='copy';$('copy-mode').setAttribute('aria-checked',String(!copying));$('copy-mode').setAttribute('aria-label',copying?'Apenas copiar. Alternar para colar.':'Copiar e colar. Alternar para apenas copiar.');$('copy-mode').title=copying?'Disquete · Apenas copia o texto para a área de transferência (Ctrl + C). Clique para colar.':'Prancheta · Copia e cola o texto no aplicativo anterior (Ctrl + V). Clique para apenas copiar.';}
function refreshCities(){const select=$<HTMLSelectElement>('city');select.replaceChildren();catalog.forEach(c=>select.add(new Option(projectLabel(c.name),c.id)));if(!catalog.length)select.add(new Option('Nenhum projeto cadastrado',''));select.disabled=!catalog.length;$<HTMLButtonElement>('edit-city').disabled=!catalog.length;}
let shortcutItem:Item|null=null;
let pendingShortcut='';
function editShortcut(item:Item){
  shortcutItem=item;pendingShortcut=itemShortcut(item);
  $('key-description').textContent=item.category;$<HTMLInputElement>('key-capture').value=shortcutText(pendingShortcut);$('key-error').textContent='';
  $<HTMLDialogElement>('shortcut-editor').showModal();$('key-capture').focus();
}
let draftItems:{category:string;text:string;page?:number;include:boolean}[]=[];
let draftDocumentText='';let editingProjectId:string|null=null;let draftGuidance:Guidance={parameters:[],notes:{}};
let draftPages:string[]=[];let draftSource='Cadastro manual';let pdfBusy=false;let pdfFailed=false;
function openProjectEditor(edit:boolean){
 edit=edit&&catalog.length>0;const current=edit?city():null;editingProjectId=current?.id||null;pdfFailed=false;draftPages=[];draftDocumentText=current?.documentText||'';draftSource=current?.source||'Cadastro manual';
 draftItems=current?current.items.map(i=>({...i,include:true})):[];
 draftGuidance=structuredClone(current?guidanceForCity():{parameters:parameterTitles.map((title:string)=>({title,text:''})),notes:{}});
 $('project-editor-eyebrow').textContent=edit?'EDITAR PROJETO':'NOVO PROJETO';$('project-editor-title').textContent=edit?'Editar projeto':'Adicionar projeto';$('save-city').textContent=edit?'Salvar alterações':'Salvar e ativar projeto';
 $<HTMLInputElement>('city-name').value=current?.name||'';$<HTMLInputElement>('project-source').value=draftSource;$<HTMLInputElement>('city-pdf').value='';
 $('current-project-pdf').textContent=current?`Base atual: ${current.source}. Para substituir, selecione outro PDF abaixo.`:'Você pode começar pelo PDF ou cadastrar os dados manualmente.';
 $('import-error').textContent='';$('pdf-source').textContent=draftDocumentText;$('read-progress').textContent='';renderDraft();renderGuidanceEditor();$<HTMLDialogElement>('city-editor').showModal();
}
function renderGuidanceEditor(){
 const parameters=$('project-parameters');parameters.replaceChildren();
 draftGuidance.parameters.forEach((section,index)=>{const row=document.createElement('div');row.className='editor-parameter';const title=document.createElement('input');title.value=section.title;title.maxLength=200;title.setAttribute('aria-label',`Título do parâmetro ${index+1}`);title.oninput=()=>section.title=title.value;const text=document.createElement('textarea');text.value=section.text;text.rows=5;text.maxLength=50000;text.setAttribute('aria-label',`Conteúdo do parâmetro ${index+1}`);text.oninput=()=>section.text=text.value;const remove=document.createElement('button');remove.textContent='Remover parâmetro';remove.onclick=()=>{draftGuidance.parameters.splice(index,1);renderGuidanceEditor();};row.append(title,text,remove);parameters.append(row);});
 const notes=$('project-notes');notes.replaceChildren();
 const names=[...new Set(draftItems.filter(i=>i.include).map(i=>i.category.trim()).filter(Boolean))];
 for(const name of names){const label=document.createElement('label');label.className='editor-note';const heading=document.createElement('span');heading.textContent=name;const text=document.createElement('textarea');text.value=findGuidanceNote(draftGuidance.notes,name)||'';text.rows=4;text.maxLength=20000;text.placeholder='Orientações desta divergência';text.oninput=()=>draftGuidance.notes[normalize(name)]=text.value;label.append(heading,text);notes.append(label);}
 if(!names.length)notes.textContent='Cadastre as divergências para editar as orientações de cada categoria.';
}
function renderDraft(){
  const container=$('city-draft');container.replaceChildren();
  $('import-summary').textContent=`${draftItems.length} texto(s) para revisar. Edite ou desmarque os que não forem divergências.`;
  draftItems.forEach((item,index)=>{
    const row=document.createElement('div');row.className='draft-row';
    const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=item.include;
    check.onchange=()=>item.include=check.checked;label.append(check,document.createTextNode(` Incluir texto ${index+1}${item.page?' · página '+item.page:''}`));
    const categoryInput=document.createElement('input');categoryInput.value=item.category;categoryInput.placeholder='Categoria';categoryInput.maxLength=120;categoryInput.setAttribute('aria-label',`Categoria do texto ${index+1}`);categoryInput.oninput=()=>item.category=categoryInput.value;
    const text=document.createElement('textarea');text.value=item.text;text.rows=3;text.maxLength=4000;text.setAttribute('aria-label',`Descrição do texto ${index+1}`);text.oninput=()=>item.text=text.value;
    row.append(label,categoryInput,text);container.append(row);
  });
}
function setupEnhancements(){
  $('user-name').oninput=()=>{prefs.name=$<HTMLInputElement>('user-name').value;refreshGreeting();save();};
  $('anchor').onchange=async()=>{prefs.anchor=$<HTMLSelectElement>('anchor').value;if(radialLayout){radialView?.destroy();radialView=new RadialView(root,radialLayout,prefs.anchor.endsWith('left'),connectedAgent?agentLabel(connectedAgent):'Agente IA');if(radialRoute==='home')await showRadial(compact);else await radialAction(radialRoute);}await dock();save();};
  $('remember-position').onclick=async()=>{if(!native){toast('Disponível no aplicativo Windows.');return;}const p=await getCurrentWindow().outerPosition();prefs.position={x:p.x,y:p.y};prefs.anchor='custom';$<HTMLSelectElement>('anchor').value='custom';save();toast('Posição atual guardada.');};
  $('go-home').onclick=()=>void dock(true);
  $('city-guide').onclick=()=>{$('guide-title').textContent=projectLabel(city().name);$('guide-content').textContent=city().documentText||'';$<HTMLDialogElement>('guide').showModal();};
  $('key-capture').onkeydown=e=>{
    if(e.key==='Escape'||e.key==='Tab')return;e.preventDefault();
    try{const key=shortcutFromEvent(e);if(key){pendingShortcut=key;$<HTMLInputElement>('key-capture').value=shortcutText(key);$('key-error').textContent='';}}catch(err){$('key-error').textContent=(err as Error).message;}
  };
  $('clear-key').onclick=()=>{pendingShortcut='';$<HTMLInputElement>('key-capture').value='Sem atalho';};
  $('default-key').onclick=()=>{if(shortcutItem){pendingShortcut=categoryShortcut(groups().findIndex((g:any)=>g.name===shortcutItem!.category),prefs.prefix);$<HTMLInputElement>('key-capture').value=shortcutText(pendingShortcut);}};
  $('save-key').onclick=async()=>{
    if(!shortcutItem)return;
    if(pendingShortcut && (['Control+Shift+D','Control+Shift+Space','Control+Shift+F'].includes(canonicalShortcut(pendingShortcut))||groups().some((g:any)=>g.name!==shortcutItem!.category&&canonicalShortcut(groupShortcut(g.name))===canonicalShortcut(pendingShortcut)))){$('key-error').textContent='Esta combinação já está atribuída no Janus. Escolha outra.';return;}
    prefs.bindings[prefs.city]??={};prefs.bindings[prefs.city]['category:'+shortcutItem.category]=pendingShortcut;
    await configureKeys();save();renderList();$<HTMLDialogElement>('shortcut-editor').close();
  };
  $('add-city').onclick=()=>openProjectEditor(false);$('edit-city').onclick=()=>openProjectEditor(true);
  $('refresh-project-notes').onclick=renderGuidanceEditor;
  $('add-project-parameter').onclick=()=>{if(draftGuidance.parameters.length>=100)return;draftGuidance.parameters.push({title:'Novo parâmetro',text:''});renderGuidanceEditor();};
  $('add-text').onclick=()=>{if(draftItems.length>=500)return;draftItems.push({category:'',text:'',include:true});renderDraft();};
  $('city-pdf').onchange=async()=>{
    const file=$<HTMLInputElement>('city-pdf').files?.[0];if(!file)return;
    pdfBusy=true;pdfFailed=false;$('import-error').textContent='';$('read-progress').textContent='Lendo o PDF neste computador…';$<HTMLButtonElement>('save-city').disabled=true;
    $<HTMLInputElement>('city-pdf').disabled=true;$<HTMLButtonElement>('add-text').disabled=true;
    try {
      draftPages=await readPdf(file);draftSource=file.name;
      draftItems=parseDivergencePages(draftPages).map((i:any)=>({...i,include:true}));draftGuidance=parseGuidance(draftPages);draftDocumentText=draftPages.join('\n\n').slice(0,500000);$<HTMLInputElement>('project-source').value=draftSource;renderGuidanceEditor();
      $('pdf-source').textContent=draftPages.map((p,i)=>`PÁGINA ${i+1}\n${p}`).join('\n\n');renderDraft();
      $('read-progress').textContent=`${draftPages.length} página(s) lida(s) localmente. Revise os textos abaixo.`;
      if(!draftItems.length)$('import-error').textContent='Não reconheci um projeto com divergências numeradas. Consulte o texto extraído e adicione as divergências manualmente.';
    }catch(e){pdfFailed=true;draftItems=[];draftPages=[];renderDraft();$('pdf-source').textContent='';$('import-error').textContent=(e as Error).message;$('read-progress').textContent='Importação não concluída.';}
    finally{pdfBusy=false;$<HTMLButtonElement>('save-city').disabled=false;$<HTMLInputElement>('city-pdf').disabled=false;$<HTMLButtonElement>('add-text').disabled=false;}
  };
  $('manual-city').onclick=()=>{if(pdfBusy)return;pdfFailed=false;draftPages=[];draftDocumentText='';draftItems=[];draftSource='Cadastro manual';draftGuidance={parameters:parameterTitles.map((title:string)=>({title,text:''})),notes:{}};renderGuidanceEditor();$<HTMLInputElement>('project-source').value=draftSource;$<HTMLInputElement>('city-pdf').value='';$('pdf-source').textContent='';$('import-error').textContent='';$('read-progress').textContent='Cadastro manual selecionado.';renderDraft();};
  $('save-city').onclick=async()=>{
    if(pdfBusy)return;
    const name=$<HTMLInputElement>('city-name').value.trim();const included=draftItems.filter(i=>i.include);
    if(!name){$('import-error').textContent='Informe o nome do projeto.';return;}
    if(catalog.some(c=>c.id!==editingProjectId&&c.name.toLocaleLowerCase()===name.toLocaleLowerCase())){$('import-error').textContent='Já existe um projeto com este nome. Use um nome que identifique este projeto.';return;}
    if(draftGuidance.parameters.some(p=>p.text.trim()&&!p.title.trim())){$('import-error').textContent='Informe um título para cada parâmetro preenchido.';return;}
    if(pdfFailed){$('import-error').textContent='Escolha outro PDF ou selecione cadastro manual.';return;}
    if(included.some(i=>!i.category.trim()||!i.text.trim())){$('import-error').textContent='Preencha categoria e descrição dos textos incluídos.';return;}
    if(draftPages.length&&!included.length){$('import-error').textContent='Inclua ao menos uma divergência revisada antes de ativar o PDF.';return;}
    if(!editingProjectId&&prefs.customCities.length>=50){$('import-error').textContent='Limite de 50 projetos pessoais atingido.';return;}
    const entry:City={id:editingProjectId||crypto.randomUUID(),name,source:$<HTMLInputElement>('project-source').value.trim()||draftSource,items:included.map((i,index)=>({key:'custom-'+index,category:i.category.trim(),text:i.text.trim()})),documentText:draftDocumentText,guidance:structuredClone(draftGuidance)};
    if(!validCity(entry)){$('import-error').textContent='Revise os dados: algum campo excede os limites do projeto.';return;}
    prefs.customCities=prefs.customCities.filter(c=>c.id!==entry.id);prefs.customCities.push(entry);const existing=catalog.findIndex(c=>c.id===entry.id);if(existing>=0)catalog[existing]=entry;else catalog.push(entry);guidanceCache.delete(entry.id);prefs.city=entry.id;
    refreshCities();setCity();await configureKeys();save();$<HTMLDialogElement>('city-editor').close();toast(`${name}: projeto ${editingProjectId?'atualizado':'ativado'} com ${categoryGroups(entry.items).length} divergências.`);
  };
  $('city-editor').addEventListener('cancel',e=>{if(pdfBusy)e.preventDefault();});
  $('close-city').onclick=()=>{if(!pdfBusy)$<HTMLDialogElement>('city-editor').close();};
}


let pickerReturnCompact=false,pickerActive=false,pickerIndex=0,pickerItems:Item[]=[],pickerName='';let categoryQueue=Promise.resolve();
function requestCategory(name:string){categoryQueue=categoryQueue.then(()=>openCategory(name)).catch(()=>toast('Não foi possível abrir a divergência.',true));return categoryQueue;}
async function togglePanel(){
  if(chatOpen)await closeChat();
  if(radialLayout){if(pdfBusy){toast('Aguarde a leitura do PDF.');return;}if(pickerActive)await closeCategory();document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());await showRadial(radialShown?!compact:false);if(native){await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}return;}
  if(native&&await getCurrentWindow().isMinimized()){await getCurrentWindow().unminimize();await setCompact(false);await getCurrentWindow().setFocus();return;}
  if(pdfBusy){toast('Aguarde a leitura do PDF.');return;}
  if(pickerActive){await closeCategory();await setCompact(true);return;}
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());
  await setCompact(!compact);
  if(!compact){if(native){await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}$('all').focus();}
}
async function closeCategory(){
  if(radialPicker){pickerActive=false;pickerName='';radialPicker=false;root.classList.remove('picking');if(pickerReturnRadial)await showRadial(pickerReturnCompact);else{await leaveRadial();await setCompact(pickerReturnCompact);}renderList();return;}
  $<HTMLDialogElement>('category-picker').close();pickerActive=false;pickerName='';root.classList.remove('picking');await setCompact(pickerReturnCompact);renderList();
}
async function openCategory(name:string){
  $<HTMLDialogElement>('guidance-menu').close();const action=pickerAction(pickerActive?pickerName:'',name);if(action==='close'){await closeCategory();return;}
  if(!pickerActive&&document.querySelector('dialog[open]'))return;
  if(chatOpen)await closeChat();
  Sound.play('open');if(!pickerActive){pickerReturnCompact=compact;pickerReturnRadial=radialShown;}pickerActive=true;pickerName=name;pickerItems=city().items.filter(i=>i.category===name);pickerIndex=0;
  root.classList.add('picking');$('picker-title').textContent=`${groups().findIndex((g:any)=>g.name===name)+1}. ${name}`;
  if(radialLayout&&radialView){radialShown=true;radialPicker=true;compact=false;root.classList.add('radial-mode');root.classList.remove('compact');paintRadialPicker(true);await radialSizing;if(native){await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}return;}
  const list=$('picker-options');list.replaceChildren();const note=categoryNote(name);$('picker-guidance').replaceChildren(guidanceBody(note));
  refreshPickerGuidance();$('picker-action-hint').textContent=`↑ ↓ para escolher · Enter para ${prefs.copyMode==='paste'?'colar':'copiar'} · Esc para voltar`;
  pickerItems.forEach((item,index)=>{const button=document.createElement('button');button.textContent=directText(item.text);button.className='picker-option';button.setAttribute('role','option');button.onclick=()=>void pick(index);button.onfocus=()=>{pickerIndex=index;highlightPicker();};list.append(button);});
  if(native){await resizePicker();await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}
  if(!$<HTMLDialogElement>('category-picker').open)$<HTMLDialogElement>('category-picker').showModal();$<HTMLDialogElement>('category-picker').scrollTop=0;focusPicker();
}
function highlightPicker(){Array.from($('picker-options').children).forEach((e,i)=>e.setAttribute('aria-selected',String(i===pickerIndex)));}
function focusPicker(){highlightPicker();const list=$('picker-options'),option=list.children[pickerIndex] as HTMLElement;if(!option)return;option.focus({preventScroll:true});const top=option.offsetTop-list.offsetTop,bottom=top+option.offsetHeight;if(top<list.scrollTop)list.scrollTop=top;else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;}
async function pick(index:number){const item=pickerItems[index];await closeCategory();if(item)await choose(item);}
async function resizePicker(){if(!native||!pickerActive)return;await getCurrentWindow().setMinSize(null);await getCurrentWindow().setSize(new LogicalSize(420,Math.min(640,240+pickerItems.length*65+(prefs.showPickerGuidance?160:0))));}
function refreshPickerGuidance(){$('picker-guidance').hidden=!prefs.showPickerGuidance;$('toggle-picker-guidance').textContent=prefs.showPickerGuidance?'Ocultar orientações':'Mostrar orientações';$('toggle-picker-guidance').setAttribute('aria-expanded',String(prefs.showPickerGuidance));}
function setupPicker(){
 $('toggle-picker-guidance').onclick=()=>{prefs.showPickerGuidance=!prefs.showPickerGuidance;refreshPickerGuidance();void resizePicker().catch(()=>toast('Não foi possível ajustar o tamanho da janela.',true));save();};
 $('guidance-menu').onclick=e=>{if(e.target!==$('guidance-menu'))return;const b=$('guidance-menu').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$<HTMLDialogElement>('guidance-menu').close();};
 $('close-picker').onclick=()=>void closeCategory();
 $('category-picker').addEventListener('cancel',e=>{e.preventDefault();void closeCategory();});
 $('category-picker').onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();pickerIndex=(pickerIndex+(e.key==='ArrowDown'?1:-1)+pickerItems.length)%pickerItems.length;focusPicker();}else if(e.key==='Home'||e.key==='End'){e.preventDefault();pickerIndex=e.key==='Home'?0:pickerItems.length-1;focusPicker();}else if(e.key==='Enter'&&document.activeElement?.classList.contains('picker-option')){e.preventDefault();void pick(pickerIndex);}};
}
type AgentConfig={provider:string;baseUrl:string;model:string};
const providerDefaults:Record<string,string>={gemini:'https://generativelanguage.googleapis.com/v1beta',openai:'https://api.openai.com/v1',anthropic:'https://api.anthropic.com/v1',compatible:''};
let connectedAgent:AgentConfig|null=null,aiConnected=false,aiBusy=false,welcomeBusy=false,lastWelcomeAttempt='';
function fillAgentForm(){const config=connectedAgent||{provider:'gemini',baseUrl:providerDefaults.gemini,model:prefs.geminiModel};$<HTMLSelectElement>('agent-provider').value=config.provider;$<HTMLInputElement>('agent-url').value=config.baseUrl;$<HTMLInputElement>('agent-model').value=config.model;updateAgentForm();}
function updateAgentForm(){const provider=$<HTMLSelectElement>('agent-provider').value;$<HTMLInputElement>('agent-url').readOnly=provider!=='compatible';$('agent-format-help').textContent=provider==='compatible'?'Use a URL base antes de /chat/completions. Compatível com esse formato; APIs proprietárias podem exigir outro adaptador. HTTP é permitido apenas em localhost.':'Endereço oficial do provedor. Para usar outro endereço, escolha API compatível.';}
async function requestWelcome(){
 if(!native||!aiConnected||!connectedAgent||!prefs.autoGreeting||welcomeBusy||$<HTMLDialogElement>('preferences').open)return;
 const key=welcomeKey(connectedAgent,prefs.name||systemName,new Date());if(prefs.welcomeCache?.key===key||lastWelcomeAttempt===key||prefs.welcomeAttempt===key)return;
 lastWelcomeAttempt=key;prefs.welcomeAttempt=key;save();welcomeBusy=true;
 try{const now=new Date();const result=await invoke<string>('ai_ask',{question:'Crie uma recepção breve e acolhedora para este momento do dia.',context:JSON.stringify({nome:firstNames(prefs.name||systemName),hora:now.getHours(),minuto:now.getMinutes()}),legacyModel:prefs.geminiModel,welcome:true});const text=welcomeText(result);if(text&&connectedAgent&&prefs.autoGreeting&&welcomeKey(connectedAgent,prefs.name||systemName,new Date())===key){prefs.welcomeCache={key,text};save();refreshGreeting();}}catch{/* Keep the local greeting and do not retry until the next hour. */}finally{welcomeBusy=false;}
}
function showAIState(){$('settings-agent-tab').textContent=connectedAgent?agentLabel(connectedAgent):'Agente IA';radialView?.setAgentName(connectedAgent?agentLabel(connectedAgent):'Agente IA');syncChatConnection();$('ai-badge').textContent=connectedAgent?agentLabel(connectedAgent):'Local';$('open-ai').title=connectedAgent?`${connectedAgent.provider} · ${connectedAgent.model}`:'Configurar agente IA';$('ai-status').textContent=aiConnected?'Conectado. Clique no rosto do Janus ou use Ctrl + Shift + Espaço para conversar.':'Nenhum agente conectado.';refreshGreeting();}
function setupAI(){
 setupPicker();
 $('agent-provider').onchange=()=>{const provider=$<HTMLSelectElement>('agent-provider').value;$<HTMLInputElement>('agent-url').value=providerDefaults[provider];$<HTMLInputElement>('agent-model').value=provider==='gemini'?prefs.geminiModel:'';$<HTMLInputElement>('agent-key').value='';updateAgentForm();};
 if(native)void invoke<AgentConfig|null>('ai_status',{legacyModel:prefs.geminiModel}).then(async config=>{connectedAgent=config;aiConnected=Boolean(config);showAIState();await configureKeys();}).catch(()=>showAIState());
 $('open-ai').onclick=()=>openSettings('agent');
 $('chat-connect').onclick=async()=>{await closeChat();openSettings('agent');};
 $('close-chat').onclick=()=>void closeChat();
 $('clear-chat').onclick=()=>{if(aiBusy)return;Sound.play('clear');engine.triggerEmote('happy');chatHistory.delete(prefs.city);renderConversation();};
 $('ai-question').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('ask-ai').click();}};
 $('connect-ai').onclick=async()=>{
  if(aiBusy)return;if(!native){$('ai-status').textContent='Conecte pelo aplicativo Windows.';return;}
  const key=$<HTMLInputElement>('agent-key').value.trim(),config:AgentConfig={provider:$<HTMLSelectElement>('agent-provider').value,baseUrl:$<HTMLInputElement>('agent-url').value.trim().replace(/\/$/,''),model:$<HTMLInputElement>('agent-model').value.trim()};
  if(!config.model||!config.baseUrl){$('ai-status').textContent='Preencha o endereço da API e o modelo.';return;}
  aiBusy=true;$<HTMLButtonElement>('connect-ai').disabled=true;$<HTMLButtonElement>('remove-ai').disabled=true;$('ai-status').textContent='Testando conexão com o provedor…';
  try{connectedAgent=await invoke<AgentConfig>('ai_connect',{key,config});if(config.provider==='gemini')prefs.geminiModel=config.model;lastWelcomeAttempt='';prefs.welcomeAttempt=undefined;prefs.welcomeCache=undefined;save();aiConnected=true;Sound.play('connected');engine.triggerEmote('wave');$<HTMLInputElement>('agent-key').value='';showAIState();await configureKeys();$<HTMLDialogElement>('preferences').close();await openChat();}catch(e){$('ai-status').textContent=String(e);}finally{aiBusy=false;$<HTMLButtonElement>('connect-ai').disabled=false;$<HTMLButtonElement>('remove-ai').disabled=false;}
 };
 $('remove-ai').onclick=async()=>{if(aiBusy)return;try{if(native)await invoke('ai_remove');aiConnected=false;connectedAgent=null;prefs.welcomeCache=undefined;save();$<HTMLInputElement>('agent-key').value='';await closeChat();showAIState();await configureKeys();}catch{$('ai-status').textContent='Não foi possível remover a chave. Tente novamente.';}};
 $('ask-ai').onclick=async()=>{
  if(aiBusy)return;if(!aiConnected){await closeChat();openSettings('agent');return;}const question=$<HTMLTextAreaElement>('ai-question').value.trim();if(!question)return;
  const history=conversation();
  const previous=history.filter(m=>m.role!=='error').slice(-12).map(m=>`${m.role==='user'?'Usuário':'Janus'}: ${m.text}`).join('\n').slice(-30000);
  const reference=$<HTMLInputElement>('ai-context').checked?{projeto:projectLabel(city().name),divergencias:city().items,parametros:guidanceForCity()}:undefined;
  const context=JSON.stringify({conversaAnterior:previous,referencia:reference});
  Sound.play('send');engine.setActivity('thinking');history.push({role:'user',text:question});$<HTMLTextAreaElement>('ai-question').value='';aiBusy=true;renderConversation();syncChatConnection();$('thinking').hidden=false;scrollConversation();
  try{const answer=await invoke<string>('ai_ask',{question,context,legacyModel:prefs.geminiModel,welcome:false});history.push({role:'assistant',text:answer});Sound.play('response');engine.triggerEmote('respond');}catch(e){Sound.play('error');engine.triggerEmote('concerned');history.push({role:'error',text:String(e)});}finally{aiBusy=false;engine.setActivity(chatOpen?'listening':'idle');$('thinking').hidden=true;renderConversation();syncChatConnection();$('ai-question').focus();}

 };
}

type ChatMessage={role:'user'|'assistant'|'error';text:string};
const chatHistory=new Map<string,ChatMessage[]>();
function conversation(){if(!chatHistory.has(prefs.city))chatHistory.set(prefs.city,[]);return chatHistory.get(prefs.city)!;}
function scrollConversation(){const log=$('chat-transcript');log.scrollTop=log.scrollHeight;}
function renderConversation(){const list=$('chat-messages');list.replaceChildren();for(const message of conversation()){const bubble=document.createElement('div');bubble.className=`chat-message chat-message-${message.role}`;const label=document.createElement('span');label.className='chat-author';label.textContent=message.role==='user'?'Você':message.role==='error'?'Não foi possível responder':'Janus';const text=document.createElement('p');text.textContent=message.text;bubble.append(label,text);list.append(bubble);}$('chat-welcome').hidden=conversation().length>0;$<HTMLButtonElement>('clear-chat').disabled=aiBusy||!conversation().length;scrollConversation();}
let chatOpen=false,chatReturnCompact=false;
async function openChat(){
 if(radialShown&&radialRoute!=='agent'){await radialAction('agent');return;}
 if(pdfBusy){toast('Aguarde a leitura do PDF.');return;}
 if(pickerActive)await closeCategory();
 document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());
 if(chatOpen){if(native){await getCurrentWindow().show();await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}$('ai-question').focus();return;}
 chatReturnCompact=compact;chatOpen=true;root.classList.add('chatting');
 if(native){if(!radialShown){await getCurrentWindow().setMinSize(null);await getCurrentWindow().setSize(new LogicalSize(460,700));}await getCurrentWindow().show();await getCurrentWindow().unminimize();await getCurrentWindow().setFocus();}
 $('close-chat').textContent=radialShown?'← Menu circular':'← Voltar ao painel';$('close-chat').setAttribute('aria-label',radialShown?'Voltar ao menu circular':'Voltar ao painel');$('janus-chat').hidden=false;renderConversation();syncChatConnection();applyLook();engine.setActivity(aiBusy?'thinking':'listening');engine.triggerEmote('happy');Sound.play('question');$('ai-question').focus();
}
function syncChatConnection(){
 $('chat-connect').hidden=aiConnected;$('chat-disconnected').hidden=aiConnected;
 $<HTMLButtonElement>('ask-ai').disabled=!aiConnected||aiBusy;
}
async function closeChat(){if(!chatOpen)return;chatOpen=false;engine.setActivity(aiBusy?'thinking':'idle');$('janus-chat').hidden=true;root.classList.remove('chatting');Sound.play('close');if(radialShown)await showRadial(false);else await setCompact(chatReturnCompact);applyLook();}
root.querySelector('.shell')!.insertAdjacentHTML('beforeend',`<section id="janus-chat" class="janus-chat" hidden aria-label="Chat do Janus"><div class="chat-toolbar"><button id="close-chat" aria-label="Voltar ao painel">← Voltar ao painel</button><button id="clear-chat" title="Limpar conversa deste projeto">Limpar conversa</button></div><div class="chat-intro"><div class="speech-bubble"><strong>Converse com o Janus</strong><span>Uma ajuda para o seu projeto.</span></div></div><div id="chat-transcript" class="chat-transcript" role="log" aria-label="Conversa" aria-live="polite"><div id="chat-welcome" class="chat-welcome"><h3>Em que posso ajudar?</h3><p>Faça uma pergunta, peça uma explicação ou converse sobre o projeto.</p><p class="small">A conversa fica disponível enquanto o Janus estiver aberto.</p></div><p id="chat-disconnected" class="small">Conecte um agente IA nas configurações para enviar mensagens.</p><button id="chat-connect" class="connect-chat">Conectar agente IA</button><div id="chat-messages"></div><div id="thinking" class="thinking" role="status" aria-label="Janus está pensando" hidden><span></span><span></span><span></span></div></div><div class="chat-compose"><label class="field-label" for="ai-question">SUA MENSAGEM</label><textarea id="ai-question" rows="2" maxlength="10000" placeholder="Escreva sua mensagem…"></textarea><div class="chat-compose-actions"><small data-help>Enter envia · Shift + Enter pula linha</small><button class="primary" id="ask-ai">Enviar ↑</button></div></div><label class="chat-context"><input type="checkbox" id="ai-context"> Incluir divergências e parâmetros do projeto</label><p class="chat-privacy">Ao enviar, sua mensagem, as últimas mensagens da conversa e o conteúdo marcado vão para o provedor de IA conectado.</p><span class="app-version chat-version">Janus 1.0a.8</span></section>`);
root.insertAdjacentHTML('afterend',`
<dialog id="guidance-menu" aria-labelledby="guidance-title"><div class="dialog-top"><h2 id="guidance-title"></h2><button class="icon dismiss" aria-label="Fechar orientações da categoria">×</button></div><div id="guidance-content"></div></dialog>
<dialog id="category-picker"><div class="dialog-top"><span class="eyebrow">ESCOLHA A DIVERGÊNCIA</span><button id="close-picker" class="icon" aria-label="Fechar opções">×</button></div><h2 id="picker-title"></h2><button id="toggle-picker-guidance" class="picker-guidance-toggle" aria-controls="picker-guidance">Ocultar orientações</button><div id="picker-guidance"></div><p id="picker-action-hint" class="small" data-help>↑ ↓ para escolher · Enter para colar · Esc para voltar</p><div id="picker-options" role="listbox" aria-label="Opções da divergência"></div></dialog>

<dialog id="shortcut-editor"><div class="dialog-top"><span class="eyebrow">ATALHO DESTA CATEGORIA</span><button class="icon dismiss" aria-label="Fechar atalho">×</button></div><p id="key-description"></p><label class="field-label" for="key-capture">PRESSIONE A COMBINAÇÃO DE TECLAS</label><input id="key-capture" readonly placeholder="Ex.: Ctrl + Shift + 1"><p class="small">Use Ctrl ou Alt com uma letra, número ou tecla F1–F12. A cópia por botão continua disponível.</p><div class="position-buttons"><button id="clear-key">Sem atalho</button><button id="default-key">Usar padrão</button></div><p class="error" id="key-error" role="alert"></p><button class="primary" id="save-key">Salvar atalho</button></dialog>
<dialog id="city-editor"><div class="dialog-top"><span class="eyebrow" id="project-editor-eyebrow">NOVO PROJETO</span><button class="icon" id="close-city" aria-label="Fechar cadastro de projeto">×</button></div><h2 id="project-editor-title">Adicionar projeto</h2><label class="field-label" for="city-name">NOME DO PROJETO</label><input id="city-name" maxlength="100" placeholder="Nome do seu projeto"><label class="field-label" for="project-source">FONTE / DOCUMENTO DE REFERÊNCIA</label><input id="project-source" maxlength="200"><p class="small" id="current-project-pdf"></p><label class="field-label" for="city-pdf">PDF COM AS DIVERGÊNCIAS (OPCIONAL)</label><input id="city-pdf" type="file" accept="application/pdf,.pdf"><p class="small">O arquivo é lido localmente, sem IA. Escolher outro PDF substitui as sugestões, parâmetros e orientações deste rascunho. A alteração só é aplicada ao salvar. O Janus reconhece projetos com categorias numeradas. Revise antes de ativar. PDFs em imagem precisam de OCR.</p><p id="read-progress" role="status"></p><details><summary>Conferir o texto original extraído</summary><pre id="pdf-source"></pre></details><p id="import-summary" class="small"></p><div id="city-draft"></div><div class="position-buttons"><button id="add-text">+ Adicionar texto</button><button id="manual-city">Começar sem PDF</button></div><details class="editor-guidance"><summary>Editar parâmetros</summary><div id="project-parameters"></div><button id="add-project-parameter">+ Adicionar parâmetro</button></details><details class="editor-guidance"><summary>Editar orientações das divergências</summary><div id="project-notes"></div><button id="refresh-project-notes" type="button">Atualizar categorias das orientações</button></details><p id="import-error" class="error" role="alert"></p><button class="primary" id="save-city">Salvar e ativar projeto</button></dialog>
<dialog id="guide"><div class="dialog-top"><span class="eyebrow">ORIENTAÇÕES DO DOCUMENTO</span><button class="icon dismiss" aria-label="Fechar orientações">×</button></div><h2 id="guide-title"></h2><p class="small">Texto extraído do PDF fornecido. As orientações ficam disponíveis para consulta; não executam ações no sistema.</p><pre id="guide-content"></pre></dialog>`);
void boot().catch(async e=>{toast('Não foi possível iniciar todos os recursos. Reinicie o Janus.',true);console.error(e);if(native){try{if(!await invoke<boolean>('update_is_probe'))await getCurrentWindow().show();}catch{/* Preserve hidden updater probes. */}}});

