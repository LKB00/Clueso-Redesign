/* ---------- editor ----------
   Live's layout and visual design (web.clueso.io, checked 18 Oct 2026): logo menu, title, cloud, Video | Article; avatar,
   Help, Comments, Translate, Clueso AI, Share; an icon-only rail with names on hover; a panel; the canvas; a full-width bottom
   panel with the playback bar over the timeline. In Article view the rail becomes the formatting toolbar, as in live.
   Every visible control has a flow, matched to what live does (menus, panels, tools, dialogs). Kept improvements: the canvas
   takes the free space; the timeline's track is the scenes and marks an out-of-date voice; one Generate speech with a count;
   AI Rewrite asks what to rewrite and can be undone; Clueso AI knows the scene; every control has an accessible name.
   Loaded before app.js; uses its globals at call time. */

const ED_SCENES = {
  p1: [
    ["Hook", "Work is everywhere. Tasks live in chats, docs and sticky notes.", "0:07", false],
    ["Meet the product", "Meet Taskly: one home for every project, so your whole team can follow the plan.", "0:09", false],
    ["Create and assign", "Add a task in seconds. Give it an owner, a due date and a priority, so everyone knows who's doing what.", "0:11", true],
    ["Track progress", "As work moves forward, drag tasks from To Do to Done. The board updates live, so status meetings become optional.", "0:11", true],
    ["Stay in sync", "Comments and mentions keep conversations next to the work, and the dashboard flags what's overdue.", "0:12", true],
    ["Outro", "Less chasing, more doing. Try Taskly free and get your team on the same page.", "0:07", false],
  ],
};
// Live's rail, in live's order and with live's names. Select, Hand, Text and Shapes are tools (they change what a click on the
// canvas does); the rest open panels. Icons only; the name shows on hover and focus.
const ED_MODES = [["select", "Select", "agent", "V"], ["hand", "Hand tool", "hand", "H"]];
const ED_TOOLS = [["script", "Voiceover script", "mic"], ["media", "Media", "image"], ["text", "Text", "textT", "T"], ["shapes", "Shapes", "shapes", "R"], ["effects", "Effects", "fx"], ["animation", "Animation", "anim"], ["templates", "Template", "template"], ["transitions", "Transition", "transition"], ["captions", "Captions", "cc"]];
const ED_TOOLMODES = ["text", "shapes"];
const ED_SHAPES = [["Rectangle", "R"], ["Arrow", "⇧A"], ["Ellipse", "O"], ["Polygon", "P"], ["Line", "L"], ["Star", "⇧S"]];
const ED_SIZES = [["Original (1920×1080)", 16 / 9], ["Landscape 16:9", 16 / 9], ["Portrait 9:16", 9 / 16], ["Square 1:1", 1], ["Standard 4:3", 4 / 3], ["Portrait 3:4", 3 / 4], ["Portrait 4:5", 4 / 5]];
// A frame drawn in each ratio, so a size is recognised by its shape before its name is read (recognition over recall).
const edRatioIcon = ar => { const odd = v => 2 * Math.round((v - 1) / 2) + 1, big = 18; const w = ar >= 1 ? big : odd(big * ar), h = ar >= 1 ? odd(big / ar) : big; const x = 12 - w / 2, y = 12 - h / 2, r = 1;
  // Drawn like the product's own icons: 24-unit grid, 1-unit line on half-unit edges, round joins, 1-unit corners, the same muted colour.
  return `<svg class="ic edratio" width="1em" height="1em" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M${x + r} ${y}H${x + w - r}C${x + w - r + .5523} ${y} ${x + w} ${y + .4477} ${x + w} ${y + r}V${y + h - r}C${x + w} ${y + h - r + .5523} ${x + w - r + .5523} ${y + h} ${x + w - r} ${y + h}H${x + r}C${x + .4477} ${y + h} ${x} ${y + h - r + .5523} ${x} ${y + h - r}V${y + r}C${x} ${y + .4477} ${x + .4477} ${y} ${x + r} ${y}Z" stroke="currentColor" stroke-miterlimit="1.02018" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
const ED_ZOOMS = ["Fit", "50%", "100%", "200%"];
const ED_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const ED_FX = [["Blur", "Hides private details on screen"], ["Callout", "Labels a click with a short note"], ["Spotlight", "Dims everything but one area"], ["Zoom", "Moves in on each click"]];
const ED_TRANS = ["Circle wipe", "Rainbow wipe", "Corner wipe", "Color wipe", "Stack", "Dissolve", "Push & pull", "Fade to color", "Flip"];
const ED_CAPSTYLES = ["Basic", "Basic Karaoke", "Highlight Box", "Karaoke Highlight Box", "Color word", "Highlight word", "Paragraph builder", "Word-by-word"];
const ED_MEDIA = {
  project: [["Your recording", [["Screen recording", "t-ink"], ["Webcam", "t-plum"]]]],
  workspace: [["Saved in workspace", []]],
  stock: [["Music", [["Paralyzed", "m"], ["Bark Technology", "m"], ["Possible Light", "m"], ["Night Shift", "m"], ["Soft Focus", "m"], ["Daylight", "m"]]], ["Backgrounds", [["Serene gradient", "t-plum"], ["Pastel dream", "t-white"], ["Deep blue", "t-blue"], ["Midnight", "t-ink"], ["Dusk", "t-plum"], ["Paper", "t-white"]]], ["Abstract", [["Waves", "t-blue"], ["Grain", "t-ink"], ["Glow", "t-plum"], ["Lines", "t-white"]]], ["Montage", [["Team at work", "t-ink"], ["City", "t-blue"], ["Laptop", "t-white"], ["Office", "t-plum"]]]],
};
const ED_FILTERS = { src: ["All sources", "Pexels", "Uploaded"], type: ["All types", "Videos", "Images", "Music"], ratio: ["Any ratio", "16:9", "9:16", "1:1"] };
const ED_ANIMS = ["Logo reveal", "Counter", "Checklist", "Chart", "Progress bar", "Typing text"];
const ED_COMPONENTS = ["Lower third", "Logo bug", "Call to action", "Subscribe card"];
const ED_TEMPLATES = ["Product intro", "Clean outro", "Title card", "Chapter break"];
const ED_PROMPTS = [["Default", "Use \"you\". Plain, conversational, short sentences. No filler or rambling."], ["Faithful", "Keep the original steps and meaning. No intro or conclusion unless the recording has one. No step numbers."], ["Marketing", "Benefit first, energetic, ends with a call to action."]];
const ED_KEYS = { Playback: [["Play / Pause", "Space"], ["Step back 1 frame", ","], ["Step forward 1 frame", "."], ["Step back 1 second", "⇧ ,"], ["Step forward 1 second", "⇧ ."]], Tools: [["Select tool", "V"], ["Hand tool", "H"], ["Text tool", "T"], ["Rectangle tool", "R"], ["Exit tool / deselect", "Esc"]], Editing: [["Split clip at playhead", "X"], ["Undo", "⌘ Z"], ["Redo", "⌘ ⇧ Z"], ["Delete element", "⌫"], ["Nudge element", "← ↑ → ↓"]], Comments: [["Toggle comment mode", "C"]], Navigation: [["Toggle Clueso AI", "⌘ J"], ["Open command palette", "⌘ K"]] };
// Live's Editor preferences, grouped as live groups them.
const ED_PREFS = [["When a project opens", [["timeline", "Timeline expanded"], ["aiopen", "Clueso AI open"], ["inspector", "Inspector expanded"], ["scriptopen", "Voiceover script open"]]], ["When a left panel opens", "radio"], ["Timeline", [["seek", "Click to seek"], ["skim", "Skimming"], ["frames", "Show clip frames"], ["fullheight", "Full-height script"]]], ["Clueso AI", [["suggest", "Suggestions for the selection"]]]];
const ED_PREF_DEFAULT = { timeline: true, aiopen: false, inspector: true, scriptopen: true, keepcanvas: false, seek: true, skim: false, frames: true, fullheight: false, suggest: true };
let edPrefs = (() => { try { const v = JSON.parse(localStorage.getItem("clueso-proto-edprefs") || "null"); if (v && typeof v === "object") return { ...ED_PREF_DEFAULT, ...Object.fromEntries(Object.entries(v).filter(([k, x]) => k in ED_PREF_DEFAULT && typeof x === "boolean")) }; } catch (e) {} return { ...ED_PREF_DEFAULT }; })();
const edSavePrefs = () => { try { localStorage.setItem("clueso-proto-edprefs", JSON.stringify(edPrefs)); } catch (e) {} };

const secs = d => { const [m, s] = d.split(":").map(Number); return m * 60 + s; };
// Live's timecode: minutes, seconds and frames at 30 fps ("00:58:09f").
const edTC = n => { const f = Math.floor((n % 1) * 30 + 1e-6); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}:${String(f).padStart(2, "0")}f`; };
const mmss = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
const edScene = (name, text, dur, stale, voice = "Jessica", voiced) => ({ name, text, voiced: voiced ?? (stale ? "" : text), dur, stale, updating: false, voice, layers: [], fx: [], trans: "", bg: "", bgName: "" });
function edState(pid) {
  if (!S.ed || S.ed.pid !== pid) {
    const p = PROJECTS.find(x => x.id === pid) || PROJECTS[0];
    const base = ED_SCENES[pid] || ["Intro", "Step one", "Step two", "Wrap-up"].map((n, i) => [n, `${p ? p.name : "This video"}: ${n.toLowerCase()}.`, "0:08", i === 1]);
    S.ed = { pid, scene: 0, panel: edPrefs.scriptopen ? "script" : "", timeline: false, collapsed: !edPrefs.timeline, playing: false, t: 0, mode: "select", shape: "Rectangle", view: "video", saved: true, savedAt: Date.now(),
      loop: false, hires: true, speed: 1, size: ED_SIZES[0][0], zoom: "Fit", pan: [0, 0], q: "", replace: false, rwith: "", hist: [], fut: [], sel: null,
      tab: { media: "stock", animation: "lib", templates: "tpl", captions: "style" }, filt: { src: 0, type: 0, ratio: 0 }, more: {}, music: "Night Shift", capsOn: false, capStyle: "Basic",
      prompt: "Default", intro: "", outro: "", pick: "", savedTpl: [], recents: [], vh: false, vhView: null, art: null, renaming: false,
      scenes: base.map(([name, text, dur, stale], i) => { const t = i % 2 && text.includes(". ") ? text.replace(". ", ". {sync} ") : text; return edScene(name, t, secs(dur), stale, "Jessica", stale ? edOlder(t) : t); }) };
    if (edPrefs.aiopen) S.ai = true;
  }
  return S.ed;
}
const edTicks = T => { const step = T > 150 ? 30 : T > 70 ? 15 : 10; const out = []; for (let x = 0; x <= T; x += step) out.push(x); return out; };
const edTotal = e => e.scenes.reduce((a, s) => a + s.dur, 0);
const edStart = (e, i) => e.scenes.slice(0, i).reduce((a, s) => a + s.dur, 0);
const ED_TH = ["t-plum", "t-ink", "t-blue", "t-white", "t-plum", "t-ink", "t-blue"];
const edTh = (i, s) => (s && s.bg) || ED_TH[i % ED_TH.length];
const ED_VOICES = [["Jessica", "Warm, clear · English (US)"], ["Matt", "Calm, low · English (US)"], ["Aria", "Bright, quick · English (UK)"], ["Dev", "Friendly · English (India)"]];
// Undo and redo, as in Clueso's timeline bar: a snapshot of the scenes (with their layers, effects and transitions) before each change.
const edSnap = e => JSON.stringify(e.scenes.map(({ updating, ...x }) => x));
function edDo(e, f) { e.hist.push(edSnap(e)); if (e.hist.length > 50) e.hist.shift(); e.fut = []; f(); edDirty(e); }
function edDirty(e) { e.saved = false; clearTimeout(edDirty.t); edDirty.t = setTimeout(() => { e.saved = true; e.savedAt = Date.now(); const a = document.activeElement; if (route()[0] === "edit" && !edSlash && !(a && (a.isContentEditable || /INPUT|TEXTAREA/.test(a.tagName)))) edRender(); }, 600); }
function edUndo(e, redo) { const from = redo ? e.fut : e.hist, to = redo ? e.hist : e.fut; if (!from.length) return; to.push(edSnap(e)); e.scenes = JSON.parse(from.pop()).map(x => ({ ...x, updating: false })); e.scene = Math.min(e.scene, e.scenes.length - 1); e.sel = null; edRender(); toast(redo ? "Redone" : "Undone"); }
// Live marks words added since the voice was generated in blue (<ins>). Seeded scenes that need a new voice had their last clause added.
const edOlder = t => { const m = t.match(/^(.*?)(,[^,.]*\.|\.\s[^.]*\.)\s*$/); return m ? m[1] + "." : t.split(" ").slice(0, -4).join(" "); };
const ED_TOK = /\{(pause:[\d.]+|sync)\}/;
const edWords = t => (t || "").split(/\s+/).filter(Boolean);
// Word-level diff: which words of the script aren't in the voiced version (longest common subsequence).
function edInserted(voiced, text) { const a = edWords(voiced), b = edWords(text), n = a.length, m = b.length; const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1)); for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]); const ins = []; let i = 0, j = 0; while (j < m) { if (i < n && a[i] === b[j]) { ins.push(false); i++; j++; } else if (i < n && L[i + 1][j] >= L[i][j + 1]) i++; else { ins.push(true); j++; } } return { words: b, ins }; }
const edChip = tok => tok === "sync" ? `<span class="edtok sync" contenteditable="false" data-tok="sync" data-act="edchip" role="button" tabindex="-1" title="Sync point: the voice waits for this click in the recording"><i class="thumb t-ink"></i>Sync Point</span>` : `<span class="edtok pause" contenteditable="false" data-tok="${tok}" data-act="edchip" role="button" tabindex="-1" title="Pause">${icon("clock")}${tok.split(":")[1]}s</span>`;
function edScriptHTML(s, q) { const { words, ins } = edInserted(s.voiced, s.text); let out = "", open = false; words.forEach((w, k) => { const m = w.match(ED_TOK); const isIns = ins[k] && !m; if (isIns && !open) { out += "<ins>"; open = true; } if (!isIns && open) { out += "</ins>"; open = false; } const h = m ? edChip(m[1]) : esc(w); out += (q && !m ? edMark(h, q) : h) + " "; }); if (open) out += "</ins>"; return out.trim(); }
// Read a script box back to text: chips become their tokens.
function edReadText(el) { let t = ""; const walk = n => { n.childNodes.forEach(c => { if (c.nodeType === 3) t += c.textContent; else if (c.dataset && c.dataset.tok) t += ` {${c.dataset.tok}} `; else if (c.tagName === "BR") t += " "; else walk(c); }); }; walk(el); return t.replace(/\s+/g, " ").trim(); }
// Live's banner, reworded so it also explains the blue: shown only while some words aren't in the voiceover.
const edBanner = e => edStale(e) && e.view !== "guide" ? `<div class="edbanner" role="status"><span class="edbt"><i aria-hidden="true"></i>Blue text needs new speech</span><button class="btn" data-act="edvoiceall">Generate speech</button></div>` : "";
const edStale = e => e.scenes.filter(s => s.stale || s.text !== s.voiced).length;
const edCur = () => S.ed && S.ed.scenes[S.ed.scene];
// Re-render, then put focus back on the control that was used, so keyboard users keep their place.
function edRender(focusSel) { const a = document.activeElement; const key = focusSel || (a && a.dataset && a.dataset.act ? `[data-act="${a.dataset.act}"]${a.dataset.k ? `[data-k="${a.dataset.k}"]` : ""}${a.dataset.i ? `[data-i="${a.dataset.i}"]` : ""}` : null); render(); if (key) { let n = null; try { n = document.querySelector(".ed " + key) || document.querySelector(key); } catch (er) {} if (n) n.focus({ preventScroll: true }); } }

/* ---------- panels ---------- */
function edPanel(e) {
  const sc = e.scenes[e.scene], n = e.scene + 1;
  const head = t => `<div class="edph"><b>${t}</b><button class="iconbtn" data-act="edpanel" data-k="" aria-label="Close panel">${icon("close")}</button></div>`;
  const tabs = (key, list) => `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" aria-selected="${e.tab[key] === k}" class="${e.tab[key] === k ? "on" : ""}" data-act="edtab" data-k="${key}" data-i="${k}">${l}</button>`).join("")}</div>`;
  const tile = (label, cls, act, on = false) => `<button class="edtile ${on ? "on" : ""}" data-act="${act}" data-k="${esc(label)}" data-c="${cls}" aria-pressed="${on}"><span class="edthumb ${cls === "m" ? "music" : "thumb " + cls}">${cls === "m" ? icon("play") : ""}${on ? `<span class="edtick">${icon("check")}</span>` : ""}</span>${esc(label)}</button>`;
  if (e.panel === "script") { const q = (e.q || "").trim().toLowerCase(), st = edStale(e); return head("Voiceover script") + `<div class="edsrow"><label class="searchbox edsearch">${icon("search")}<input id="edq" type="search" placeholder="Search script" aria-label="Search script" value="${esc(e.q || "")}" autocomplete="off"></label><button class="iconbtn ${e.replace ? "on" : ""}" data-act="edreplace" aria-pressed="${e.replace}" aria-label="Find and replace" data-tip="Find and replace">${icon("replace")}</button></div>
    ${e.replace ? `<div class="edrep"><input id="edrw" placeholder="Replace with" aria-label="Replace with" value="${esc(e.rwith)}"><button class="btn" data-act="edrepdo" data-k="one" ${q ? "" : "disabled"}>Replace</button><button class="btn" data-act="edrepdo" data-k="all" ${q ? "" : "disabled"}>Replace all</button></div>` : ""}
    <div class="edscript">${e.scenes.map((s, i) => q && !(s.text.replace(/\{[^}]*\}/g, "") + " " + s.name).toLowerCase().includes(q) ? "" : `<section class="edsc ${i === e.scene ? "on" : ""}" aria-label="Scene ${i + 1}, ${esc(s.name)}">
      ${i ? `<button class="edins" data-act="edaddat" data-i="${i}" aria-label="Add a scene before scene ${i + 1}" data-tip="Add scene">${icon("plus")}</button>` : ""}
      <div class="edsch"><span class="edhgrp"><span class="edchip edname"><button data-act="edscene" data-i="${i}" aria-label="Go to scene ${i + 1}">${i + 1}</button><input class="edcname" data-ni="${i}" value="${esc(s.name)}" aria-label="Scene ${i + 1} name" maxlength="60" spellcheck="false"></span>
        <button class="edchip edvpill" data-act="edvoicemenu" data-i="${i}" aria-haspopup="menu" aria-label="Voice for scene ${i + 1}: ${s.voice}">${icon("micai")}<span class="trunc">${s.voice}</span><span class="bdg blue">V4</span></button></span>
        ${(() => { const need = s.stale || s.text !== s.voiced; return `<button class="iconbtn edsgen" data-act="edvoice" data-i="${i}" ${need && !s.updating ? "" : "disabled"} aria-label="${need ? `Generate speech for scene ${i + 1}` : `Scene ${i + 1} speech is up to date`}" data-tip="${need ? "Generate speech for this scene" : "Speech is up to date"}">${icon("wavegen")}</button>`; })()}
        <button class="iconbtn edcmenu" data-act="edclipmenu" data-i="${i}" aria-haspopup="menu" aria-label="Scene ${i + 1} actions" data-tip="Scene actions">${icon("dots")}</button></div>
      <div class="edtext" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Script for scene ${i + 1}" data-i="${i}" data-ph="Start typing or press &quot;/&quot; for commands…">${edScriptHTML(s, q)}</div>
      ${s.updating ? `<div class="edvoice"><span class="spin" aria-hidden="true"></span>Generating speech…</div>` : ""}
    </section>`).join("") || `<p class="edhint">No scene mentions “${esc(e.q)}”.</p>`}</div>
    <div class="edpf"><button class="iconbtn bord" data-act="edscriptmore" aria-haspopup="menu" aria-label="Transcript options" data-tip="More">${icon("dots")}</button><button class="iconbtn bord" data-act="edplus" aria-haspopup="menu" aria-label="Insert" data-tip="Insert">${icon("plus")}</button><span class="edsplit" role="group" aria-label="AI Rewrite"><button class="btn edrw" data-act="edrewrite" aria-haspopup="menu" data-tip="AI Rewrite">${icon("wand")}AI Rewrite</button><button class="iconbtn" data-act="edprompt" aria-haspopup="menu" aria-label="Prompt hub: ${e.prompt}" data-tip="Prompt hub: ${e.prompt}">${icon("sliders")}</button></span><span class="grow"></span>
      <button class="btn dark edgen" data-act="edvoiceall" aria-label="Generate speech${st ? ` for ${st} ${st === 1 ? "scene" : "scenes"} with blue words` : ""}">${icon("wave")}Generate speech</button></div>`; }
  if (e.panel === "media") { const tb = e.tab.media; return head("Media") + tabs("media", [["project", "In this project"], ["workspace", "Saved in workspace"], ["stock", "Stock"]]) + `<div class="edfilters">${Object.entries(ED_FILTERS).map(([k, list]) => `<button class="pill ${e.filt[k] ? "on" : ""}" data-act="edfilter" data-k="${k}" aria-haspopup="menu">${list[e.filt[k]]}${icon("chevDown")}</button>`).join("")}</div>
    ${ED_MEDIA[tb].map(([title, items]) => { if (!items.length) return `<div class="edempty">${icon("folder")}<b>Nothing saved yet</b><span>Media you save from any project shows up here, for the whole workspace.</span></div>`; const ty = ED_FILTERS.type[e.filt.type]; const shown = items.filter(([, c]) => ty === "All types" || (ty === "Music" ? c === "m" : ty === "Images" ? c !== "m" && title !== "Montage" : c !== "m" && (title === "Montage" || title === "Your recording"))); if (!shown.length) return ""; const open = e.more[title]; const list = open ? shown : shown.slice(0, 4);
      return `<div class="edsec"><span class="lab">${title}</span>${shown.length > 4 ? `<button class="linkbtn" data-act="edmore" data-k="${title}" aria-expanded="${!!open}">${open ? "Show less" : "See more"}</button>` : ""}</div><div class="edgrid">${list.map(([l, c]) => tile(l, c, c === "m" ? "edmusic" : "edbg", c === "m" ? e.music === l : sc.bgName === l)).join("")}</div>`; }).join("") || `<p class="edhint">Nothing matches these filters.</p>`}
    ${tb === "stock" ? `<p class="edhint">Photos and videos provided by Pexels.</p>` : ""}`; }
  if (e.panel === "effects") return head("Effects") + `<p class="edhint">On scene ${n}: ${esc(sc.name)}. Select again to remove.</p>${ED_FX.map(([x, d]) => `<button class="edrow ${sc.fx.includes(x) ? "on" : ""}" data-act="edfx" data-k="${x}" aria-pressed="${sc.fx.includes(x)}"><span class="ck">${sc.fx.includes(x) ? icon("check") : ""}</span><span><b>${x}</b><span class="mut">${d}</span></span></button>`).join("")}`;
  if (e.panel === "animation") return head("Animation") + tabs("animation", [["lib", "Library"], ["recent", "Recents"]]) + (e.tab.animation === "lib" ? `<div class="edgrid">${ED_ANIMS.map(a => tile(a, "t-ink", "edanim")).join("")}</div>` : e.recents.length ? `<div class="edgrid">${e.recents.map(a => tile(a, "t-ink", "edanim")).join("")}</div>` : `<div class="edempty">${icon("history")}<b>No recent animations</b><span>Animations you add show up here.</span></div>`) + `<button class="btn" data-act="edanimai">${icon("sparkle")}New animation with Clueso AI</button>`;
  if (e.panel === "templates") { const tb = e.tab.templates; return head("Templates") + tabs("templates", [["tpl", "Templates"], ["comp", "Components"], ["saved", "Saved"], ["lib", "Library"]]) +
    (tb === "tpl" ? `${[["intro", "Default Intro"], ["outro", "Default Outro"]].map(([k, l]) => `<div class="lab">${l}</div>${e[k] ? `<div class="edrow on"><span><b>${esc(e[k])}</b><span class="mut">Added to every new video</span></span><button class="linkbtn" data-act="eddefault" data-k="${k}">Remove</button></div>` : `<p class="edhint">No default ${k}. Find a template to set as default.</p><button class="btn" data-act="edtab" data-k="templates" data-i="lib" data-pick="${k}">Find a template</button>`}`).join("")}<div class="lab">Folders</div><p class="edhint">All saved · ${e.savedTpl.length}</p>`
    : tb === "comp" ? `<div class="edgrid">${ED_COMPONENTS.map(c => tile(c, "t-white", "edcomp")).join("")}</div>`
    : tb === "saved" ? (e.savedTpl.length ? `<div class="edgrid">${e.savedTpl.map(x => tile(x, "t-plum", "edusetpl")).join("")}</div>` : `<div class="edempty">${icon("template")}<b>Nothing to see yet!</b><span>Saved media for this project shows up here.</span></div>`)
    : `${e.pick ? `<p class="edhint">Pick a template for the default ${e.pick}.</p>` : `<p class="edhint">Select one to add it after scene ${n}.</p>`}<div class="edgrid">${ED_TEMPLATES.map(x => tile(x, "t-blue", "edusetpl")).join("")}</div>`) +
    `<button class="btn" data-act="edsavetpl">${icon("plus")}Save current clip as template</button>`; }
  if (e.panel === "transitions") return head("Transitions") + `<p class="edhint">Between scene ${n} and ${Math.min(n + 1, e.scenes.length)}. Select again to remove.</p><div class="edgrid">${ED_TRANS.map(x => tile(x, "t-ink", "edtrans", sc.trans === x)).join("")}</div>`;
  if (e.panel === "captions") { const tb = e.tab.captions; return head("Captions") + tabs("captions", [["style", "Style"], ["content", "Content"], ["saved", "Saved"], ["lib", "Library"]]) +
    (tb === "style" || tb === "lib" ? `<div class="edgrid">${ED_CAPSTYLES.map(x => `<button class="edtile ${e.capStyle === x ? "on" : ""}" data-act="edcapstyle" data-k="${x}" aria-pressed="${e.capStyle === x}"><span class="edthumb capprev"><span class="cs-${x.replace(/\W+/g, "").toLowerCase()}">Add a task</span>${e.capStyle === x ? `<span class="edtick">${icon("check")}</span>` : ""}</span>${x}</button>`).join("")}</div>`
    : tb === "content" ? `<p class="edhint">Captions follow the script. Editing a line here edits its scene.</p>` + e.scenes.map((s, i) => `<label class="edcapline"><span>${i + 1}</span><textarea data-capi="${i}" aria-label="Captions for scene ${i + 1}" rows="2">${esc(s.text)}</textarea></label>`).join("")
    : `<div class="edempty">${icon("cc")}<b>No saved styles</b><span>Save a caption style to reuse it in other videos.</span></div>`) +
    `<div class="edpf"><button class="btn" data-act="edcapdl" aria-haspopup="menu">Download${icon("chevDown")}</button><button class="btn" data-act="create" data-k="translate">${icon("translate")}Translate</button><span class="grow"></span><button class="swlab edvis" data-act="edcapvis" role="switch" aria-checked="${e.capsOn}">Visibility<span class="sw ${e.capsOn ? "on" : ""}"></span></button></div>`; }
  return "";
}
const edMark = (html, q) => q ? html.replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), m => `<mark>${m}</mark>`) : html;

/* ---------- timeline, canvas, article ---------- */
function edTimeline(e) {
  const T = edTotal(e);
  const tracks = [["Video", "v"], ["Voice", "a"], ["Captions", "c"], ["Music", "m"]];
  return `<div class="edtl" role="region" aria-label="Detailed timeline">${tracks.map(([l, k]) => `<div class="edtr"><span class="edtrl">${l}</span><div class="edtrb">${k === "m" ? (e.music ? `<span class="edblk m" style="width:100%">${esc(e.music)}</span>` : `<span class="edblk empty" style="width:100%">No music</span>`) : e.scenes.map((s, i) => `<button class="edblk ${k} ${i === e.scene ? "on" : ""} ${k === "a" && s.stale ? "stale" : ""} ${k === "c" && !e.capsOn ? "off" : ""}" style="width:${s.dur / T * 100}%" data-act="edscene" data-i="${i}" aria-label="${l}, scene ${i + 1}">${k === "c" ? "" : esc(k === "v" ? s.name : s.stale ? "Out of date" : s.voice)}</button>`).join("")}</div></div>`).join("")}<span class="edhead" style="left:calc(72px + (100% - 72px) * ${e.t / T})" aria-hidden="true"></span></div>`;
}
function edLayer(l, e) {
  const on = e.sel === l.id;
  const c = l.color || "#ffffff";
  const body = l.type === "text" ? `<span class="edltext sz-${l.size || "M"} ${l.bold ? "bold" : ""}" style="color:${c}" contenteditable="${on}" data-lid="${l.id}" spellcheck="false">${esc(l.text)}</span>` : l.type === "shape" ? `<span class="edshape sh-${l.shape.toLowerCase()} ${l.fill ? "fill" : ""}" style="--c:${c}"></span>` : `<span class="edlcomp">${esc(l.text)}</span>`;
  return `<div class="edlayer ${l.type} ${on ? "on" : ""}" data-lid="${l.id}" style="left:${l.x}%;top:${l.y}%" aria-label="${l.type === "shape" ? l.shape : esc(l.text)}${on ? ", selected" : ""}">${body}${on ? `<i class="h tl"></i><i class="h tr"></i><i class="h bl"></i><i class="h br"></i>` : ""}</div>`;
}
function edArticleHTML(e) {
  if (e.art == null) e.art = `<h2>${esc((PROJECTS.find(x => x.id === e.pid) || {}).name || "Article")}</h2>` + e.scenes.map((s, i) => `<h3>${i + 1}. ${esc(s.name)}</h3><p>${esc(s.text)}</p><figure class="edfig" contenteditable="false" data-i="${i}"><span class="thumb ${edTh(i, s)}">${esc(s.name)}</span><button class="btn" data-act="edfigmenu" data-i="${i}" aria-haspopup="menu">Replace screenshot</button></figure>`).join("");
  return e.art;
}
const ED_FMT = [["Block type", "textT", "block"], ["Bold", "B", "bold"], ["Italic", "I", "italic"], ["Underline", "U", "underline"], ["Strikethrough", "S", "strikeThrough"], ["Link", "link", "link"], ["Text alignment", "alignLeft", "align"], ["Numbered list", "listOl", "insertOrderedList"], ["Bullet list", "listUl", "insertUnorderedList"], ["Horizontal rule", "hrule", "insertHorizontalRule"], ["Code block", "code", "code"], ["Blockquote", "quote", "quote"], ["Add image", "image", "image"], ["Undo", "undo", "undo"], ["Redo", "redo", "redo"]];

// Side panels by width (R-ED12). Live keeps both panels at full width at every size: at 1024 px its AI panel runs off-screen,
// at 900 px the canvas is about 80 px, at 768 px it disappears, and the top bar overlaps the panels. Here:
// wide (1280+): both docked at 360 px · mid (1016–1279): both docked at 300 px, canvas at least 320 px ·
// narrow (901–1015): left and right share one 320 px column with tabs, nothing covers the canvas · phone (≤900): the right
// panel is a full-screen sheet. Nothing ever closes a panel you opened.
const edTier = () => innerWidth >= 1280 ? "wide" : innerWidth >= 1016 ? "mid" : innerWidth > 900 ? "narrow" : "phone";
let edLastTier = edTier();
// Pixel snapping: controls sized by their text get fractional widths (e.g. 304.09 px), which pushes everything after them onto
// half pixels and softens edges. After each render, round those widths up to whole pixels, and lay the timeline clips on
// whole-pixel boundaries.
const ED_PX = ".ed .btn, .ed .linkbtn, .ed .edtime, .ed .edvis, .ed .edtop .edgrp > :not(.edtitle):not(.grow):not(.edbanwrap), .ed .edtop .seg button, .ed .edchip, .ed .edbar .btn, .ed .edpf .btn, .ed .edsize, .ed .edzoom, .ed .tabs:not(.eddock) button, .ed .pill, .ed .edinspf .btn, .ed .edrep .btn, .ed .edinsph";
function edPx() {
  const els = [...document.querySelectorAll(ED_PX)]; els.forEach(el => { el.style.width = ""; }); const t = document.querySelector(".ed .edtitle"); if (t) t.style.width = "";
  const ws = els.map(el => el.getBoundingClientRect().width); els.forEach((el, i) => { if (ws[i] && Math.abs(ws[i] - Math.round(ws[i])) > 0.01) el.style.width = Math.ceil(ws[i]) + "px"; });
  if (t) { const w = t.getBoundingClientRect().width; if (w && Math.abs(w - Math.round(w)) > 0.01) t.style.width = Math.floor(w) + "px"; }
  document.querySelectorAll(".ed .edgrid").forEach(g => { g.style.gridTemplateColumns = ""; const gap = parseFloat(getComputedStyle(g).columnGap) || 8; const col = Math.floor((g.clientWidth - gap) / 2); if (col > 0) g.style.gridTemplateColumns = `${col}px ${col}px`; });
  document.querySelectorAll(".ed .edtile .edthumb").forEach(th => { th.style.height = ""; const w = th.getBoundingClientRect().width; if (w) th.style.height = Math.round(w * 9 / 16) + "px"; });
  const tr = document.querySelector(".ed .edscenes"); if (tr && S.ed) { const W = tr.clientWidth, T = edTotal(S.ed); let acc = 0, prev = 0; tr.querySelectorAll(".edcard").forEach((c, i) => { acc += S.ed.scenes[i] ? S.ed.scenes[i].dur : 0; const edge = Math.round(acc / T * W); c.style.width = (edge - prev) + "px"; prev = edge; }); }
}
// Clueso AI width in the editor (review, 18 Oct 2026: "allow the AI panel to resize"). Drag the panel's left edge, or focus it
// and use ←/→; double-click resets. Each width tier keeps its own width for the session, inside limits that keep the canvas
// at least 320 px wide. The canvas keeps its ratio; it just scales.
const ED_AIW = { wide: [360, 300, 520], mid: [300, 280, 360] }; // default, min, max
function edAiW(tier) { const d = ED_AIW[tier]; if (!d) return 0; const w = (S.edAiW || {})[tier]; return Math.min(d[2], Math.max(d[1], w || d[0])); }
function edAiApply() { const r = document.documentElement.style; r.setProperty("--edai-wide", edAiW("wide") + "px"); r.setProperty("--edai-mid", edAiW("mid") + "px"); }
function edAiSet(tier, w) { const d = ED_AIW[tier], prev = edAiW(tier); S.edAiW = { ...(S.edAiW || {}), [tier]: Math.round(Math.min(d[2], Math.max(d[1], w))) }; edAiApply();
  const m = document.querySelector(".ed .edmain"); if (m && edAiW(tier) > prev && m.clientWidth < 320) { S.edAiW[tier] = prev; edAiApply(); } // keep the canvas usable
  edPx(); const h = document.querySelector(".airesize"); if (h) { h.setAttribute("aria-valuenow", edAiW(tier)); } }
function edAiHandle() { const t = edTier(), d = ED_AIW[t]; return `<div class="airesize" role="separator" aria-orientation="vertical" tabindex="0" aria-label="Resize Clueso AI" aria-valuemin="${d[1]}" aria-valuemax="${d[2]}" aria-valuenow="${edAiW(t)}" title="Drag to resize · double-click to reset"></div>`; }
document.addEventListener("pointerdown", ev => {
  const h = ev.target.closest && ev.target.closest(".airesize"); if (!h) return;
  ev.preventDefault(); const tier = edTier(), x0 = ev.clientX, w0 = edAiW(tier); try { h.setPointerCapture(ev.pointerId); } catch (x) {} document.body.classList.add("airesizing");
  const mv = e2 => edAiSet(tier, w0 + (x0 - e2.clientX));
  const up = () => { h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); document.body.classList.remove("airesizing"); saveWorkSoon(); render(); };
  h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
});
document.addEventListener("dblclick", ev => { if (!(ev.target.closest && ev.target.closest(".airesize"))) return; const t = edTier(); S.edAiW = { ...(S.edAiW || {}), [t]: ED_AIW[t][0] }; edAiApply(); saveWorkSoon(); render(); });
document.addEventListener("keydown", ev => { const h = ev.target.closest && ev.target.closest(".airesize"); if (!h || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)) return; ev.preventDefault(); const t = edTier(), d = ED_AIW[t];
  edAiSet(t, ev.key === "Home" ? d[1] : ev.key === "End" ? d[2] : edAiW(t) + (ev.key === "ArrowLeft" ? 20 : -20)); saveWorkSoon(); });
function edMeasure() { edPx(); const b = document.querySelector(".ed .edbottom"); document.documentElement.style.setProperty("--ed-bottom-h", (b ? b.offsetHeight + 8 : 0) + "px"); }
function vEditor(pid) {
  const p = PROJECTS.find(x => x.id === pid) || PROJECTS[0];
  if (!p) return shell("projects", `<div class="page"><div class="drop">${icon("folder")}<b>This project doesn't exist</b><a class="btn" href="#/projects">All projects</a></div></div>`);
  const e = edState(p.id), sc = e.scenes[e.scene], T = edTotal(e);
  const art = e.view === "guide";
  const tier = edTier(); edLastTier = tier; edAiApply();
  // the tab that was opened last is in front when left and right share a column
  if (S.ai && !e.lastAi || e.vh && !e.lastVh) e.dockTab = "right"; e.lastAi = !!S.ai; e.lastVh = !!e.vh;
  const rightOpen = !!(S.ai || e.vh), shared = tier === "narrow" && !!e.panel && rightOpen && !art;
  if (!shared) e.dockTab = e.dockTab || "left";
  const rightName = e.vh ? "Version history" : "Clueso AI";
  setTimeout(edMeasure, 0); // after this render is in the page; runs in background tabs too, unlike a frame callback
  const tip = (l, extra = "") => `aria-label="${l}" data-tip="${l}${extra}"`;
  const top = `<header class="edtop"><div class="edgrp"><button class="edlogo" data-act="edprojmenu" aria-haspopup="menu" ${tip("Project menu")}><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${LOGO.match(/ d="([^"]+)"/)[1]}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>${icon("chevDown")}</button>
    ${e.renaming ? `<input class="edtitlein" id="edtitle" value="${esc(p.name)}" aria-label="Project name" maxlength="120">` : `<button class="edtitle" data-act="edrename" title="${esc(p.name)}" aria-label="Project name: ${esc(p.name)}. Rename"><b class="trunc">${esc(p.name)}</b></button>`}<button class="edsave ${e.saved ? "" : "busy"}" data-act="edsavepop" aria-haspopup="dialog" aria-label="${e.saved ? "All changes saved" : "Saving…"}" data-tip="${e.saved ? "All changes saved" : "Saving…"}">${icon("cloud")}</button>
    <div class="seg edview" role="group" aria-label="Output"><button class="${!art ? "on" : ""}" aria-pressed="${!art}" data-act="edview" data-k="video">Video</button><button class="${art ? "on" : ""}" aria-pressed="${art}" data-act="edview" data-k="guide">Article</button></div></div>
    <span class="grow edbanwrap">${p.sample ? `<div class="edbanner samp" role="status"><span class="edbt"><i aria-hidden="true"></i>Sample project to explore</span><a class="btn" href="#/create">Make my own</a></div>` : edBanner(e)}</span>
    <div class="edgrp"><button class="ava sm edava" data-act="edavatar" aria-haspopup="menu" ${tip(`${S.user.first} ${S.user.last}`)}>${S.user.ini}</button>
      <button class="iconbtn" data-act="help" aria-haspopup="menu" aria-label="${helpLabel()}" data-tip="${HELP_NAME}">${icon("helpbook")}${helpDot()}</button><button class="iconbtn" data-act="edcomments" aria-haspopup="dialog" ${tip("Comments")}>${icon("chat")}</button><button class="iconbtn" data-act="create" data-k="translate" aria-haspopup="dialog" ${tip("Translate")}>${icon("translate")}</button>
      <button class="iconbtn edai ${S.ai ? "on" : ""}" id="aibtn" data-act="ai" aria-expanded="${!!S.ai}" ${tip("Clueso AI", " (⌘J)")}>${icon("sparkle")}</button>
      <button class="btn pink" data-act="sharefrom" data-id="${p.id}">Share</button></div></header>`;
  const tool = e.mode;
  const rail = art
    ? `<nav class="edrail edfmt" aria-label="Formatting" role="toolbar">${ED_FMT.map(([l, ic, cmd], i) => `${[5, 7, 9, 13].includes(i) ? `<span class="edrsep" aria-hidden="true"></span>` : ""}<button class="edtool" data-act="edfmt" data-k="${cmd}" aria-label="${l}" data-tip="${l}" ${["block", "align", "link", "image"].includes(cmd) ? `aria-haspopup="menu"` : ""} ${p.article ? "" : "disabled"}>${ic.length === 1 ? `<span class="edgl ${ic.toLowerCase()}">${ic}</span>` : icon(ic)}</button>`).join("")}</nav>`
    : `<nav class="edrail" aria-label="Editor tools">${ED_MODES.map(([k, l, ic, key]) => `<button class="edtool ${tool === k ? "on" : ""}" data-act="edmode" data-k="${k}" aria-pressed="${tool === k}" aria-label="${l}" data-tip="${l} (${key})">${icon(ic)}</button>`).join("")}${ED_TOOLS.map(([k, l, ic, key]) => { const isTool = ED_TOOLMODES.includes(k); const on = isTool ? tool === k : e.panel === k; return `<button class="edtool ${on ? "on" : ""}" data-act="${isTool ? "edmode" : "edpanel"}" data-k="${k}" aria-pressed="${on}" aria-label="${k === "shapes" ? `Shapes: ${e.shape}` : l}" data-tip="${k === "shapes" ? `${e.shape} (${(ED_SHAPES.find(s => s[0] === e.shape) || [, key])[1]})` : `${l}${key ? ` (${key})` : ""}`}">${icon(ic)}</button>${k === "shapes" ? `<button class="edflyout" data-act="edshapes" aria-label="Choose a shape" aria-haspopup="menu" data-tip="Choose a shape"></button>` : ""}`; }).join("")}</nav>`;
  const ar = (ED_SIZES.find(x => x[0] === e.size) || ED_SIZES[0])[1];
  const zoomScale = e.zoom === "Fit" ? 1 : parseInt(e.zoom, 10) / 63;
  const modeBar = ED_TOOLMODES.includes(e.mode) ? `<div class="edmodebar" role="status">${icon(e.mode === "text" ? "textT" : "sh" + e.shape.toLowerCase())}<span>${e.mode === "text" ? "Text" : e.shape} active</span><button class="btn" data-act="edmode" data-k="select" aria-label="Exit ${e.mode === "text" ? "Text" : e.shape} tool">Exit<span class="kbd">Esc</span></button></div>` : "";
  const stage = `<div class="edstage ${e.sel && sc.layers.some(l => l.id === e.sel) ? "hasinsp" : ""}">${modeBar}${e.vhView ? `<div class="edvhbar" role="status">${icon("history")}<span>Viewing the version from ${esc(e.vhView)}</span><span class="grow"></span><button class="btn" data-act="edvhback">Back to current</button><button class="btn dark" data-act="edvhrestore">Restore this version</button></div>` : ""}
    <div class="edcanvas tool-${tool}" tabindex="0" aria-label="Canvas, scene ${e.scene + 1}, ${esc(sc.name)}. ${tool === "text" ? "Click to add text" : tool === "shapes" ? `Click to add a ${e.shape.toLowerCase()}` : tool === "hand" ? "Drag to move around" : "Click an element to select it"}">
      <div class="edframe thumb ${edTh(e.scene, sc)} ${sc.fx.map(f => "fx-" + f.toLowerCase()).join(" ")}" style="--ar:${ar};transform:translate(${e.pan[0]}px,${e.pan[1]}px) scale(${zoomScale})">
        <span class="edcap">${esc(sc.name)}</span><span class="edsub">${esc(sc.text.split(". ")[0])}</span>
        ${sc.layers.map(l => edLayer(l, e)).join("")}
        ${sc.fx.includes("Callout") ? `<span class="edcallout">Click here</span>` : ""}
        ${e.capsOn ? `<span class="edcaps cs-${e.capStyle.replace(/\W+/g, "").toLowerCase()}">${esc(sc.text.split(" ").slice(0, 9).join(" "))}</span>` : ""}
      </div></div>
    ${edInspector(e, sc)}
    <button class="edsize" data-act="edsizemenu" aria-haspopup="menu" aria-label="Canvas size: ${e.size}">${edRatioIcon(ar)}${e.size}${icon("chevDown")}</button>
    <button class="edzoom" data-act="edzoommenu" aria-haspopup="menu" aria-label="Zoom: ${e.zoom}">${e.zoom}${icon("chevDown")}</button></div>`;
  const bottom = `<section class="edbottom ${e.collapsed ? "collapsed" : ""}" aria-label="Timeline"><div class="edbar">
      <span class="edbg"><button class="iconbtn" data-act="edjump" data-k="start" ${tip("Skip to start")}>${icon("skipstart")}</button><button class="iconbtn" data-act="edstep" data-k="-1" ${tip("Previous scene")}>${icon("chevLeft")}</button><button class="iconbtn edpp" data-act="edplay" aria-label="${e.playing ? "Pause" : "Play"}" data-tip="${e.playing ? "Pause" : "Play"} (Space)">${icon(e.playing ? "pause" : "play")}</button><button class="iconbtn" data-act="edstep" data-k="1" ${tip("Next scene")}>${icon("chevRight")}</button><button class="iconbtn" data-act="edjump" data-k="end" ${tip("Skip to end")}>${icon("skipend")}</button></span>
      <span class="edbg"><span class="edtime" aria-label="${mmss(e.t)} of ${mmss(T)}">${edTC(e.t)} / ${edTC(T)}</span><button class="btn ghost" data-act="edspeed" aria-haspopup="menu" aria-label="Playback speed: ${e.speed}x" data-tip="Playback speed">${e.speed}x</button><button class="iconbtn ${e.loop ? "on" : ""}" data-act="edloop" aria-pressed="${e.loop}" ${tip("Loop playback")}>${icon("loop")}</button><button class="btn ghost ${e.hires ? "on" : ""}" data-act="edhires" aria-pressed="${e.hires}" data-tip="Preview in high resolution">High res</button></span>
      <span class="edsep" aria-hidden="true"></span><span class="edbg"><button class="iconbtn" data-act="edsplit" aria-label="Split scene ${e.scene + 1} at the playhead" data-tip="Split (X)">${icon("split")}</button><button class="iconbtn" data-act="edadd" aria-label="Add a scene after scene ${e.scene + 1}" data-tip="Add scene">${icon("plus")}</button><button class="iconbtn" data-act="edundo" aria-label="Undo" data-tip="Undo (⌘Z)" ${e.hist.length ? "" : "disabled"}>${icon("undo")}</button><button class="iconbtn" data-act="edredo" aria-label="Redo" data-tip="Redo (⇧⌘Z)" ${e.fut.length ? "" : "disabled"}>${icon("redo")}</button></span>
      <span class="grow"></span><span class="edbg"><button class="iconbtn ${e.timeline ? "on" : ""}" data-act="edtl" aria-expanded="${e.timeline}" ${tip(e.timeline ? "Hide detailed timeline" : "Show detailed timeline")}>${icon("keyframe")}</button><button class="iconbtn ${edPrefs.skim ? "on" : ""}" data-act="edskim" aria-pressed="${edPrefs.skim}" ${tip(edPrefs.skim ? "Turn off skimming" : "Turn on skimming", " (S)")}>${icon("skim")}</button><button class="iconbtn" data-act="edfull" aria-haspopup="dialog" ${tip("Full-screen preview")}>${icon("fullscreen")}</button><button class="iconbtn" data-act="edtlset" aria-haspopup="menu" ${tip("Timeline settings")}>${icon("settings")}</button><button class="iconbtn" data-act="edcollapse" aria-expanded="${!e.collapsed}" ${tip(e.collapsed ? "Expand timeline" : "Collapse timeline")}>${icon(e.collapsed ? "tlexpand" : "tlcollapse")}</button></span></div>
    ${e.collapsed ? "" : `<div class="edtrack"><div class="edruler" aria-hidden="true">${edTicks(T).map(x => `<span style="left:${x / T * 100}%">${x < 60 ? x + "s" : Math.floor(x / 60) + "m " + String(x % 60).padStart(2, "0") + "s"}</span>`).join("")}</div>
    <div class="edscenes" role="listbox" aria-label="Scenes" aria-orientation="horizontal">${e.scenes.map((s, i) => `<button class="edcard ${i === e.scene ? "on" : ""} ${edPrefs.frames ? "" : "noframes"}" role="option" aria-selected="${i === e.scene}" aria-label="Scene ${i + 1}, ${esc(s.name)}, ${mmss(s.dur)}${s.stale || s.text !== s.voiced ? ", has text not in the voiceover" : ""}${s.trans ? `, ${s.trans} after it` : ""}" data-act="edscene" data-i="${i}" tabindex="${i === e.scene ? 0 : -1}" style="width:${s.dur / T * 100}%"><span class="edcn trunc"><b>${i + 1}</b> ${esc(s.name)}</span><span class="edct thumb ${edTh(i, s)}"><span class="eddur">${mmss(s.dur)}</span>${s.trans ? `<span class="edtrmark" title="${esc(s.trans)}">${icon("transition")}</span>` : ""}</span></button>`).join("")}</div>
    ${e.timeline ? edTimeline(e) : ""}<span class="edplayhead" style="left:${e.t / T * 100}%" aria-hidden="true"><b>${mmss(e.t)}</b></span></div>`}</section>`;
  const article = `<div class="edguide">${p.article ? `<div class="edart" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article" id="edart">${edArticleHTML(e)}</div>` : `<div class="edgd"><b>Article</b><p class="mut">This video doesn't have its article yet. Clueso writes it from the same scenes: a step-by-step guide with a screenshot for each step.</p><button class="btn dark" data-act="edguidemake">${icon("doc")}Make the article</button></div>`}</div>`;
  const vh = e.vh ? `<aside class="edvh" aria-label="Version history"><div class="edph"><b>${icon("history")}Version history</b><button class="iconbtn" data-act="edvh" aria-label="Close version history">${icon("close")}</button></div>
    ${[["Today", [["Current version", ""]]], ["Yesterday", [["10:18 pm", "yesterday at 10:18 pm"]]], ["16 October", [["4:02 pm", "16 October at 4:02 pm"]]]].map(([d, items]) => `<div class="lab">${d}</div>${items.map(([l, full]) => `<button class="edvhrow ${(e.vhView || "") === full ? "on" : ""}" data-act="edvhpick" data-k="${full}" aria-pressed="${(e.vhView || "") === full}"><span class="cdot ${full ? "" : "ok"}" aria-hidden="true"></span><span><b>${l}</b><span class="mut">${esc(S.user.email)}</span></span></button>`).join("")}`).join("")}</aside>` : "";
  const side = e.vh || tier === "narrow" ? "side" : aiView();
  return `<div class="ed tier-${tier} ${shared ? "shared dock-" + e.dockTab : ""} ${e.panel && !art ? "withpanel" : ""} ${edPrefs.keepcanvas ? "keep" : ""} ${edPrefs.fullheight ? "fullh" : ""} ${art ? "art" : ""} ${S.ai || e.vh ? "ai-" + side : ""}">${top}<div class="edbody">${rail}${e.panel && !art ? `<aside class="edpanel ed-${e.panel}" aria-label="${(ED_TOOLS.find(t => t[0] === e.panel) || [, e.panel])[1]}">${shared ? `<div class="eddock tabs" role="tablist" aria-label="Side panels">${[["left", (ED_TOOLS.find(t => t[0] === e.panel) || [, e.panel])[1]], ["right", rightName]].map(([k, l]) => `<button role="tab" aria-selected="${e.dockTab === k}" class="${e.dockTab === k ? "on" : ""}" data-act="eddock" data-k="${k}">${esc(l)}</button>`).join("")}</div>` : ""}${shared && e.dockTab === "right" ? "" : edPanel(e)}</aside>` : ""}<main class="edmain">${art ? article : stage}</main></div>${art ? "" : bottom}</div>${vh}${S.ai && !e.vh ? aiPanel() : ""}`;
}

// Inspector for the selected element, as live's "Inspector expanded" preference implies: position, look, duplicate, delete.
const ED_COLORS = [["White", "#ffffff"], ["Black", "#1a1a1a"], ["Blue", "#3a63de"], ["Yellow", "#ffd84d"]];
function edInspector(e, sc) {
  const l = e.sel && sc.layers.find(x => x.id === e.sel); if (!l) return "";
  const open = e.inspOpen ?? edPrefs.inspector;
  const name = l.type === "text" ? "Text" : l.type === "shape" ? l.shape : l.text;
  const sw = (prop, cur, list) => `<div class="edsw" role="radiogroup" aria-label="${prop === "color" ? "Colour" : "Fill"}">${list.map(([n, c]) => `<button role="radio" aria-checked="${cur === c}" aria-label="${n}" data-tip="${n}" data-act="edlprop" data-k="${prop}" data-i="${c}" class="${cur === c ? "on" : ""}" style="--c:${c}"></button>`).join("")}</div>`;
  return `<aside class="edinsp ${open ? "" : "shut"}" aria-label="Inspector: ${esc(name)}"><button class="edinsph" data-act="edinsp" aria-expanded="${open}"><b>${esc(name)}</b>${icon(open ? "chevDown" : "chevRight")}</button>
    ${open ? `<div class="edinspb"><div class="edlab">Position</div><div class="edxy"><label>X<input type="number" min="0" max="100" data-lpos="x" value="${l.x}" aria-label="X position, percent"></label><label>Y<input type="number" min="0" max="100" data-lpos="y" value="${l.y}" aria-label="Y position, percent"></label></div>
      ${l.type === "text" ? `<div class="edlab">Size</div><div class="seg" role="group" aria-label="Text size">${["S", "M", "L"].map(z => `<button class="${(l.size || "M") === z ? "on" : ""}" aria-pressed="${(l.size || "M") === z}" data-act="edlprop" data-k="size" data-i="${z}">${z}</button>`).join("")}</div><div class="edlab">Colour</div>${sw("color", l.color || "#ffffff", ED_COLORS)}<button class="edlrow" data-act="edlprop" data-k="bold" data-i="${!l.bold}" role="switch" aria-checked="${!!l.bold}"><span>Bold</span><span class="sw ${l.bold ? "on" : ""}"></span></button>` : ""}
      ${l.type === "shape" ? `<div class="edlab">Colour</div>${sw("color", l.color || "#ffffff", ED_COLORS)}<button class="edlrow" data-act="edlprop" data-k="fill" data-i="${!l.fill}" role="switch" aria-checked="${!!l.fill}"><span>Fill</span><span class="sw ${l.fill ? "on" : ""}"></span></button>` : ""}
      <div class="edinspf"><button class="btn" data-act="edldup">${icon("copy")}Duplicate</button><button class="btn" data-act="edldel">${icon("close")}Delete</button></div></div>` : ""}</aside>`;
}

/* ---------- playback ---------- */
let edTimer = null;
function edGo(i) { const e = S.ed; if (!e) return; const inStrip = !!(document.activeElement && document.activeElement.closest(".edscenes")); e.scene = Math.max(0, Math.min(e.scenes.length - 1, i)); e.t = edStart(e, e.scene); e.sel = null; render(); const c = document.querySelector(`.edcard[data-i="${e.scene}"]`); if (c && inStrip) c.focus(); const sc = document.querySelector(`.edsc.on`); if (sc) sc.scrollIntoView({ block: "nearest" }); }
function edPlay(on) { const e = S.ed; e.playing = on; clearInterval(edTimer); if (on) edTimer = setInterval(() => { if (!S.ed || route()[0] !== "edit") return clearInterval(edTimer); e.t += 0.5 * e.speed; if (e.t >= edTotal(e)) { e.t = 0; e.scene = 0; if (!e.loop) { edPlay(false); return render(); } } let i = 0; while (i < e.scenes.length - 1 && e.t >= edStart(e, i + 1)) i++; e.scene = i; if (!document.activeElement || !document.activeElement.isContentEditable) render(); }, 500); render(); }
function edVoice(idx) { const e = S.ed; idx.forEach(i => { e.scenes[i].updating = true; }); render(); setTimeout(() => { idx.forEach(i => { if (e.scenes[i]) { e.scenes[i].updating = false; e.scenes[i].stale = false; e.scenes[i].voiced = e.scenes[i].text; } }); render(); toast(idx.length === 1 ? `Speech generated for scene ${idx[0] + 1}` : `Speech generated for ${idx.length} scenes`); }, 1200); }
// A tighter version of a line: drops filler words and trailing clauses. Stands in for the AI rewrite.
const edTighten = t => t.replace(/\b(just|really|very|in order to)\b\s*/gi, "").replace(/,\s*so\s+/i, ". ").replace(/\s{2,}/g, " ").replace(/\. (\w)/g, (m, c) => ". " + c.toUpperCase()).trim();
let edRange = null; // the article selection, kept while a formatting menu is open
const edKeepRange = () => { const s = getSelection(); const a = document.querySelector("#edart"); if (s.rangeCount && a && a.contains(s.anchorNode)) edRange = s.getRangeAt(0).cloneRange(); };
const edRestoreRange = () => { const a = document.querySelector("#edart"); if (!a) return; a.focus({ preventScroll: true }); if (edRange && a.contains(edRange.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(edRange); } };
function edFmt(cmd, val) { edRestoreRange(); document.execCommand(cmd, false, val); const a = document.querySelector("#edart"); if (a && S.ed) { S.ed.art = a.innerHTML; edDirty(S.ed); } }
function edAddLayer(e, type, x, y, extra = {}) { const id = "l" + Date.now().toString(36); edDo(e, () => { e.scenes[e.scene].layers.push({ id, type, x, y, text: type === "text" ? "Text" : extra.text || "", shape: type === "shape" ? extra.shape || "Rectangle" : "" }); }); e.sel = id; return id; }
function edMenu(t, items, align) { popover(t, items, align); const f = document.querySelector(".pop [aria-checked=true]") || document.querySelector(".pop .mi:not([disabled])"); if (f) f.focus(); }
const edRadio = (list, cur, act, label = x => x, extra = "") => list.map(x => `<button class="mi mi2" role="menuitemradio" aria-checked="${x === cur}" data-act="${act}" data-k="${esc(String(x))}" ${extra}><span class="ck">${x === cur ? icon("check") : ""}</span><span class="mt"><span>${esc(label(x))}</span></span></button>`).join("");

/* ---------- dialogs ---------- */
function edKeysDialog(tab = "Playback") { dialog(dh("Keyboard shortcuts") + `<div class="db"><div class="tabs" role="tablist">${Object.keys(ED_KEYS).map(k => `<button role="tab" class="${k === tab ? "on" : ""}" aria-selected="${k === tab}" data-act="edkeystab" data-k="${k}">${k}</button>`).join("")}</div><div class="edkeys">${ED_KEYS[tab].map(([l, k]) => `<div><span>${l}</span><span>${k.split(" ").map(x => `<kbd>${x}</kbd>`).join("")}</span></div>`).join("")}</div></div>`); }
function edPrefsDialog() { dialog(dh("Editor preferences", "Saved on this device.") + `<div class="db">${ED_PREFS.map(([g, items]) => `<div class="lab">${g}</div>${items === "radio" ? `<div role="radiogroup" aria-label="${g}">${[[true, "Keep canvas in place", "The panel opens over the canvas"], [false, "Make room for the canvas", "The canvas moves over"]].map(([v, l, d]) => `<button class="kv edpref" data-act="edprefkeep" data-k="${v}" role="radio" aria-checked="${edPrefs.keepcanvas === v}"><span>${l}<small>${d}</small></span><span class="edradio ${edPrefs.keepcanvas === v ? "on" : ""}"></span></button>`).join("")}</div>` : items.map(([k, l]) => `<button class="kv edpref" data-act="edpref" data-k="${k}" role="switch" aria-checked="${edPrefs[k]}"><span>${l}</span><span class="sw ${edPrefs[k] ? "on" : ""}"></span></button>`).join("")}`).join("")}</div>`); }
function edMoveDialog(sel) { const e = S.ed; const p = PROJECTS.find(x => x.id === e.pid); S.folders = S.folders || []; const cur = p.folder || "Your projects"; sel = sel || cur;
  dialog(dh(`Move “${esc(p.name)}”`, `Current location: ${esc(cur)}`) + `<div class="db edmove" role="radiogroup" aria-label="Folders">${["Your projects", ...S.folders].map(f => `<button class="edrow ${f === sel ? "on" : ""}" role="radio" aria-checked="${f === sel}" data-act="edmovepick" data-k="${esc(f)}">${icon("folder")}<span><b>${esc(f)}</b>${f === cur ? `<span class="mut">Current location</span>` : ""}</span></button>`).join("")}
    <div class="edrep"><input id="ednewf" placeholder="New folder name" aria-label="New folder name" maxlength="60"><button class="btn" data-act="edmkfolder">${icon("plus")}Create folder</button></div></div>
    <div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="edmovedo" data-k="${esc(sel)}" ${sel === cur ? "disabled" : ""}>Move here</button></div>`); }

/* ---------- clicks ---------- */
let edFig = null, edChipEl = null;
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-act]"); if (!t || route()[0] !== "edit") return; const e = S.ed; if (!e) return; const k = t.dataset.k;
  const p = PROJECTS.find(x => x.id === e.pid); const sc = e.scenes[e.scene];
  switch (t.dataset.act) {
    /* top bar */
    case "edprojmenu": edMenu(t, [["Back to Home", "home", "go:/create"], ["Duplicate project", "copy", "eddup"], ["Move to folder", "folder", "edmove"], ["Save", "check", "edsavenow"], ["View original media", "video", "edorig"], ["Keyboard shortcuts", "dots", "edkeys"], ["Editor preferences", "settings", "edprefs"], ["Version history", "history", "edvh"]].map(([l, ic, a]) => a.startsWith("go:") ? `<button class="mi" data-go="${a.slice(3)}">${icon(ic)}${l}</button>` : `<button class="mi" data-act="${a}">${icon(ic)}${l}</button>`).join("") + `<div class="sep"></div><button class="mi danger" data-act="eddelete">${icon("close")}Delete project</button>`); break;
    case "eddup": { closeLayers(); const c = { ...p, id: "c" + Date.now(), name: "Copy of " + p.name, mod: "just now", versions: [], madeFrom: [] }; PROJECTS.splice(PROJECTS.indexOf(p) + 1, 0, c); toast("Duplicated. Versions stay with the original.", { label: "Open copy", go: "/edit/" + c.id }); break; }
    case "edmove": closeLayers(); edMoveDialog(); break;
    case "edmovepick": edMoveDialog(k); break;
    case "edmkfolder": { const i = document.querySelector("#ednewf"); const v = (i.value || "").trim(); if (!v) { i.focus(); break; } S.folders = S.folders || []; if (!S.folders.includes(v)) S.folders.push(v); edMoveDialog(v); toast(`Folder “${v}” created`); break; }
    case "edmovedo": closeLayers(); p.folder = k === "Your projects" ? "" : k; toast(`Moved to ${k}`); break;
    case "edsavenow": closeLayers(); e.saved = true; e.savedAt = Date.now(); edRender('[data-act="edprojmenu"]'); toast("Saved"); break;
    case "edorig": closeLayers(); dialog(dh("View original recording", "What you recorded, before Clueso edited it. Nothing here changes the video.") + `<div class="db"><div class="edorig thumb t-ink"><span>Original recording</span></div><div class="edorigbar"><button class="iconbtn" data-act="edorigplay" aria-label="Play">${icon("play")}</button><span class="mut" id="edorigt">0:00 / 0:47</span><span class="grow"></span><span class="mut">1x</span></div></div>`); break;
    case "edorigplay": { const on = t.getAttribute("aria-label") === "Play"; t.setAttribute("aria-label", on ? "Pause" : "Play"); t.innerHTML = icon(on ? "pause" : "play"); document.querySelector("#edorigt").textContent = on ? "0:01 / 0:47" : "0:00 / 0:47"; break; }
    case "edkeys": closeLayers(); edKeysDialog(); break;
    case "edkeystab": edKeysDialog(k); { const b = document.querySelector(`[data-act="edkeystab"][data-k="${k}"]`); if (b) b.focus(); } break;
    case "edprefs": closeLayers(); edPrefsDialog(); break;
    case "edpref": edPrefs[k] = !edPrefs[k]; edSavePrefs(); render(); edPrefsDialog(); { const b = document.querySelector(`[data-act="edpref"][data-k="${k}"]`); if (b) b.focus(); } break;
    case "edprefkeep": edPrefs.keepcanvas = k === "true"; edSavePrefs(); render(); edPrefsDialog(); { const b = document.querySelector(`[data-act="edprefkeep"][data-k="${k}"]`); if (b) b.focus(); } break;
    case "edvh": closeLayers(); e.vh = !e.vh; if (!e.vh) e.vhView = null; render(); { const b = document.querySelector(e.vh ? ".edvh .edvhrow" : '[data-act="edprojmenu"]'); if (b) b.focus(); } break;
    case "edvhpick": e.vhView = k || null; edRender(); break;
    case "edvhback": e.vhView = null; edRender(".edvh .edvhrow"); break;
    case "edvhrestore": { const v = e.vhView; edDo(e, () => { const base = ED_SCENES[e.pid]; if (base) e.scenes = base.map(([name, text, dur]) => edScene(name, text, secs(dur), false)); }); e.vhView = null; e.scene = 0; edRender(".edvh .edvhrow"); toast(`Restored the version from ${v}`, { label: "Undo", act: "edundo" }); break; }
    case "eddelete": closeLayers(); dialog(dh("Delete this project?", `“${esc(p.name)}” moves to Deleted. You can restore it, with its versions, for 30 days.`) + `<div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="eddeldo">Delete project</button></div>`); break;
    case "eddeldo": { closeLayers(); clearInterval(edTimer); const i = PROJECTS.indexOf(p); PROJECTS.splice(i, 1); S.deleted.unshift({ p, at: Date.now(), i }); S.ed = null; S.ai = false; go("/projects"); toast(`Moved “${p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name}” to Deleted`, { label: "Undo", act: "restore", id: p.id }); break; }
    case "edrename": e.renaming = true; render(); { const i = document.querySelector("#edtitle"); if (i) { i.focus(); i.select(); } } break;
    case "edsavepop": { const ago = Math.round((Date.now() - e.savedAt) / 60000); popover(t, `<div class="mlab"><b>${e.saved ? "All changes saved" : "Saving…"}</b><span>${e.saved ? (ago < 1 ? "Just now" : ago + " min ago") : "Your latest edit"} · saved automatically</span></div><button class="mi" data-act="edvh">${icon("history")}Version history</button>`); { const f = document.querySelector(".pop .mi"); if (f) f.focus(); } break; }
    case "edavatar": edMenu(t, `<div class="mlab"><b>${esc(wsName())}</b><span>${esc(S.user.email)}</span></div><button class="mi" data-act="toast" data-m="Opens the Clueso help center">${icon("doc")}Help center</button><button class="mi" data-act="toast" data-m="Opens a chat with Clueso support">${icon("help")}Chat with support</button><div class="sep"></div><button class="mi" data-act="signout">${icon("external")}Sign out</button>`, "right"); break;
    case "edcomments": dialog(dh("Unlock video comments", "Comments are on the Business plan.") + `<div class="db"><p class="mut" style="margin:0">With video comments, you can:</p><ul class="edlist"><li>Leave timestamped comments right on the video</li><li>Mark the exact area of a frame for precise feedback</li><li>Track threads and resolve them as changes are made</li></ul></div><div class="df"><button class="btn" data-act="closedlg">Not now</button><a class="btn dark" href="#/settings/plan">See Business plan</a></div>`); break;
    case "edchip": { const chip = t; const i = +chip.closest(".edtext").dataset.i; edChipEl = chip; const tok = chip.dataset.tok; edMenu(chip, tok === "sync" ? (() => { const s = e.scenes[i], pend = s.stale || s.text !== s.voiced;
        return `<div class="edsync"><div class="edsynch"><b>Sync Point</b><span class="edsyncst ${pend ? "pend" : ""}" title="${pend ? "Lines up when you generate speech for this scene" : "The voice waits for this click"}">${pend ? "Pending" : "Synced"}</span></div><div class="edsyncf thumb ${edTh(i, s)}" role="img" aria-label="The frame this sync point waits for, in scene ${i + 1}"><span>${esc(s.name)}</span></div><p class="edsyncn">The voice waits here until this click in your recording.</p><div class="edsyncb"><button class="btn dark" data-act="edsyncedit" data-i="${i}">${icon("pencil")}Edit</button><button class="iconbtn bord" data-act="edtokdel" data-i="${i}" aria-label="Remove sync point" data-tip="Remove">${icon("trash")}</button></div></div>`; })() : `<div class="lab">Pause</div>${edRadio(["0.5", "1", "2"], tok.split(":")[1], "edtokset", x => x + " s", `data-i="${i}"`)}<div class="sep"></div><button class="mi" data-act="edtokdel" data-i="${i}">${icon("close")}Remove pause</button>`); break; }
    case "edsyncedit": { closeLayers(); const i = +t.dataset.i; let st = 0; for (let j = 0; j < i; j++) st += e.scenes[j].dur; e.scene = i; e.t = st + e.scenes[i].dur / 2; edRender(".edcanvas"); toast("Playhead is on the sync point's frame. Move it to the click, then generate speech"); break; }
    case "edaddat": { const at = +t.dataset.i; edDo(e, () => { e.scenes.splice(at, 0, edScene("New scene", "", 5, true, e.scenes[at - 1].voice)); e.scene = at; }); render(); setTimeout(() => { const el = document.querySelector(`.edtext[data-i="${at}"]`); if (el) el.focus(); }, 0); toast(`Scene ${at + 1} added. Write its script`, { label: "Undo", act: "edundo" }); break; }
    case "edtokdel": case "edtokset": { closeLayers(); const i = +t.dataset.i; const s = e.scenes[i]; const el = document.querySelector(`.edtext[data-i="${i}"]`); if (!el || !edChipEl || !el.contains(edChipEl)) break; if (t.dataset.act === "edtokdel") edChipEl.remove(); else edChipEl.dataset.tok = "pause:" + k; edDo(e, () => { s.text = edReadText(el); s.stale = true; }); edRender(); toast(t.dataset.act === "edtokdel" ? "Removed" : `Pause set to ${k} s`); break; }
    /* inspector */
    case "edinsp": e.inspOpen = !(e.inspOpen ?? edPrefs.inspector); edRender('[data-act="edinsp"]'); break;
    case "edlprop": { const l = sc.layers.find(x => x.id === e.sel); if (!l) break; const v = t.dataset.i; edDo(e, () => { l[k] = v === "true" ? true : v === "false" ? false : v; }); edRender(`[data-act="edlprop"][data-k="${k}"]${k === "bold" || k === "fill" ? "" : `[data-i="${v}"]`}`); break; }
    case "edldup": { const l = sc.layers.find(x => x.id === e.sel); if (!l) break; const id = "l" + Date.now().toString(36); edDo(e, () => { sc.layers.push({ ...l, id, x: Math.min(l.x + 4, 96), y: Math.min(l.y + 4, 94) }); }); e.sel = id; edRender('[data-act="edldup"]'); toast("Element duplicated"); break; }
    case "edldel": edDo(e, () => { sc.layers = sc.layers.filter(x => x.id !== e.sel); }); e.sel = null; edRender(".edcanvas"); toast("Element deleted", { label: "Undo", act: "edundo" }); break;
    /* rail */
    case "edmode": e.mode = e.mode === k && ED_TOOLMODES.includes(k) ? "select" : k; e.sel = null; edRender(); break;
    case "edshapes": edMenu(t, ED_SHAPES.map(([x, key]) => `<button class="mi edshapemi" role="menuitemradio" aria-checked="${x === e.shape}" data-act="edshape" data-k="${x}">${icon("sh" + x.toLowerCase())}<span class="grow">${x}</span><span class="kbd" aria-label="Shortcut ${key.replace("⇧", "Shift ")}">${key}</span><span class="ck">${x === e.shape ? icon("check") : ""}</span></button>`).join("")); break;
    case "edshape": closeLayers(); e.shape = k; e.mode = "shapes"; edRender('[data-act="edmode"][data-k="shapes"]'); break;
    case "eddock": e.dockTab = k; edRender(`[data-act="eddock"][data-k="${k}"]`); break;
    case "edpanel": e.panel = e.panel === k ? "" : k; if (e.panel) e.dockTab = "left"; render(); { const b = document.querySelector(`.edtool[data-k="${k}"]`); if (b) b.focus(); } break;
    case "edtab": e.tab[k] = t.dataset.i; if (t.dataset.pick) e.pick = t.dataset.pick; else if (k === "templates") e.pick = ""; edRender(`[data-act="edtab"][data-k="${k}"][data-i="${t.dataset.i}"]`); break;
    /* script */
    case "edscene": edGo(+t.dataset.i); break;
    case "edreplace": e.replace = !e.replace; edRender(); if (e.replace) { const i = document.querySelector(e.q ? "#edrw" : "#edq"); if (i) i.focus(); } break;
    case "edrepdo": { const q = (e.q || "").trim(); if (!q) break; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), k === "all" ? "gi" : "i"); let n = 0; edDo(e, () => { for (const s of e.scenes) { if (k !== "all" && n) break; const before = s.text; s.text = s.text.replace(re, () => { n++; return e.rwith; }); if (s.text !== before) s.stale = true; } }); if (!n) e.hist.pop(); edRender(); toast(n ? `Replaced ${n} ${n === 1 ? "match" : "matches"}. Generate speech for those scenes` : "No matches", n ? { label: "Undo", act: "edundo" } : undefined); break; }
    case "edclipmenu": { const i = +t.dataset.i; edMenu(t, `<button class="mi" data-act="edrwone" data-i="${i}">${icon("wand")}AI rewrite</button><button class="mi" data-act="edvoice" data-i="${i}">${icon("mic")}Generate speech</button><button class="mi" data-act="eddupclip" data-i="${i}">${icon("copy")}Duplicate scene</button><div class="sep"></div><button class="mi danger" data-act="eddelclip" data-i="${i}" ${e.scenes.length < 2 ? "disabled" : ""}>${icon("close")}Delete scene</button>`, "right"); break; }
    case "edrwone": case "edrwall": { closeLayers(); const idx = t.dataset.act === "edrwall" ? e.scenes.map((_, i) => i) : [+(t.dataset.i ?? e.scene)]; edDo(e, () => idx.forEach(i => { const s = e.scenes[i]; const nt = edTighten(s.text); s.text = nt; s.stale = true; })); edRender('[data-act="edrewrite"]'); toast(idx.length > 1 ? "Script rewritten. Review it, then generate speech" : `Scene ${idx[0] + 1} rewritten. Review it, then generate speech`, { label: "Undo", act: "edundo" }); break; }
    case "edvoice": closeLayers(); edVoice([+t.dataset.i]); break;
    case "eddupclip": { closeLayers(); const i = +t.dataset.i; edDo(e, () => { const c = JSON.parse(JSON.stringify(e.scenes[i])); c.name += " (copy)"; c.layers.forEach((l, j) => { l.id = "l" + Date.now().toString(36) + j; }); e.scenes.splice(i + 1, 0, c); e.scene = i + 1; }); edRender(); toast(`Scene ${i + 1} duplicated`); break; }
    case "eddelclip": { closeLayers(); const i = +t.dataset.i; if (e.scenes.length < 2) break; const name = e.scenes[i].name; edDo(e, () => { e.scenes.splice(i, 1); e.scene = Math.min(e.scene, e.scenes.length - 1); }); edRender(); toast(`Deleted “${name}”`, { label: "Undo", act: "edundo" }); break; }
    case "edscriptmore": edMenu(t, `<button class="mi" data-act="edtrdl">${icon("upload")}Download transcript</button><button class="mi" data-act="edtrcopy">${icon("copy")}Copy transcript</button>`); break;
    case "edtrdl": closeLayers(); toast("Transcript downloaded as transcript.txt"); break;
    case "edtrcopy": { closeLayers(); const txt = e.scenes.map((s, i) => `${i + 1}. ${s.name}\n${s.text}`).join("\n\n"); try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (er) {} toast("Transcript copied"); break; }
    case "edplus": edMenu(t, `<button class="mi" data-act="edpause">${icon("clock")}Add a pause<small>${edCaret.i === e.scene && edCaret.pos != null ? "At the cursor" : `End of scene ${e.scene + 1}`}</small></button>`); break;
    case "edpause": { closeLayers(); const s = edCur(); const pos = edCaret.i === e.scene && edCaret.pos != null ? Math.min(edCaret.pos, s.text.length) : s.text.length; edDo(e, () => { s.text = (s.text.slice(0, pos).trimEnd() + " {pause:0.5} " + s.text.slice(pos).trimStart()).trim(); s.stale = true; }); edRender('[data-act="edplus"]'); toast(`Pause added to scene ${e.scene + 1}`); break; }
    case "edrewrite": edMenu(t, `<div class="mlab"><b>AI Rewrite</b><span>Uses the “${esc(e.prompt)}” prompt. You can undo it.</span></div><button class="mi" data-act="edrwone" data-i="${e.scene}">${icon("wand")}This scene<small>Scene ${e.scene + 1}</small></button><button class="mi" data-act="edrwall">${icon("wand")}Every scene<small>${e.scenes.length} scenes</small></button>`); break;
    case "edprompt": edMenu(t, `<div class="mlab"><b>Prompt hub: video script</b><span>The base prompt AI uses to write your scripts.</span></div>${ED_PROMPTS.map(([nm, d]) => `<button class="mi mi2" role="menuitemradio" aria-checked="${e.prompt === nm}" data-act="edsetprompt" data-k="${nm}"><span class="ck">${e.prompt === nm ? icon("check") : ""}</span><span class="mt"><span>${nm}</span><small>${d}</small></span></button>`).join("")}`); break;
    case "edsetprompt": closeLayers(); e.prompt = k; edRender('[data-act="edprompt"]'); toast(`AI Rewrite now uses the ${k} prompt`); break;
    case "edvoiceall": if (!edStale(e)) { toast("Every voice already matches its script"); break; } edVoice(e.scenes.map((s, i) => s.stale ? i : -1).filter(i => i > -1)); break;
    case "edvoicemenu": { const i = +t.dataset.i; edMenu(t, `<div class="lab">Voice for scene ${i + 1}</div>${ED_VOICES.map(([v, d]) => `<button class="mi mi2" role="menuitemradio" aria-checked="${e.scenes[i].voice === v}" data-act="edsetvoice" data-i="${i}" data-k="${v}"><span class="ck">${e.scenes[i].voice === v ? icon("check") : ""}</span><span class="mt"><span>${v}</span><small>${d}</small></span></button>`).join("")}<div class="sep"></div><button class="mi" data-act="edsetvoice" data-i="all" data-k="${e.scenes[i].voice}">Use ${e.scenes[i].voice} for every scene</button>`); break; }
    case "edsetvoice": { const i = t.dataset.i; closeLayers(); edDo(e, () => { (i === "all" ? e.scenes : [e.scenes[+i]]).forEach(s => { if (s.voice !== k) { s.stale = true; s.voiced = ""; } s.voice = k; }); }); render(); toast(i === "all" ? `${k} is now the voice for every scene` : `Scene ${+i + 1} now uses ${k}. Generate its speech to hear it`); break; }
    /* media, effects, animation, templates, transitions, captions */
    case "edfilter": edMenu(t, edRadio(ED_FILTERS[k], ED_FILTERS[k][e.filt[k]], "edsetfilter", x => x, `data-f="${k}"`)); break;
    case "edsetfilter": closeLayers(); e.filt[t.dataset.f] = ED_FILTERS[t.dataset.f].indexOf(k); edRender(`[data-act="edfilter"][data-k="${t.dataset.f}"]`); break;
    case "edmore": e.more[k] = !e.more[k]; edRender(); break;
    case "edmusic": e.music = e.music === k ? "" : k; edDirty(e); edRender(); toast(e.music ? `${k} is the background music` : "Background music removed"); break;
    case "edbg": { const same = sc.bgName === k; edDo(e, () => { sc.bg = same ? "" : t.dataset.c; sc.bgName = same ? "" : k; }); edRender(); toast(same ? `Background removed from scene ${e.scene + 1}` : `${k} is the background of scene ${e.scene + 1}`, { label: "Undo", act: "edundo" }); break; }
    case "edfx": { const on = sc.fx.includes(k); edDo(e, () => { sc.fx = on ? sc.fx.filter(x => x !== k) : [...sc.fx, k]; }); edRender(); toast(on ? `${k} removed from scene ${e.scene + 1}` : `${k} added to scene ${e.scene + 1}`); break; }
    case "edanim": { edAddLayer(e, "comp", 30, 62, { text: k }); e.recents = [k, ...e.recents.filter(x => x !== k)].slice(0, 6); edRender(); toast(`${k} added to scene ${e.scene + 1}. Drag it to place it`, { label: "Undo", act: "edundo" }); break; }
    case "edanimai": S.ai = true; S.aiDraft = `Make an animation for scene ${e.scene + 1} (${sc.name}): `; render(); aiFocusComposer(); break;
    case "edcomp": edAddLayer(e, "comp", 8, 70, { text: k }); edRender(); toast(`${k} added to scene ${e.scene + 1}. Drag it to place it`, { label: "Undo", act: "edundo" }); break;
    case "edusetpl": if (e.pick) { e[e.pick] = k; toast(`${k} is the default ${e.pick}`); e.pick = ""; e.tab.templates = "tpl"; edRender(); } else { edDo(e, () => { e.scenes.splice(e.scene + 1, 0, edScene(k, `${k}.`, 5, true, sc.voice)); e.scene += 1; }); edRender(); toast(`${k} added as scene ${e.scene + 1}`, { label: "Undo", act: "edundo" }); } break;
    case "eddefault": e[k] = ""; edRender(); toast(`Default ${k} removed`); break;
    case "edsavetpl": dialog(dh("Save clip as template", `Saves scene ${e.scene + 1} with its layout, so you can reuse it.`) + `<div class="db"><label class="field">Template name<input id="edtplname" value="${esc(sc.name)}" maxlength="60"></label></div><div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="edsavetpldo">Save template</button></div>`); break;
    case "edsavetpldo": { const v = (document.querySelector("#edtplname").value || "").trim() || sc.name; closeLayers(); e.savedTpl.push(v); e.tab.templates = "saved"; edRender(); toast(`Saved “${v}” as a template`); break; }
    case "edtrans": { const same = sc.trans === k; edDo(e, () => { sc.trans = same ? "" : k; }); edRender(); toast(same ? "Transition removed" : `${k} between scene ${e.scene + 1} and ${Math.min(e.scene + 2, e.scenes.length)}`); break; }
    case "edcapstyle": e.capStyle = k; e.capsOn = true; edDirty(e); edRender(); toast(`Captions on: ${k}`); break;
    case "edcapvis": e.capsOn = !e.capsOn; edDirty(e); edRender(); break;
    case "edcapdl": edMenu(t, [".srt", ".vtt", ".txt"].map(x => `<button class="mi" data-act="edcapdldo" data-k="${x}">${icon("upload")}Download ${x}</button>`).join("")); break;
    case "edcapdldo": closeLayers(); toast(`Captions downloaded as captions${k}`); break;
    /* canvas */
    case "edsizemenu": edMenu(t, ED_SIZES.map(([l, r]) => `<button class="mi edsizemi" role="menuitemradio" aria-checked="${l === e.size}" data-act="edsetsize" data-k="${esc(l)}">${edRatioIcon(r)}<span class="grow">${esc(l)}</span>${l === e.size ? icon("check") : ""}</button>`).join("")); break;
    case "edsetsize": closeLayers(); e.size = k; edDirty(e); edRender('[data-act="edsizemenu"]'); toast(`Canvas size: ${k}`); break;
    case "edzoommenu": edMenu(t, edRadio(ED_ZOOMS, e.zoom, "edsetzoom"), "right"); break;
    case "edsetzoom": closeLayers(); e.zoom = k; if (k === "Fit") e.pan = [0, 0]; edRender('[data-act="edzoommenu"]'); if (k !== "Fit") toast("Use the Hand tool (H) to move around"); break;
    /* bottom bar */
    case "edstep": edGo(e.scene + +k); break;
    case "edplay": edPlay(!e.playing); { const b = document.querySelector(".edpp"); if (b) b.focus(); } break;
    case "edspeed": edMenu(t, `<div class="lab">Playback speed</div>` + edRadio(ED_SPEEDS, e.speed, "edsetspeed", x => x + "x")); break;
    case "edsetspeed": closeLayers(); e.speed = +k; edRender('[data-act="edspeed"]'); break;
    case "edtl": e.timeline = !e.timeline; e.collapsed = false; edRender(); break;
    case "edskim": edPrefs.skim = !edPrefs.skim; edSavePrefs(); edRender(); toast(edPrefs.skim ? "Skimming on: hover a scene to preview it" : "Skimming off"); break;
    case "edfull": { if (e.playing) edPlay(false); dialog(`<div class="edfullwrap"><div class="edfullstage"><div class="edframe thumb ${edTh(e.scene, sc)}" style="--ar:${(ED_SIZES.find(x => x[0] === e.size) || ED_SIZES[0])[1]}"><span class="edcap">${esc(sc.name)}</span><span class="edsub">${esc(sc.text.split(". ")[0])}</span></div></div><div class="edfullbar"><span>Scene ${e.scene + 1} of ${e.scenes.length} · ${mmss(edStart(e, e.scene))} / ${mmss(T0(e))}</span><span class="grow"></span><button class="btn" data-act="closedlg">Exit full screen<kbd>Esc</kbd></button></div></div>`, "edfulldlg"); break; }
    case "edtlset": edMenu(t, `<div class="lab">Timeline</div>${[["seek", "Click to seek"], ["skim", "Skimming"], ["frames", "Show clip frames"]].map(([pk, l]) => `<button class="mi mi2" role="menuitemcheckbox" aria-checked="${edPrefs[pk]}" data-act="edtlpref" data-k="${pk}"><span class="ck">${edPrefs[pk] ? icon("check") : ""}</span><span class="mt"><span>${l}</span></span></button>`).join("")}`, "right"); break;
    case "edtlpref": closeLayers(); edPrefs[k] = !edPrefs[k]; edSavePrefs(); edRender('[data-act="edtlset"]'); break;
    case "edcollapse": e.collapsed = !e.collapsed; edRender(); break;
    case "edview": e.view = k; e.sel = null; edPlay(false); break;
    case "edjump": edGo(k === "start" ? 0 : e.scenes.length - 1); if (k === "end") { e.t = edTotal(e); render(); } break;
    case "edloop": e.loop = !e.loop; edRender(); break;
    case "edhires": e.hires = !e.hires; edRender(); break;
    case "edundo": edUndo(e, false); break;
    case "edredo": edUndo(e, true); break;
    case "edadd": edDo(e, () => { e.scenes.splice(e.scene + 1, 0, edScene("New scene", "", 5, true, sc.voice)); e.scene += 1; e.panel = "script"; }); render(); setTimeout(() => { const n = document.querySelector(`.edtext[data-i="${e.scene}"]`); if (n) n.focus(); }, 0); toast(`Scene ${e.scene + 1} added. Write its script`); break;
    case "edsplit": edSplit(e); break;
    /* article */
    case "edguidemake": { if (p) p.article = true; e.art = null; render(); toast(`Article written from your ${e.scenes.length} scenes`); break; }
    case "edfmt": edFmtClick(t, k); break;
    case "edslash": edSlashRun(k); break;
    case "edblock": closeLayers(); edFmt("formatBlock", k); break;
    case "edalign": closeLayers(); edFmt({ Left: "justifyLeft", Center: "justifyCenter", Right: "justifyRight" }[k]); break;
    case "edlinkdo": { const v = (document.querySelector("#edlink").value || "").trim(); closeLayers(); if (v) { edFmt("createLink", /^https?:\/\//.test(v) ? v : "https://" + v); toast("Link added"); } break; }
    case "edimg": { closeLayers(); const s = e.scenes[+k]; edFmt("insertHTML", `<figure class="edfig" contenteditable="false" data-i="${k}"><span class="thumb ${edTh(+k, s)}">${esc(s.name)}</span><button class="btn" data-act="edfigmenu" data-i="${k}" aria-haspopup="menu">Replace screenshot</button></figure><p><br></p>`); break; }
    case "edfigmenu": edFig = t.closest("figure"); edMenu(t, `<div class="lab">Use a frame from</div>${e.scenes.map((s, i) => `<button class="mi" data-act="edfigset" data-k="${i}">${icon("image")}Scene ${i + 1}: ${esc(s.name)}</button>`).join("")}<div class="sep"></div><button class="mi" data-act="toast" data-m="Choose an image to upload">${icon("upload")}Upload image</button>`); break;
    case "edfigset": { closeLayers(); if (edFig) { const s = e.scenes[+k]; const th = edFig.querySelector(".thumb"); th.className = "thumb " + edTh(+k, s); th.textContent = s.name; const a = document.querySelector("#edart"); if (a) { e.art = a.innerHTML; edDirty(e); } } toast("Screenshot replaced"); break; }
  }
});
const T0 = e => edTotal(e);
function edFmtClick(t, cmd) {
  if (cmd === "block") return edMenu(t, [["Heading 1", "h2"], ["Heading 2", "h3"], ["Paragraph", "p"]].map(([l, v]) => `<button class="mi" data-act="edblock" data-k="${v}">${l}</button>`).join(""));
  if (cmd === "align") return edMenu(t, ["Left", "Center", "Right"].map(x => `<button class="mi" data-act="edalign" data-k="${x}">${icon("alignLeft")}${x}</button>`).join(""));
  if (cmd === "link") { popover(t, `<div class="edlinkpop"><label class="field">Link<input id="edlink" placeholder="https://" aria-label="Link address"></label><button class="btn dark" data-act="edlinkdo">Add link</button></div>`); const i = document.querySelector("#edlink"); if (i) i.focus(); return; }
  if (cmd === "image") return edMenu(t, `<div class="lab">Insert a frame from</div>${S.ed.scenes.map((s, i) => `<button class="mi" data-act="edimg" data-k="${i}">${icon("image")}Scene ${i + 1}: ${esc(s.name)}</button>`).join("")}`);
  if (cmd === "code") return edFmt("formatBlock", "pre");
  if (cmd === "quote") return edFmt("formatBlock", "blockquote");
  edFmt(cmd);
}
function edSplit(e) { const sc = e.scenes[e.scene]; if (sc.dur < 2) { toast("This scene is too short to split"); return; } const at = Math.max(1, Math.round(e.t - edStart(e, e.scene)) || Math.round(sc.dur / 2)); const parts = sc.text.split(/(?<=\.)\s+/); const half = Math.ceil(parts.length / 2); edDo(e, () => { e.scenes.splice(e.scene, 1, { ...sc, dur: Math.min(at, sc.dur - 1), text: parts.slice(0, half).join(" "), stale: true, voiced: "" }, { ...JSON.parse(JSON.stringify(sc)), name: sc.name + " (2)", dur: sc.dur - Math.min(at, sc.dur - 1), text: parts.slice(half).join(" "), stale: true, voiced: "", layers: [] }); }); render(); toast(`Scene ${e.scene + 1} split in two`, { label: "Undo", act: "edundo" }); }
// Remember the caret in a scene's script, so "Add a pause" goes where the cursor was.
const edCaret = { i: null, pos: null };
document.addEventListener("selectionchange", () => { const s = getSelection(); if (!s.anchorNode) return; const el = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement; const tx = el && el.closest && el.closest(".edtext"); if (tx) { const r = document.createRange(); r.selectNodeContents(tx); r.setEnd(s.anchorNode, s.anchorOffset); edCaret.pos = r.toString().length; edCaret.i = +tx.dataset.i; } });

/* ---------- canvas: tools, selection, drag ---------- */
let edDrag = null;
document.addEventListener("pointerdown", ev => {
  if (route()[0] !== "edit" || !S.ed) return; const e = S.ed;
  if (ev.target.closest(".edrail.edfmt .edtool")) { ev.preventDefault(); edKeepRange(); return; } // keep the article selection
  const tr = ev.target.closest(".edruler, .edtrack"); if (tr && !ev.target.closest(".edcard, .edblk") && edPrefs.seek && ev.button === 0) { const sc2 = document.querySelector(".edscenes").getBoundingClientRect(); const T = edTotal(e); e.t = Math.max(0, Math.min(T, (ev.clientX - sc2.left) / sc2.width * T)); let i = 0; while (i < e.scenes.length - 1 && e.t >= edStart(e, i + 1)) i++; e.scene = i; render(); return; }
  const cv = ev.target.closest(".edcanvas"); if (!cv || ev.button !== 0) return;
  const fr = cv.querySelector(".edframe"); const r = fr.getBoundingClientRect();
  const lay = ev.target.closest(".edlayer");
  if (e.mode === "hand") { edDrag = { kind: "pan", x: ev.clientX, y: ev.clientY, p: [...e.pan] }; cv.classList.add("dragging"); ev.preventDefault(); return; }
  if (ED_TOOLMODES.includes(e.mode)) { if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return; ev.preventDefault(); const x = Math.round((ev.clientX - r.left) / r.width * 100), y = Math.round((ev.clientY - r.top) / r.height * 100); const was = e.mode; const id = edAddLayer(e, was === "text" ? "text" : "shape", Math.min(x, 90), Math.min(y, 90), { shape: e.shape }); e.mode = "select"; render(); if (was === "text") setTimeout(() => { const n = document.querySelector(`.edltext[data-lid="${id}"]`); if (n) { n.focus(); document.execCommand("selectAll", false); } }, 0); return; }
  if (lay) { const l = edCur().layers.find(x => x.id === lay.dataset.lid); if (!l) return; if (ev.target.closest(".edltext[contenteditable=true]")) return; if (e.sel !== l.id) { e.sel = l.id; render(); } edDrag = { kind: "move", id: l.id, x: ev.clientX, y: ev.clientY, o: [l.x, l.y], w: r.width, h: r.height, moved: false }; ev.preventDefault(); return; }
  if (e.sel) { e.sel = null; render(); }
});
document.addEventListener("pointermove", ev => {
  if (!edDrag || !S.ed) return; const e = S.ed;
  if (edDrag.kind === "pan") { e.pan = [edDrag.p[0] + ev.clientX - edDrag.x, edDrag.p[1] + ev.clientY - edDrag.y]; const f = document.querySelector(".edcanvas .edframe"); if (f) f.style.transform = f.style.transform.replace(/translate\([^)]*\)/, `translate(${e.pan[0]}px,${e.pan[1]}px)`); return; }
  const l = edCur().layers.find(x => x.id === edDrag.id); if (!l) return; if (!edDrag.moved) { e.hist.push(edSnap(e)); e.fut = []; edDrag.moved = true; }
  l.x = Math.max(0, Math.min(96, Math.round(edDrag.o[0] + (ev.clientX - edDrag.x) / edDrag.w * 100))); l.y = Math.max(0, Math.min(94, Math.round(edDrag.o[1] + (ev.clientY - edDrag.y) / edDrag.h * 100)));
  const n = document.querySelector(`.edlayer[data-lid="${l.id}"]`); if (n) { n.style.left = l.x + "%"; n.style.top = l.y + "%"; }
});
document.addEventListener("pointerup", () => { if (!edDrag) return; const was = edDrag; edDrag = null; document.querySelectorAll(".edcanvas.dragging").forEach(c => c.classList.remove("dragging")); if (was.moved) { edDirty(S.ed); render(); } });
document.addEventListener("dblclick", ev => { if (route()[0] !== "edit" || !S.ed) return; const lt = ev.target.closest(".edlayer.text"); if (lt) { const n = lt.querySelector(".edltext"); if (n) { n.contentEditable = "true"; n.focus(); } return; } if (ev.target.closest(".edcanvas") && S.ed.mode === "hand") { S.ed.pan = [0, 0]; render(); } });
document.addEventListener("pointerover", ev => { if (!edPrefs.skim || !S.ed || route()[0] !== "edit" || !ev.target.closest) return; const c = ev.target.closest(".edcard"); const f = document.querySelector(".edcanvas .edframe"); if (!c || !f) return; const s = S.ed.scenes[+c.dataset.i]; f.className = f.className.replace(/\bt-[\w-]+/, edTh(+c.dataset.i, s)); f.querySelector(".edcap").textContent = s.name; f.querySelector(".edsub").textContent = s.text.split(". ")[0]; });
document.addEventListener("pointerout", ev => { if (!edPrefs.skim || !S.ed || route()[0] !== "edit" || !ev.target.closest) return; if (ev.target.closest(".edscenes") && !(ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest(".edscenes"))) render(); });

/* ---------- "/" commands, as live's placeholder promises ("press / for commands") ---------- */
let edSlash = null;
const ED_SLASH_SCRIPT = [["pause", "Add a pause", "clock"], ["rewrite", "AI rewrite this scene", "wand"], ["speech", "Generate speech", "mic"], ["voice", "Change voice", "record"]];
const ED_SLASH_ART = [["h2", "Heading 1", "textT"], ["h3", "Heading 2", "textT"], ["ul", "Bullet list", "listUl"], ["ol", "Numbered list", "listOl"], ["quote", "Quote", "quote"], ["code", "Code block", "code"], ["img", "Image from a scene", "image"]];
function edSlashOpen(el) { const sel = getSelection(); if (!sel.rangeCount) return; const r = sel.getRangeAt(0); const rect = r.getBoundingClientRect(); const box = rect.width || rect.height ? rect : el.getBoundingClientRect(); edSlash = { el, node: r.startContainer, off: r.startOffset, art: el.id === "edart" }; const list = edSlash.art ? ED_SLASH_ART : ED_SLASH_SCRIPT; popover({ getBoundingClientRect: () => box }, `<div class="lab">Commands</div>${list.map(([k, l, ic]) => `<button class="mi" data-act="edslash" data-k="${k}">${icon(ic)}${l}</button>`).join("")}`); const f = document.querySelector(".pop .mi"); if (f) f.focus(); }
function edSlashRun(k) { const e = S.ed; const sl = edSlash; edSlash = null; closeLayers(); if (!sl || !document.contains(sl.node)) return; try { const r = document.createRange(); r.setStart(sl.node, Math.max(0, sl.off - 1)); r.setEnd(sl.node, sl.off); if (r.toString() === "/") r.deleteContents(); sl.el.focus({ preventScroll: true }); const c = document.createRange(); const blk = sl.node.parentElement && sl.node.parentElement.closest("p, h2, h3, li, blockquote, pre"); if (sl.art && blk && !blk.textContent.trim()) { blk.innerHTML = "<br>"; c.setStart(blk, 0); } else c.setStart(sl.node, Math.max(0, sl.off - 1)); c.collapse(true); const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(c); } catch (er) {}
  if (sl.art) { e.art = sl.el.innerHTML; edKeepRange(); if (k === "img") { const b = document.querySelector('.edfmt [data-k="image"]'); if (b) edFmtClick(b, "image"); return; } edFmt(...({ h2: ["formatBlock", "h2"], h3: ["formatBlock", "h3"], ul: ["insertUnorderedList"], ol: ["insertOrderedList"], quote: ["formatBlock", "blockquote"], code: ["formatBlock", "pre"] }[k])); return; }
  const i = +sl.el.dataset.i; const s = e.scenes[i]; s.text = sl.el.textContent; e.scene = i;
  if (k === "pause") { edCaret.i = i; edCaret.pos = Math.max(0, sl.off - 1); const b = document.createElement("button"); b.dataset.act = "edpause"; document.body.appendChild(b); b.click(); b.remove(); return; }
  if (k === "rewrite") { edDo(e, () => { s.text = edTighten(s.text); s.stale = true; }); edRender(); toast(`Scene ${i + 1} rewritten. Review it, then generate speech`, { label: "Undo", act: "edundo" }); return; }
  if (k === "speech") { edDirty(e); edVoice([i]); return; }
  if (k === "voice") { render(); const v = document.querySelector(`[data-act="edvoicemenu"][data-i="${i}"]`); if (v) v.click(); }
}

/* ---------- typing ---------- */
// Rename the project from its title: Enter or leaving the field saves; Esc cancels; an empty name keeps the old one.
function edCommitName(input, refocus) { const e = S.ed; if (!e || !e.renaming) return; const p = PROJECTS.find(x => x.id === e.pid); const v = input.value.trim(); e.renaming = false; if (p && v && v !== p.name) { p.name = v; p.mod = "just now"; edDirty(e); toast("Renamed"); } render(); if (refocus) { const b = document.querySelector(".edtitle"); if (b) b.focus({ preventScroll: true }); } }
document.addEventListener("input", ev => {
  if (!S.ed || route()[0] !== "edit") return; const e = S.ed;
  if (ev.inputType === "insertText" && ev.data === "/" && (ev.target.closest(".edtext") || ev.target.id === "edart")) { const el = ev.target.closest(".edtext") || ev.target; const sel = getSelection(); const n = sel.anchorNode, o = sel.anchorOffset; const prev = n && n.nodeType === 3 ? n.textContent.slice(Math.max(0, o - 2), o - 1) : ""; if (!prev || /\s/.test(prev)) setTimeout(() => edSlashOpen(el), 0); }
  if (ev.target.classList && ev.target.classList.contains("edcname")) { const s = e.scenes[+ev.target.dataset.ni]; s.name = ev.target.value; edDirty(e); const c = document.querySelector(`.edcard[data-i="${ev.target.dataset.ni}"] .edcn`); if (c) c.innerHTML = `<b>${+ev.target.dataset.ni + 1}</b> ${esc(s.name)}`; return; }
  if (ev.target.id === "edq") { e.q = ev.target.value; render(); const i = document.querySelector("#edq"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; }
  if (ev.target.id === "edrw") { e.rwith = ev.target.value; return; }
  if (ev.target.id === "edart") { e.art = ev.target.innerHTML; edDirty(e); return; }
  if (ev.target.dataset && ev.target.dataset.lpos) { const l = edCur().layers.find(x => x.id === e.sel); const v = Math.max(0, Math.min(100, parseInt(ev.target.value, 10) || 0)); if (l) { l[ev.target.dataset.lpos] = v; const n = document.querySelector(`.edlayer[data-lid="${l.id}"]`); if (n) n.style[ev.target.dataset.lpos === "x" ? "left" : "top"] = v + "%"; edDirty(e); } return; }
  if (ev.target.dataset && ev.target.dataset.capi != null) { const s = e.scenes[+ev.target.dataset.capi]; s.text = ev.target.value; s.stale = true; edDirty(e); return; }
  const lt = ev.target.closest(".edltext"); if (lt) { const l = edCur().layers.find(x => x.id === lt.dataset.lid); if (l) { l.text = lt.textContent; edDirty(e); } return; }
  const el = ev.target.closest(".edtext"); if (!el) return; if (!el.dataset.dirty) { e.hist.push(edSnap(e)); e.fut = []; el.dataset.dirty = "1"; } const s = e.scenes[+el.dataset.i]; s.text = edReadText(el); s.stale = s.text !== s.voiced || s.stale; edDirty(e); clearTimeout(edRetype); edRetype = setTimeout(() => edRefreshText(el), 700);
});
// After a typing pause, redraw the box so new words turn blue, and put the caret back where it was.
let edRetype = null;
function edRefreshText(el) { if (!document.contains(el) || document.activeElement !== el || edSlash) return; const i = +el.dataset.i; const sel = getSelection(); let pos = 0; if (sel.rangeCount && el.contains(sel.anchorNode)) { const r = document.createRange(); r.selectNodeContents(el); r.setEnd(sel.anchorNode, sel.anchorOffset); pos = r.toString().length; } el.innerHTML = edScriptHTML(S.ed.scenes[i], (S.ed.q || "").trim().toLowerCase()); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, left = pos, set = false; while ((n = w.nextNode())) { if (n.parentElement.closest(".edtok")) { left -= n.textContent.length; continue; } if (left <= n.textContent.length) { const r = document.createRange(); r.setStart(n, Math.max(0, left)); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); set = true; break; } left -= n.textContent.length; } if (!set) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); } const b = document.querySelector(".edbanwrap"); if (b) b.innerHTML = edBanner(S.ed); }
document.addEventListener("focusin", ev => { if (ev.target.classList && ev.target.classList.contains("edcname") && S.ed && +ev.target.dataset.ni !== S.ed.scene) { S.ed.scene = +ev.target.dataset.ni; S.ed.t = edStart(S.ed, S.ed.scene); document.querySelectorAll(".edsc").forEach(c => c.classList.toggle("on", c.querySelector(".edcname") === ev.target)); } });
document.addEventListener("focusin", ev => { const el = ev.target.closest && ev.target.closest(".edtext"); if (el && S.ed && +el.dataset.i !== S.ed.scene) { S.ed.scene = +el.dataset.i; S.ed.t = edStart(S.ed, S.ed.scene); document.querySelectorAll(".edcard").forEach((c, i) => { c.classList.toggle("on", i === S.ed.scene); c.setAttribute("aria-selected", i === S.ed.scene); }); document.querySelectorAll(".edsc").forEach((c, i) => c.classList.toggle("on", i === S.ed.scene)); } });
document.addEventListener("focusout", ev => {
  if (!S.ed || route()[0] !== "edit") return;
  if (ev.target.classList && ev.target.classList.contains("edcname")) { const s = S.ed.scenes[+ev.target.dataset.ni]; if (s && !s.name.trim()) { s.name = `Scene ${+ev.target.dataset.ni + 1}`; setTimeout(render, 0); } }
  if (ev.target.id === "edtitle" && S.ed.renaming) edCommitName(ev.target, false);
  const lt = ev.target.closest && ev.target.closest(".edltext"); if (lt) { const l = edCur().layers.find(x => x.id === lt.dataset.lid); if (l && !l.text.trim()) { edDo(S.ed, () => { edCur().layers = edCur().layers.filter(x => x !== l); }); S.ed.sel = null; setTimeout(render, 0); } }
});
document.addEventListener("keydown", ev => {
  if (route()[0] !== "edit" || !S.ed) return; const e = S.ed; const a = document.activeElement; const typing = a && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName));
  if (a && a.id === "edtitle") { if (ev.key === "Enter") { ev.preventDefault(); edCommitName(a, true); } if (ev.key === "Escape") { ev.stopPropagation(); e.renaming = false; render(); const b = document.querySelector(".edtitle"); if (b) b.focus(); } return; }
  if (a && a.classList && a.classList.contains("edcname") && (ev.key === "Enter" || ev.key === "Escape")) { ev.preventDefault(); const s = e.scenes[+a.dataset.ni]; if (!s.name.trim()) { s.name = `Scene ${+a.dataset.ni + 1}`; } a.blur(); render(); return; }
  if (a && a.id === "edrw" && ev.key === "Enter") { const b = document.querySelector('[data-act="edrepdo"][data-k="one"]'); if (b) b.click(); return; }
  if (a && a.id === "edlink" && ev.key === "Enter") { const b = document.querySelector('[data-act="edlinkdo"]'); if (b) b.click(); return; }
  if (a && a.closest && a.closest(".edltext") && ev.key === "Escape") { a.blur(); return; }
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "j") { ev.preventDefault(); const b = document.querySelector("#aibtn"); if (b) b.click(); return; }
  if (typing || document.querySelector(".scrim, .pop")) return;
  if (ev.key === " " && e.view !== "guide" && !(a && /BUTTON|A/.test(a.tagName) && !a.classList.contains("edcard"))) { ev.preventDefault(); edPlay(!e.playing); }
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); edUndo(e, ev.shiftKey); return; }
  if (ev.metaKey || ev.ctrlKey || ev.altKey || e.view === "guide") return;
  if (ev.key === "Escape" && (e.sel || e.mode !== "select")) { ev.stopPropagation(); e.sel = null; e.mode = "select"; edRender(); return; }
  if ((ev.key === "Backspace" || ev.key === "Delete") && e.sel) { ev.preventDefault(); edDo(e, () => { edCur().layers = edCur().layers.filter(x => x.id !== e.sel); }); e.sel = null; edRender(); toast("Element deleted", { label: "Undo", act: "edundo" }); return; }
  if (e.sel && ev.key.startsWith("Arrow")) { ev.preventDefault(); const l = edCur().layers.find(x => x.id === e.sel); const d = ev.shiftKey ? 4 : 1; edDo(e, () => { if (ev.key === "ArrowLeft") l.x -= d; if (ev.key === "ArrowRight") l.x += d; if (ev.key === "ArrowUp") l.y -= d; if (ev.key === "ArrowDown") l.y += d; }); render(); return; }
  if ((ev.key === "ArrowRight" || ev.key === "ArrowLeft") && a && a.closest(".edscenes")) { ev.preventDefault(); edGo(e.scene + (ev.key === "ArrowRight" ? 1 : -1)); return; }
  const key = ev.shiftKey ? ev.key.toUpperCase() : ev.key.toLowerCase();
  const tools = { v: "select", h: "hand", t: "text", r: "shapes" }; if (tools[key]) { e.mode = tools[key]; if (key === "r") e.shape = "Rectangle"; e.sel = null; edRender(); return; }
  const shapes = { o: "Ellipse", p: "Polygon", l: "Line", A: "Arrow", S: "Star" }; if (shapes[key]) { e.mode = "shapes"; e.shape = shapes[key]; edRender(); return; }
  if (key === "x") { edSplit(e); return; }
  if (key === "s") { edPrefs.skim = !edPrefs.skim; edSavePrefs(); edRender(); toast(edPrefs.skim ? "Skimming on" : "Skimming off"); return; }
  if (key === "c") { const b = document.querySelector('[data-act="edcomments"]'); if (b) b.click(); return; }
  if (ev.key === "," || ev.key === "." || ev.key === "<" || ev.key === ">") { const fwd = ev.key === "." || ev.key === ">"; const step = ev.shiftKey ? 1 : 1 / 30; e.t = Math.max(0, Math.min(edTotal(e), e.t + (fwd ? step : -step))); let i = 0; while (i < e.scenes.length - 1 && e.t >= edStart(e, i + 1)) i++; e.scene = i; render(); }
});
// A "/" menu closed with Esc or a click elsewhere is forgotten, so the editor goes back to saving and re-rendering normally.
["keyup", "pointerup"].forEach(t => document.addEventListener(t, () => setTimeout(() => { if (edSlash && !document.querySelector(".pop")) edSlash = null; }, 0)));
addEventListener("resize", () => { if (S.ed && document.querySelector(".ed") && edTier() !== edLastTier) render(); else edMeasure(); });

/* ---------- tooltips ----------
   Names on hover and keyboard focus, as live's tooltips. They are drawn in one fixed layer above the page, so a scrolling
   panel or a card edge never clips them (the CSS ::after version was cut off at the script panel's edge), and they are kept
   on screen: right of the rail, above the timeline and panel footers, below everything else, flipping when there's no room. */
const edTip = (() => { const t = document.createElement("div"); t.className = "edtip"; t.setAttribute("aria-hidden", "true"); t.hidden = true; document.body.appendChild(t); return t; })();
let edTipFor = null;
function edTipShow(el) {
  const txt = el.dataset.tip; if (!txt) return; edTipFor = el; edTip.textContent = txt; edTip.hidden = false;
  const r = el.getBoundingClientRect(), w = edTip.offsetWidth, h = edTip.offsetHeight, gap = 6, m = 8;
  let side = el.closest(".edrail") && innerWidth > 900 ? "right" : el.closest(".edbottom, .edpf") ? "top" : "bottom";
  if (side === "bottom" && r.bottom + gap + h > innerHeight - m) side = "top";
  if (side === "top" && r.top - gap - h < m) side = "bottom";
  let x, y;
  if (side === "right") { x = r.right + gap + 2; y = r.top + r.height / 2 - h / 2; if (x + w > innerWidth - m) { side = "bottom"; } }
  if (side !== "right") { x = r.left + r.width / 2 - w / 2; y = side === "top" ? r.top - gap - h : r.bottom + gap; }
  x = Math.min(Math.max(m, x), innerWidth - w - m); y = Math.min(Math.max(m, y), innerHeight - h - m);
  edTip.style.left = Math.round(x) + "px"; edTip.style.top = Math.round(y) + "px";
}
function edTipHide() { edTipFor = null; edTip.hidden = true; }
const edTipTarget = n => n && n.closest && n.closest(".ed [data-tip], .edvh [data-tip]");
document.addEventListener("pointerover", ev => { if (ev.pointerType === "touch") return; const t = edTipTarget(ev.target); if (t && t !== edTipFor && !t.disabled) edTipShow(t); else if (!t && edTipFor) edTipHide(); });
document.addEventListener("pointerout", ev => { if (edTipFor && !(ev.relatedTarget && edTipFor.contains(ev.relatedTarget))) { const t = edTipTarget(ev.relatedTarget); if (t) edTipShow(t); else edTipHide(); } });
document.addEventListener("focusin", ev => { const t = edTipTarget(ev.target); if (t && t.matches(":focus-visible")) edTipShow(t); else edTipHide(); });
document.addEventListener("focusout", () => edTipHide());
document.addEventListener("pointerdown", () => edTipHide(), true);
// On scroll, follow the control; hide only when it has scrolled out of sight.
document.addEventListener("scroll", () => { if (!edTipFor) return; if (!document.contains(edTipFor)) return edTipHide(); const r = edTipFor.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !r.width) edTipHide(); else edTipShow(edTipFor); }, true);
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && edTipFor) edTipHide(); }, true);
addEventListener("hashchange", edTipHide);
