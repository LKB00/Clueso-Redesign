/* Clueso redesign prototype. Hash-routed, no build step. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const S = {
  user: { first: "Alex", last: "Rivera", email: "alex.rivera@gmail.com", ini: "AR" },
  goals: new Set(), role: "", brandSet: false, brandUrl: "",
  collapsed: false, ai: false, showFix: false, fixList: false,
  credits: { used: 255, total: 1000 }, minutes: { used: 0, total: 10 },
  checklist: { account: true, video: false, brand: false, share: false },
  mode: "Ask", model: (() => { try { const m = localStorage.getItem("clueso-proto-model"); return /^(opus|sonnet|astra|sol|luna|terra|kimi|glm|deepseek)$/.test(m || "") ? m : "sonnet"; } catch (e) { return "sonnet"; } })(), brandOn: false, prompt: "",
  projTab: "all", expanded: new Set(["p1", "p2"]),
  libTab: "styles", setPage: "general", langTab: "pron",
};

const GOALS = [
  ["demo", "record", "Product demos and walkthroughs", "Show your customers how your product works"],
  ["training", "users", "Training videos", "Train your team on any tool or process"],
  ["marketing", "bolt", "Marketing videos", "Create fast-paced videos for your product launches"],
  ["sop", "doc", "SOPs or step-by-step guides", "Get step-by-step documentation from any video"],
  ["slides", "slides", "Videos from slide decks", "Convert your PPTs or documents into narrated videos"],
  ["translate", "translate", "Translate videos", "Localize your videos into any other language"],
  ["animation", "wand", "Motion graphics", "Build standalone animations from simple prompts"],
];

// Clueso Home's "Or start directly" (17 Oct 2026): Record your screen, Upload videos, Upload slide decks, Translate.
// Kept, with the two uploads as one (one drop zone takes both). New project menu, as Clueso: blank first.
const CREATE = [
  { k: "record", ic: "record", label: "Record your screen", desc: "Walk through your product and talk. Clueso writes the script, voice and steps.", goals: ["demo", "sop", "training"] },
  { k: "upload", ic: "upload", label: "Upload videos or slides", desc: "A recording, slide deck, document or image.", goals: ["demo", "training", "sop", "slides"] },
  { k: "translate", ic: "translate", label: "Translate a video", desc: "Upload one or pick a project, choose the language.", goals: ["translate", "marketing", "animation"] },
  { k: "blank", ic: "plus", label: "Start blank project", desc: "Build it yourself in the editor.", goals: [], menuOnly: true },
];
// Credit figures used in the prototype, all from Clueso itself:
// 250 = a 57-second video built with the most capable model (observed, 16 Oct 2026)
// 150 = Clueso's own estimate per video in the "Which ones should I make?" picker (observed)
// "about half" = help center, Clueso Agent best practices: a smaller model "costs about half as much per message"
const COST = { Best: "150–250", Fast: "75–125" };
// Clueso's model list, exactly as its "Director model" menu shows it (17 Oct 2026). "eff" marks the two models Clueso
// itself describes as "fast, cost-efficient"; the help center says a smaller model costs "about half as much per message".
const MODELS = [
  { k: "opus", n: "Opus 5.5", v: "anthropic", g: "Anthropic", d: "Anthropic's most capable model" },
  { k: "sonnet", n: "Sonnet 5.5", v: "anthropic", g: "Anthropic", d: "Anthropic's general-purpose model" },
  { k: "astra", n: "Astra 6", v: "openai", g: "OpenAI", d: "OpenAI's most capable model" },
  { k: "sol", n: "Sol 6.1", v: "openai", g: "OpenAI", d: "OpenAI's flagship model" },
  { k: "luna", n: "Luna 6", v: "openai", g: "OpenAI", d: "OpenAI's fast, cost-efficient model", eff: true },
  { k: "terra", n: "Terra 5.6", v: "openai", g: "OpenAI", d: "OpenAI's balanced model" },
  { k: "kimi", n: "Kimi K3", v: "moonshot", g: "Open models · hosted by Baseten", d: "Moonshot AI's most capable open model" },
  { k: "glm", n: "GLM 5.3", v: "zai", g: "Open models · hosted by Baseten", d: "Z.ai's balanced open model" },
  { k: "deepseek", n: "DeepSeek V4.1 Flash", v: "deepseek", g: "Open models · hosted by Baseten", d: "DeepSeek's fast, cost-efficient open model", eff: true },
];
const modelPillMini = () => `<b>${curModel().n}</b>`;
const curModel = () => MODELS.find(m => m.k === S.model) || MODELS[1];
const costRange = () => curModel().eff ? COST.Fast : COST.Best;
const replyCr = () => curModel().eff ? 7 : 13; // 13 = one clarifying reply, observed
const videoCr = () => curModel().eff ? 125 : 250; // 250 = a 57-second video, observed
// Edge cases: a build needs at least the low end of its estimate; a reply needs its per-reply cost.
const lowCost = () => +costRange().split("–")[0];
// Credits work as on live from the first video (20 Oct 2026, the user's call: a free first video was our proposal, not Clueso's
// policy). The credit anxiety it addressed is handled by translating credits into videos ("1,000 credits · about 5 videos").
// freeFirst stays as a switch: if Clueso decides to make the first video free, turning it on restores every "on us" path.
// First run (layout): nothing ever built.
const firstRun = () => !PROJECTS.some(p => !p.sample) && !S.generating;
const FREE_FIRST_VIDEO = false;
const freeFirst = () => FREE_FIRST_VIDEO && !PROJECTS.some(p => !p.sample && !p.cancelled && !p.failed) && !S.generating; // a failed or cancelled build doesn't use up the free video
// Credits in words: a video costs about 150–250 credits on the default model (observed), so about 200 each
const videosFor = n => Math.max(0, Math.round(n / ((lowCost() + +costRange().split("–").pop()) / 2)));
const credWords = n => `${n.toLocaleString("en-US")} credits · about ${videosFor(n)} video${videosFor(n) === 1 ? "" : "s"}`;
const canBuild = () => freeFirst() || credLeft() >= lowCost();
const outOfCredits = () => credLeft() < replyCr();
const shortNote = () => `Not enough credits: about ${costRange()} needed, ${credLeft().toLocaleString("en-US")} left. ${curModel().eff ? "" : "A cost-efficient model needs about " + COST.Fast + ". "}`;
function modelPill(extra = "") { const m = curModel(); return `<button class="pill mpill" data-act="model" aria-haspopup="menu" aria-label="Model: ${m.n}" title="${m.d}" ${extra}>${icon("v" + m.v)}<span>${m.n}</span>${icon("chevDown")}</button>`; }
function modelMenu() {
  const groups = [...new Set(MODELS.map(m => m.g))];
  return groups.map(g => `<div class="lab">${g}</div>${MODELS.filter(m => m.g === g).map(m => `<button class="mi mi2" role="menuitemradio" aria-checked="${S.model === m.k}" data-act="setmodel" data-k="${m.k}"><span class="ck">${S.model === m.k ? icon("check") : ""}</span>${icon("v" + m.v)}<span class="mt"><span>${m.n}${m.eff ? ` <span class="efftag">Cost-efficient</span>` : ""}</span><small>${m.d}</small></span></button>`).join("")}`).join("")
    + `<div class="sep"></div><div class="lab mnote">Cost-efficient models use about half the credits a message (Clueso help center). A video is about ${COST.Best} credits on the others.</div>`;
}

const SUGGEST = {
  demo: ["Walk through our sign-up flow in 60 seconds", "Show how to create a first project"],
  training: ["Train new managers on our weekly review", "Explain our expense policy to new hires"],
  marketing: ["30-second teaser for our new dashboard", "Launch video for our mobile app"],
  sop: ["Turn our refund process into a how-to article", "Document how to reset a customer password"],
  slides: ["Narrate my sales deck in a friendly tone"],
  translate: ["Make a Spanish version of my latest video"],
  animation: ["Animate our logo with a soft reveal", "Kinetic text: 3 reasons teams switch"],
  none: ["Walk through our sign-up flow in 60 seconds", "Turn our refund process into a how-to article", "30-second teaser for our new dashboard"],
};

const PROJECTS = [
  { id: "p1", name: "Taskly – Track Tasks Together (Product Demo)", type: "AI video", th: "t-plum", label: "Work is everywhere.", dur: "0:57", mod: "12 min ago", created: "54 min ago", chat: "Taskly product demo", article: false,
    versions: [{ id: "p1es", name: "Taskly – Seguimiento de Tareas en Equipo", lang: "Spanish", dur: "0:59", mod: "5 min ago" }], madeFrom: [] },
  { id: "p2", name: "Taskly Onboarding for New Managers", type: "Slides", th: "t-white", label: "Taskly onboarding", dur: "0:20", mod: "15 min ago", created: "15 min ago", chat: "Video ideas", article: true,
    versions: [], madeFrom: [
      { id: "p3", name: "3-step Taskly onboarding for new managers", kind: "Training video", th: "t-ink", dur: "1:42", mod: "4 min ago" },
      { id: "p4", name: "Why weekly reviews keep tasks on track", kind: "Animated explainer", th: "t-ink", dur: "0:48", mod: "3 min ago" }] },
  { id: "p5", name: "Add a task in Taskly", type: "Recording", th: "t-blue", label: "Add a task", dur: "0:18", mod: "1 h ago", created: "1 h ago", chat: null, article: true, versions: [], madeFrom: [] },
];
// Progress survives a reload, like a real account. The first-video step is true whenever the workspace has a video.
const PROGRESS_KEY = "clueso-proto-progress";
try { const sv = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null"); if (sv) { Object.assign(S.checklist, sv.checklist || {}); ["gsHidden", "brandSet", "brandOn", "brandUrl"].forEach(k => { if (k in sv) S[k] = sv[k]; }); if (sv.minutesUsed) S.minutes.used = sv.minutesUsed; } } catch (e) {}
S.checklist.video = S.checklist.video || PROJECTS.length > 0;
function saveProgress() { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ checklist: S.checklist, gsHidden: !!S.gsHidden, brandSet: S.brandSet, brandOn: S.brandOn, brandUrl: S.brandUrl, minutesUsed: S.minutes.used })); } catch (e) {} }

const STYLES = [
  ["Chapter-based Product Tutorial", "t-ink", "Product tutorial", "A step-by-step walkthrough with chapter tracking and animated transitions. Upload one recording and it splits into chapters with zooms and callouts.", ["A screen recording"], "150"],
  ["Narrated Product Teaser", "t-white", "Then grows it.", "Alternates crisp statement slides with real screen recordings.", ["A screen recording", "A short script or topic"], "120"],
  ["Product Marketing Teaser", "t-cobalt", "What if it just took a photo?", "A cobalt-on-white montage: hook on the pain, reveal the product, show it working, name who it's for. About a minute.", ["Product name and audience", "Optional: screenshots or a recording"], "150"],
  ["Hero Product Marketing Video", "t-plum", "Hook, demo, proof, close", "A complete 72-second product story. Record once, drop in customer logos.", ["A screen recording", "Customer logos (optional)"], "180"],
  ["Narrated Feature Launch", "t-sand", "Build an app. With a sentence.", "Give a new feature a cinematic reveal in your own words.", ["A recording of the feature"], "140"],
  ["Launch Announcement – Patchwork", "t-ink", "Patchwork", "A punchy, music-driven teaser for launch day. No voiceover.", ["A topic"], "90"],
  ["Product Tutorial – Customer Education", "t-teal", "Submitting an expense report", "An editorial walkthrough with deep-teal branding and spotlight-driven demo.", ["A screen recording"], "150"],
  ["Minimal Kinetic Animation", "t-ink", "For more than a decade", "Eight animated scenes of geometric motion. Just a topic and a brand color.", ["A topic", "A brand color"], "100"],
];

// Numbered improvements per screen: [what changed, audit findings, evidence].
// Evidence types: "Clueso:" = Clueso's own site, pricing, help center or app; "Research:" = cited UX source; "Proposal:" = needs validation.
const FIXES = {
  s1: [
    ["One question that decides the first video: what you need right now (single choice, a tap moves on). Role, workspace name and goals lists are gone: none of them changed what you saw.", "B1, B7, B12, O1", "Research: Appcues, segment by the job to be done and branch the first steps; ask only what changes the path. Observed: Clueso asks goals, name, role and workspace before anything happens."],
    ["The reason is on the screen (\"so your first video starts with the right structure and example\"), and the answer sets the next two screens, the brief, the Clueprint and Home's suggestions.", "O2, O3", "Research: answers must change the experience (Appcues, Userpilot); NN/g, explain why you ask."],
    ["\"Just exploring?\" opens a labelled sample project in the editor instead of an empty Home.", "B13", "Research: empty states and sample content as onboarding (NN/g, Smashing). Observed: Clueso's \"I'm just exploring\" lands on an empty Home."],
  ],
  s2: [
    ["The second question is what you have to start with: record now, a recording, slides or a doc, or just an idea. In Clueso this decides the whole first step, more than role or goal. The usual choice for your video is marked.", "O2, P1", "Clueso's own creation paths: record, upload video, upload slides, prompt. Research: branch on the signal that predicts the path to value (Appcues)."],
    ["Replaces the \"Here's what Clueso does\" screen, which was a tutorial.", "G5", "Research: NN/g, deck-of-cards tutorials didn't improve task success (91% vs 94%) and made tasks feel harder (SEQ 4.92 vs 5.49)."],
  ],
  s3: [
    ["The third screen is the first video itself, not an explanation: record (with a live timer), choose a file, or edit a brief written for your video type. Recording needs nothing installed.", "B13, P1", "Research: onboarding ends at value (aha), not at setup; AI products shouldn't open on a blank box. Observed: Clueso's recorder needs an extension it springs on you mid-flow."],
    ["Your website (optional) pulls your logo and colours, so the first video looks like yours.", "C4", "Clueso: \"Switch to your work email so your videos are on-brand\" (brand from your domain)."],
    ["What you'll get (an example for your video type and its Clueprint) and the cost are shown before anything runs; Make my video says why it's off until you've given it something.", "B9, E1", "Research: Google PAIR, set expectations; Nielsen #1 and #5."],
  ],
  signin: [
    ["Visible labels tied to inputs; Forgot password moved below the password so Tab goes email → password → Sign in.", "A1, A2", "Observed: inputs had no label, name or autocomplete, and the link sat between them. Research: WCAG 1.3.1 and 2.4.3."],
    ["One static customer quote instead of an auto-scrolling wall that included unrelated tiles.", "A3", "Observed: tiles titled \"Meet Claude Cowork\" and \"How to create playlists in Spotify\". Research: Laws of UX, cognitive load."],
    ["Terms and privacy stated at sign-up.", "A5", "Observed: no consent line on the form; links exist only on clueso.io."],
  ],
  create: [
    ["Clueso's own start options, each with one line on what it does: Record your screen, Upload videos or slides (its two upload buttons share one drop zone, as both dialogs already accept files), and Translate a video. The New project menu keeps Clueso's order, blank project first.", "D13, N8, N10, P2", "Clueso Home (live, 17 Oct 2026): \"Or start directly\" with Record your screen, Upload videos, Upload slide decks, Translate; New project menu: Start blank project, Record screen, Upload videos, Upload PPT/PDF. Research: Hick's law for merging the two uploads."],
    ["Clueso\'s full model list stays on every composer (Home, the panel, the Clueso AI page), as one control: the pill shows the vendor mark and model, and the menu groups the nine models by vendor (Anthropic, OpenAI, open models hosted by Baseten) with Clueso\'s own descriptions. The two models Clueso calls cost-efficient are tagged, and every estimate follows the chosen model. One remembered default everywhere. (An earlier Fast/Best switch removed a real choice and was reverted.)", "C1, C10", "Clueso: \"Director model\" menu lists 9 models with no cost, defaulting to Sonnet 5.5 in chat and Opus 5.5 on Home; the help center says a smaller model costs about half per message; observed 250 credits for a video and 13 for a reply. Research: Nielsen #3 user control; chunking (grouped options); HAX G2 (make clear how well the system can do)."],
    ["The brand is shown, not named, wherever it is chosen or used. The composer pill carries a four-colour swatch of the active kit and its name (\"Clueso default\" until you add one). Its picker previews each kit: logo, its four colours and font. The plan card shows the same preview and can switch it. The Brand kit page follows Clueso's own layout and Preview card, and with no kit it previews the Clueso default you would be replacing. Clueso never builds a brand from an email domain, and nothing is appended to your brief.", "C2, G1", "Observed: the brand kit chip was on by default with a made-up kit, and \"Use our brand kit.\" was added to the prompt."],
    ["The cost estimate and credits left show before sending, from the first video. With nothing typed, credits are put in videos: \"1,000 credits · about 5 videos\".", "B20, E5, A3", "Clueso: its idea picker already shows \"about 150 credits\" per video; a 57-second video used 250. Research: Shape of AI cost estimates."],
    ["The suggestion sits inside the empty prompt with a Tab key to accept it, and rotates. That's Clueso's own pattern, with suggestions from your onboarding answer instead of \"Make a video explaining how Facebook works\". It replaces a row of chips. It animates as Clueso's does: each character blurs out and the next suggestion blurs in, letter by letter, and the box glows pink while you type.", "B19, P2", "Clueso: observed placeholder with a Tab hint; measured its promptCharVanish (400 ms, blur 4px, 6px drift) and promptCharMaterialize (450 ms, blur 10px, 20 ms stagger) keyframes and its focused border (pink-50, 0 0 10px 2px glow, 150 ms). Motion is off under reduced-motion. Research: NN/g prompt suggestions should be contextual; cognitive load (no extra row)."],
    ["Getting started is one quiet line right under the composer, about the next video you make: \"2 of 4 done · Next: add your brand\". The next step is a link (Brand kit, or Share), not pink, since brand is optional. It appears once the first video exists (the prompt is that step) and goes at 4 of 4; hiding it keeps progress, with Undo.", "C4, O8, P6", "Research: Appcues (3 to 5 items, complete on real events); endowed progress (Nunes and Drèze, 2006)."],
    ["One compact usage line (export minutes and credits) links to Plan and usage, replacing a two-meter card and an upgrade ad. A bar appears only when credits run low, showing what is left.", "C5, C6", "Research: Loom and Tango show free limits as one counter (competitor benchmark); cognitive load."],
    ["Clueso AI stays in the header on every page.", "C12", "Observed: the button disappeared on Home."],
    ["The composer keeps Clueso's controls, with its record button folded into + (Record your screen first, then Attach files, Add a project, Add a Clueprint): both add source material, \"Choose recording\" duplicated Attach files, and Record your screen is also a card right below. Then check-in mode (Ask, Plan, Auto, with Clueso's descriptions), model and brand. Ask and Plan stop at a plan card with the cost; Auto builds as soon as you send, with the cost shown beside Send first. No sale banner, survey or footer links. What's new moves from a sidebar card into Help, and Help stays in the top bar where Clueso has it.", "C3, C6, O9, P14", "Clueso: mode labels from its own menu. Observed: seven attention-seekers on first load. Research: progressive disclosure; ProductLed, no pricing before value."],
    ["First visit, no wizard: a 40-second before/after (a rough recording becoming a finished video) plays muted, the composer is ready with optional example starters (Product demo, How-to article, Training video, Launch teaser) that fill an editable brief, and the starts are ordered by effort: describe it, drop a file anywhere, or record (\"about 2 minutes, open your product first\"; on a phone, a link to record on your computer). Your cost shows in credits and videos (\"about 5 videos\"). Greeting by name only when Google gave us the name. Explorers open the sample in the editor.", "B1, B7, B12, B13, O1", "Research: NN/g, tutorials don't improve success and make tasks feel harder; onboarding ends at value; ask only what changes the path (Appcues); loss aversion. Proposal: first video free needs Clueso's confirmation."],
    ["Search (⌘K) keeps Clueso's fixed 680 × 480 frame with the input pinned at the top, its scopes and p; n; a; prefixes, and Tab to ask AI. When empty it shows recent projects and quick actions instead of a blank panel. It lists only real matches, highlighted and ranked, with at most 5 per group and \"Show all\". When nothing matches it says so and offers Ask AI or Create. Old names (Chats, MCP, Styles) find their new home.", "N12", "Observed on web.clueso.io: the empty panel is blank; \"xyzq\" still returns 5 projects; \"brand\" returns Home; Navigation is always listed first. Research: Nielsen #6 recognition over recall; NN/g search results (relevance, highlight the query, a useful no-results page); Hick's law; WAI-ARIA combobox pattern for ↑↓ and Enter."],
    ["A build keeps its status in the top bar on every page (\"Building · 2 of 6\"), and its finish toast has an Open button that waits 6 s and pauses on hover. Toasts are read out by screen readers; dialogs keep keyboard focus inside and return it when closed.", "A5, G5", "Research: Nielsen #1 visibility of system status; WCAG 2.2.1 timing, 4.1.3 status messages and 2.4.3 focus order; WAI-ARIA dialog pattern."],
    ["Clueso AI keeps Clueso's three views, names and icons (Sidebar, Floating, Full screen), and each now works: Sidebar (the default on wide screens) keeps the top bar intact, Floating floats, and Full screen expands in place without leaving the page. The choice is remembered, the header icon shows it, and each option's description is visible instead of hidden in a tooltip. The composer mirrors Clueso's row (+, check-in mode, model). The title becomes an editable conversation name, starters sit just above the composer, and the low-credit banner appears only under 150 credits. It names the page or video it is on, offers chips for that page, runs chips a button can do (translate, write the article, record) directly with no credits, shows credits per reply before sending, attaches context with Clueso's + menu, moves focus to the composer, and Escape closes one layer at a time.", "N14, N15", "Clueso (live, 17 Oct 2026): View mode Sidebar / Floating / Full screen; full screen routes to /home/chat; sidebar hides New project; same 3 chips everywhere; Escape on a menu closes the panel; a reply cost 13 credits. Research: HAX G3, G4; Shape of AI cost estimates; Nielsen #3; WAI-ARIA."],
  ],
  projects: [
    ["Language versions and AI spin-offs are grouped under their source.", "N4", "Observed: the Spanish copy and the two PDF spin-offs were loose, unlinked projects."],
    ["Rows show only what helps you pick: name, type, article, a version count, length and when it was edited. The owner and versions columns are dropped for a one-person workspace.", "H7, N3", "Research: cognitive load; NN/g, show information when it supports a decision."],
    ["One Filter button replaces seven filters.", "H6, H7", "Observed: the filter bar clipped New folder at 1294 px."],
    ["Search filters projects, their language versions and spin-offs as you type, bolds the match, and says so when nothing matches.", "N4, N12", "Observed: the prototype's search box did nothing. Research: NN/g search (highlight the query, a useful no-results page)."],
    ["Every Projects ability Clueso has, in fewer controls: sortable Name, Length and Edited headers instead of a sort menu that repeats them; one Filter with removable chips; a row menu (copy link, rename, duplicate, pin, move, delete) that shows on hover and keyboard focus; titles that are real links for opening in a new tab; and a Deleted tab that keeps projects 30 days, with Undo on delete.", "N16", "Clueso (live, 17 Oct 2026): All/Deleted tabs (30 days), 5 filters, 8 sort options, a 9-item row menu shown on hover only, New folder clipped. Research: Jakob's law (sortable headers); Hick's law; NN/g, undo over confirmation; WCAG 2.1.1 keyboard."],
  ],
  project: [
    ["One project page with three things beside the video: its article, its versions (languages and spin-offs together), and a link to its analytics.", "N3, N4", "Research: Dan Brown, objects (one home per object); cognitive load, fewer boxes."],
    ["Scene-by-scene progress with an estimate; leave and get notified.", "G5, A5, A10", "Observed: a 9 min 37 s build with only elapsed time. Research: Nielsen \"Slow AI\" three-layer progress; NN/g, waits over 10 s need percent-done."],
    ["\"Generate article\" when a video has no article yet.", "F14, N8", "Clueso pricing: \"Generate step-by-step guides/documentation\" is on Free. Observed: articles were blank, behind a Prompt hub."],
    ["A breadcrumb shows where you are.", "N2", "Research: Dan Brown, front doors."],
    ["When a build finishes, the project page leads with \"Your video is ready\" and Share link, with the export-minute cost in the same line.", "P10, A5", "Research: peak-end rule (the finished video is the peak); Lenny's Newsletter: activation is the first shared link; Nielsen #1 visibility of system status."],
  ],
  library: [
    ["Clueprints and Brand kit stay two pages, as in Clueso. Clueprints keeps Clueso's Community and Workspace tabs, search and New Clueprint, with nothing locked that Clueso leaves open.", "D11, I7", "Clueso (live, 17 Oct 2026): Clueprints has Workspace and Community tabs and New clueprint on the Free plan; clip templates, components and media are managed in the editor."],
    ["Brand kit has every field Clueso has: pull again from your website, logo variants, the four colors (Text, Backgrounds, Accent, Accent 2), title and body font, tone of voice, Save changes. It starts empty until you give a website.", "C2, C7", "Clueso (live): the same fields. Observed: Clueso filled the kit from gmail.com."],
    ["The Clueprint detail says what you need, and a short brief replaces a paid clarifying chat.", "N5", "Observed: \"Create video\" sent a chat that charged 13 credits to ask for the brief."],
  ],
  integrations: [
    ["Things you set up once (extension, MCP, code connections) live in one place at the bottom of the sidebar.", "D10", "Research: Microsoft settings guidance, rarely changed items go last. Clueso: GitHub and Bitbucket \"power your video agents\" (Connections page)."],
  ],
  settings: [
    ["One Settings area, grouped like Clueso's own pricing: workspace and admin, billing, content, sharing.", "D14, E10", "Clueso pricing groups: \"Admin & Workspace Control\", \"Sharing & Analytics\". Observed: settings were split across three places."],
    ["No domain-joining option for personal email domains.", "E1", "Observed: \"Anyone with a gmail.com email address\" was offered."],
    ["Limits match what Clueso shows: only the embedded player and analytics are locked on Free. Pronunciations, transcription keywords, and translation terms and rules all work, as in Clueso. The credit table uses only Clueso's own numbers.", "E3, E4, E6", "Clueso pricing: Free has 1 user, 10 min, 10 articles, 1,000 credits. Observed: Usage showed 1/4 seats."],
    ["Invite explains seats and roles per plan.", "N11", "Clueso pricing: Business includes 2 editors plus roles and permissions; reviewer seats are Enterprise."],
    ["The only admin can't \"Leave\"; the real options are explained.", "E8", "Observed."],
    ["One menu for who you are and where you are: the workspace button at the bottom of the sidebar opens the workspace, then you (name, email), theme, profile and sign out. The top-bar avatar is gone. A workspace is a square and a person is a circle, everywhere.", "N13", "Clueso (live, 17 Oct 2026): two identical blue initial squares, \"UW\" (workspace) bottom left and \"UA\" (account) top right, each with its own menu. Linear, Notion and Slack put workspace and account in one sidebar menu. Research: Nielsen #4 consistency (same look should mean same thing); Gestalt similarity."],
    ["A dark theme built from Clueso's own dark tokens, with Light, Dark and System in the account menu (where Clueso puts it) and in Profile. Clueso's three icons stay, but each gets a visible label and the set works as one radio group with arrow keys.", "N13", "Clueso: measured its .dark tokens (canvas grey-90, surface grey-80, text grey-0, brand text pink-40) and its account-menu icons, which are role=tab buttons with no accessible names. Research: NN/g, icons need text labels; WAI-ARIA radio group; WCAG 1.4.3 contrast in both themes."],
  ],
  agent: [
    ["Two of Clueso's own names, one per job: the nav item is Chats (the list of your conversations, as in Clueso) and the top-bar button is Clueso AI (the assistant, in a panel). Before, both said \"Clueso AI\" and did different things. Chats gets a speech-bubble icon so it no longer shares the assistant's sparkle.", "N17, R2", "Clueso (live): \"Chats\" in the nav, \"Clueso AI\" on the header button. Research: Nielsen #4 consistency (same name, same thing)."],
    ["Floating is a window: shorter, bottom right, clear of the page toolbar, draggable by its header (double-click to reset), opening scrolled to the starters by the composer. Sidebar stays the default from 1100 px.", "N14, R3", "Observed: the full-height floating panel covered the project page's Share and Open editor, as Clueso's does."],
    ["A build can be cancelled from its project page or its conversation, after a confirmation that states the credits already used; a queued build can be removed at no cost. A cancelled build offers Build again. The share of credits charged on cancel is the prototype's assumption and needs Clueso to confirm its policy.", "R4", "Research: Nielsen #3 user control and freedom; a build costs 150 to 250 credits and about 10 minutes."],
    ["Three jobs, three places. Home starts something new and sends you to the conversation; this page (was Agent) is where conversations live in full, as a list beside the open conversation, where you reply, approve plans and see what got built; the Clueso AI panel only helps with what is on screen while you work elsewhere. The panel and its button never appear on Home or here, as in Clueso, so there is never a second composer.", "N17, D1, D2, N3", "Clueso (live, 17 Oct 2026): one agent behind five doors and four names (Home prompt, Clueso AI, Chats, a full-page chat, Director); the button hides on Home and in chats; Agent is an Enterprise sales page. Research: Nielsen #4 consistency; Dan Brown, objects and front doors; cognitive load (one composer at a time)."],
    ["Enterprise automations (record for you, keep videos up to date) are named Automations, not Agent, and are listed once here, where they act.", "D1, N17", "Clueso pricing: \"Clueso Agents for auto-recording and updating videos\" is an Enterprise product, separate from creating a video from chat (Free)."],
    ["Included on Free is stated first: create from a brief, and use it from Claude, ChatGPT or Cursor.", "D1, I3", "Clueso pricing: \"Create video from chat\" and \"Clueso MCP\" are included on Free."],
    ["Each conversation shows its status and the credits it used.", "N15", "Clueso: chats show a per-message credit count (for example, 13 credits)."],
    ["Chats, redesigned around why people open it. The list is one list, newest activity first, with no group headings. Each row is two lines: the title with its time and a status dot at the right edge, then what helps you choose (the question itself, the plan's cost, the scene it's on, or the video it made). The dot is yellow when Clueso AI needs you, blue for a result you haven't opened, grey and softly pulsing while running, red when something failed, and absent otherwise, so a row without a status has no empty space. The row menu takes no space; it replaces the time and dot on hover or focus. The Chats item in the sidebar carries one dot when something needs you (yellow) or failed (red), so it's visible from every page; the page title has no count. Credits moved into the thread. Search, a Sort menu (last activity or date created) and a row menu with Rename and Delete (with Undo) keep Clueso's own controls.", "N17", "Clueso (live, 17 Oct 2026): Chats is a table of name, date created, last updated and creator, with Created and Modified filters, search, New chat, and a row menu with Open chat and Delete. Research: list-detail pattern; NN/g, show information when it supports a decision; Hick's law for one sort control."],
    ["Each conversation has a body for its state, with one primary action. A question uses Clueso's numbered choices plus \"Something else\". A plan shows its cost and Build. A build shows the scene, time left, Cancel and that you can leave. A failure says which scene failed, what was kept and charged, and offers Continue (with its estimate) or Start over. A finished video leads with the result, Open video and Share, then a \"check before sharing\" list, feedback, its credits, and follow-ups (shorten, translate, make the article). Long briefs collapse with Show more, and the agent's steps sit behind \"Ran n steps\", as in Clueso.", "N15, N17", "Clueso (live): numbered choices for decisions, \"Show more\" on long briefs, \"Ran 5 steps\", \"Ran 4 steps (2 failed)\", caveats after a build, thumbs and copy, per-message credits. Research: Nielsen #1 and #9 (status, recovery); HAX G11 (make clear why the system did what it did)."],
    ["Filters answer the questions people actually bring to Chats. Status (Needs you, Running, Failed, Finished, with counts) comes first; Clueso has none. Clueso's two date filters, Created and Modified with 7 options each, become one Date filter with a Last active / Created switch over Clueso's own options, including a custom range. Created by appears only when the workspace has more than one member and defaults to Anyone, where Clueso silently defaults to you. One Filter button next to search (as on Projects), removable chips with Clear all, a no-results message that names the filters, and \"n need you\" in the title applies that filter.", "N17", "Clueso (live, 17 Oct 2026): Created and Modified (All time, Today, Yesterday, Last 7, 30, 90 days, Custom) and a creator filter preset to the signed-in user. Research: Hick's law (half the date options); Nielsen #4 (same filter pattern as Projects) and #1 (show what's applied)."],
    ["Brand sits on the chat composer too (Chats and the Clueso AI panel), after the model, as on Home, so what a reply will build with is visible before you send. The plan card no longer repeats model, check-in and brand in an Options panel; one line says what it will use and that it's changed in the box below. One control per setting.", "C2, N17", "User review. Clueso (live): the chat composer has +, Record, Ask and model but no brand, while Home has it. Research: Nielsen #4 consistency; #1 visibility of system status; no duplicate controls for one setting."],
    ["Two views of Chats. Browse (the default) keeps the list beside the conversation for triage. Focus is Clueso's own view: one conversation fills the area at a readable 720 px, with a \"Made in this chat\" panel (Clueso's Projects panel) listing everything it made, each with Open and Copy link. Enter Focus from the expand button in the header or by double-clicking a row; leave by the back arrow, the list button or Escape. The choice and the panel are remembered. Below 1100 px the panel steps aside; phones show the list or one chat.", "N17", "Clueso (live): a chat opens across the whole content area with a back arrow, a Projects panel of outputs with Open, and header toggles. Keeping Browse as the default avoids going back to the list to move between chats that need you."],
    ["New chat is back on this page, as in Clueso: a blank thread with Home's composer (model, mode, brand), so there is still one composer on screen. With no conversations, one centered empty state explains Chats and what Free includes, with one New chat button.", "N17", "Clueso (live): New chat on Chats. The earlier redesign sent you to Home instead, with no evidence for the move."],
  ],
  edit: [
    ["Live's layout, with the canvas given the free space: rail, panel and canvas, with a full-width timeline panel below, as in Clueso. The canvas fills what's left instead of a fixed small frame.", "R-ED1", "Clueso (live, 18 Oct 2026): the same layout. Research: visual hierarchy follows importance (NN/g)."],
    ["The timeline's track is the scenes: live's blue clip headers with name and number over a thumbnail and duration, sized by length. A dot marks a scene whose voice is out of date. Selecting a scene, its script or its clip selects it everywhere.", "R-ED2", "Clueso: 20+ unnamed clip blocks, and the script, canvas and timeline aren't linked. Research: Nielsen #1 visibility of status."],
    ["Voiceover script keeps live's cards (number and name chip, voice chip with V4, sync button) and footer (more, add, AI Rewrite, voice settings, Generate speech). A scene says only when its voice is out of date (\"Voice out of date · Generate\"); Generate speech shows how many scenes need it. The duplicate banner is gone.", "R-ED3", "Clueso: unexplained blue text, and Generate speech in both a banner and the panel. Research: Nielsen #8, one place per action; show only what needs attention."],
    ["The rail is live's: Select and Hand, then Voiceover script, Media, Text, Shapes, Effects, Animation, Template, Transition, Captions, icons only, in live's order. Each name appears on hover and on keyboard focus, and every icon has an accessible name.", "R-ED4", "Clueso (live): the same rail. An earlier version added labels and Content / Add / Polish groups; reverted after review, because the names aren't needed up front and it no longer looked like Clueso."],
    ["The detailed timeline (video, voice, captions and music tracks with a playhead) is one click away under the strip, for precise edits.", "R-ED5", "Clueso keeps a full timeline; most people need scene-level changes first. Research: progressive disclosure."],
    ["Top bar as live: the logo opens the project menu (Back to projects, Duplicate, Move to folder, Save, View original media, Keyboard shortcuts, Editor preferences, Version history, Delete), then the title, the cloud for saved, Video | Article; avatar, Help, Comments, Translate, Clueso AI and Share. Icons are named on hover. Clueso AI knows the scene (\"On: Scene 4: Track progress\").", "R-ED6", "Clueso (live, 18 Oct 2026): the same controls."],
    ["Every control has a name (0 unnamed, against about 60 in Clueso's editor). The scene strip is a listbox: arrow keys move between scenes and focus follows; Space plays and pauses outside text fields.", "R-ED7", "Research: WCAG 4.1.2 name, role, value; WAI-ARIA listbox pattern."],
    ["Live's editing controls stay: skip to start and end, previous and next, 1x, Loop, High res; Split at the playhead, Add a scene, Undo and Redo (⌘Z, ⇧⌘Z); a voice per scene, Add pause (Clueso's Sync Point, named for what it does), Search script; media tabs and filters; the article's formatting toolbar.", "R-ED8", "Clueso (live, 17 Oct 2026): all present in the editor. Removing them had no evidence."],
    ["On smaller screens (900–1280 px) a tool panel and the Clueso AI sidebar take turns: opening one closes the other, so the canvas stays at least about 440 px wide. The playbar and canvas tools fit the column they're in, moving the time and options to a second row when it's narrow.", "R-ED9", "Side by side they left the canvas 108–343 px wide and broke the playbar. Canva and Figma swap side panels the same way."],
    ["Every control has a flow, matched to live's: the project menu and its dialogs, rename, Text and Shapes as canvas tools, selection and moving, every panel's tabs and items, size, zoom, speed, full-screen preview, timeline settings, and in Article view the formatting rail. AI Rewrite asks what to rewrite and can be undone.", "R-ED10", "Clueso (live, 18 Oct 2026): the same menus and options. Live's AI Rewrite rewrote the whole transcript at once with no undo (Nielsen #3)."],
    ["Second check against live: a timeline ruler and playhead with click to seek, live's timecode, an inspector for the selected element, \"/\" commands in the script and article, and live's remaining editor preferences. Sizes follow one scale measured from live: 16 px margin, 8 px gaps, 6 px cards, 28 px controls, 24 px chips, 12 and 14 px text.", "R-ED11", "Clueso (live, 18 Oct 2026): measured with computed styles at 1440 × 900."],
    ["The script looks like live's: ink text, with words added since the voice was generated in blue and live's banner explaining it (\"Blue text needs new speech\"); pause and Sync Point chips in the text; dashed dividers with the current scene shaded; editable scene names; the scene menu on hover. Clueso AI in the editor has live's Chat history and New chat.", "R-ED13", "Clueso (live, 18 Oct 2026, page code): text oklch(.24), <ins> words oklch(.546 .215 263), sync-marker chips. The per-scene status line, dots and count were removed as extra signals."],
    ["Side panels work at every size, and opening one never closes another: both docked at 360 px from 1280, at 300 px from 1016, sharing one column with tabs from 901, and on phones the right panel is a full-screen sheet. Floating AI stays above the timeline; the inspector moves beside or under the canvas instead of covering it.", "R-ED12", "Clueso (live, 18 Oct 2026, resized): panels keep full width; the AI panel runs off-screen at 1024 px, the canvas is about 80 px at 900 px and gone at 768 px, and the top bar overlaps the panels."],
  ],
  analytics: [
    ["A workspace-wide dashboard across all videos, matching Clueso's help center.", "D7", "Clueso help center (Analytics): project filter, date range, impressions, plays, play rate, impressions vs plays chart, top content table with CSV export, breakdown by location, search analytics."],
    ["On Free, a labeled sample of the real dashboard instead of a blank paywall.", "D8", "Clueso pricing: \"Viewership analytics\" is Business and Enterprise."],
    ["Pick one video for its retention and drop-off; project pages link here.", "N4", "Clueso help center: audience retention appears when one project is selected."],
    ["A lock on the sidebar item, so the paywall isn't a surprise.", "D7, I3", "Research: Dan Brown, disclosure."],
  ],
};

const ROUTE_FIX = { edit: "edit", s1: "s1", s2: "s2", s3: "s3", s4: "s4", s5: "s5", agent: "agent", chats: "agent", analytics: "analytics", signin: "signin", create: "create", projects: "projects", project: "project", library: "library", integrations: "integrations", settings: "settings" };

/* ---------- helpers ---------- */
const fix = (n) => `data-fix data-n="${n}"`;
const credLeft = () => S.credits.total - S.credits.used;
// Toasts are announced through one persistent live region (WCAG 4.1.3). A toast with an action stays 6 s and pauses on hover,
// so there is time to use it (WCAG 2.2.1); a plain one stays 2.6 s.
function toast(msg, action) {
  let live = $("#live"); if (!live) { live = document.createElement("div"); live.id = "live"; live.className = "sr"; live.setAttribute("aria-live", "polite"); document.body.appendChild(live); }
  live.textContent = ""; setTimeout(() => { live.textContent = msg + (action ? ". " + action.label + " available." : ""); }, 50);
  document.querySelectorAll(".toast").forEach(x => x.remove());
  const t = document.createElement("div"); t.className = "toast" + (action ? " act" : ""); t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button ${action.go ? `data-go="${action.go}"` : `data-act="${action.act}" data-id="${action.id || ""}"`}>${esc(action.label)}</button>` : ""}`; document.body.appendChild(t);
  let left = action ? 6000 : 2600, last = Date.now(), timer;
  const tick = () => { timer = setTimeout(() => { t.classList.add("leave"); setTimeout(() => t.remove(), 150); }, left - 150); };
  t.addEventListener("mouseenter", () => { clearTimeout(timer); left -= Date.now() - last; });
  t.addEventListener("mouseleave", () => { last = Date.now(); tick(); });
  tick();
}
/* ---------- Help: one place for getting help, learning and what's new ----------
   Live spreads these over four places: a Help button (support chat, knowledge base, feature request), a footer under Home
   ("Learn about our features", "More from Clueso", below the fold at 1155 × 811), a "New in Clueso" card in the sidebar, and
   help links in the account menu. Here they are one Help menu in the top bar, where live already puts Help, grouped as
   Get help · Learn · What's new. A dot on Help says there are updates you haven't seen. */
const UPDATES = [
  ["Multi-Video Layering", "Put more than one video in a scene, such as your webcam over a screen recording."],
  ["Media Panel", "Your project's media, the workspace library and stock in one panel, with filters for source, type and ratio."],
  ["Voice Library", "Choose a voice for each scene from a library, each voice with a short description."],
];
const UPDATES_KEY = "clueso-proto-updates-seen";
const updatesUnseen = () => { let n = 0; try { n = +localStorage.getItem(UPDATES_KEY) || 0; } catch (e) {} return Math.max(0, UPDATES.length - n); };
const seeUpdates = () => { try { localStorage.setItem(UPDATES_KEY, String(UPDATES.length)); } catch (e) {} };
const helpDot = () => updatesUnseen() ? `<i class="udot" aria-hidden="true"></i>` : "";
// Named for all three groups; "Help" stays first because it's the word people look for when they're stuck.
const HELP_NAME = "Help & resources";
const helpLabel = () => updatesUnseen() ? `${HELP_NAME}, ${updatesUnseen()} new ${updatesUnseen() === 1 ? "update" : "updates"}` : HELP_NAME;
// One account menu for the whole product, the app's workspace button and the editor's avatar alike (IA fix W8, 21 Oct 2026).
// Help lives only in the Help button, so it isn't repeated here.
const accountMenu = () => `<div class="lab">Workspace</div><button class="mi" role="menuitemradio" aria-checked="true"><span class="ava wsava" aria-hidden="true">${esc(wsIni())}</span>${esc(wsName())}<small>Free plan</small></button>
      <div class="sep"></div><div class="me"><span class="ava person" aria-hidden="true">${S.user.ini}</span><span><b>${esc(S.user.first)} ${esc(S.user.last)}</b>${esc(S.user.email)}</span></div>
      <div class="themerow">${themeControl()}</div><button class="mi" data-go="/settings/profile">${icon("users")}Profile settings</button><div class="sep"></div><button class="mi" data-act="signout">${icon("chevLeft")}Sign out</button>`;
function helpMenu() {
  if (firstRun() && S.guest) return `<div class="lab">Get help</div>
    <button class="mi mi2" data-act="helpchat">${icon("chat")}<span class="mt"><span>Chat with support</span><small>We usually reply within a few hours</small></span></button>
    <div class="sep"></div><div class="lab">Learn</div>
    <a class="mi" href="https://www.youtube.com/@CluesoAI" target="_blank" rel="noopener noreferrer">${icon("video")}<span class="grow">How to make your first video</span>${icon("external")}</a>
    <a class="mi" href="https://help.clueso.io" target="_blank" rel="noopener noreferrer">${icon("doc")}<span class="grow">Help center</span>${icon("external")}</a>`;
  return `<div class="lab">Get help</div>
    <button class="mi" data-act="helpchat">${icon("chat")}Chat with support</button>
    <button class="mi" data-act="helpreq">${icon("send")}Request a feature</button>
    <div class="sep"></div><div class="lab">Learn</div>
    ${firstRun() ? `<a class="mi" href="https://www.youtube.com/@CluesoAI" target="_blank" rel="noopener noreferrer">${icon("video")}<span class="grow">How to make your first video</span>${icon("external")}</a>` : ""}
    <a class="mi" href="https://help.clueso.io" target="_blank" rel="noopener noreferrer">${icon("doc")}<span class="grow">Help center</span>${icon("external")}</a>
    <a class="mi" href="https://www.youtube.com/@CluesoAI" target="_blank" rel="noopener noreferrer">${icon("video")}<span class="grow">Video tutorials</span>${icon("external")}</a>
    <button class="mi" data-act="helpkeys">${icon("keyboard")}<span class="grow">Keyboard shortcuts</span><span class="kbd">?</span></button>
    <div class="sep"></div><div class="lab">What's new</div>
    ${UPDATES.map(([t, d], i) => `<button class="mi mi2 helpnews" data-act="helpnews" data-i="${i}">${icon("bolt")}<span class="mt"><span>${esc(t)}</span><small>${esc(d)}</small></span></button>`).join("")}
    <button class="mi" data-act="helpnews" data-i="all"><span class="icsp" aria-hidden="true"></span><span class="grow">View changelog</span>${icon("chevRight")}</button>`;
}
function newsDialog(i) {
  const list = i === "all" || i == null ? UPDATES : [UPDATES[+i]];
  dialog(dh(i === "all" || i == null ? "Changelog" : "What's new", i === "all" || i == null ? "Recent updates to Clueso." : "") + `<div class="db newslist">${list.map(([t, d]) => `<div class="newsitem">${icon("bolt")}<span><b>${esc(t)}</b><span>${esc(d)}</span></span></div>`).join("")}</div><div class="df">${i === "all" || i == null ? "" : `<button class="btn" data-act="helpnews" data-i="all">View changelog</button>`}<button class="btn dark" data-act="closedlg">Done</button></div>`);
}
function go(h) { location.hash = h; }
// First screen: everyone lands on Try (20 Oct 2026, decided with the user), signed in before or not. It says "Have an account?
// Sign in to see your videos", and Sign in opens the box over it. The Sign in page is only for links that need an account.
const HAD_KEY = "clueso-proto-had-account";
const hadAccount = () => { try { return localStorage.getItem(HAD_KEY) === "1"; } catch (e) { return true; } };
const markAccount = () => { try { localStorage.setItem(HAD_KEY, "1"); } catch (e) {} };
// Accounts made in this browser, so signing out and back in works for them too (the demo account is always there).
const ACCOUNTS_KEY = "clueso-proto-accounts";
const DEMO_ACCT = { first: "Alex", last: "Rivera", email: "alex.rivera@gmail.com", ini: "AR", known: true };
function accounts() { let a = {}; try { a = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}"); } catch (e) {} a[DEMO_ACCT.email] = DEMO_ACCT; return a; }
function saveAccount(u) { if (!u || !u.email) return; const a = accounts(); a[u.email.toLowerCase()] = { first: u.first, last: u.last, email: u.email, ini: u.ini, known: u.known }; try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); } catch (e) {} }
// "Have an account? Sign in to see your videos" shows only to a browser that has signed in before (a first-time visitor has no videos to find)
function toEntry() { applyScenario("new"); seeUpdates(); S.guest = true; S.verified = undefined; S.user = { first: "", last: "", email: "", ini: "", known: false }; }
// URLs follow the visible labels (IA fix W6, 21 Oct 2026): /home, /clueprints, /brand-kit, /settings/plan-and-usage …
// route() maps them to the prototype's internal page keys; canonicalPath() sends the old paths to the new ones.
const URL_ALIAS = { home: ["create"], clueprints: ["library", "styles"], "brand-kit": ["library", "brand"] };
const SET_SLUG = { "plan-and-usage": "plan", "player-and-links": "sharing", "video-defaults": "defaults", "language-and-voice": "language" };
const SET_URL = Object.fromEntries(Object.entries(SET_SLUG).map(([u, k]) => [k, u]));
function route() { const h = location.hash.replace(/^#\/?/, "") || "try"; let p = h.split("/"); if (URL_ALIAS[p[0]]) p = [...URL_ALIAS[p[0]], ...p.slice(1)]; if (p[0] === "settings" && SET_SLUG[p[1]]) p[1] = SET_SLUG[p[1]]; return p; }
function canonicalPath() { const p = location.hash.replace(/^#\/?/, "").split("/");
  if (p[0] === "create") return ["home", ...p.slice(1)].join("/");
  if (p[0] === "library") return p[1] === "brand" ? "brand-kit" : "clueprints";
  if (p[0] === "settings" && SET_URL[p[1]]) return ["settings", SET_URL[p[1]], ...p.slice(2)].join("/");
  return null; }
// Pages that need an account: opened signed out, they show the Sign in page, then go where the link pointed
const NEEDS_ACCOUNT = ["projects", "project", "edit", "library", "chats", "analytics", "settings"];
// Signing out keeps that account's work aside (the prototype holds one workspace at a time), so signing back in restores it
const SIGNEDOUT_KEY = "clueso-proto-signed-out";
function signOut() { saveWork(); const u = S.user || {}; try { const st = JSON.parse(sessionStorage.getItem(SIGNEDOUT_KEY) || "{}"); st[(u.email || "").toLowerCase()] = { work: sessionStorage.getItem(WORK_KEY), scenario: localStorage.getItem(SCENARIO_KEY), progress: localStorage.getItem(PROGRESS_KEY) }; sessionStorage.setItem(SIGNEDOUT_KEY, JSON.stringify(st)); } catch (e) {}
  closeLayers(); go("/try"); toast("Signed out"); }
// Signing in from the try screen as an account that has work: restore it (unless the visitor started something here, which is kept)
function signInRestore(email, after) { const started = TASKS.length > 0 || PROJECTS.some(p => !p.sample); if (started) return false; let st = {}; try { st = JSON.parse(sessionStorage.getItem(SIGNEDOUT_KEY) || "{}"); } catch (e) {}
  const w = st[email.toLowerCase()]; const dest = after || "/home";
  if (!w && email.toLowerCase() !== DEMO_ACCT.email) return false;
  clearTimeout(saveWorkT); removeEventListener("pagehide", saveWork);
  try { if (w) { if (w.work) sessionStorage.setItem(WORK_KEY, w.work); else sessionStorage.removeItem(WORK_KEY); if (w.scenario) localStorage.setItem(SCENARIO_KEY, w.scenario); if (w.progress) localStorage.setItem(PROGRESS_KEY, w.progress); delete st[email.toLowerCase()]; sessionStorage.setItem(SIGNEDOUT_KEY, JSON.stringify(st)); }
    else { sessionStorage.removeItem(WORK_KEY); localStorage.setItem(SCENARIO_KEY, "returning"); } } catch (e) {} // the demo account's seeded videos
  location.href = location.pathname + "?s=" + Date.now() + "#" + dest; return true; }

/* ---------- brand ----------
   Live Clueso shows a kit only on the Brand kit page (logo, title font, four colour tiles). Here the same preview appears
   wherever the brand is chosen or used: the composer pill and picker, the plan card and the Brand kit page. With no kit,
   the video uses a named, previewable Clueso default instead of one invented from the email domain. */
const KITS = {
  default: { name: "Clueso default", logo: "", font: "Inter", colors: [["Text", "#1A1A1A"], ["Backgrounds", "#FFFFFF"], ["Accent", "#5C5C5C"], ["Accent 2", "#D6D6D6"]] },
  acme: { name: "Acme", logo: "A", font: "Inter", colors: [["Text", "#1A1A1A"], ["Backgrounds", "#F4F1EC"], ["Accent", "#FF5A1F"], ["Accent 2", "#0075DE"]] },
};
if (S.brandUrl) { const nm = S.brandUrl.split(".")[0]; KITS.acme.name = nm.charAt(0).toUpperCase() + nm.slice(1); KITS.acme.logo = nm.charAt(0).toUpperCase(); } // a kit pulled from the user's own website keeps its name
if (typeof ED_SCENES !== "undefined" && ED_SCENES.p1 && !ED_SCENES.sample) ED_SCENES.sample = ED_SCENES.p1; // the sample project opens with real scenes
const curKit = () => S.brandOn ? KITS.acme : KITS.default;
// Text on a colour tile: whichever of near-black or white has more contrast (WCAG relative luminance).
const onColor = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return (1.05 / (L + 0.05)) >= ((L + 0.05) / (0.0103 + 0.05)) ? "#fff" : "#1A1A1A"; };
const kitDots = k => `<span class="kdots" aria-hidden="true">${k.colors.map(([, h]) => `<i style="background:${h}"></i>`).join("")}</span>`;
const kitMini = k => `<span class="kmini" aria-hidden="true"><span class="klogo">${k.logo ? `<b>${k.logo}</b>` : icon("brand")}</span>${k.colors.map(([, h]) => `<i style="background:${h}"></i>`).join("")}<span class="kfont">${k.font}</span></span>`;
function kitPreview(k) {
  return `<div class="kprev" aria-label="Preview of ${esc(k.name)}"><div class="kpl">${k.logo ? `<span class="klogo lg"><b>${k.logo}</b></span>` : `<span class="mut" style="font-size:12px">No logo</span>`}</div><div class="kpt">${k.font}</div>
    <div class="kpg">${k.colors.map(([l, h]) => `<div style="background:${h};color:${onColor(h)}"><small>${l}</small><span>${h}</span></div>`).join("")}</div></div>`;
}

/* ---------- shell ---------- */
// Phone (≤760px, 21 Oct 2026): a phone-first layout modelled on Claude, ChatGPT and Gemini's mobile apps. A ☰ drawer holds the
// navigation, search, recent chats and Help; the top bar keeps the page name, Clueso AI and New project; menus open as
// bottom sheets; composers sit at the bottom of the screen; the editor becomes review and quick edits.
const isPhone = () => innerWidth <= 760;
const PAGE_NAME = { projects: "Projects", project: "Project", chats: "Chats", analytics: "Analytics", integrations: "Integrations", settings: "Settings" };
const pageName = () => { const [r, a] = route(); if (r === "library") return a === "brand" ? "Brand kit" : "Clueprints"; if (r === "projects" && a) return decodeURIComponent(a); return PAGE_NAME[r] || ""; };
// Getting started: one quiet line under the composer, about the next video you make. Hidden until the first video exists
// (the prompt is that step) and gone at 4 of 4 or when dismissed. The brand step points at the composer's own brand pill
// instead of adding a second button for it; sharing has no control on Home, so it gets the one button.
function nextStep() { const c = S.checklist; if (!c.video || S.gsHidden || !PROJECTS.length || (S.ready && !S.watched)) return null; const done = Object.values(c).filter(Boolean).length; if (done >= 4) return null; return { k: !c.brand ? "brand" : "share", done }; }
function nextLine() {
  const n = nextStep(); if (!n) return "";
  const txt = n.k === "brand" ? `Next: <button class="linkbtn nla" data-act="check" data-k="brand">add your brand</button>, so your videos look like yours.` : `Next: <button class="linkbtn nla" data-act="check" data-k="share">share your video</button> with a link. It uses about 1 of your 10 free minutes.`;
  return `<div class="nextline" id="nextline" ${fix(6)}><span><span class="nlc">${n.done} of 4 done</span> · ${txt}</span><button class="iconbtn nlx" data-act="hidecheck" aria-label="Hide getting started" title="Hide · your progress is kept">${icon("close")}</button></div>`;
}
function sidebar(active) {
  const item = (k, ic, label, href, extra = "") => `<a class="navitem ${active === k ? "on" : ""}" href="#/${href}" data-label="${label}">${icon(ic)}<span class="lbl grow">${label}</span>${extra}</a>`;
  return `<aside class="side">
    <div class="brandrow"><div class="wm">${LOGO}<span>Clueso</span></div><button class="iconbtn" data-act="collapse" aria-label="${S.collapsed ? "Expand sidebar" : "Collapse sidebar"}" title="${S.collapsed ? "Expand sidebar" : "Collapse sidebar"}">${icon("collapse")}</button></div>
    <button class="phsearch" data-act="cmdk">${icon("search")}<span>Search</span></button>
    <nav class="nav" ${fix(1)}>
      ${item("create", "home", "Home", "home")}
      ${item("projects", "folder", "Projects", "projects")}
      ${(() => { const need = TASKS.filter(c => ["Needs your reply", "Waiting for you"].includes(c.st)).length, failed = TASKS.filter(c => c.st === "Failed").length;
        const lab = need ? `${need} need${need === 1 ? "s" : ""} you` : failed ? `${failed} failed` : "";
        return item("chats", "chat", "Chats", "chats", lab ? `<span class="navdot ${need ? "attn" : "err"}" role="img" aria-label="${lab}" title="${lab}"></span>` : ""); })()}
      ${item("library-styles", "clueprint", "Clueprints", "clueprints")}
      ${item("library-brand", "brand", "Brand kit", "brand-kit")}
      ${item("analytics", "analytics", "Analytics", "analytics", `<span class="tag lbl">${icon("lock")}</span>`)}
    </nav>
    ${TASKS.length ? `<div class="phrecent" aria-label="Recent chats" role="group"><div class="phlab">Recent chats</div>${TASKS.slice(0, 5).map(c => `<a class="navitem" href="#/chats" data-act="phchat" data-id="${c.id}"><span class="lbl grow trunc">${esc(c.t)}</span>${NEEDS.includes(c.st) ? `<span class="navdot attn" role="img" aria-label="Needs you"></span>` : ""}</a>`).join("")}</div>` : ""}
    <div class="spacer"></div>
    ${(() => { const low = credLeft() / S.credits.total <= .2;
      return `<a class="usage ${low ? "low" : ""}" href="#/settings/plan-and-usage" ${fix(7)} title="${S.minutes.total - S.minutes.used} of ${S.minutes.total} export minutes and ${credLeft()} of ${S.credits.total.toLocaleString("en")} AI credits left this month · Plan and usage">
      <div class="kv"><span>${S.minutes.total - S.minutes.used} export min</span><span>${credLeft()} credits</span></div>
      ${low ? `<div class="meter" role="img" aria-label="${credLeft()} of ${S.credits.total} credits left"><i style="width:${credLeft() / S.credits.total * 100}%"></i></div>` : ""}
    </a>`; })()}
    <nav class="nav">
      <button class="navitem phhelp" data-act="help" aria-haspopup="menu">${icon("helpbook")}<span class="lbl grow">${HELP_NAME}</span>${helpDot()}</button>
      ${item("integrations", "puzzle", "Integrations", "integrations")}
      ${item("settings", "settings", "Settings", "settings/general")}
    </nav>
    <button class="ws" data-act="ws" aria-label="${esc(wsName())}, ${S.user.first} ${S.user.last}. Account and workspace menu" aria-haspopup="menu"><span class="ava">${esc(wsIni())}</span><span class="t"><b>${esc(wsName())}</b><span>Free plan</span></span><span class="chev">${icon("chevDown")}</span></button>
  </aside>`;
}

function topbar() {
  return `<div class="top">
    <button class="iconbtn menubtn" data-act="navopen" aria-label="Open menu" aria-expanded="${!!S.navopen}">${icon("menu")}</button>
    <span class="phname trunc">${pageName() ? esc(pageName()) : `${LOGO}<span>Clueso</span>`}</span>
    <button class="searchbox" data-act="cmdk" aria-label="Search or jump to">${icon("search")}<span class="sl trunc">Search or jump to…</span><span class="ss" aria-hidden="true">Search</span><span class="kbd">⌘K</span></button>
    <div class="grow"></div>
    ${S.generating && location.hash !== "#/project/" + S.generating.id ? `<a class="buildchip" href="#/project/${S.generating.id}" aria-label="Video building, scene ${Math.min(S.generating.step + 1, 6)} of 6. Open project"><span class="spin" aria-hidden="true"></span><span class="bl">Building · ${Math.min(S.generating.step + 1, 6)} of 6</span><span class="bs" aria-hidden="true">${Math.min(S.generating.step + 1, 6)}/6</span></a>` : ""}
    <button class="btn helpbtn" data-act="help" aria-haspopup="menu" aria-label="${helpLabel()}">${icon("helpbook")}<span class="lblt">${HELP_NAME}</span>${helpDot()}</button>
    ${panelAllowed() ? `<button class="btn aibtn ${S.ai ? "on" : ""}" id="aibtn" data-act="ai" ${fix(8)} aria-label="Clueso AI" aria-expanded="${!!S.ai}" aria-controls="aipanel">${icon("sparkle")}<span class="lblt">Clueso AI</span></button>` : ""}
    <button class="btn dark newbtn" data-act="newmenu" aria-label="New project" aria-haspopup="menu"><span class="phplus">${icon("plus")}</span><span class="lblt">New project</span>${icon("chevDown")}</button>
  </div>`;
}

// First run: Home shows only what helps make the first video. No side menu, search or New project; the logo, Help and the
// account button stay. The full app comes back once the first video starts building, with one tip pointing at Projects.
const userIni = () => S.user.known === false ? (S.user.email[0] || "?").toUpperCase() : S.user.ini;
function focusTop() {
  return `<div class="top focustop"><div class="wm">${LOGO}<span>Clueso</span></div><div class="grow">${S.verified === false ? `<span class="vnote">${icon("info")}<span>Check your inbox to verify ${esc(S.user.email)}. You can start now.</span><button class="linkbtn" data-act="resendverify">Resend</button></span>` : ""}</div>
    <button class="btn ghost" data-act="help" aria-haspopup="menu">${icon("helpbook")}Help</button>
    ${S.guest ? `<button class="btn ghost" data-act="gatesignin">Sign in</button><button class="btn dark" data-act="gate" data-k="signup">Sign up</button>` : `<button class="ava person sm" data-act="ws" aria-haspopup="menu" aria-label="Account: ${S.user.known === false ? esc(S.user.email) : esc(S.user.first + " " + S.user.last)}" title="${S.user.known === false ? esc(S.user.email) : esc(S.user.first + " " + S.user.last)}">${userIni()}</button>`}</div>`;
}
// Verify-email reminder in the full app: live's announcement strip (dark, full width, one button). Shown from the moment
// there's a finished video to share until the email is verified; not while the Projects tip is showing (one hint at a time).
function vStrip() {
  if (S.verified !== false || S.guest || S.tipProjects === "show") return ""; // one hint at a time: after the Projects tip is gone
  if (!PROJECTS.some(p => !p.sample && !p.cancelled && !p.failed && !(S.generating && S.generating.id === p.id))) return "";
  return `<button class="vstrip" data-act="verifystrip">${icon("mail")}<span class="vsl">Verify <b>${esc(S.user.email)}</b> to share your videos. Check your inbox, or open this to resend.</span><span class="vss">Verify your email to share</span></button>`;
}
function shell(active, inner, opts = {}) {
  // Focus mode (logo, Help, Sign in) is for visitors only (20 Oct 2026, decided with the user): once signed in, the full app
  // with its sidebar shows from the first moment, as signed-in ChatGPT and Gemini do; Home still shows first-run content.
  if (active === "create" && firstRun() && S.guest) return `<div class="app focus ${isPhone() ? "phone" : ""}"><div class="col">${focusTop()}<div class="main ${opts.grid ? "grid-bg" : ""}">${inner}</div></div></div>`;
  const strip = vStrip();
  const inThread = active === "chats" && isPhone() && (S.chatId === "new" || (S.chatId && chatById(S.chatId)));
  return `<div class="app ${isPhone() ? "phone" : ""} ${inThread ? "inthread" : ""} ${strip ? "hasstrip" : ""} ${S.collapsed ? "collapsed" : ""} ${S.navopen ? "navopen" : ""} ${S.ai ? "ai-" + aiView() : ""}">${strip}${sidebar(active)}
    <div class="col">${topbar()}<div class="main ${opts.grid ? "grid-bg" : ""}">${inner}</div></div></div>${S.ai ? aiPanel() : ""}${S.tipProjects === "show" ? `<div class="coach" role="dialog" aria-labelledby="coacht"><b id="coacht">${S.generating ? "Your video is building" : "Your video is ready"}</b><span>${innerWidth <= 760 ? "Find it, and every video you make, under Projects in this menu." : "Find it here, along with every video you make."}</span><button class="btn" data-act="tipok">Got it</button></div>` : ""}`;
}
// The tip sits beside Projects in the side menu (or under the menu button on phones), placed after each render
function placeCoach() {
  if (S.tipProjects === "show" && route()[0] !== "project") { S.tipProjects = "done"; const x = $(".coach"); if (x) x.remove(); return; } // one tip, on the page it belongs to: leaving that page dismisses it
  const c = $(".coach"); if (!c) return; const t = innerWidth <= 760 ? $(".menubtn") : $('.side .navitem[data-label="Projects"]'); if (!t) { c.hidden = true; return; } c.hidden = false;
  const r = t.getBoundingClientRect(), cw = c.offsetWidth;
  if (innerWidth <= 760) { c.className = "coach down"; Object.assign(c.style, { left: Math.max(8, r.left) + "px", top: r.bottom + 10 + "px" }); }
  else { c.className = "coach right"; Object.assign(c.style, { left: Math.min(r.right + 12, innerWidth - cw - 8) + "px", top: r.top + r.height / 2 - 22 + "px" }); }
}

/* ---------- sign in ---------- */
function vSignin() {
  return `<div class="signin"><div class="formside"><form data-form="signin" novalidate>
    <div class="mark">${LOGO}</div>
    ${S.guest && S.after ? `<h1>Sign in to continue</h1><p class="sub">This page is in a Clueso workspace. Sign in and we'll take you straight there.</p>` : `<h1>Welcome back</h1><p class="sub">Sign in to your Clueso account</p>`}
    <div class="oauth"><button type="button" class="btn lg block" data-act="google" data-k="signin">${icon("google")}Google</button><a class="btn lg block" href="#/sso">${icon("key")}SSO</a></div>
    <div class="or">OR</div>
    <div ${fix(1)} style="display:grid;gap:12px">
      <label class="field" for="em">Email address<input id="em" type="email" autocomplete="email" placeholder="name@example.com" aria-describedby="siErr"></label><p class="ferr" id="siErr" role="alert" hidden></p>
      <label class="field" for="pw">Password<input id="pw" type="password" autocomplete="current-password" placeholder="Password" aria-describedby="siPwErr"></label><p class="ferr" id="siPwErr" role="alert" hidden></p>
      <div class="rowlink"><button type="button" class="linkbtn" data-act="forgotpw">Forgot password?</button></div>
    </div>
    <button class="btn pink lg block" type="submit">Sign in</button>
    
    <p class="legal">Don't have an account? <a href="#/signup">Sign up</a> or <a href="#/try">try it first</a></p>
  </form></div>
  <div class="quote" ${fix(2)}><p>“We're now producing 30+ professional-grade product videos every month.”</p><span style="font-size:12px;opacity:.75">Krish Ramineni · Co-founder &amp; CEO, Fireflies.ai</span></div></div>`;
}

/* ---------- sign up (live's layout: Google, SSO, name, email, password, the work-email tip) ---------- */
const PERSONAL = /@(gmail|googlemail|yahoo|outlook|hotmail|icloud|live|proton|protonmail|aol)\./i;
// The workspace name isn't asked for (it changes nothing on day one); it defaults from what we know, and Settings renames it.
// A known name → "Sam's workspace"; no name but a work email → the company ("Taskly"); otherwise "My workspace".
// Company workspaces that already exist on Clueso (prototype data): an invite joins one; a matching work email is offered one.
const TEAMS = { "taskly.io": { name: "Taskly", members: 6, by: "Priya Shah" } };
const emailDom = () => (((S.user || {}).email || "").split("@")[1] || "").toLowerCase();
const teamForEmail = () => TEAMS[emailDom()] || null; // the person's company already has a workspace
function wsName() { if (S.wsName) return S.wsName; if (S.team && TEAMS[S.team]) return TEAMS[S.team].name; const u = S.user || {}; if (u.known && u.first) return `${u.first}'s workspace`;
  const dom = emailDom().split(".")[0]; if (dom && !PERSONAL.test(u.email || "") && !teamForEmail()) return dom.charAt(0).toUpperCase() + dom.slice(1); return "My workspace"; } // never a second "Taskly" beside the team's
const wsIni = () => (/^my workspace$/i.test(wsName()) ? ((S.user || {}).email || "W")[0] : wsName()[0] || "W").toUpperCase(); // "My workspace" shows your own initial
function vSignup() {
  return `<div class="signin"><div class="formside"><form data-form="signup" novalidate>
    <div class="mark">${LOGO}</div>
    ${S.invite && TEAMS[S.invite] ? `<h1>Join ${esc(TEAMS[S.invite].name)} on Clueso</h1><p class="sub">${esc(TEAMS[S.invite].by)} invited you. ${TEAMS[S.invite].members - 1} teammates and their videos are already there.</p>` : `<h1>Welcome to Clueso</h1><p class="sub">Create your free account</p>`}
    <div class="oauth"><button type="button" class="btn lg block" data-act="google" data-k="signup">${icon("google")}Google</button><a class="btn lg block" href="#/sso">${icon("key")}SSO</a></div>
    <div class="or">OR</div>
    <div class="supnames"><label class="field" for="sfn">First name<input id="sfn" autocomplete="given-name" placeholder="John"></label><label class="field" for="sln">Last name<input id="sln" autocomplete="family-name" placeholder="Doe"></label></div>
    <label class="field" for="sem">Email address<input id="sem" type="email" autocomplete="email" placeholder="name@company.com" aria-describedby="semTip semErr"></label>
    <p class="ftip" id="semTip">${icon("brand")}Sign up with your work email and your videos come out with your company's logo and colours.</p>
    <p class="ferr" id="semErr" role="alert" hidden></p>
    <label class="field" for="spw">Create a password<input id="spw" type="password" autocomplete="new-password" placeholder="At least 8 characters" aria-describedby="spwErr"></label>
    <p class="ferr" id="spwErr" role="alert" hidden></p>
    <button class="btn pink lg block" type="submit">Create account</button>
    <p class="legal">By continuing you agree to the <a href="#/signup">Terms</a> and <a href="#/signup">Privacy policy</a>.</p>
    <p class="legal">Already have an account? <a href="#/signin">Sign in</a>${S.invite ? " to join" : ""}</p>
    <p class="legal"><a href="#/try">Try it without an account</a></p>
  </form></div>
  <div class="quote"><p>“With Clueso, we created and launched 8 training courses for Duda's new editor in just one quarter.”</p><span style="font-size:12px;opacity:.75">Duda</span></div></div>`;
}
// SSO: a company email finds the company's sign-in. A personal email, or a company without SSO, says what to do instead.
const SSO_DOMAINS = ["taskly.io", "acme.io"];
let ssoPrev = null; // the page the SSO page was opened from (sign in, sign up, invite)
addEventListener("hashchange", e => { const from = (e.oldURL.split("#/")[1] || ""), to = (e.newURL.split("#/")[1] || ""); if (to.split("/")[0] === "sso" && from.split("/")[0] !== "sso") ssoPrev = from || null; });
// Follow-up emails: triggered by what the person did (or didn't), never by the calendar alone, one at a time, each with one action.
// A review page for the prototype (Clueso's lifecycle tool would send them); not part of the product UI.
const EMAILS = [
  ["A teammate invites them", "Priya Shah invited you to Taskly on Clueso", "Join Taskly's workspace to see the team's videos and make your own with the same brand. It takes a few seconds.", "Join Taskly", "Sent when the invite is made; one reminder after 3 days", "#/invite"],
  ["Signed up, no brief after 1 day", "Your 1,000 free credits are waiting", "You signed up yesterday but haven't made a video yet. Pick a starting point and Clueso drafts it in minutes: a product demo, a how-to article, a training video or a launch teaser.", "Start my video", "Stops once a brief is sent"],
  ["Brief written, plan not built after 1 day", "Your plan is ready to build", "Your plan for “A 1-minute demo of our product” is waiting. It uses about 150–250 of your 1,000 credits, takes about 10 minutes, and you can change anything after.", "Build it", "Stops once Build is pressed"],
  ["Video ready, not watched after 2 hours", "Your video is ready", "“A 1-minute demo of our product” is done: about a minute, with voiceover, zooms and captions, plus a step-by-step article.", "Watch it", "Sent when the build finishes; the reminder only if it's still unwatched"],
  ["Watched, not shared after 2 days", "Share it with your team", "Your video is ready to send. A view-only link takes one click and uses about 1 of your 10 free export minutes.", "Share a link", "Stops once a link is made"],
  ["Shared, no second video after 5 days", "Make the next one from what you have", "Turn the same recording into a how-to article, translate it, or make a 30-second teaser. Your brand and style carry over.", "Make another", "Stops once a second video starts"],
];
function vEmails() {
  return `<div class="emailsp"><header><div class="wm">${LOGO}<span>Clueso</span></div><a class="btn ghost" href="#/home">Back to the prototype</a></header>
    <h1>Follow-up emails</h1><p class="sub">Gap 3 of the onboarding review: what Clueso sends when someone stalls on the way to their first video, and after it. Each is triggered by what the person did or didn't do, goes out once, and stops as soon as they take the step. Review page, not product UI.</p>
    <div class="emlist">${EMAILS.map(([trig, subj, body, cta, stop, href], i) => `<article class="em"><div class="emmeta"><span class="bdg">${i + 1}</span><span><b>When</b> ${esc(trig)}</span><span class="mut">${esc(stop)}</span></div>
      <div class="emcard"><div class="emhd"><span class="emfrom">${LOGO}Clueso</span><b>${esc(subj)}</b></div><p>Hi ${esc(S.user && S.user.known && S.user.first ? S.user.first : "there")},</p><p>${esc(body)}</p>${href ? `<a class="emcta" href="${href}">${esc(cta)}</a>` : `<span class="emcta">${esc(cta)}</span>`}<p class="mut">You're getting this because you signed up for Clueso. <u>Email settings</u></p></div></article>`).join("")}</div>
    <p class="sub">Never more than one a day. None after the person unsubscribes, and none about a step they've already taken.</p></div>`;
}
function vSSO() {
  return `<div class="signin"><div class="formside"><form data-form="sso" novalidate>
    <div class="mark">${LOGO}</div>
    <h1>Continue with SSO</h1><p class="sub">Enter your work email to continue</p>
    <label class="field" for="ssoem">Work email address<input id="ssoem" type="email" autocomplete="email" placeholder="you@company.com" aria-describedby="ssoErr"></label>
    <p class="ferr" id="ssoErr" role="alert" hidden></p>
    <div class="ssobtns"><button type="button" class="btn lg" data-act="ssoback">Go back</button><button class="btn pink lg" type="submit">Continue</button></div>
  </form></div>
  <div class="quote"><p>“Clueso is my go-to tool for creating fast and professional videos.”</p><span style="font-size:12px;opacity:.75">Pushpak Teja · Senior Product Manager, MoEngage</span></div></div>`;
}
const fErr = (id, msg) => { const el = $("#" + id); if (!el) return; el.hidden = !msg; el.innerHTML = msg || ""; const inp = document.querySelector(`[aria-describedby~="${id}"]`); if (inp) inp.setAttribute("aria-invalid", msg ? "true" : "false"); }; // the field that names this message
// New account: a fresh workspace, signed in. Email accounts aren't verified yet; Google and SSO ones are.
// The account is asked for at Build, when there's something to keep. Short: Google, or email and password (names can wait).
function signupGate(p) {
  S.pending = p; const mode = p.mode || "signup";
  const tm = p.kind === "invite" && TEAMS[S.invite || "taskly.io"];
  if (tm) { dialogGate(p, mode, mode === "signin" ? `Sign in to join ${esc(tm.name)}` : `Join ${esc(tm.name)} on Clueso`, `${esc(tm.by)} invited you. ${tm.members - 1} teammates and their videos are already there.`); return; }
  if (p.kind === "continue") { dialogGate(p, "signin", "Sign in to continue", "That page is in a Clueso workspace. Sign in and we'll take you straight there."); return; }
  // Name what the guest chose: the Clueprint they're building with, or the one they want to copy
  const bc = p.kind === "build" && chatById(p.chat), clueNm = p.kind === "clueedit" ? (STYLES[p.clue] || [])[0] : bc && ((bc.ask || "").match(/^Use the “(.+?)” Clueprint/) || [])[1];
  if (clueNm && p.kind === "clueedit") { dialogGate(p, mode, mode === "signin" ? "Sign in to save this Clueprint" : "Create your free account to save this Clueprint", "Your copy goes in Workspace Clueprints, ready to edit."); return; }
  if (clueNm) { dialogGate(p, mode, mode === "signin" ? "Sign in to build your video" : "Create your free account to build your video", mode === "signin" ? "Your brief and plan come with you." : "Your brief and plan are kept. The free plan includes 1,000 credits, about 5 videos."); return; }
  const why = p.kind === "build" ? "Create your free account to build your video" : p.kind === "record" ? "Create your free account to record" : p.kind === "recordlater" ? "Create your free account so we can email you the link" : "Create your free account";
  const started = !!(S.prompt && S.prompt.trim()) || TASKS.length > 0;
  dialogGate(p, mode, mode === "signin" ? (p.kind === "build" ? "Sign in to build your video" : "Sign in") : why, mode === "signin" ? (started ? "What you started here comes with you." : "Welcome back.") : p.kind === "signup" ? "The free plan includes 1,000 credits, about 5 videos. Your brief stays where it is." : p.kind === "build" ? "Your brief and plan are kept. The free plan includes 1,000 credits, about 5 videos." : "It takes a few seconds.");
}
function dialogGate(p, mode, title, sub) {
  // What the box is for, shown, not just named: the video, the Clueprint, the team or the recording
  const bc = p.kind === "build" && chatById(p.chat), ttl = bc && (shortTitle(bc.answer || bc.ask) || "Your video");
  const cl = bc && ((bc.ask || "").match(/^Use the “(.+?)” Clueprint/) || [])[1];
  const gcard = (thumb, b, sub) => `<div class="gbuild">${thumb}<span><b class="trunc">${b}</b><span>${sub}</span></span></div>`;
  const tile = (ic, cls = "") => `<span class="thumb gtile ${cls}" aria-hidden="true">${icon(ic)}</span>`;
  const st = p.kind === "clueedit" && STYLES[p.clue], tm = p.kind === "invite" && TEAMS[S.invite || "taskly.io"];
  const card = bc ? gcard(sceneThumb(ttl, 0, SCENES.length), esc(ttl), `${esc(VTYPES[bc.vtype || inferType(bc.ask + " " + (bc.answer || ""))])}${cl ? ` · “${esc(cl)}” Clueprint` : ""} · ${SCENES.length} scenes · about 10 min`)
    : st ? gcard(`<span class="thumb fr chmini ${st[1]}" aria-hidden="true"><span class="cfstage"><span class="cfcard">${esc(st[2])}</span></span></span>`, esc(st[0]), `Clueprint · ${clueScenes(st).length} chapters · needs ${esc(st[4][0].toLowerCase())}`)
    : tm ? gcard(`<span class="thumb gteam" aria-hidden="true">${SEED.projects.slice(0, 3).map((x, k) => sceneThumb(x.name, 1 + k, 6, x.th === "t-white" ? "t-ink" : x.th || "t-plum")).join("")}<b>${esc(tm.name[0])}</b></span>`, `${esc(tm.name)} workspace`, `${tm.members} people · ${SEED.projects.length} videos · invited by ${esc(tm.by)}`)
    : p.kind === "record" ? gcard(tile("record"), "Record your screen", "About 2 minutes. Clueso writes the script, voice and steps.")
    : p.kind === "recordlater" ? gcard(tile("mail"), "Record on your computer", "We'll email you a link that opens the recorder there.") : "";
  dialog(dh(title, sub) + `<form class="db gate" data-form="gate" novalidate>${card}
    <div class="oauth"><button type="button" class="btn lg block" data-act="gategoogle">${icon("google")}Google</button><button type="button" class="btn lg block" data-act="ssohandoff" title="Opens your company's sign-in">${icon("key")}SSO</button></div>
    <div class="or">OR</div>
    <label class="field" for="gem">Email address<input id="gem" type="email" autocomplete="email" placeholder="name@company.com" aria-describedby="gemErr"></label><p class="ferr" id="gemErr" role="alert" hidden></p>
    <label class="field" for="gpw">${mode === "signin" ? "Password" : "Create a password"}<input id="gpw" type="password" autocomplete="${mode === "signin" ? "current-password" : "new-password"}" placeholder="${mode === "signin" ? "Password" : "At least 8 characters"}" aria-describedby="gpwErr"></label><p class="ferr" id="gpwErr" role="alert" hidden></p>
    ${mode === "signin" ? `<div class="gaterow"><button type="button" class="linkbtn" data-act="forgotpw">Forgot password?</button></div>` : ""}
    <button class="btn pink lg block" type="submit">${mode === "signin" ? "Sign in" : p.kind === "build" ? "Create account and build" : p.kind === "clueedit" ? "Create account and save" : p.kind === "invite" ? `Join ${esc((TEAMS[S.invite || "taskly.io"] || {}).name || "the team")}` : "Create account"}</button>
    <p class="legal">${mode === "signin" ? `New to Clueso? <button type="button" class="linkbtn" data-act="gatemode" data-k="signup">Create an account</button>` : `Already have an account? <button type="button" class="linkbtn" data-act="gatemode" data-k="signin">Sign in</button>`}</p>
    ${mode === "signin" ? "" : `<p class="legal">By creating an account you agree to the Terms and Privacy policy.</p>`}</form>`);
  setTimeout(() => { const i = $("#gem"); if (i) i.focus(); }, 0);
}
// After the gate: the guest's brief, plan and chat carry over, and what they were doing continues
function finishGate(first, last, email, verified, existing) {
  markAccount();
  const nm = (first || "").trim();
  S.user = existing ? { ...(accounts()[(email || "").toLowerCase()] || DEMO_ACCT) } : { first: nm || email.split("@")[0], last: (last || "").trim(), email, ini: ((nm[0] || email[0]) + ((last || "")[0] || "")).toUpperCase(), known: !!nm };
  S.guest = false; S.verified = existing ? undefined : verified; const p = S.pending || {}; S.pending = null; closeLayers(); saveAccount(S.user); takeInvite();
  if (p.kind === "build") { const c = chatById(p.chat); if (c) { const brief = c.q && c.answer ? c.answer : c.ask; S.prompt = brief; startBuild("new", brief, c.id); toast(existing ? "Signed in. Building your video" : "Account created. Building your video"); return; } }
  if (p.kind === "record") { startBuild("new", p.name || "Screen recording"); return; }
  if (p.kind === "clueedit") { go("/home"); render(); toast(`${existing ? "Signed in" : "Account created"}. A copy of “${STYLES[p.clue][0]}” is in your Workspace Clueprints, ready to edit`); return; }
  if (p.kind === "recordlater") { render(); toast(`Account created. We emailed ${S.user.email} a link to record on your computer`); return; }
  const after = S.after; S.after = null;
  if (after && !existing) { go("/home"); render(); toast("Account created. That link is in someone else's workspace: ask them to invite you"); return; } // a new account can't see another workspace's page
  go(after || "/home"); render(); toast(existing ? (TASKS.length || S.prompt ? "Signed in. What you started is still here" : "Signed in") : "Account created");
}
// An invite opened while signed in: join the team's workspace (your videos move with you), or not now
function inviteSignedIn() { const d = "taskly.io", t = TEAMS[d]; if (S.team === d) return toast(`You're already in ${t.name}'s workspace`);
  dialog(dh(`Join ${esc(t.name)} on Clueso`, `${esc(t.by)} invited you. Joining moves your videos into ${esc(t.name)}'s workspace, where your team can see them.`) + `<div class="db gate">${`<div class="gbuild"><span class="thumb gteam" aria-hidden="true">${SEED.projects.slice(0, 3).map((x, k) => sceneThumb(x.name, 1 + k, 6, x.th === "t-white" ? "t-ink" : x.th || "t-plum")).join("")}<b>${esc(t.name[0])}</b></span><span><b class="trunc">${esc(t.name)} workspace</b><span>${t.members} people · ${SEED.projects.length} videos · invited by ${esc(t.by)}</span></span></div>`}</div><div class="df"><button class="btn" data-act="closedlg">Not now</button><button class="btn pink" data-act="joininvite">Join ${esc(t.name)}</button></div>`); }
function joinTeam(dom, quiet) { const t = TEAMS[dom]; if (!t) return; const mine = PROJECTS.filter(p => !p.sample); S.team = dom; S.wsName = null; S.teamOffer = "joined";
  const ids = new Set(PROJECTS.map(p => p.id)); JSON.parse(JSON.stringify(SEED.projects)).forEach(p => { if (!ids.has(p.id)) PROJECTS.push(p); }); S.firstRun = false;
  if (!quiet) toast(mine.length ? `Moved to ${t.name}'s workspace. Your team can see it now` : `You're in ${t.name}'s workspace`); }
// An invite link (#/invite) is kept until the account exists, whichever way it's made (email, Google, SSO, signing in)
function takeInvite() { const d = S.invite; S.invite = null; if (d) joinTeam(d); }
// Google's account chooser (a stand-in for Google's own screen): the browser's signed-in Google account, or another one
function googleChooser(k) { closeLayers(); dialog(`<div class="gpick"><div class="gph">${icon("google")}<b>Choose an account</b><span>to continue to Clueso</span></div><button class="gacct" data-act="googlepick" data-k="${k || "signin"}"><span class="ava person">AR</span><span><b>Alex Rivera</b>alex.rivera@gmail.com</span></button><button class="gacct" data-act="ganother" data-k="${k || "signin"}"><span class="ava gadd">${icon("users")}</span><span><b>Use another account</b></span></button><p class="mut">Google shares your name, email and profile picture with Clueso.</p></div>`); }
function newAccount(first, last, email, verified) {
  const inv = S.invite;
  markAccount();
  applyScenario("new"); seeUpdates();
  const f = (first || "").trim(), l = (last || "").trim();
  S.user = { first: f || email.split("@")[0], last: l, email, ini: ((f[0] || email[0]) + (l[0] || "")).toUpperCase(), known: !!f };
  S.verified = verified; S.invite = inv; saveAccount(S.user); takeInvite(); go("/home");
}
document.addEventListener("change", e => { if (e.target && e.target.dataset && e.target.dataset.wsname) { const v = e.target.value.trim(); S.wsName = v || null; render(); toast(v ? `Workspace renamed to ${v}` : "Workspace name reset"); } });
document.addEventListener("submit", e => {
  const f = e.target.dataset && e.target.dataset.form; if (!f) return; e.preventDefault();
  const v = id => (($("#" + id) || {}).value || "").trim(); const okEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  if (f === "signin") { const em = v("em"), pw = v("pw"); fErr("siErr", ""); fErr("siPwErr", "");
    if (!okEmail(em)) { fErr("siErr", "Enter the email address you signed up with."); $("#em").focus(); return; }
    const acct = accounts()[em.toLowerCase()];
    if (!acct) { fErr("siErr", `There's no account for ${esc(em)}. <a href="#/signup">Create one</a>, or try another email.`); $("#em").focus(); return; }
    if (pw.length < 1) { fErr("siPwErr", "Enter your password."); $("#pw").focus(); return; }
    markAccount(); const same = S.user && S.user.email && S.user.email.toLowerCase() === acct.email.toLowerCase();
    if (S.invite) { S.guest = false; S.user = { ...acct }; takeInvite(); go("/home"); return; }
    const after = S.after; S.after = null;
    if (S.guest) { if (signInRestore(acct.email, after)) return; S.guest = false; S.user = { ...acct }; S.verified = undefined; toast("Signed in. What you started is still here"); go(after || "/home"); return; }
    if (!same && acct.email !== DEMO_ACCT.email) { applyScenario("new"); seeUpdates(); } // another account made here: its own workspace (the prototype keeps one workspace's work at a time)
    S.user = { ...acct }; go(after || "/home"); return; }
  if (f === "signup") { const em = v("sem"), pw = ($("#spw") || {}).value || ""; let bad = false;
    if (!okEmail(em)) { fErr("semErr", "Enter an email address, like name@company.com."); bad = true; }
    else if (accounts()[em.toLowerCase()]) { fErr("semErr", `There's already an account for this email. <a href="#/signin">Sign in instead</a>.`); bad = true; } else fErr("semErr", "");
    if (pw.length < 8) { fErr("spwErr", `Use at least 8 characters${pw.length ? ` (${pw.length} so far)` : ""}.`); bad = true; } else fErr("spwErr", "");
    if (bad) { const first = document.querySelector('[aria-invalid="true"]'); if (first) first.focus(); return; }
    newAccount(v("sfn"), v("sln"), em, false); return; }
  if (f === "chemail") { const em = v("chem"); if (!okEmail(em)) { fErr("chemErr", "Enter an email address, like name@company.com."); $("#chem").focus(); return; }
    if (em.toLowerCase() !== S.user.email.toLowerCase() && accounts()[em.toLowerCase()]) { fErr("chemErr", "There's already an account for this email. Use another one."); $("#chem").focus(); return; }
    try { const a = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}"); delete a[S.user.email.toLowerCase()]; localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); } catch (x) {}
    S.user.email = em; S.verified = false; saveAccount(S.user); closeLayers(); render(); toast(`We sent a verification link to ${em}`); return; }
  if (f === "gother") { const em = v("gaem"), nm = v("gann"), k = e.target.dataset.k; if (!okEmail(em)) { fErr("gaemErr", "Enter an email address, like name@company.com."); $("#gaem").focus(); return; }
    const parts = (nm || em.split("@")[0].split(/[._-]/).map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(" ")).trim().split(/\s+/), first = parts[0] || "", last = parts.slice(1).join(" ");
    const acct = accounts()[em.toLowerCase()]; closeLayers();
    if (S.guest) { if (acct && !S.pending && signInRestore(acct.email, S.after)) return; finishGate(acct ? acct.first : first, acct ? acct.last : last, em, true); return; } // finishGate goes on to what they were doing
    if (acct) { markAccount(); if (!(S.user && S.user.email && S.user.email.toLowerCase() === acct.email.toLowerCase()) && acct.email !== DEMO_ACCT.email) { applyScenario("new"); seeUpdates(); } S.user = { ...acct }; S.verified = true; if (S.invite) takeInvite(); go("/home"); toast("Welcome back"); return; }
    newAccount(first, last, em, true); return; }
  if (f === "gate") { const em = v("gem"), pw = ($("#gpw") || {}).value || "", mode = (S.pending || {}).mode || "signup"; let bad = false;
    if (!okEmail(em)) { fErr("gemErr", "Enter an email address, like name@company.com."); bad = true; }
    else if (mode === "signup" && accounts()[em.toLowerCase()]) { fErr("gemErr", `There's already an account for this email. <button type="button" class="linkbtn" data-act="gatemode" data-k="signin">Sign in instead</button>; your brief is kept.`); bad = true; }
    else if (mode === "signin" && !accounts()[em.toLowerCase()]) { fErr("gemErr", `There's no account for ${esc(em)}. <button type="button" class="linkbtn" data-act="gatemode" data-k="signup">Create one</button>.`); bad = true; } else fErr("gemErr", "");
    if (mode === "signup" && pw.length < 8) { fErr("gpwErr", `Use at least 8 characters${pw.length ? ` (${pw.length} so far)` : ""}.`); bad = true; } else if (mode === "signin" && !pw) { fErr("gpwErr", "Enter your password."); bad = true; } else fErr("gpwErr", "");
    if (bad) { const first = document.querySelector('[aria-invalid="true"]'); if (first) first.focus(); return; }
    if (mode === "signin" && !["build", "record", "recordlater", "clueedit"].includes((S.pending || {}).kind) && signInRestore(em, S.after)) return; // nothing waiting: back to this account's own work
    finishGate("", "", em, false, mode === "signin"); return; }
  if (f === "sso") { const em = v("ssoem"), dom = em.split("@")[1] || "";
    if (!okEmail(em)) { fErr("ssoErr", "Enter your work email address."); $("#ssoem").focus(); return; }
    if (PERSONAL.test(em)) { fErr("ssoErr", "SSO works with company email addresses. Use Google, or sign up with email."); return; }
    if (!SSO_DOMAINS.includes(dom.toLowerCase())) { fErr("ssoErr", `We couldn't find SSO for ${esc(dom)}. Ask your IT team, or <button type="button" class="linkbtn" data-act="gatemode" data-k="signup">sign up with email</button>.`); return; }
    toast(`Signing in with ${dom.split(".")[0].replace(/^./, m => m.toUpperCase())}…`); const nm = em.split("@")[0].split(/[._-]/); if (S.guest) { finishGate(nm[0] ? nm[0][0].toUpperCase() + nm[0].slice(1) : "", nm[1] ? nm[1][0].toUpperCase() + nm[1].slice(1) : "", em, true); return; } newAccount(nm[0] ? nm[0][0].toUpperCase() + nm[0].slice(1) : "", nm[1] ? nm[1][0].toUpperCase() + nm[1].slice(1) : "", em, true); return; }
});
document.addEventListener("input", e => { if (e.target.id === "sem") { const tip = $("#semTip"); if (tip) tip.hidden = !!e.target.value && !PERSONAL.test(e.target.value) && /@.+\./.test(e.target.value); } }); // the tip only matters for a personal email

/* ---------- onboarding ---------- */
function onbTop(step) {
  return `<div class="onbtop">${step > 1 ? `<button class="btn ghost" data-act="back">${icon("chevLeft")}Back</button>` : `<div class="wm" style="display:flex;gap:6px;align-items:center;font:500 17px/24px var(--display)">${LOGO}Clueso</div>`}
    <div class="prog" ${fix(2)}>${[1, 2, 3].map(i => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}<span>Step ${step} of 3</span></div>
    <div style="margin-left:auto;font-size:12px;color:var(--muted)">${esc(S.user.email)}</div></div>`;
}
const ROLE_SUG = {
  "Customer education and training": "Teach customers how to set up their account",
  "Product management": "Announce a new feature to customers in 60 seconds",
  "Product marketing": "A 30-second launch teaser for a new feature",
  "Customer support and success": "Answer our most common support question",
  "Learning and development": "Onboard new hires to our internal tools",
  "Sales and pre-sales": "A short demo for a prospect's use case",
  "Founder or executive": "A 2-minute product overview",
};
function goalSugs() {
  const gs = S.goals.size ? [...S.goals] : [];
  const list = [ROLE_SUG[S.role], ...gs.flatMap(g => SUGGEST[g] || [])].filter(Boolean);
  return [...new Set(list)].slice(0, 3);
}
/* ---------- first run: no wizard ----------
   The first Home visit is the onboarding (research/onboarding-research.md, decided with the user 19 Oct 2026). Nothing is
   asked before value: a short before/after shows what Clueso does, the composer is ready with optional starters (a chip
   fills an example brief, editable, never a gate), the starts are ordered by effort (describe, drop a file, record), the
   cost is shown in credits and videos, and what Clueso will make is inferred from the brief and changeable in one click. Questions about
   the user come after the first share, and are optional. */
const JOBS = [
  { k: "demo", ic: "video", t: "Product demo", d: "Show customers how your product works", have: "record", clue: 0, title: "How to create your first project", makes: "a polished 1-minute demo",
    brief: "A 1-minute demo of our product for new customers: how to create your first project, step by step." },
  { k: "training", ic: "users", t: "Training video", d: "Teach a tool or process to your team", have: "slides", clue: 6, title: "Running the weekly review", makes: "a narrated training video",
    brief: "A 2-minute training video for new team members: how we run the weekly review." },
  { k: "sop", ic: "doc", t: "How-to article", d: "Step-by-step help with screenshots", have: "record", clue: 0, title: "Reset a customer's password", makes: "a step-by-step article and a video",
    brief: "A step-by-step article for our support team: how to reset a customer's password." },
  { k: "marketing", ic: "bolt", t: "Launch teaser", d: "Announce a product or feature", have: "idea", clue: 2, title: "Meet the new dashboard", makes: "a 30-second launch teaser",
    brief: "A 30-second teaser for our new dashboard, for existing customers. Hook on the pain, show it working, end with where to find it." },
];
S.start = { jobs: new Set(), job: null, have: null, rec: "idle", recSec: 0, file: null, brief: "" };
/* ---------- create (home) ---------- */
// Rotating suggestion inside the empty prompt; Tab accepts it. Mirrors Clueso's own placeholder pattern,
// with suggestions taken from the user's onboarding answer instead of generic examples.
function ghostList() { const l = goalSugs(); return l.length ? l : SUGGEST.none; }
function ghostSug() { const l = ghostList(); return l[(S.sugIdx || 0) % l.length]; }
let ghostTimer = null, ghostRun = 0;
// Per-character reveal measured on web.clueso.io: old text vanishes (400 ms ease-out, blur 0→4px, translateX 0→6px,
// scattered delays (i×13) mod 50 ms) while the Tab key fades out (200 ms); 500 ms later the new text materializes
// (450 ms ease-out, blur 10px→0, translateX 6px→0, delays i×20 ms, left to right, spaces counted); the key fades back in once the
// last character lands, and the suggestion holds for 4 s.
function ghostChars(text, mode) {
  let i = 0;
  return text.split(" ").map(w => `<span class="w">${[...w].map(c => { const d = mode === "out" ? (i * 13) % 50 : i * 20; i++; return `<span class="ch" style="animation-delay:${d}ms">${esc(c)}</span>`; }).join("")}</span>${(i++, "")}`).join(" ");
}
function startGhost() {
  clearTimeout(ghostTimer); const run = ++ghostRun;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const later = (ms, f) => { ghostTimer = setTimeout(() => { if (run === ghostRun) f(); }, ms); };
  const cycle = () => later(4000, () => {
    const g = $(".psug .gtext"), k = $(".psug .kbd"), ta = $("#prompt");
    if (!g || !ta || ghostList().length < 2) return;
    if (ta.value) return cycle();
    g.innerHTML = ghostChars(g.textContent, "out"); g.className = "gtext out"; if (k) k.classList.add("off");
    later(500, () => {
      S.sugIdx = (S.sugIdx || 0) + 1; const t = ghostSug();
      g.innerHTML = ghostChars(t, "in"); g.className = "gtext in";
      const h = $("#ghosthint"); if (h) h.textContent = "Suggestion: " + t + ". Press Tab to use it.";
      later(450 + ([...t].length - 1) * 20, () => { if (k) k.classList.remove("off"); cycle(); });
    });
  });
  cycle();
}
function promptBox(ph) {
  const has = S.prompt.trim();
  const sug = ghostSug();
  return `<div class="prompt">
    ${S.clue != null && STYLES[S.clue] ? `<div class="pclue" title="Using this Clueprint. Tell Clueso your product, who it's for and what viewers should do"><span class="thumb ${STYLES[S.clue][1]}" aria-hidden="true"></span><span class="trunc">Clueprint: <b>${esc(STYLES[S.clue][0])}</b></span><button class="iconbtn" data-act="clueoff" aria-label="Remove the Clueprint">${icon("close")}</button></div>` : ""}
    <div class="pwrap" ${fix(5)}>
      <textarea id="prompt" placeholder="${esc(ph || "Describe the video you want")}" aria-label="${S.clue != null ? "Describe your product, who it's for and what viewers should do" : "Describe the video you want"}" aria-describedby="ghosthint">${esc(S.prompt)}</textarea>
      <div class="psug" aria-hidden="true" ${has ? "hidden" : ""}><span class="gtext">${esc(sug)}</span><span class="kbd">Tab</span></div>
      <span id="ghosthint" class="sr">Suggestion: ${esc(sug)}. Press Tab to use it.</span>
    </div>
    <div class="prow">
      <button class="pill sq" data-act="attach" aria-label="Add: record, files, a project or a Clueprint" aria-haspopup="menu" title="Record, attach files, add a project or a Clueprint">${icon("plus")}</button>
      ${firstRun() ? "" : `<button class="pill" data-act="mode" aria-haspopup="menu" aria-label="Check in: ${S.mode}" title="${(CHECKIN.find(c => c[0] === S.mode) || CHECKIN[0])[2]}">${esc(S.mode)}${icon("chevDown")}</button>
      ${modelPill(fix(2))}
      <button class="pill" data-act="brandchip" aria-haspopup="menu" aria-label="Brand: ${curKit().name}" ${(nextStep() || {}).k === "brand" ? 'aria-describedby="nextline"' : ""} ${fix(3)}>${kitDots(curKit())}${curKit().name}${icon("chevDown")}</button>`}
      ${freeFirst() ? `<span class="cost free" ${fix(4)} title="No credits are taken for your first video">${icon("sparkle")}Your first video is on us</span>` : `<span class="cost ${outOfCredits() || (has && !canBuild()) ? "warn" : ""}" ${fix(4)} title="${has ? "Estimate for this video. Credits are taken as Clueso builds it; in Ask and Plan you approve the plan and its cost first" : "Replies use a few credits; a video's cost is shown here before you send"}">${icon("coin")}${outOfCredits() ? `Out of credits · <a href="#/settings/plan-and-usage">See plans</a>` : has ? (canBuild() ? `About ${costRange()} credits · ${credLeft().toLocaleString("en-US")} left` : `Needs about ${costRange()} · only ${credLeft().toLocaleString("en-US")} left`) : credWords(credLeft())}</span>`}
      <button class="sendbtn" data-act="send" aria-label="Send" ${has && (freeFirst() || !outOfCredits()) ? "" : "disabled"}>${icon("send")}</button>
    </div></div>`;
}
/* A frame from the video instead of a coloured tile: the title card it opens on, over the screen it shows (a product
   window for recordings and AI videos, a slide for decks). The prototype has no real frames, so this stands in for one. */
function thumbFrame(p) {
  const slide = p.type === "Slides";
  return `<div class="thumb fr ${p.th}" aria-hidden="true"><span class="frwin ${slide ? "slide" : ""}">${slide ? "" : `<i class="frbar"><b></b><b></b><b></b></i>`}<i class="frbody">${slide ? `<i class="frl w1"></i><i class="frl w2"></i><i class="frl w3"></i>` : [
    `<i class="frl w1"></i><i class="frl w2"></i><i class="frbtn"></i>`,                                              // a form
    `<i class="frl w1"></i>${"<i class=\"frrow\"><b></b><i class=\"frl w2\"></i></i>".repeat(3)}`,                   // a list
    `<i class="frl w1"></i><i class="frbars">${[60, 85, 45, 100, 70].map(h => `<b style="height:${h}%"></b>`).join("")}</i>` // a chart
  ][[...p.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 3]}</i></span><span class="frcap trunc">${esc(p.label || p.name)}</span><span class="dur">${p.dur}</span></div>`;
}
// A 40-second before/after, playing muted on a loop: a rough recording becomes a finished video. It answers "what is this?"
// with nothing to read or press. Explorers can open the same sample in the editor.
// First run: Clueprints instead of a single example (live's first-video step shows them too). Each is a finished style
// made with Clueso: preview it scene by scene, then "Create video" attaches it to the box above.
const FIRST_CLUES = [0, 1, 2, 6];
function clueRow() {
  return `<section class="cluerow" aria-labelledby="cluerowh" ${fix(10)}><div class="hd"><span id="cluerowh">Start from a Clueprint</span><button class="btn xs" data-act="style" data-i="0" title="See all ${STYLES.length} Clueprints (← → to step through)">See all${icon("chevRight")}</button></div>
    <p class="mut">Video styles made with Clueso. Preview one, then make yours with it.</p>
    <div class="cards">${FIRST_CLUES.map(i => { const s = STYLES[i]; return `<button class="pcard" data-act="style" data-i="${i}" aria-label="Preview the ${esc(s[0])} Clueprint"><div class="thumb ${s[1]}">${esc(s[2])}<span class="fdplay" aria-hidden="true">${icon("play")}</span></div><div class="meta"><b class="trunc" title="${esc(s[0])}">${esc(s[0])}</b><span class="cneed trunc" title="Needs ${esc(s[4].join(" or ").toLowerCase())}">Needs ${esc(s[4][0].charAt(0).toLowerCase() + s[4][0].slice(1))}</span></div></button>`; }).join("")}</div></section>`;
}
function firstDemo() {
  return `<div class="firstdemo" ${fix(10)}><div class="fdv" aria-hidden="true"><div class="thumb raw"><span class="wave"></span></div><div class="thumb t-plum fda">Work is everywhere.</div><span class="fdl">Example</span></div>
    <div class="fdt"><b>See what Clueso does</b><span>A rough 2-minute recording becomes a 1-minute video with voiceover, zooms, captions and an article.</span><span class="fdb"><button class="btn" data-act="toast" data-m="Plays the 40-second example with sound">${icon("play")}Watch with sound · 0:40</button><button class="linkbtn" data-act="stexplore">Open this sample in the editor</button></span></div></div>`;
}
// One optional question, only after the first share: what they'll mostly make, to suggest Clueprints. Never before value.
const VTYPES = { demo: "a 1-minute product demo", training: "a 2-minute training video", sop: "a how-to article with a short video", marketing: "a 30-second launch teaser", video: "a 1-minute video" };
// The video type is read from the brief rather than asked: no wrong first pick to undo
function inferType(t) { t = (t || "").toLowerCase(); return /teaser|launch|announce|promo|marketing|new feature/.test(t) ? "marketing" : /\bdemo\b|walkthrough|walk through/.test(t) ? "demo" : /train|onboard|new hires|team members|course|lesson/.test(t) ? "training" : /how to|how-to|guide|steps|step-by-step|sop|reset|set up|setup/.test(t) ? "sop" : /show (customers|how)|product/.test(t) ? "demo" : "video"; } // an explicit "demo" wins over "step by step"
function askLater() {
  if (!S.checklist.share || S.askedMake || nextStep()) return "";
  return `<div class="nextline asklater"><span><span class="nlc">One question</span> · What will you mostly make? It changes the suggestions here.</span><span class="starters inline">${JOBS.map(j => `<button class="choice" data-act="askmake" data-k="${j.k}">${j.t}</button>`).join("")}</span><button class="iconbtn nlx" data-act="askmake" data-k="" aria-label="No thanks" title="No thanks">${icon("close")}</button></div>`;
}
// First run, after Send: Clueso's question or plan in the same focused screen, not the full Chats page
// One way back to the brief: the plan card's Change brief when there's a plan; the top link only while Clueso asks a question.
function vFirstPlan(c) {
  const left = S.credits.total - S.credits.used;
  return shell("create", `<div class="create firstrun frplan">
    ${c.plan && !c.pid ? "" : `<div class="frtop"><button class="linkbtn" data-act="frback">${icon("chevLeft")}Change the brief</button></div>`}
    <div class="frthread">${aiThread(c, left, true)}</div>
    ${c.q && !c.answer ? `<div class="frreply">${aiComposer(c, { kind: "chats", label: "Clueso AI" })}</div>` : ""}
  </div>`, { grid: true });
}
function vCreate() {
  { const fc = S.frChat && chatById(S.frChat); if (firstRun() && fc && !fc.pid) { S.chatId = fc.id; return vFirstPlan(fc); } }
  const gs = S.goals.size ? [...S.goals] : ["none"];
  const sugs = goalSugs().length ? goalSugs() : SUGGEST.none.slice(0, 3);
  const first = firstRun(); const phone = innerWidth <= 760 || matchMedia("(pointer: coarse)").matches;
  // First run: the starts ordered by effort (drop a file, then record), nothing to translate yet; on a phone, recording moves to the computer
  const opts = first ? [CREATE.find(o => o.k === "upload"), phone ? { k: "recordlater", ic: "record", label: "Record on your computer", desc: "Screen recording needs a computer. We'll email you a link to open there." } : { ...CREATE.find(o => o.k === "record"), desc: "About 2 minutes. Open the product you want to show, then talk as you go." }] : CREATE.filter(o => !o.menuOnly);
  // Gap 3 (the return visit): a stalled first video is the first thing Home shows, with the one action that moves it on
  const resume = (() => { const g = S.generating && PROJECTS.find(p => p.id === S.generating.id); if (g) return `<div class="resume" role="status">${icon("sparkle")}<span class="grow"><b>Your video is building</b><span class="trunc">“${esc(g.name)}” · ${Math.min(S.generating.step, 6)} of 6 scenes ready</span></span><a class="btn" href="#/project/${g.id}">${Math.min(S.generating.step, 6) ? "Watch what's ready" : "See progress"}</a></div>`;
    const r = S.ready && !S.watched && PROJECTS.find(p => p.id === S.ready); if (r) return `<div class="resume" role="status"><span class="rdot" aria-hidden="true">${icon("check")}</span><span class="grow"><b>Your video is ready</b><span class="trunc">“${esc(r.name)}”</span></span><button class="btn pink" data-act="watch" data-id="${r.id}">${icon("play")}Watch it</button></div>`; return ""; })();
  return shell("create", `<div class="create ${first ? "firstrun" : ""}" ${first ? 'data-drop="1"' : ""}>${resume}
    ${first && S.user.known ? `<p class="hello">Welcome, ${esc(S.user.first)}</p>` : ""}
    ${first && S.guest && hadAccount() ? `<p class="hasacct">Have an account? <button class="linkbtn" data-act="gatesignin">Sign in to see your videos</button></p>` : ""}
    <div class="hero"><span style="display:flex;gap:10px;align-items:center"><svg viewBox="0 0 100 100" width="22" height="22" style="color:var(--ink)" aria-hidden="true"><path d="${LOGO.match(/d="([^"]+)"/)[1]}" fill="currentColor"/></svg>${first && S.guest ? "Describe a video, and Clueso makes it" : "What are we creating today?"}</span></div>
    ${promptBox(sugs[0] && S.goals.size ? "Describe the video you want. For example: " + sugs[0].charAt(0).toLowerCase() + sugs[0].slice(1) : "Describe the video you want. Clueso AI asks about audience and style, then drafts it.")}
    ${first ? `<div class="starters" role="group" aria-label="Start from an example"><span class="mut">Start from an example:</span>${JOBS.map(j => `<button class="choice ${S.prompt === j.brief ? "on" : ""}" data-act="starter" data-k="${j.k}" aria-pressed="${S.prompt === j.brief}">${j.t}</button>`).join("")}</div>` : ""}
    ${nextLine()}
    ${askLater()}
    ${(() => {
      const ways = `<div class="orline">Or start another way</div>
    <div class="ways ${first ? "two" : ""}" ${fix(1)}>${opts.map(o => `<button class="way" data-act="${o.k === "recordlater" ? "recordlater" : "create"}" data-k="${o.k}"><span class="wi">${icon(o.ic)}</span><span><b>${o.label}</b><span>${o.desc}</span></span></button>`).join("")}</div>`;
      const recent = PROJECTS.length ? `<section class="recent" aria-label="Recent projects"><div class="hd"><span>Recent projects</span><a class="btn xs" href="#/projects">See all${icon("chevRight")}</a></div>
      <div class="cards">${PROJECTS.slice(0, 3).map(p => `<a class="pcard" href="#/project/${p.id}" aria-label="${esc(p.name)}, ${p.dur}, edited ${p.mod}">${thumbFrame(p)}<div class="meta"><b class="trunc" title="${esc(p.name)}">${esc(p.name)}</b><span><span class="bdg">${p.type}</span>Edited ${p.mod}</span></div></a>`).join("")}</div>
    </section>` : "";
      // Returning (set-up done, more than one project): their work comes before the other ways to start
      return PROJECTS.length > 1 && !nextStep() ? recent.replace('class="recent"', 'class="recent first"') + ways : ways + recent;
    })()}
  ${first ? clueRow() : ""}
  ${first && S.guest ? `<p class="vterms">By using Clueso, you agree to the <button class="linkbtn" data-act="toast" data-m="Opens Clueso's Terms of Service">Terms</button> and <button class="linkbtn" data-act="toast" data-m="Opens Clueso's Privacy Policy">Privacy Policy</button>. Clueso is AI and can make mistakes.</p>` : ""}
  ${first ? `<div class="dropzone" aria-hidden="true"><span>${icon("upload")}Drop it to start your video</span></div>` : ""}
  </div>`, { grid: true });
}

/* ---------- projects ----------
   Checked against web.clueso.io (17 Oct 2026): tabs All / Deleted (kept 30 days), five filter dropdowns (type, creator, tags,
   created, modified), an 8-option sort menu that repeats the sortable column headers, and a row menu (open in new tab, edit
   title, tags, duplicate, copy link, pin, move, copy to workspace, delete) that appears on hover only.
   Here: the same abilities in fewer controls. Sort lives on the column headers (Jakob's law; one control, not two). One
   Filter button with removable chips (Hick's law; five dropdowns clip New folder in Clueso). The row menu shows on hover and
   on keyboard focus. Titles are real links, so "open in new tab" is the browser's own. Delete moves to Deleted with Undo
   (NN/g: undo beats confirmation). Creator and Copy to workspace are left out for a one-person, one-workspace Free account. */
const agoMin = s => { if (!s || /just now/.test(s)) return 0; const m = s.match(/([\d.]+)\s*(min|h|d)/); if (!m) return 0; return +m[1] * ({ min: 1, h: 60, d: 1440 }[m[2]]); };
const durSec = s => { const m = (s || "").replace("~", "").match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 0; };
S.projSort = S.projSort || { key: "edited", dir: "asc" }; // asc on "edited" = most recent first
S.pf = S.pf || { types: new Set(), edited: "any" };
S.deleted = S.deleted || [];
S.pinned = S.pinned || new Set();
const EDITED = [["any", "Any time"], ["hour", "In the last hour"], ["today", "Today"], ["week", "Last 7 days"]];
const editedOk = p => { const m = agoMin(p.mod); return S.pf.edited === "any" || (S.pf.edited === "hour" && m <= 60) || (S.pf.edited === "today" && m <= 1440) || (S.pf.edited === "week" && m <= 10080); };
function projFilterPop() {
  const types = [...new Set(PROJECTS.map(p => p.type))];
  return `<div class="lab">Type</div>${types.map(t => `<button class="mi" role="menuitemcheckbox" aria-checked="${S.pf.types.has(t)}" data-act="pftype" data-k="${esc(t)}"><span class="ck">${S.pf.types.has(t) ? icon("check") : ""}</span>${esc(t)}<small>${PROJECTS.filter(p => p.type === t).length}</small></button>`).join("")}
    <div class="sep"></div><div class="lab">Edited</div>${EDITED.map(([k, l]) => `<button class="mi" role="menuitemradio" aria-checked="${S.pf.edited === k}" data-act="pfedited" data-k="${k}"><span class="ck">${S.pf.edited === k ? icon("check") : ""}</span>${l}</button>`).join("")}`;
}
function projRowMenu(id) {
  const p = PROJECTS.find(x => x.id === id); const pinned = S.pinned.has(id);
  return `<div class="lab">${esc(p.name.length > 34 ? p.name.slice(0, 34) + "…" : p.name)}</div>
    <button class="mi" data-act="pm" data-op="copy" data-id="${id}">${icon("link")}Copy link<small>Workspace only</small></button>
    <button class="mi" data-act="pm" data-op="rename" data-id="${id}">${icon("doc")}Rename</button>
    <button class="mi" data-act="pm" data-op="dup" data-id="${id}">${icon("layers")}Duplicate</button>
    <button class="mi" data-act="pm" data-op="pin" data-id="${id}">${icon("bolt")}${pinned ? "Unpin" : "Pin to top"}</button>
    <button class="mi" data-act="pm" data-op="move" data-id="${id}">${icon("folder")}Move to folder</button>
    <div class="sep"></div>
    <button class="mi danger" data-act="pm" data-op="del" data-id="${id}">${icon("close")}Delete<small>Kept 30 days</small></button>`;
}
function vProjects(fArg) {
  const tab = fArg ? "all" : S.projTab; // a folder lists its projects; Deleted is one list for the whole workspace
  S.folders = S.folders || [];
  const folder = fArg ? decodeURIComponent(fArg) : null;
  if (folder && !S.folders.includes(folder)) return shell("projects", `<div class="page"><div class="crumbs"><a href="#/projects">Projects</a></div><div class="drop" style="max-width:640px;margin-top:16px" role="status">${icon("folder")}<b style="color:var(--ink);font-weight:500">This folder doesn't exist</b>It may have been deleted or renamed.<a class="btn" href="#/projects">All projects</a></div></div>`);
  let body;
  if (tab === "deleted") {
    const day = 864e5; const fmt = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    body = S.deleted.length ? `<p class="mut" style="font-size:12px;margin:0 0 8px">Deleted projects stay here for 30 days, then they're removed for good. Restoring brings back their versions too.</p>
      <table class="list"><thead><tr><th scope="col">Name</th><th scope="col">Removed for good on</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>${S.deleted.map(d => `<tr><td><div class="nm"><div class="thumb ${d.p.th}"></div><div class="tw"><b>${esc(d.p.name)}</b><span class="sub"><span class="bdg">${d.p.type}</span>${d.p.versions.length + d.p.madeFrom.length ? `<span class="mut" style="font-size:11px">+${d.p.versions.length + d.p.madeFrom.length} versions</span>` : ""}</span></div></div></td><td class="mut">${fmt(d.at + 30 * day)}</td><td style="text-align:right"><button class="btn" data-act="restore" data-id="${d.p.id}">Restore</button></td></tr>`).join("")}</tbody></table>`
      : `<div class="drop" style="max-width:720px">${icon("close")}<b style="color:var(--ink);font-weight:500">Nothing deleted</b>Projects you delete stay here for 30 days, so you can restore them.</div>`;
  } else {
    const q = (S.projQ || "").trim().toLowerCase(); const words = q.split(/\s+/).filter(Boolean);
    const hit = n => words.every(w => n.toLowerCase().includes(w));
    const { key, dir } = S.projSort; const sgn = dir === "asc" ? 1 : -1;
    const cmp = (a, b) => sgn * (key === "name" ? a.name.localeCompare(b.name) : key === "dur" ? durSec(a.dur) - durSec(b.dur) : agoMin(a.mod) - agoMin(b.mod));
    const shownList = PROJECTS.filter(p => (!q || hit(p.name) || [...p.versions, ...p.madeFrom].some(k => hit(k.name))) && (!S.pf.types.size || S.pf.types.has(p.type)) && editedOk(p) && (folder ? p.folder === folder : (q || S.pf.types.size || S.pf.edited !== "any") || !p.folder || !S.folders.includes(p.folder)))
      .sort((a, b) => (S.pinned.has(b.id) - S.pinned.has(a.id)) || cmp(a, b));
    const rows = shownList.map(p => {
      const kids = [...p.versions.map(v => ({ ...v, kind: v.lang, th: p.th, isLang: true })), ...p.madeFrom];
      const kidHit = q && kids.some(k => hit(k.name));
      const open = S.expanded.has(p.id) || kidHit; const showKids = q && !hit(p.name) ? kids.filter(k => hit(k.name)) : kids;
      return `<tr class="row" data-go="/project/${p.id}"><td><div class="nm">${kids.length ? `<button class="iconbtn" data-act="expand" data-id="${p.id}" aria-expanded="${open}" aria-label="${open ? "Hide" : "Show"} ${kids.length} version${kids.length > 1 ? "s" : ""}">${icon(open ? "chevDown" : "chevRight")}</button>` : `<span style="width:24px"></span>`}<div class="thumb ${p.th}"></div><div class="tw"><a class="ttl" href="#/project/${p.id}">${hl(p.name, words)}</a><span class="sub">${S.pinned.has(p.id) ? `<span class="bdg pink">${icon("bolt")}Pinned</span>` : ""}<span class="bdg">${p.type}</span>${p.article ? `<span class="bdg">${icon("doc")}Article</span>` : ""}${kids.length ? `<span class="mut" style="font-size:11px">+${kids.length} version${kids.length > 1 ? "s" : ""}</span>` : ""}</span><span class="phmeta">${p.dur} · ${p.mod}</span></div></div></td>
        <td class="mut">${p.dur}</td><td class="mut">${p.mod}</td><td class="rowact"><button class="iconbtn" data-act="rowmenu" data-id="${p.id}" aria-label="More actions for ${esc(p.name)}" aria-haspopup="menu">${icon("dots")}</button></td></tr>
        ${open ? showKids.map(k => `<tr class="row child" data-go="/project/${k.id}"><td><div class="nm indent"><div class="thumb ${k.th}"></div><div class="tw"><a class="ttl" href="#/project/${k.id}" style="font-size:14px">${hl(k.name, words)}</a><span class="sub">${k.isLang ? `<span class="bdg green">${icon("translate")}${k.kind}</span>` : `<span class="bdg pink">${icon("sparkle")}Made from this · ${k.kind}</span>`}</span><span class="phmeta">${k.dur} · ${k.mod}</span></div></div></td><td class="mut">${k.dur}</td><td class="mut">${k.mod}</td><td></td></tr>`).join("") : ""}`;
    }).join("");
    const th = (k, l) => { const on = S.projSort.key === k; const d = on ? S.projSort.dir : null; const aria = on ? (k === "edited" ? (d === "asc" ? "descending" : "ascending") : (d === "asc" ? "ascending" : "descending")) : "none";
      const hint = k === "edited" ? (on && d === "asc" ? "newest first" : on ? "oldest first" : "") : k === "name" ? (on ? (d === "asc" ? "A to Z" : "Z to A") : "") : (on ? (d === "asc" ? "shortest first" : "longest first") : "");
      return `<th scope="col" aria-sort="${aria}"><button class="sorth ${on ? "on" : ""}" data-act="psort" data-k="${k}" title="Sort by ${l.toLowerCase()}">${l}${on ? `<span class="sarr" aria-hidden="true">${(aria === "ascending") ? "↑" : "↓"}</span><span class="sr">, sorted ${hint}</span>` : ""}</button></th>`; };
    const filtered = S.pf.types.size || S.pf.edited !== "any";
    // Folders sit above projects at the top level (as in Drive and Finder); searching or filtering looks inside them too
    const fRows = folder || q || filtered ? "" : S.folders.map(f => { const n = PROJECTS.filter(p => p.folder === f).length, u = "/projects/" + encodeURIComponent(f);
      return `<tr class="row" data-go="${u}"><td><div class="nm"><span style="width:24px"></span><div class="thumb fthumb">${icon("folder")}</div><div class="tw"><a class="ttl" href="#${u}">${esc(f)}</a><span class="sub"><span class="mut" style="font-size:11px">Folder · ${n} project${n === 1 ? "" : "s"}</span></span></div></div></td><td class="mut"></td><td class="mut"></td><td class="rowact"><button class="iconbtn" data-act="foldermenu" data-k="${esc(f)}" aria-label="More actions for folder ${esc(f)}" aria-haspopup="menu">${icon("dots")}</button></td></tr>`; }).join("");
    body = shownList.length || fRows ? `<table class="list" ${fix(2)}><thead><tr>${th("name", "Name")}${th("dur", "Length")}${th("edited", "Edited")}<th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody ${fix(1)}>${fRows}${rows}</tbody></table>`
      : folder && !q && !filtered ? `<div class="drop" style="max-width:720px" role="status">${icon("folder")}<b style="color:var(--ink);font-weight:500">This folder is empty</b>Move projects here from their ⋯ menu, or from the editor's project menu.<a class="btn" href="#/projects">All projects</a></div>`
      : !PROJECTS.length && !q && !filtered ? `<div class="drop" style="max-width:720px" role="status">${icon("folder")}<b style="color:var(--ink);font-weight:500">No projects yet</b>Videos you make on Home show up here.${S.deleted.length ? ` ${S.deleted.length} deleted ${S.deleted.length === 1 ? "project is" : "projects are"} in Deleted for 30 days.` : ""}<a class="btn dark" href="#/home">${icon("plus")}Make a video</a></div>`
      : `<div class="drop" style="max-width:720px" role="status">${icon(q ? "search" : "filter")}<b style="color:var(--ink);font-weight:500">${q ? `No projects match “${esc(S.projQ.trim())}”` : "No projects match these filters"}</b>${q ? "Names are searched, including language versions and videos made from another." : "Try another type or a longer time range."}<span style="display:flex;gap:8px">${q ? `<button class="btn" data-act="clearpq">Clear search</button>` : ""}${filtered ? `<button class="btn" data-act="pfclear">Clear filters</button>` : ""}<button class="btn" data-act="cmdk">Search everything</button></span></div>`;
  }
  const chips = tab === "all" ? [...[...S.pf.types].map(t => `<button class="fchip" data-act="pftype" data-k="${esc(t)}" aria-label="Remove filter: type ${esc(t)}">Type: ${esc(t)}${icon("close")}</button>`), S.pf.edited !== "any" ? `<button class="fchip" data-act="pfedited" data-k="any" aria-label="Remove filter: edited ${EDITED.find(e => e[0] === S.pf.edited)[1]}">Edited: ${EDITED.find(e => e[0] === S.pf.edited)[1].toLowerCase()}${icon("close")}</button>` : ""].filter(Boolean) : [];
  const nf = S.pf.types.size + (S.pf.edited !== "any" ? 1 : 0);
  return shell("projects", `<div class="page">
    ${folder ? `<div class="crumbs"><a href="#/projects">Projects</a>${icon("chevRight")}<b>${esc(folder)}</b></div><div class="ptitle" style="margin-top:6px">${icon("folder")}${esc(folder)}</div>` : `<div class="ptitle">${icon("folder")}Projects</div>`}
    <div class="toolbar"><div class="tabs" ${folder ? "hidden" : ""}>${[["all", "All"], ["deleted", "Deleted"]].map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="projtab" data-k="${k}">${l}${k === "deleted" && S.deleted.length ? ` <span class="tabn">${S.deleted.length}</span>` : ""}</button>`).join("")}</div>
      <div style="flex:1"></div>
      ${tab === "all" ? `<label class="searchbox" style="width:220px">${icon("search")}<input id="pq" type="search" aria-label="Search projects" placeholder="Search projects" value="${esc(S.projQ || "")}" autocomplete="off" style="border:0;background:none;outline:none;flex:1;font-size:12px;min-width:0"></label>
      <button class="btn ${nf ? "on" : ""}" data-act="filter" aria-haspopup="menu" ${fix(3)}>${icon("filter")}Filter${nf ? ` <span class="tabn">${nf}</span>` : ""}</button>` : ""}
      ${folder ? "" : `<button class="btn" data-act="newfolder">${icon("folder")}New folder</button>`}</div>
    ${chips.length ? `<div class="fchips">${chips.join("")}<button class="btn ghost" data-act="pfclear" style="height:24px;font-size:12px">Clear all</button></div>` : ""}
    ${body}</div>`);
}

function renameDialog(id) {
  const p = PROJECTS.find(x => x.id === id);
  dialog(dh("Rename project") + `<div class="db"><label class="field">Name<input id="rnm" value="${esc(p.name)}" maxlength="120"></label></div><div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn pink" data-act="dorename" data-id="${id}">Save</button></div>`);
  const i = $("#rnm"); i.select(); i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); document.querySelector('[data-act="dorename"]').click(); } });
}
// Folders: one level, made from Projects or from Move to folder (here or in the editor); "Projects" is the top level
const ROOT_F = "Projects";
function moveDialog(id, sel) {
  const p = PROJECTS.find(x => x.id === id); if (!p) return; S.folders = S.folders || []; const cur = p.folder && S.folders.includes(p.folder) ? p.folder : ROOT_F; sel = sel || cur;
  dialog(dh(`Move “${esc(p.name)}”`, `Current location: ${esc(cur)}`) + `<div class="db edmove" role="radiogroup" aria-label="Folders">${[ROOT_F, ...S.folders].map(f => `<button class="edrow ${f === sel ? "on" : ""}" role="radio" aria-checked="${f === sel}" data-act="mvpick" data-id="${id}" data-k="${esc(f)}">${icon("folder")}<span><b>${esc(f)}</b>${f === cur ? `<span class="mut">Current location</span>` : ""}</span></button>`).join("")}
    <div class="edrep"><input id="mvnew" placeholder="New folder name" aria-label="New folder name" maxlength="60"><button class="btn" data-act="mvmk" data-id="${id}">${icon("plus")}Create folder</button></div></div>
    <div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="mvdo" data-id="${id}" data-k="${esc(sel)}" ${sel === cur ? "disabled" : ""}>Move here</button></div>`);
  const i = $("#mvnew"); if (i) i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $('[data-act="mvmk"]').click(); } });
}
// Name a folder: new (old = null) or rename. Names are unique; "Projects" is taken by the top level.
function folderDialog(old) {
  dialog(dh(old ? "Rename folder" : "New folder") + `<div class="db"><label class="field">Name<input id="fnm" value="${esc(old || "")}" maxlength="60" placeholder="e.g. Onboarding videos" aria-describedby="fnmErr"></label><p class="ferr" id="fnmErr" role="alert" hidden></p></div><div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="dofolder" data-k="${esc(old || "")}">${old ? "Save" : "Create folder"}</button></div>`);
  const i = $("#fnm"); i.select(); i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $('[data-act="dofolder"]').click(); } });
}
const folderErr = (v, old) => !v ? "Give the folder a name" : v.toLowerCase() === ROOT_F.toLowerCase() ? "“Projects” is the top level. Pick another name" : S.folders.some(f => f !== old && f.toLowerCase() === v.toLowerCase()) ? `There's already a folder called “${v}”` : "";

/* ---------- project hub ---------- */
function vProject(id) {
  const all = [...PROJECTS, ...PROJECTS.flatMap(p => p.madeFrom.map(m => ({ ...m, type: m.kind, parent: p, versions: [], madeFrom: [] }))), ...PROJECTS.flatMap(p => p.versions.map(v => ({ ...v, type: "Translation", th: p.th, parent: p, article: false, chat: null, versions: [], madeFrom: [] })))];
  const p = all.find(x => x.id === id);
  if (!p) { const del = S.deleted.find(d => d.p.id === id); return shell("projects", `<div class="page"><div class="crumbs"><a href="#/projects">Projects</a></div><div class="drop" style="max-width:640px;margin-top:16px" role="status">${icon("folder")}<b style="color:var(--ink);font-weight:500">${del ? "This project is in Deleted" : "This project doesn't exist"}</b>${del ? "Restore it to open it again. Deleted projects are kept for 30 days." : "It may have been removed, or the link is wrong."}<span style="display:flex;gap:8px">${del ? `<button class="btn dark" data-act="opendeleted">Open Deleted</button>` : ""}<a class="btn" href="#/projects">All projects</a></span></div></div>`); }
  const queued = (S.queue || []).some(x => x.id === id);
  const gen = S.generating && S.generating.id === id ? S.generating : null;
  const scenes = p.vtype ? scenesFor(p.vtype) : SCENES;
  const related = [...(p.versions || []).map(v => ({ id: v.id, n: v.lang, tag: "Language", cls: "green", d: v.dur })), ...(p.madeFrom || []).map(m => ({ id: m.id, n: m.name, tag: m.kind, cls: "pink", d: m.dur }))];
  return shell("projects", `<div class="page">
    <div class="crumbs" ${fix(4)}><a href="#/projects">Projects</a>${icon("chevRight")}${p.parent ? `<a href="#/project/${p.parent.id}">${esc(p.parent.name)}</a>${icon("chevRight")}` : ""}<b>${esc(p.name)}</b></div>
    <div class="toolbar" style="margin-top:10px"><div class="ptitle" style="font-size:18px;font-family:var(--display);font-weight:400">${esc(p.name)}</div><div style="flex:1"></div>
      <a class="btn" href="#/edit/${p.parent ? p.parent.id : p.id}">${icon("video")}Open editor</a>${gen || queued ? `<button class="btn" disabled title="Share when it's ready">${icon("link")}Share</button>` : `<button class="btn ${S.ready === p.id ? "" : "pink"}" data-act="share">${icon("link")}Share</button>`}</div>
    ${S.ready === p.id || queued || p.cancelled || gen ? `<div class="hubstatus">${S.ready === p.id ? `${(() => { const t = teamForEmail(); if (t && !S.team && !S.teamOffer) return `<div class="box brandoffer teamoffer" role="status"><span class="grow">Your team at ${esc(t.name)} uses Clueso (${t.members} people). Move this video to their workspace?</span><button class="btn" data-act="teamjoin">Move and join</button><button class="btn ghost" data-act="teamno">Keep my own</button></div>`; const dom = (S.user.email.split("@")[1] || ""); return S.team ? "" : !S.brandSet && dom && !/^(gmail|googlemail|yahoo|outlook|hotmail|icloud|live|proton|protonmail|aol)\./i.test(dom) ? `<div class="box brandoffer" role="status"><span class="grow">Use ${esc(dom.split(".")[0].replace(/^./, m => m.toUpperCase()))}'s logo and colours from ${esc(dom)}?</span><button class="btn" data-act="brandfromemail" data-k="${esc(dom)}">Use them</button><button class="btn ghost" data-act="toast" data-m="Kept the Clueso default">No thanks</button></div>` : ""; })()}<div class="box readybox ${S.justReady === p.id ? "celebrate" : ""}" role="status"><span class="rdot" aria-hidden="true">${icon("check")}</span><div class="grow"><b>${S.watched ? "Your video is ready to share" : "Your video is ready"}</b><span>${S.watched ? `Share a link with your team. It uses about 1 export minute; ${S.minutes.total - S.minutes.used} of ${S.minutes.total} are left this month.` : "Watch it first: it takes a minute. Then share it or change anything."}</span></div>${S.watched ? `<button class="btn pink rbact" data-act="share">${icon("link")}Share link</button>` : `<button class="btn pink rbact" data-act="watch" data-id="${p.id}">${icon("play")}Watch it</button>`}<button class="iconbtn rbx" data-act="hideready" aria-label="Dismiss" title="Dismiss">${icon("close")}</button></div>` : ""}
        ${queued ? `<div class="box"><div class="kv"><b style="font-weight:500">Queued</b><button class="btn ghost" data-act="cancelbuild" data-id="${id}">Remove from queue</button></div><span class="mut" style="font-size:12px">Starts when the video that's building now finishes. You can leave this page. Nothing is charged until it starts.</span></div>` : ""}
        ${p.cancelled ? `<div class="box"><div class="kv"><b style="font-weight:500">Build cancelled</b><button class="btn" data-act="rebuild" data-id="${id}">${icon("sparkle")}Build again</button></div><span class="mut" style="font-size:12px">${p.cancelled.cr ? `${p.cancelled.cr} credits were used for the scenes already made.` : "Nothing was charged."} Building again starts from the same brief, at the cost shown before it starts.</span></div>` : ""}
        ${gen ? buildBox(p, gen, scenes) : ""}</div>` : ""}
    <div class="hubgrid">
      <div style="display:grid;gap:12px;align-content:start;min-width:0">
        <div class="thumb ${p.th || "t-ink"}" style="border-radius:8px;font-size:18px;width:100%">${esc(p.label || p.name)}<span class="dur">${p.dur || "0:00"}</span>${gen ? (Math.min(gen.step, 6) ? `<button class="playbtn" data-act="watchscene" data-id="${p.id}" data-i="0" aria-label="Watch the scenes that are ready">${icon("play")}</button>` : "") : `<button class="playbtn" data-act="watch" data-id="${p.id}" aria-label="Play ${esc(p.name)}">${icon("play")}</button>`}</div>
        <div class="vmeta"><span>${p.type} · ${p.dur || ""} · Edited ${p.mod || "just now"}</span>${(() => { const c = TASKS.find(x => x.pid === (p.parent ? p.parent.id : p.id)); return c ? `<button class="linkbtn madewith" data-act="openchat" data-id="${c.id}" title="Open the conversation">${icon("sparkle")}<span>Made with Clueso AI from “${esc(c.t)}”</span></button>` : ""; })()}</div>
      </div>
      <div style="display:grid;gap:12px;align-content:start" ${fix(1)}>
        <div class="box" ${fix(3)}><h3>${icon("doc")}Article</h3>${p.article ? `<div class="kv"><span class="mut" style="font-size:12px">6 steps with screenshots</span><button class="btn" data-act="toast" data-m="Opens the article">Open</button></div>` : `<div class="kv"><span class="mut" style="font-size:12px">Not made yet</span><button class="${gen || (S.ready === p.id && !S.watched) ? "btn" : "btn dark"}" data-act="genarticle">${icon("sparkle")}Make article</button></div>`}</div>
        <div class="box"><h3>${icon("translate")}Versions</h3>
          ${related.length ? related.map(r => `<a class="vrow vtwo" href="#/project/${r.id}"><span class="grow"><span class="vn">${esc(r.n)}</span><span class="bdg ${r.cls}">${r.tag}</span></span><span class="mut">${r.d}</span></a>`).join("") : `<span class="mut" style="font-size:12px">Translations and videos made from this one appear here.</span>`}
          <div><button class="btn ghost" data-act="create" data-k="translate">${icon("plus")}Add a language</button></div></div>
        <a class="box linkbox" href="#/analytics/${p.parent ? p.parent.id : p.id}" title="Who watched and where they stopped. On the Business plan; opens a sample of the dashboard" aria-label="Views and drop-off. On the Business plan. Opens a sample"><span>${icon("analytics")}Views and drop-off</span><span class="bdg amber">${icon("lock")}Business</span></a>
      </div></div></div>`);
}

// A chat is named after its first six words, without a dangling end word ("…flow in" reads as cut off)
function chatName(t) { const w = t.trim().replace(/^Use the “[^”]*” Clueprint\.\s*/, "").split(/\s+/).slice(0, 6); while (w.length > 2 && /^(a|an|the|in|on|of|for|to|and|or|with|at|by|from|about|our|your|my)$/i.test(w[w.length - 1].replace(/[^a-z]/gi, ""))) w.pop(); return w.join(" ").replace(/[,:;.]+$/, ""); }
// Gap 2 (time to value): the first look shouldn't wait for the whole video. The script can be read as soon as it's written,
// and each scene can be watched the moment it's built, so the first "that's my product" comes in about a minute, not ten.
// One scene still, in Clueso's own visual language (title card, product window, end card): used by the plan's storyboard,
// the sign-up box and the build's scene tiles, so each step shows the same video taking shape.
const SCENES = ["Hook", "Meet the product", "Create and assign", "Track progress", "Stay in sync", "Outro"]; // the seeded Taskly demo
// The storyboard follows the kind of video: a teaser isn't built like a how-to guide
const SCENE_SETS = { demo: ["Hook", "Meet the product", "Key feature", "How it works", "Why it matters", "Try it"], marketing: ["Hook", "The problem", "The reveal", "See it work", "Who it's for", "Call to action"],
  training: ["Welcome", "What you'll learn", "Step 1", "Step 2", "Step 3", "Recap"], sop: ["Intro", "Step 1", "Step 2", "Step 3", "Step 4", "Done"], video: ["Opening", "Point 1", "Point 2", "Point 3", "Point 4", "Close"] };
const scenesFor = t => SCENE_SETS[t] || SCENE_SETS.demo;
// Before the first video, the cost is one calm line by Build, in videos (the budget they already have), not a credits box:
// a price in an unfamiliar unit, loudest on the card, is a pause right before the aha. Credits come back after the first video.
const quietCost = () => canBuild() && !PROJECTS.some(p => !p.sample && !p.cancelled && !p.failed) && !S.generating;
// What the video comes with, in one plain sentence (not icon chips, which read as controls), and true to the type:
// a teaser is music-led with no voiceover or guide (live's launch-teaser Clueprint has no voiceover)
function includesFor(t) { const guide = S.guideOn !== false;
  if (t === "marketing") return "Includes music, captions and animated text.";
  if (t === "video") return "Includes an AI voiceover and captions.";
  return `Includes an AI voiceover, captions and zooms${guide ? ", plus a step-by-step article" : ""}.`; }
const END_CARDS = { marketing: ["Try it free", "Start free"], demo: ["Try it today", "Get started"], sop: ["You're all set", ""], training: ["That's a wrap", ""], video: ["Thanks for watching", ""] };
function sceneArt(title, k, n, type) { if (k === 0) return `<span class="cfcard">${esc(title)}</span>`; if (k === n - 1) { const [t, b] = END_CARDS[type] || END_CARDS.marketing; return `<span class="cfcard end"><span>${t}</span>${b ? `<i class="cfcta">${b}</i>` : ""}</span>`; }
  const body = [`<i class="frl w1"></i><i class="frl w2"></i><i class="frbtn"></i>`, `<i class="frl w1"></i>${"<i class=\"frrow\"><b></b><i class=\"frl w2\"></i></i>".repeat(3)}`, `<i class="frl w1"></i><i class="frbars">${[60, 85, 45, 100, 70].map(h => `<b style="height:${h}%"></b>`).join("")}</i>`][k % 3];
  return `<span class="frwin ${k === 2 ? "cfzoom" : ""}"><i class="frbar"><b></b><b></b><b></b></i><i class="frbody">${body}</i></span>`; }
const sceneThumb = (title, k, n, th = "t-plum", type) => `<span class="thumb fr chmini ${th}" aria-hidden="true"><span class="cfstage">${sceneArt(title, k, n, type)}</span></span>`;
function buildBox(p, gen, scenes) {
  const ready = Math.min(gen.step, 6), left = Math.max(1, Math.round((6 - gen.step) * 10 / 6));
  return `<div class="box buildbox" ${fix(2)} role="status"><div class="kv"><b style="font-weight:500">${ready ? `Building · ${ready} of 6 scenes ready` : "Writing the script"}</b><span class="mut">${gen.step >= 6 ? "Finishing" : "about " + left + " min left"}</span></div><div class="meter"><i style="width:${gen.step / 6 * 100}%"></i></div>
    <div class="bscenes" role="list" aria-label="Scenes">${(() => { const fresh = gen._shown !== ready ? ready - 1 : -1; gen._shown = ready; return scenes.map((n, i) => i < ready ? `<button role="listitem" class="bsc ready ${i === fresh ? "fresh" : ""}" data-act="watchscene" data-id="${p.id}" data-i="${i}" aria-label="Watch scene ${i + 1}, ${esc(n)}"><span class="bstill">${sceneThumb(p.name, i, scenes.length, p.th || "t-plum", p.vtype || "demo")}<span class="bplay">${icon("play")}</span></span><span class="trunc">${i + 1} · ${esc(n)}</span></button>` : `<span role="listitem" class="bsc ${i === ready ? "now" : ""}"><span class="thumb blank">${i === ready ? '<i class="spin" aria-hidden="true"></i>' : ""}</span><span class="trunc mut">${i + 1} · ${i === ready ? "Building" : "Up next"}</span></span>`).join(""); })()}</div>
    <div class="kv"><span class="mut" style="font-size:12px">${ready ? `<button class="linkbtn" data-act="readscript" data-id="${p.id}">Read the script</button> · Watch a scene as soon as it's ready.` : "The script comes first, then each scene."} You can close this; we'll email ${esc(S.user.email || "you")} when it's done.</span><button class="btn ghost" data-act="cancelbuild" data-id="${gen.id}">Cancel build</button></div></div>`;
}
const SCRIPT = n => [["Hook", `Work is everywhere. Here's how ${n} brings it into one place.`], ["Meet the product", `Meet ${n}: one home for your team's work.`], ["Create and assign", "Create a task, give it an owner and a due date. That's it."], ["Track progress", "See where everything stands at a glance."], ["Stay in sync", "Comments and updates stay with the task, so nobody's chasing."], ["Outro", "Try it with your team today."]];
// A project name from a brief: the part after a colon, the leading "Make a"/"Show customers" dropped, cut at a comma, at most 8 words.
// (Live names projects with AI; this stands in for it.) "A 1-minute demo …: how to create your first project, step by step." → "How to create your first project"
function shortTitle(t) { let s = String(t || "").replace(/^Animate:\s*/, "").replace(/^(?:an?\s+)?\d+[- ](?:second|sec|minute|min)s?\s+/i, "").replace(/^Use the “[^”]*” Clueprint\.\s*/, "").trim(); if (s.includes(":")) s = s.split(":").slice(1).join(":").trim() || s;
  const about = s.match(/^(?:an?\s+)?(?:[\w-]+\s+){0,4}?(?:demo|video|tutorial|guide|teaser|walkthrough|explainer|training)\b[^,.;]*?\b(?:on|about|showing)\s+((?:how to\s+)?[^,.;]+)/i); if (about && about[1].split(/\s+/).length >= 2) s = about[1];
  s = s.replace(/^(please\s+)?(make|create|build|record)\s+(me\s+)?(an?\s+)?/i, "").replace(/^\d+[- ](?:second|sec|minute|min)s?\s+/i, "").replace(/^(?:launch\s+)?(?:teaser|announcement)\s+(?:for|of|about)\s+/i, "").replace(/^show\s+(customers|users|people|the team|our team|new \w+)\s+/i, "").split(/[,.;!?]/)[0].trim();
  const w = s.split(/\s+/).filter(Boolean); let out = w.slice(0, 8); while (out.length > 2 && /^(a|an|the|of|for|to|and|with|in|on|our|your|by)$/i.test(out[out.length - 1])) out.pop();
  s = out.join(" "); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
function startBuild(id, name, chatId, quiet, opt = {}) { S.checklist.video = true; if (id === "new") { const title = (S.prompt || name || "New video").replace(/^Animate:\s*/, "").replace(/^Use the “[^”]*” Clueprint\.\s*/, "").trim() || "New video"; id = "n" + Date.now(); const nm = shortTitle(title) || "New video"; const vt = (chatId && chatById(chatId)) ? (chatById(chatId).vtype || inferType(chatById(chatId).ask + " " + (chatById(chatId).answer || ""))) : null; PROJECTS.unshift({ id, vtype: vt, name: nm, type: "AI video", th: "t-plum", label: nm, dur: "~1:00", mod: "just now", created: "just now", chat: title.slice(0, 28), article: false, versions: [], madeFrom: [] }); S.prompt = ""; } if (S.generating && S.generating.id !== id) { S.queue = S.queue || []; S.queue.push({ id, chatId }); const qc = chatId && chatById(chatId); if (qc) { qc.pid = id; qc.st = "Queued"; qc.kind = "Waiting to build"; qc.plan = false; } toast("Queued. It starts when the current video finishes"); if (!quiet) go("/project/" + id); return; }
  S.frChat = null; const first = !PROJECTS.some(p => !p.sample && !p.cancelled && !p.failed && p.id !== id), free = !opt.cost && first && FREE_FIRST_VIDEO; if (first && !S.tipProjects) S.tipProjects = "show"; const cost = free ? 0 : opt.cost || videoCr(); S.generating = { id, step: opt.step || 0, cost, free }; S.credits.used += Math.round(cost / 3); S.checklist.video = true; const ch = chatId && chatById(chatId); if (ch) { ch.pid = id; ch.st = "Building"; ch.kind = "Building a video"; ch.plan = false; ch.cr = String(Math.round(cost / 3)); touch(ch); } if (!quiet) go("/project/" + id); clearInterval(genTimer); genTimer = setInterval(() => { if (!S.generating) return clearInterval(genTimer); S.generating.step++; if (S.generating.step > 6) { clearInterval(genTimer); S.credits.used += cost - Math.round(cost / 3); S.ready = S.generating.id; S.justReady = S.generating.id; setTimeout(() => { S.justReady = null; }, 1500); const done = S.generating.id; const dc = TASKS.find(c => c.pid === done && c.st === "Building"); if (dc) { dc.st = "Done"; dc.kind = "Made a video from a brief"; dc.cr = String(cost); dc.seen = onChatsPage() && S.chatId === dc.id; touch(dc); } S.generating = null; const nx = (S.queue || []).shift(); if (nx) startBuild(nx.id, null, nx.chatId, true); render(); toast("Your video is ready", location.hash === "#/project/" + done ? null : { label: "Open", go: "/project/" + done }); return; } if (!document.querySelector(".scrim,.drawer,.pop") && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) render(); }, 1600);
}
/* ---------- Clueso AI page (was Agent) ---------- */
// Conversations with Clueso AI. One object, one home: the Clueso AI panel shows them; the Clueso AI page lists them.
// One conversation per state, so every case on the Chats page can be reviewed. "at" and "made" are minutes ago.
const TASKS = [
  { id: "c3", t: "Product Marketing Teaser", pid: null, st: "Needs your reply", cr: "13", at: 8, made: 9, kind: "Asked about audience and goal", ask: "Make a product marketing teaser.", q: "Who is the teaser for, and what should viewers do after watching?", opts: ["Prospects on our website, so they start a free trial", "Existing customers, so they try the new dashboard", "Investors and partners, so they book a call"] },
  { id: "c4", t: "Assigning tasks for new managers", pid: null, st: "Waiting for you", plan: true, cr: "0", at: 12, made: 13, kind: "Planning a video", ask: "A 45-second video for new managers on assigning tasks and setting due dates in Taskly." },
  { id: "c1", t: "Taskly product demo", pid: "p1", st: "Done", cr: "250", at: 43, made: 62, kind: "Made a video from a brief", ask: "Make a 1-minute product demo explaining how Taskly helps teams track tasks. Show creating a project, assigning tasks with due dates and priorities, tracking progress on the Kanban board, and comments and mentions keeping everyone in sync. End with a call to action to try Taskly free.", steps: ["Read your brief", "Wrote a 6-scene storyline", "Wrote the voiceover script", "Generated the voiceover", "Built 6 scenes"], checks: ["“Taskly” is used as the product name throughout. Tell me if it should be something else.", "Names, dates and numbers on screen are sample data.", "Captions are off. I can turn them on."] },
  { id: "c2", t: "Video ideas for manager onboarding", pid: "p2", st: "Done", seen: false, cr: "about 300", at: 15, made: 75, kind: "Made 2 videos from a PDF", ask: "Turn this onboarding deck into a few short videos for new managers.", steps: ["Read the PDF (12 slides)", "Suggested 3 ideas", "Built 2 videos you picked"] },
  { id: "c5", t: "Kanban view launch", pid: null, st: "Failed", cr: "120", at: 1500, made: 1530, kind: "Stopped at scene 5 of 6", ask: "A 30-second launch teaser for our new Kanban view.", fail: { done: 4, of: 6, at: "Stay in sync" }, steps: ["Read your brief", "Wrote a 6-scene storyline", "Built scenes 1 to 4", "Scene 5 failed twice"] },
  { id: "c6", t: "Polish the add-a-task recording", pid: "p5", st: "Done", cr: "40", at: 5800, made: 5810, kind: "Polished a recording", ask: "Clean up this recording and add a voiceover.", steps: ["Removed pauses and filler words", "Added zooms on clicks", "Generated the voiceover"] },
];

// Review scenarios. "Returning user" is the seeded workspace; "New user" is what someone sees right after onboarding:
// no projects, no conversations, the first-run strip and every empty state. Chosen from the review bar; signing in starts New.
const SEED = { projects: JSON.parse(JSON.stringify(PROJECTS)), tasks: JSON.parse(JSON.stringify(TASKS)) };
const SCENARIO_KEY = "clueso-proto-scenario";
function applyScenario(sc) {
  S.scenario = sc; try { localStorage.setItem(SCENARIO_KEY, sc); } catch (e) {}
  const fresh = sc === "new";
  PROJECTS.splice(0, PROJECTS.length, ...(fresh ? [] : JSON.parse(JSON.stringify(SEED.projects))));
  TASKS.splice(0, TASKS.length, ...(fresh ? [] : JSON.parse(JSON.stringify(SEED.tasks))));
  clearInterval(genTimer); Object.assign(S, { generating: null, queue: [], ready: null, chatId: null, pChat: null, deleted: [], gsHidden: false, brandSet: false, brandOn: false, firstRun: fresh, ai: false });
  S.checklist = { account: true, video: !fresh, brand: false, share: false }; S.credits.used = fresh ? 0 : 255; S.minutes.used = 0;
  S.guest = false; S.pending = null; S.wsName = null; S.team = null; S.teamOffer = null; S.cpTab = null; // a new account's workspace is named from its own user
  if (fresh) Object.assign(S, { goals: new Set(), askedMake: false, prompt: "", clue: null, tipProjects: null, dropped: null, watched: false, frChat: null }); // a new user starts with nothing from the last one
  saveProgress();
}
(() => { let sc = "returning"; try { sc = localStorage.getItem(SCENARIO_KEY) === "new" ? "new" : "returning"; } catch (e) {} S.scenario = sc;
  if (sc === "new") { PROJECTS.splice(0); TASKS.splice(0); S.checklist.video = false; S.firstRun = true; S.credits.used = Math.min(S.credits.used, 0); } })();
const chatById = id => TASKS.find(c => c.id === id);
const agoLabel = m => (m = +m || 0) < 1 ? "now" : m < 60 ? Math.round(m) + "m" : m < 1440 ? Math.round(m / 60) + "h" : m < 2880 ? "Yesterday" : Math.round(m / 1440) + "d";
const agoLong = m => (m = +m || 0) < 1 ? "just now" : m < 60 ? Math.round(m) + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : m < 2880 ? "yesterday" : Math.round(m / 1440) + " days ago";
TASKS.forEach(c => { c.w = agoLong(c.at); });
const touch = c => { c.at = 0; c.w = "just now"; };
// Three jobs, three places. Home starts something new; the Chats page is where conversations live in full;
// the panel helps with what's on screen while you work elsewhere (never on Home or the Clueso AI page).
const NO_PANEL = ["create", "chats", "start", "signin", "welcome", ""];
const panelAllowed = () => !NO_PANEL.includes(route()[0]);
// The panel and the Clueso AI page each remember their own open conversation.
const onChatsPage = () => route()[0] === "chats";
const curChatId = () => onChatsPage() || (route()[0] === "create" && S.frChat) ? S.chatId : S.pChat;
const setCurChat = id => { if (onChatsPage()) S.chatId = id; else S.pChat = id; };
function startChat(text, inPanel) {
  const t = text.trim(); if (!t) return;
  const ctx = aiContext();
  const c = { id: "c" + Date.now(), t: chatName(t), pid: null, st: "Waiting for you", cr: "0", w: "just now", at: 0, made: 0, kind: inPanel ? "Asked on " + ctx.label : "Planning a video", ask: t, plan: !inPanel || /video|demo|teaser|tutorial|make|create/i.test(t), about: inPanel ? ctx.label : null };
  if (!inPanel && firstRun() && t.split(/\s+/).filter(w => /[a-z\u00c0-\uffff]{2,}/i.test(w)).length < 4) { // "demo", "hi", "asdf": ask, don't build a bad first video from it
    Object.assign(c, { plan: false, st: "Needs your reply", kind: "Asking about your video", q: "Happy to help. What should the video show, and who is it for?", opts: [JOBS[0].brief, JOBS[2].brief, JOBS[1].brief] }); }
  if (!c.plan && !c.q) { const cr = replyCr(); c.cr = String(cr); S.credits.used += cr; c.st = "Answered"; }
  TASKS.unshift(c); if (inPanel) S.pChat = c.id; else S.chatId = c.id; S.prompt = ""; S.aiDraft = ""; S.planOpen = false; S.aiAttach = []; S.aiNoCtx = false;
  if (inPanel) { render(); } else if (onChatsPage()) { S.ai = false; render(); } else if (firstRun()) { S.frChat = c.id; S.ai = false; render(); } else { S.ai = false; go("/chats"); } // a first video's plan stays on the focused Home
  setTimeout(() => { const b = $('[data-act="aibuild"]'); if (b) b.focus(); else aiFocusComposer(); }, 0);
}
function answerChat(c, v) { c.answer = v; if (!freeFirst()) { S.credits.used += replyCr(); c.cr = String((+c.cr || 0) + replyCr()); } c.plan = true; c.st = "Waiting for you"; c.kind = "Planning a video"; touch(c); }
function openChat(id) { S.chatListOnly = false; if (onChatsPage()) { S.chatId = id; render(); aiFocusComposer(); return; } if (!panelAllowed()) { S.chatId = id; return go("/chats"); } S.pChat = id; S.ai = true; render(); aiFocusComposer(); }
// Chats: what needs you first, then what's running, then by time. Each row answers "which one and why now" in two lines;
// the thread answers "what is this and where does it stand", with one primary action per state. Credits live in the thread.
const NEEDS = ["Needs your reply", "Waiting for you", "Failed"], RUNNING = ["Building", "Queued"];
function chatLine(x) {
  const pr = x.pid && PROJECTS.find(p => p.id === x.pid);
  if (x.st === "Needs your reply") return `“${esc(x.q)}”`;
  if (x.st === "Waiting for you") return freeFirst() ? "Plan ready · your first video is on us" : `Plan ready · about ${costRange()} credits`;
  if (x.st === "Building") { const g = S.generating && S.generating.id === x.pid ? S.generating : null; return `Building · scene ${g ? Math.min(g.step + 1, 6) : 1} of 6`; }
  if (x.st === "Queued") return "Queued, starts after the current build";
  if (x.st === "Failed") return `Stopped at scene ${x.fail.done + 1} of ${x.fail.of}`;
  if (x.st === "Cancelled") return "Build cancelled";
  if (pr) return `${icon("video")}${esc(pr.name)}${pr.madeFrom && pr.madeFrom.length ? ` · ${pr.madeFrom.length + 1} videos` : ""}`;
  return esc(x.about ? "Asked on " + x.about : x.kind);
}
// One status dot per row, trailing at the right edge after the time (no space when there's none): yellow needs you, blue a result you haven't opened,
// grey (pulsing) running, red failed, none when there's nothing new. Line 2 always says the same thing in words.
function chatDot(x) {
  const k = ["Needs your reply", "Waiting for you"].includes(x.st) ? ["attn", "Needs you"] : x.st === "Failed" ? ["err", "Failed"] : x.st === "Building" ? ["run", "Running"] : x.st === "Queued" ? ["run", "Queued"] : x.st === "Done" && x.seen === false ? ["new", "New result"] : null;
  return k ? `<span class="cdot ${k[0]}" role="img" aria-label="${k[1]}" title="${k[1]}"></span>` : "";
}
function chatBadge(x) { return x.st === "Needs your reply" ? `<span class="bdg amber">Needs reply</span>` : x.st === "Waiting for you" ? `<span class="bdg amber">Plan</span>` : x.st === "Failed" ? `<span class="bdg red">Failed</span>` : ""; }
// Filters. Live Clueso has Created and Modified date filters (7 options each) and a creator filter that defaults to you.
// Here: Status (what people actually come for), one Date filter with a Last active / Created switch over Clueso's own
// options, and Created by only when the workspace has more than one member, defaulting to Anyone.
const CSTATUS = [["all", "All"], ["needs", "Needs you"], ["running", "Running"], ["failed", "Failed"], ["finished", "Finished"]];
const CDATES = [["any", "All time"], ["today", "Today"], ["yesterday", "Yesterday"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["custom", "Custom range"]];
S.cf = S.cf || { status: "all", basis: "at", date: "any", from: "", to: "" };
// Two views of Chats: Browse (list beside the conversation, for triage) and Focus (one conversation fills the area, as in
// Clueso, with a "Made in this chat" panel like Clueso's Projects panel). The choice is remembered in this browser.
(() => { try { S.chatFocus = localStorage.getItem("clueso-proto-chatfocus") === "1"; S.chatPanel = localStorage.getItem("clueso-proto-chatpanel") !== "0"; } catch (e) { S.chatFocus = false; S.chatPanel = true; } })();
const setChatFocus = on => { S.chatFocus = on; try { localStorage.setItem("clueso-proto-chatfocus", on ? "1" : "0"); } catch (e) {} };
function madeIn(c) { const pr = c && c.pid && PROJECTS.find(p => p.id === c.pid); if (!pr || !["Done", "Cancelled"].includes(c.st) && !(S.generating && S.generating.id === pr.id)) return []; return [pr, ...(pr.madeFrom || []).map(m => ({ ...m, type: m.kind }))]; }
function madePanel(c) {
  const items = madeIn(c); if (!items.length) return "";
  return `<aside class="madepanel" aria-label="Made in this chat"><div class="mph"><b>Made in this chat</b><span class="mut">${items.length}</span></div>
    ${items.map(p => `<div class="mpi"><div class="thumb ${p.th || "t-ink"}"></div><div class="tw"><b class="trunc" title="${esc(p.name)}">${esc(p.name)}</b><span class="mut">${esc(p.type || "Video")} · ${p.dur || "—"}</span></div><div class="mpa"><a class="btn" href="#/project/${p.id}">Open</a><button class="iconbtn" data-act="toast" data-m="Link copied. Workspace members can open it" aria-label="Copy link to ${esc(p.name)}" title="Copy link">${icon("link")}</button></div></div>`).join("")}</aside>`;
}
const cStatus = c => ["Needs your reply", "Waiting for you"].includes(c.st) ? "needs" : RUNNING.includes(c.st) ? "running" : c.st === "Failed" ? "failed" : "finished";
function cDateOk(c) { const f = S.cf, m = +c[f.basis] || 0; if (f.date === "any") return true; if (f.date === "today") return m < 1440; if (f.date === "yesterday") return m >= 1440 && m < 2880; if (f.date === "custom") { const t = Date.now() - m * 60000; const a = f.from ? new Date(f.from + "T00:00").getTime() : -Infinity, b = f.to ? new Date(f.to + "T23:59:59").getTime() : Infinity; return t >= a && t <= b; } return m < +f.date * 1440; }
const cFilterOn = () => (S.cf.status !== "all" ? 1 : 0) + (S.cf.date !== "any" ? 1 : 0);
function chatFilterPop() {
  const f = S.cf; const n = k => k === "all" ? TASKS.length : TASKS.filter(c => cStatus(c) === k).length;
  return `<div class="lab">Status</div>${CSTATUS.map(([k, l]) => `<button class="mi" role="menuitemradio" aria-checked="${f.status === k}" data-act="cfstatus" data-k="${k}"><span class="ck">${f.status === k ? icon("check") : ""}</span>${l}<small>${n(k)}</small></button>`).join("")}
    <div class="sep"></div><div class="lab cfdate">Date<span class="seg sm" role="group" aria-label="Date of">${[["at", "Last active"], ["made", "Created"]].map(([k, l]) => `<button class="${f.basis === k ? "on" : ""}" aria-pressed="${f.basis === k}" data-act="cfbasis" data-k="${k}">${l}</button>`).join("")}</span></div>
    ${CDATES.map(([k, l]) => `<button class="mi" role="menuitemradio" aria-checked="${f.date === k}" data-act="cfdate" data-k="${k}"><span class="ck">${f.date === k ? icon("check") : ""}</span>${l}</button>`).join("")}
    ${f.date === "custom" ? `<div class="cfrange"><label>From<input type="date" id="cffrom" value="${f.from}"></label><label>To<input type="date" id="cfto" value="${f.to}"></label></div>` : ""}
    ${S.members > 1 ? `<div class="sep"></div><div class="lab">Created by</div><button class="mi" role="menuitemradio" aria-checked="true"><span class="ck">${icon("check")}</span>Anyone</button>` : ""}
    ${cFilterOn() ? `<div class="sep"></div><button class="mi" data-act="cfclear">${icon("close")}Clear filters</button>` : ""}`;
}
const cfReopen = () => { const b = $('[data-act="chatfilter"]'); if (b) { popover(b, chatFilterPop(), "right"); const f = $('.pop [aria-checked=true]'); if (f) f.focus(); } };
function vChats() {
  const q = (S.chatQ || "").trim().toLowerCase();
  const sortKey = S.chatSort === "made" ? "made" : "at";
  const shown = TASKS.filter(c => (!q || c.t.toLowerCase().includes(q) || (c.ask || "").toLowerCase().includes(q)) && (S.cf.status === "all" || cStatus(c) === S.cf.status) && cDateOk(c)).slice().sort((a, b) => (a[sortKey] || 0) - (b[sortKey] || 0));
  const wide = innerWidth > 900;
  if (S.chatId !== "new" && (!S.chatId || !chatById(S.chatId)) && wide && !S.chatListOnly && shown.length) S.chatId = (shown.find(c => NEEDS.includes(c.st)) || shown[0]).id;
  const isNew = S.chatId === "new";
  const chat = !isNew && S.chatId && chatById(S.chatId); const left = S.credits.total - S.credits.used;
  if (chat) chat.seen = true;
  const row = x => { const on = chat && chat.id === x.id;
    return `<div class="crow ${on ? "on" : ""}"><button class="chatrow" data-act="openchat" data-id="${x.id}" aria-current="${on}">
      <span class="ct"><b class="trunc" title="${esc(x.t)}">${hl(x.t, q ? [q] : [])}</b><span class="cmeta"><span class="cw">${agoLabel(sortKey === "made" ? x.made : x.at)}</span>${chatDot(x)}</span></span>
      <span class="cm trunc" title="${esc(chatLine(x).replace(/<[^>]+>/g, ""))}">${chatLine(x)}</span></button>
      <button class="iconbtn crmenu" data-act="chatmenu" data-id="${x.id}" aria-haspopup="menu" aria-label="More for ${esc(x.t)}">${icon("dots")}</button></div>`; };
  const list = shown.length ? shown.map(row).join("")
    : cFilterOn() ? `<div class="cfnone"><span>No conversations ${q ? `match “${esc(S.chatQ.trim())}” and ` : "match "}these filters.</span><button class="linkbtn" data-act="cfclear">Clear filters</button></div>`
    : q ? `<p class="mut" style="font-size:12px;padding:8px">No conversations match “${esc(S.chatQ.trim())}”.</p>` : `<p class="mut" style="font-size:12px;padding:8px">Your conversations with Clueso AI will appear here.</p>`;
  let thread;
  if (isNew) thread = `<div class="cthead"><button class="iconbtn chback" data-act="chatlist" aria-label="All conversations">${icon("chevLeft")}</button><div class="grow"><b class="aititle" style="cursor:default">New chat</b><span class="actx">Describe a video, or ask anything. Nothing is charged until you approve a plan.</span></div></div>
      <div class="cthread"><div class="ctempty" style="margin:auto">${icon("sparkle")}<b>What are we making?</b><span>Clueso AI asks what it needs, shows a plan with the cost, and builds only when you say so.</span></div></div>
      <div class="ctfoot">${promptBox("Describe the video you want")}</div>`;
  else if (chat) { const pr = chat.pid && PROJECTS.find(p => p.id === chat.pid);
    const status = { "Needs your reply": "Needs your reply", "Waiting for you": "Plan to approve", Building: "Building", Queued: "Queued", Failed: "Failed", Cancelled: "Cancelled", Done: "Done", Answered: "Answered" }[chat.st] || chat.st;
    thread = `<div class="cthead"><button class="iconbtn chback" data-act="chatlist" aria-label="All conversations">${icon("chevLeft")}</button><div class="grow">${S.aiRenaming ? `<input id="aititle" class="aititle" value="${esc(chat.t)}" aria-label="Conversation name" maxlength="80">` : `<button class="aititle trunc" data-act="airename" title="Rename this conversation">${esc(chat.t)}</button>`}<span class="actx">${status} · ${chat.about ? "asked on " + esc(chat.about) : "started on Home"} ${agoLong(chat.made)} · ${chat.cr} credits</span></div>
      <button class="iconbtn" data-act="chatmenu" data-id="${chat.id}" aria-haspopup="menu" aria-label="More for this conversation">${icon("dots")}</button></div>
      <div class="cthread">${aiThread(chat, left, true)}</div>
      <div class="ctfoot">${aiComposer(chat, { kind: "chats", label: "Clueso AI" })}</div>`; }
  else thread = `<div class="ctempty">${icon("sparkle")}<b>${TASKS.length ? "Pick a conversation" : "No conversations yet"}</b><span>${TASKS.length ? "Choose one from the list to continue it." : "Chats is where you and Clueso AI plan, build and change videos. Included on Free: make videos from a brief, here or from Claude, ChatGPT or Cursor."}</span>${TASKS.length ? "" : `<button class="btn pink" data-act="chatnew">${icon("plus")}New chat</button>`}</div>`;
  const sortL = sortKey === "made" ? "Date created" : "Last activity";
  const focus = S.chatFocus && chat && wide;
  if (focus) { const panel = S.chatPanel ? madePanel(chat) : ""; const hasMade = madeIn(chat).length > 0;
    const head = thread.replace('<button class="iconbtn chback" data-act="chatlist" aria-label="All conversations">', '<button class="iconbtn fback" data-act="chatunfocus" aria-label="Back to all chats" title="All chats (Esc)">')
      .replace('<button class="iconbtn" data-act="chatmenu"', `${hasMade ? `<button class="iconbtn ${S.chatPanel ? "on" : ""}" data-act="chatpanel" aria-pressed="${!!S.chatPanel}" aria-label="${S.chatPanel ? "Hide" : "Show"} what this chat made" title="Made in this chat">${icon("video")}</button>` : ""}<button class="iconbtn" data-act="chatunfocus" aria-label="Show the list beside this chat" title="Show the list">${icon("collapse")}</button><button class="iconbtn" data-act="chatmenu"`);
    return shell("chats", `<div class="page chatpage has-chat chatfocus ${panel ? "withpanel" : ""}"><section class="chatmain" aria-label="Conversation">${head}</section>${panel}</div>`); }
  if (chat && wide) thread = thread.replace('<button class="iconbtn" data-act="chatmenu"', `<button class="iconbtn" data-act="chatfocus" aria-label="Open this chat full width" title="Full width">${icon("expand")}</button><button class="iconbtn" data-act="chatmenu"`);
  return shell("chats", `<div class="page chatpage ${chat || isNew ? "has-chat" : ""}">
    <div class="toolbar"><div class="ptitle">${icon("chat")}Chats <span class="mut" style="font-size:12px;font-weight:400;margin-left:4px">Your conversations with Clueso AI</span></div><div style="flex:1"></div>
      ${TASKS.length || isNew ? `<button class="btn dark" data-act="chatnew" ${fix(3)}>${icon("plus")}New chat</button>` : ""}</div>
    <div class="chatgrid ${TASKS.length || isNew ? "" : "none"}">
      <div class="chatside" ${TASKS.length || isNew ? "" : "hidden"}>
        <div class="chatq"><label class="searchbox chatsearch">${icon("search")}<input id="chq" type="search" aria-label="Search conversations" placeholder="Search conversations" value="${esc(S.chatQ || "")}" autocomplete="off"></label>
          ${TASKS.length > 1 ? `<button class="btn ${sortKey === "made" ? "on" : ""}" data-act="chatsort" aria-haspopup="menu" aria-label="Sort: ${sortL}" title="Sort: ${sortL}">${icon("sort")}</button>` : ""}
          <button class="btn ${cFilterOn() ? "on" : ""}" data-act="chatfilter" aria-haspopup="menu" aria-label="Filter conversations${cFilterOn() ? `, ${cFilterOn()} on` : ""}">${icon("filter")}${cFilterOn() ? `<span class="tabn">${cFilterOn()}</span>` : ""}</button></div>
        ${cFilterOn() ? `<div class="fchips">${S.cf.status !== "all" ? `<button class="fchip" data-act="cfstatus" data-k="all" aria-label="Remove filter: ${CSTATUS.find(x => x[0] === S.cf.status)[1]}">${CSTATUS.find(x => x[0] === S.cf.status)[1]}${icon("close")}</button>` : ""}${S.cf.date !== "any" ? `<button class="fchip" data-act="cfdate" data-k="any" aria-label="Remove date filter">${S.cf.basis === "made" ? "Created" : "Active"}: ${S.cf.date === "custom" ? (() => { const d = v => v ? new Date(v + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""; return S.cf.from && S.cf.to ? `${d(S.cf.from)} to ${d(S.cf.to)}` : S.cf.from ? `since ${d(S.cf.from)}` : S.cf.to ? `until ${d(S.cf.to)}` : "custom"; })() : CDATES.find(x => x[0] === S.cf.date)[1].toLowerCase()}${icon("close")}</button>` : ""}<button class="linkbtn" data-act="cfclear" style="font-size:12px">Clear all</button></div>` : ""}
        <nav class="chatlist" aria-label="Conversations" ${fix(2)}>${list}</nav>
      </div>
      <section class="chatmain" aria-label="Conversation">${thread}</section></div></div>`);
}

/* ---------- library ---------- */
function vLibrary(tab) {
  // Clueso has Clueprints and Brand kit as two pages. Clip templates, components and media are managed inside its editor,
  // which this prototype doesn't cover, so they have no pages here.
  S.libTab = tab === "brand" ? "brand" : "styles";
  let body = "", title;
  if (S.libTab === "styles") {
    title = `${icon("clueprint")}Clueprints <span class="mut" style="font-size:12px;font-weight:400;margin-left:4px">A Clueprint sets the look, pacing, voice and structure of a whole video</span>`;
    const ws = S.cpTab === "workspace";
    body = `<div class="toolbar" style="margin-top:12px"><div class="tabs">${[["community", "Community"], ["workspace", "Workspace"]].map(([k, l]) => `<button class="${(S.cpTab || "community") === k ? "on" : ""}" data-act="cptab" data-k="${k}">${l}</button>`).join("")}</div><div style="flex:1"></div>
      <label class="searchbox" style="width:220px">${icon("search")}<input type="search" aria-label="Search Clueprints" placeholder="Search Clueprints" autocomplete="off" style="border:0;background:none;outline:none;flex:1;font-size:12px;min-width:0"></label>
      <button class="btn dark" data-act="toast" data-m="Opens the Clueprint builder">${icon("plus")}New Clueprint</button></div>
    ${ws ? `<div class="drop" style="max-width:640px">${icon("clueprint")}<b style="color:var(--ink);font-weight:500">No Clueprints yet</b>Make one from an existing video or from scratch, then use it to make consistent videos every time.<button class="btn" data-act="toast" data-m="Opens the Clueprint builder">New Clueprint</button></div>`
      : `<div class="sgrid">${STYLES.map((s, i) => `<button class="pcard" data-act="style" data-i="${i}"><div class="thumb ${s[1]}">${esc(s[2])}</div><div class="meta"><b class="trunc" title="${esc(s[0])}">${esc(s[0])}</b><span class="trunc" title="by Clueso · needs ${esc(s[4][0].toLowerCase())}">by Clueso · needs ${s[4][0].toLowerCase()}</span></div></button>`).join("")}</div>`}`;
  } else {
    title = `${icon("brand")}Brand kit`;
    const k = KITS.acme;
    const tiles = kit => `<div class="ktiles">${kit.colors.map(([l, h]) => `<button class="ktile" style="background:${h};color:${onColor(h)}" aria-label="${l} color ${h}"><small>${l}</small></button>`).join("")}</div>`;
    body = S.brandSet ? `<div class="setcard" style="margin-top:12px"><p class="d" style="margin:0">The default style for every video in this workspace. You can switch to the Clueso default for any single video.</p>
      <label class="field">Pull again from your website<span style="display:flex;gap:8px"><input value="https://${esc(S.brandUrl || "acme.io")}" style="flex:1"><button class="btn" data-act="toast" data-m="Pulled again from ${esc(S.brandUrl || "acme.io")}">Refetch</button></span></label>
      <div class="field">Logo variants<span style="display:flex;gap:8px"><span class="klogo xl"><b>${k.logo}</b><small>Icon</small></span><button class="kup" data-act="toast" data-m="File picker">${icon("upload")}Upload</button></span></div>
      <div class="field">Colors${tiles(k)}</div>
      <div class="fgrid"><label class="field">Title font<select><option>Inter</option></select></label><label class="field">Body font<select><option>Inter</option></select></label></div>
      <label class="field">Tone of voice<textarea rows="2">Friendly, clear, no jargon.</textarea></label>
      <div class="field">Preview${kitPreview(k)}</div>
      <div style="display:flex;gap:8px;align-items:center"><button class="btn dark" data-act="toast" data-m="Saved">Save changes</button><span class="mut" style="font-size:12px">No unsaved changes</span></div></div>`
      : `<div class="setcard" style="margin-top:12px" ${fix(1)}><h3>Add your brand</h3><p class="d">Clueso pulls your logo, colors, fonts and tone from your website. Until then, videos use the Clueso default, shown below.</p>
      <label class="field" for="site2">Company website<input id="site2" placeholder="acme.io"></label><div><button class="btn dark" data-act="fetchbrand2">${icon("globe")}Pull from website</button></div>
      <div class="field">Now using: Clueso default${kitPreview(KITS.default)}</div></div>`;
  }
  return shell("library-" + S.libTab, `<div class="page"><div class="ptitle">${title}</div>${body}</div>`);
}

/* ---------- integrations ---------- */
function vIntegrations() {
  const card = (ic, t, d, btn, extra = "") => `<div class="box"><h3>${icon(ic)}${t}</h3><p class="mut" style="margin:0;font-size:12px">${d}</p>${extra}<div>${btn}</div></div>`;
  return shell("integrations", `<div class="page"><div class="ptitle">${icon("puzzle")}Integrations</div>
    <p class="mut" style="margin:6px 0 0;font-size:12px">Tools you connect once.</p>
    <div class="sgrid" style="margin-top:16px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))" ${fix(1)}>
      ${card("record", "Chrome extension", "Records your screen with click highlights and auto-zoom. Included on every plan.", `<button class="btn" data-act="toast" data-m="Opens the Chrome Web Store">Add to Chrome${icon("external")}</button>`)}
      ${card("mcp", "AI assistants (MCP)", "Create and edit Clueso videos from Claude, ChatGPT, Cursor, Gemini CLI or VS Code. Included on every plan.", `<button class="btn" data-act="toast" data-m="Connection URL copied">Copy connection URL</button>`, `<code style="font-size:11px;background:var(--field);padding:6px 8px;border-radius:4px">https://connect.clueso.io/mcp</code>`)}
      ${card("link", "GitHub and Bitbucket", "Keeps product videos up to date when your code changes. An Enterprise automation (auto-update add-on).", `<button class="btn" disabled>${icon("lock")}Enterprise</button>`)}
    </div></div>`);
}

/* ---------- settings ---------- */
const SET_LABEL = { profile: "Profile", general: "General", plan: "Plan and usage", members: "Members", defaults: "Video defaults", language: "Language and voice", sharing: "Player and links" };
function vSettings(page) {
  S.setPage = page || "general";
  const lock = (plan) => `<span class="bdg amber">${icon("lock")}${plan}</span>`;
  // As live: no category headings (most headed one item and repeated it, "Account" over "Profile"); items with icons,
  // grouped by dividers: you · the workspace (live's Admin, Billing, Users order) · what videos sound like · how they're shared.
  const nav = [[["profile", "Profile", "user"]], [["general", "General", "settings"], ["plan", "Plan and usage", "coin"], ["members", "Members", "users"]], [["defaults", "Video defaults", "video"], ["language", "Language and voice", "translate"]], [["sharing", "Player and links", "link"]]];
  if (!["profile", "general", "members", "plan", "defaults", "language", "sharing"].includes(S.setPage)) S.setPage = "general";
  const P = S.setPage;
  let card = "";
  if (P === "profile") card = `<div class="setcard"><h3>Profile</h3><div style="display:flex;gap:10px;align-items:center"><span class="ava person">${S.user.ini}</span><div><b style="font-weight:500">${S.user.first} ${S.user.last}</b><div class="mut" style="font-size:12px">${S.user.email}</div></div></div>
    <label class="field">Name<input value="${S.user.first} ${S.user.last}"></label><div class="kv"><span class="lab">Sign-in</span><span>${icon("google")} Google · password managed by Google</span></div>
    <div class="kv"><span class="lab">Theme</span>${themeControl()}</div></div>`;
  if (P === "general") card = `<div class="setcard"><h3>General</h3><label class="field">Workspace name<input id="wsname" value="${esc(wsName())}" data-wsname="1"></label>${teamForEmail() && !S.team ? `<div class="teamrow"><span class="grow">Your team at ${esc(teamForEmail().name)} uses Clueso (${teamForEmail().members} people). Joining moves your videos there.</span><button class="btn" data-act="teamjoin">Join ${esc(teamForEmail().name)}</button></div>` : ""}
    <div class="field">Who can join this workspace<div class="callout grey" ${fix(2)}>${icon("lock")}<span><b style="font-weight:500">Only people you invite.</b> Joining by email domain isn't offered for personal domains like gmail.com.</span></div></div>
    <div style="border-top:1px solid var(--line);padding-top:12px;display:grid;gap:6px" ${fix(5)}><b style="font-weight:500">Delete workspace</b><span class="mut" style="font-size:12px">You're the only admin, so you can't leave this workspace. Transfer admin to a teammate first, or delete it.</span><div><button class="btn" style="color:var(--red)">Delete workspace…</button></div></div></div>`;
  if (P === "members") card = `<div class="setcard"><div class="kv"><h3>Members</h3><button class="btn dark" data-act="invite">${icon("users")}Invite</button></div><p class="d">1 of 1 editor on the Free plan.</p>
    <div class="vrow"><span class="ava person sm">${S.user.ini}</span><span class="grow">${S.user.first} ${S.user.last} <span class="mut">· ${S.user.email}</span></span><span class="bdg">Admin</span></div></div>`;
  if (P === "plan") card = `<div class="setcard" ${fix(3)}><div class="kv"><h3>Plan and usage</h3><span class="bdg">Free plan · resets 15 Nov</span></div>
    <div class="statgrid"><div class="stat"><small>Export minutes</small><b>${S.minutes.used}<span> / ${S.minutes.total}</span></b><div class="meter"><i style="width:${S.minutes.used * 10}%"></i></div></div><div class="stat"><small>Article exports</small><b>0<span> / 10</span></b><div class="meter"><i style="width:0"></i></div></div><div class="stat"><small>AI credits</small><b>${S.credits.used}<span> / ${S.credits.total}</span></b><div class="meter"><i style="width:${S.credits.used / 10}%"></i></div></div></div>
    <table class="list"><thead><tr><th>What AI credits go on</th><th>From Clueso</th></tr></thead><tbody>
      <tr><td>A 1-minute AI video</td><td>Clueso estimates about 150 a video; a 57-second video with Opus 5.5 used 250</td></tr>
      <tr><td>Cost-efficient models (Luna 6, DeepSeek V4.1 Flash)</td><td>About half per message (Clueso help center)</td></tr>
      <tr><td>Each message to Clueso AI</td><td>Shown under every reply; a clarifying question used 13</td></tr></tbody></table>
    <div class="kv"><span class="lab">Export minutes: view-only links and embeds count; re-exporting the same video doesn't count twice; each language version counts separately.</span><button class="btn pink" data-act="toast" data-m="Opens plan comparison">See plans</button></div></div>`;
  if (P === "defaults") card = `<div class="setcard"><h3>Video defaults</h3><p class="d">These settings apply to videos made by everyone in this workspace.</p>
    ${[["Auto-rewrite script", "Rewrite and improve scripts with AI.", true], ["Auto-generate speech", "Make a voiceover from the script.", false], ["Auto-add elements", "Add click indicators and highlights.", true]].map(([t, d, on]) => `<div class="kv"><span>${t}<span class="mut" style="display:block;font-size:12px">${d}</span></span><span class="swlab">${on ? "On" : "Off"}<span class="sw ${on ? "on" : ""}"></span></span></div>`).join("")}
    <div class="kv"><span>Default voices<span class="mut" style="display:block;font-size:12px">No default voices added</span></span><button class="btn" data-act="toast" data-m="Opens the voice library">${icon("plus")}Add voice</button></div>
    <details><summary class="mut" style="font-size:12px;cursor:pointer">Export</summary><div class="kv" style="margin-top:8px"><span>Use legacy color processing<span class="mut" style="display:block;font-size:12px">Only if exported colors look wrong.</span></span><span class="swlab">Off<span class="sw"></span></span></div></details></div>`;
  if (P === "language") { const L = S.langTab || "pron"; const T = { pron: ["Teach the voiceover how to say specific words.", "New word", "No words yet."], trans: ["Tell transcription how to spell your product's words.", "New keyword", "No keywords yet."], gloss: ["How terms are translated, and rules for each language.", "Add term", "No terms yet."] }[L];
    card = `<div class="setcard"><h3>Language and voice</h3>
    <div class="tabs">${[["pron", "Pronunciations"], ["trans", "Transcription keywords"], ["gloss", "Translation terms and rules"]].map(([k, l]) => `<button class="${L === k ? "on" : ""}" data-act="langtab" data-k="${k}">${l}</button>`).join("")}</div>
    <p class="d">${T[0]}</p><div style="display:flex;gap:8px"><input class="inp" placeholder="${L === "gloss" ? "Original term" : "Word"}" aria-label="${T[1]}" style="flex:1"><button class="btn dark" data-act="toast" data-m="Added">${icon("plus")}${T[1]}</button>${L === "gloss" ? `<button class="btn" data-act="toast" data-m="File picker">Import CSV</button>` : ""}</div>
    <div class="mut" style="font-size:12px">${T[2]}</div>${L === "gloss" ? `<div class="kv" style="border-top:1px solid var(--line);padding-top:12px"><span>Rules<span class="mut" style="display:block;font-size:12px">Instructions for translating into each language.</span></span><button class="btn" data-act="toast" data-m="New rule">${icon("plus")}New rule</button></div>` : ""}</div>`; }
  if (P === "sharing") card = `<div class="setcard"><h3>Player and links</h3><p class="d">What people see when you share a link or embed a video.</p>
    <b class="setsub">View-only links <span class="mut">· included on every plan</span></b>
    <div class="kv"><span>Domain</span><span class="mut" style="font-size:12px">heavy-cobra-of-assurance.clueso.site</span></div>
    <div class="kv"><span>Appearance<span class="mut" style="display:block;font-size:12px">Theme, colors, logo, header links, feedback, author</span></span><button class="btn">Edit</button></div>
    <div class="kv"><span>Authentication<span class="mut" style="display:block;font-size:12px">Who can open your links</span></span><button class="btn">Edit</button></div>
    <b class="setsub">Embedded player ${lock("Business")}</b><p class="d" style="margin:0">Match your embedded video player to your brand: colors, controls and style.</p></div>`;
  return shell("settings", `<div class="page"><div class="ptitle">${icon("settings")}Settings</div>
    <div class="setgrid"><nav class="setnav" aria-label="Settings" ${fix(1)}>${nav.map(items => items.map(([k, l, ic]) => `<a class="navitem ${P === k ? "on" : ""}" href="#/settings/${SET_URL[k] || k}" ${P === k ? 'aria-current="page"' : ""}>${icon(ic)}<span class="lbl">${l}</span></a>`).join("")).join(`<div class="setsep" role="separator"></div>`)}</nav><div>${card}</div></div></div>`);
}

/* ---------- analytics ---------- */
const AN = [
  { id: "p1", n: "Taskly – Track Tasks Together (Product Demo)", c: "12 Jun", imp: 642, plays: 388, dur: "0:41", pct: 72 },
  { id: "p2", n: "Taskly Onboarding for New Managers", c: "3 Jul", imp: 301, plays: 152, dur: "0:12", pct: 60 },
  { id: "p3", n: "3-step Taskly onboarding for new managers", c: "21 Aug", imp: 214, plays: 119, dur: "1:05", pct: 64 },
  { id: "p5", n: "Add a task in Taskly", c: "9 Sep", imp: 127, plays: 53, dur: "0:15", pct: 83 },
];
function chart(series, labels, h = 150) {
  const W = 640, pad = 34, max = Math.max(...series.flatMap(s => s.v)) * 1.1;
  const x = i => pad + i * (W - pad - 10) / (labels.length - 1), y = v => h - 22 - v / max * (h - 40);
  const grid = [0, .5, 1].map(f => `<line x1="${pad}" x2="${W - 10}" y1="${y(max * f / 1.1)}" y2="${y(max * f / 1.1)}" stroke="var(--line)"/><text x="${pad - 6}" y="${y(max * f / 1.1) + 3}" text-anchor="end" font-size="10" fill="var(--faint)">${Math.round(max * f / 1.1)}</text>`).join("");
  const xl = labels.map((l, i) => i % 5 === 0 || i === labels.length - 1 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="${i === labels.length - 1 ? "end" : "middle"}" font-size="10" fill="var(--faint)">${l}</text>` : "").join("");
  const lines = series.map(s => `<polyline fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round" points="${s.v.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/><circle cx="${x(s.v.length - 1)}" cy="${y(s.v[s.v.length - 1])}" r="3" fill="${s.c}"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Chart">${grid}${xl}${lines}</svg>`;
}
/* Analytics, as Clueso's help center describes it (help.clueso.io/home/analytics, read 18 Oct 2026): Impressions = times the
   content was opened, watched or not; Plays = unique plays per viewing session (rewatches in the same session don't count);
   Play rate = plays ÷ impressions; presets 7/14/30/90 days or custom; one project or all; top content (name and created
   date, impressions, plays, average play duration as time and % of the video), sortable by any header, Download CSV;
   location by impressions; help-center searches (date, query, clicked result). Here it's a labelled sample on Free. */
const AN_TODAY = new Date(2026, 9, 18);
const anDay = d => { const t = new Date(AN_TODAY); t.setDate(t.getDate() - d); return t; };
const anFmt = t => t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
// Sample series, d days before today (0 = today): a steady rise with some day-to-day noise
const AN_FIRST = Math.round((AN_TODAY - new Date(2026, 5, 12)) / 864e5); // the first sample video was published 12 Jun: no views before it
const anImp = d => d > AN_FIRST ? 0 : Math.max(3, Math.round(48 * Math.pow(0.993, d) + 3 * Math.sin(d * 1.3)));
const anPlays = d => Math.round(anImp(d) * (0.53 + 0.05 * Math.sin(d * 0.9))); // 0 when there are no impressions
function anRange() { const r = S.anRange || "30d"; if (r === "custom" && S.anFrom && S.anTo) { const from = Math.round((AN_TODAY - new Date(S.anFrom + "T00:00")) / 864e5), to = Math.round((AN_TODAY - new Date(S.anTo + "T00:00")) / 864e5); return { key: "custom", start: Math.max(to, 0), n: Math.max(0, from - Math.max(to, 0) + 1), future: to < 0 }; } const n = +r.replace("d", "") || 30; return { key: r, start: 0, n }; }
function anChart(pts) {
  // pts: [{ l, imp, plays }] oldest first. Hover or arrow keys show one day; a hidden table carries every value for screen readers.
  const W = 640, h = 170, pad = 34, n = pts.length, max = Math.max(1, ...pts.map(p => p.imp)) * 1.1;
  const x = i => pad + (n > 1 ? i * (W - pad - 10) / (n - 1) : (W - pad - 10) / 2), y = v => h - 22 - v / max * (h - 40);
  const grid = [0, .5, 1].map(f => `<line x1="${pad}" x2="${W - 10}" y1="${y(max * f / 1.1)}" y2="${y(max * f / 1.1)}" stroke="var(--line)"/><text x="${pad - 6}" y="${y(max * f / 1.1) + 3}" text-anchor="end" font-size="10" fill="var(--faint)">${Math.round(max * f / 1.1)}</text>`).join("");
  const step = Math.max(1, Math.ceil(n / 6));
  const xl = pts.map((p, i) => (n - 1 - i) % step === 0 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="${i === n - 1 ? "end" : i === 0 ? "start" : "middle"}" font-size="10" fill="var(--faint)">${p.l}</text>` : "").join("");
  const line = (k, c, dash) => `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" ${dash ? 'stroke-dasharray="5 3"' : ""} points="${pts.map((p, i) => `${x(i)},${y(p[k])}`).join(" ")}"/>`;
  window.__anPts = pts.map((p, i) => ({ ...p, x: x(i) / W, yi: y(p.imp) / h, yp: y(p.plays) / h }));
  return `<div class="anchart" tabindex="0" role="group" aria-label="Impressions and plays by day, ${pts[0].l} to ${pts[n - 1].l}. Use the left and right arrow keys to read each day." aria-describedby="antbl">
    <svg viewBox="0 0 ${W} ${h}" width="100%" aria-hidden="true"><text class="anwm" x="${W / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle">SAMPLE DATA</text>${grid}${xl}${line("imp", "var(--pink)")}${line("plays", "var(--blue)", true)}<line class="anx" x1="0" x2="0" y1="10" y2="${h - 22}" stroke="var(--muted)" stroke-dasharray="2 2" visibility="hidden"/></svg>
    <i class="andot imp" hidden></i><i class="andot plays" hidden></i><div class="antip" role="status" aria-live="polite" hidden></div>
    <table class="sr" id="antbl"><caption>Impressions and plays by day</caption><thead><tr><th>Date</th><th>Impressions</th><th>Plays</th><th>Play rate</th></tr></thead><tbody>${pts.map(p => `<tr><td>${p.l}</td><td>${p.imp}</td><td>${p.plays}</td><td>${p.imp ? Math.round(p.plays / p.imp * 100) + "%" : "—"}</td></tr>`).join("")}</tbody></table></div>`;
}
function anShow(el, i) {
  const P = window.__anPts; if (!P || !P.length) return; i = Math.max(0, Math.min(P.length - 1, i)); el.dataset.i = i; const p = P[i];
  const r = el.querySelector("svg").getBoundingClientRect(), b = el.getBoundingClientRect(); const px = p.x * r.width + (r.left - b.left);
  const vx = el.querySelector(".anx"); vx.setAttribute("x1", p.x * 640); vx.setAttribute("x2", p.x * 640); vx.setAttribute("visibility", "visible");
  const di = el.querySelector(".andot.imp"), dp = el.querySelector(".andot.plays"); di.hidden = dp.hidden = false;
  di.style.left = dp.style.left = px + "px"; di.style.top = p.yi * r.height + (r.top - b.top) + "px"; dp.style.top = p.yp * r.height + (r.top - b.top) + "px";
  const tip = el.querySelector(".antip"); tip.hidden = false; tip.innerHTML = `<b>${p.l}</b><span><i class="anlg imp"></i>${p.imp} impressions</span><span><i class="anlg plays"></i>${p.plays} plays</span><span>${p.imp ? Math.round(p.plays / p.imp * 100) + "% play rate" : "No views"}</span>`;
  const tw = tip.offsetWidth; tip.style.left = Math.min(Math.max(px + 12, 0), b.width - tw) + "px"; if (px + 12 + tw > b.width) tip.style.left = Math.max(0, px - tw - 12) + "px";
}
function anHide(el) { el.querySelector(".antip").hidden = true; el.querySelectorAll(".andot").forEach(d => d.hidden = true); el.querySelector(".anx").setAttribute("visibility", "hidden"); }
document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest(".anchart"); if (!el || !window.__anPts) return; const r = el.querySelector("svg").getBoundingClientRect(); const fx = (e.clientX - r.left) / r.width; let best = 0, bd = 9; window.__anPts.forEach((p, i) => { const d = Math.abs(p.x - fx); if (d < bd) { bd = d; best = i; } }); anShow(el, best); });
document.addEventListener("pointerout", e => { const el = e.target.closest && e.target.closest(".anchart"); if (el && !el.contains(e.relatedTarget) && document.activeElement !== el) anHide(el); });
document.addEventListener("keydown", e => { const el = e.target.closest && e.target.closest(".anchart"); if (!el || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault(); const n = window.__anPts.length, i = el.dataset.i == null ? n - 1 : +el.dataset.i; anShow(el, e.key === "Home" ? 0 : e.key === "End" ? n - 1 : i + (e.key === "ArrowLeft" ? -1 : 1)); });
document.addEventListener("focusin", e => { if (e.target.classList && e.target.classList.contains("anchart") && window.__anPts) anShow(e.target, e.target.dataset.i == null ? window.__anPts.length - 1 : +e.target.dataset.i); });
document.addEventListener("focusout", e => { if (e.target.classList && e.target.classList.contains("anchart")) anHide(e.target); });
const AN_SORT = [["n", "Project"], ["imp", "Impressions"], ["plays", "Plays"], ["pct", "Avg. play"]];
function vAnalytics(id) {
  const one = AN.find(a => a.id === id);
  const R = anRange();
  const pts = Array.from({ length: R.n }, (_, k) => { const d = R.start + R.n - 1 - k; return { l: anFmt(anDay(d)), imp: anImp(d), plays: anPlays(d) }; });
  const share = one ? one.imp / AN.reduce((s, b) => s + b.imp, 0) : 1;
  const sc = p => ({ ...p, imp: Math.max(0, Math.round(p.imp * share)), plays: Math.max(0, Math.round(p.plays * share)) });
  const P = pts.map(sc).map(p => ({ ...p, imp: Math.max(p.imp, p.plays) }));
  const sum = (arr, k) => arr.reduce((s, p) => s + p[k], 0);
  const tot = { imp: sum(P, "imp"), plays: sum(P, "plays") };
  // previous period of the same length, for the change line
  const prev = Array.from({ length: R.n }, (_, k) => { const d = R.start + R.n + k; return sc({ imp: anImp(d), plays: anPlays(d) }); }); const ptot = { imp: sum(prev, "imp"), plays: sum(prev, "plays") };
  const chg = (a, b) => { if (!b || !R.n) return ""; const v = Math.round((a - b) / b * 100); return `<span class="anchg ${v >= 0 ? "up" : "down"}" title="Compared with the ${R.n} days before">${v >= 0 ? "▲" : "▼"} ${Math.abs(v)}% vs previous ${R.n} days</span>`; };
  const rate = t => t.imp ? Math.round(t.plays / t.imp * 100) : 0;
  const ratePt = (a, b) => { if (!R.n || !b.imp) return ""; const v = rate(a) - rate(b); return v === 0 ? `<span class="anchg" title="Compared with the ${R.n} days before">No change vs previous ${R.n} days</span>` : `<span class="anchg ${v > 0 ? "up" : "down"}" title="Compared with the ${R.n} days before">${v > 0 ? "▲" : "▼"} ${Math.abs(v)} pts vs previous ${R.n} days</span>`; };
  // the table follows the range and adds up to the totals above
  const aImp = AN.reduce((s, b) => s + b.imp, 0), aPl = AN.reduce((s, b) => s + b.plays, 0);
  const rows = (one ? [one] : AN).map(r => ({ ...r, imp: Math.round(r.imp * (one ? tot.imp / r.imp : tot.imp / aImp)), plays: Math.round(r.plays * (one ? tot.plays / r.plays : tot.plays / aPl)) })).filter(r => r.imp > 0);
  const so = S.anSort || { k: "imp", dir: -1 }; rows.sort((x, y) => (so.k === "n" ? x.n.localeCompare(y.n) : x[so.k] - y[so.k]) * so.dir);
  const rangeLabel = R.n ? `${pts[0].l} – ${pts[R.n - 1].l}${R.start === 0 ? ", including today" : ""}` : "";
  const ret = [100, 96, 91, 88, 84, 81, 79, 76, 74, 72, 70, 66, 61, 58, 55, 54, 52, 50, 47, 44];
  const stat = (lab, val, def, tip, c) => `<div class="stat"><small class="anlab">${lab}<button class="iconbtn aninfo" data-act="toast" data-m="${esc(tip)}" aria-label="What counts as ${lab.toLowerCase()}" title="${esc(tip)}">${icon("info")}</button></small><b>${val}</b><small>${def}</small>${c}</div>`;
  const empty = !R.n || !tot.imp;
  return shell("analytics", `<div class="page">
    <div class="toolbar" style="margin-top:0"><div class="ptitle">${icon("analytics")}Analytics<span class="bdg samp lgx" title="Everything on this page is sample data, not your videos">Sample data</span></div><div style="flex:1"></div>
      <select class="btn" aria-label="Project" data-act2="anproj" style="padding-right:24px;max-width:240px;text-overflow:ellipsis">${[["", "All projects"], ...AN.map(a => [a.id, a.n])].map(([v, l]) => `<option value="${v}" ${(id || "") === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <div class="seg" role="group" aria-label="Date range">${[["7d", "7d"], ["14d", "14d"], ["30d", "30d"], ["90d", "90d"], ["custom", "Custom"]].map(([k, l]) => `<button class="${R.key === k ? "on" : ""}" aria-pressed="${R.key === k}" data-act="anrange" data-k="${k}" ${k === "custom" ? 'aria-haspopup="dialog"' : `title="Last ${k.replace("d", "")} days, including today"`}>${l}</button>`).join("")}</div>
      <button class="btn" data-act="toast" data-m="Downloads the top content table as CSV" ${empty ? "disabled" : ""}>${icon("upload")}Download CSV</button></div>
    <section class="anup" ${fix(2)} aria-labelledby="anupt"><div class="anupc"><span class="bdg amber">${icon("lock")}Business</span><h2 id="anupt">See how your real videos perform</h2><ul class="anupl"><li>${icon("check")}Every published video, link and embed</li><li>${icon("check")}Where viewers stop watching</li><li>${icon("check")}Where they're from, and what they search for</li></ul></div><div class="anupa"><button class="btn pink" data-act="toast" data-m="Opens checkout for the Business plan">Upgrade to Business</button><a class="btn ghost" href="#/settings/plan-and-usage">Compare plans</a></div></section>
    <div class="anrange mut">${R.n ? `${R.key === "custom" ? "Custom range" : `Last ${R.n} days`} · ${rangeLabel}` : "Pick a start and end date"}${one ? ` · ${esc(one.n)}` : " · All projects"}</div>
    ${empty ? `<div class="drop anempty" role="status">${icon("analytics")}<b>No views in this period</b><span>${R.future ? "Analytics has data up to today." : "Nothing was opened in these dates. Try a longer range."}</span><button class="btn" data-act="anrange" data-k="30d">Show the last 30 days</button></div>` : `
    <div class="ansample"><div class="statgrid" ${fix(1)}>${stat("Impressions", tot.imp.toLocaleString("en"), "Times your content was opened, watched or not", "Each time someone opens the page, link or embed with your video, whether or not they press play.", chg(tot.imp, ptot.imp))}${stat("Plays", tot.plays.toLocaleString("en"), "Unique plays per viewing session", "A play is counted once per viewing session. Watching again in the same session doesn't add a play.", chg(tot.plays, ptot.plays))}${stat("Play rate", rate(tot) + "%", "Plays ÷ impressions", `${tot.plays.toLocaleString("en")} plays ÷ ${tot.imp.toLocaleString("en")} impressions = ${(tot.plays / tot.imp * 100).toFixed(1)}%, rounded.`, ratePt(tot, ptot))}</div>
    <div class="box" style="margin-top:12px"><h3>Impressions vs plays <span class="anlegend"><i class="anlg imp"></i>Impressions <i class="anlg plays"></i>Plays</span></h3>${anChart(P)}</div>
    ${one ? `<div class="box" style="margin-top:12px" ${fix(3)}><h3>Audience retention · ${esc(one.n)} </h3><div class="kv"><span class="lab">Average watch</span><span>${one.dur} · ${one.pct}% of the video</span></div>${chart([{ v: ret, c: "var(--pink)" }], ret.map((_, i) => Math.round(i / 19 * 57) + "s"), 140)}<span class="mut" style="font-size:12px">Biggest drop-off at 0:34 (“Stay in sync” scene).</span><div><a class="btn" href="#/analytics">${icon("chevLeft")}All projects</a></div></div>` : ""}
    <div class="hubgrid angrid">
      <div class="box"><h3>Your top content in this period </h3>${rows.length ? `<div class="tablewrap"><table class="list antable"><thead><tr>${AN_SORT.map(([k, l]) => `<th scope="col" class="${k === "n" ? "" : "num"}" aria-sort="${so.k === k ? (so.dir > 0 ? "ascending" : "descending") : "none"}"><button class="ansort" data-act="ansort" data-k="${k}">${l}<span aria-hidden="true">${so.k === k ? (so.dir > 0 ? "↑" : "↓") : ""}</span></button></th>`).join("")}</tr></thead><tbody>
        ${rows.map(a => `<tr class="row" data-go="/analytics/${a.id}"><td><div class="tw"><a class="ttl" href="#/analytics/${a.id}" style="font-weight:500;font-size:14px">${esc(a.n)}</a><span class="mut" style="font-size:11px">Created ${a.c} · ${PROJECTS.some(x => x.id === a.id) ? `<a class="mut" href="#/project/${a.id}">Open project</a>` : "Sample video"}</span></div></td><td class="num">${a.imp.toLocaleString("en")}</td><td class="num">${a.plays.toLocaleString("en")}</td><td class="num"><span>${a.dur}</span> <span class="mut">${a.pct}%</span></td></tr>`).join("")}</tbody></table></div>` : `<p class="mut" style="font-size:12px;margin:0">No video was opened in this period.</p>`}</div>
      <div style="display:grid;gap:16px;align-content:start">
        <div class="box"><h3>Breakdown by location <span class="mut anh">by impressions</span></h3>${[["India", 38], ["United States", 27], ["Germany", 12], ["United Kingdom", 9], ["Other", 14, "14 more countries, each under 3%"]].map(([c, v, t]) => `<div class="kv" style="font-size:12px" ${t ? `title="${t}"` : ""}><span style="width:110px">${c}${t ? `<span class="mut" style="font-size:11px"> (14)</span>` : ""}</span><div class="meter" style="flex:1" role="img" aria-label="${c}: ${v}% of impressions"><i style="width:${v / 38 * 100}%"></i></div><span class="mut num" style="width:34px;text-align:right">${v}%</span></div>`).join("")}</div>
        <div class="box"><h3>Help center searches </h3><table class="list"><thead><tr><th scope="col">Date</th><th scope="col">Search</th><th scope="col">Clicked article</th></tr></thead><tbody><tr><td class="mut num0">${anFmt(anDay(0))}</td><td>add a task</td><td class="mut">Add a task in Taskly</td></tr><tr><td class="mut num0">${anFmt(anDay(1))}</td><td>weekly review</td><td class="mut">3-step Taskly onboarding</td></tr><tr><td class="mut num0">${anFmt(anDay(3))}</td><td>export csv</td><td class="mut" title="No article was clicked">None</td></tr></tbody></table></div>
      </div></div></div>`}</div>`);
}

/* ---------- AI panel ---------- */
/* ---------- Clueso AI panel ----------
   Live Clueso (17 Oct 2026): a floating panel (378 px) over the page, with View mode = Sidebar / Floating / Full screen,
   three generic chips on every page, a + menu (Attach files, Add Project, Add Clueprint), mode and model pickers, and a
   "Running low on AI credits" banner. Observed problems: floating covers the page's own controls; Sidebar pushes New project,
   Help and the account menu off screen; Full screen navigates to /home/chat and drops the page you were on; the view isn't
   remembered; Escape on a menu also closes the panel; focus stays on the header button; chips ignore where you are.
   Redesign: the same three views with plain names, remembered; side-by-side keeps the top bar intact and is the default on
   wide screens; full width expands in place; chips follow the page, and chips a button can do are done directly (no AI
   credits); cost per reply is shown before sending; focus moves in and Escape closes one layer at a time. */
const AI_VIEWS = [["side", "Sidebar", "Sits beside the page, so nothing is covered", "collapse"], ["float", "Floating", "A smaller window you can drag anywhere", "float"], ["full", "Full screen", "Phone only", "fullscreen"]];
const CHECKIN = [["Ask", "When unsure", "Asks when unsure before taking the next step"], ["Plan", "After the plan", "Lays out a plan first, then runs end-to-end"], ["Auto", "Never", "Runs end-to-end without checking in"]]; // Clueso's own wording
const LOW_CREDITS = 150; // about one video at Clueso's own estimate
function aiViewDefault() { return innerWidth >= 1100 ? "side" : "float"; } // floating would cover the page's own controls, as it does in Clueso
function aiView() { if (innerWidth <= 760) return "full"; if (!S.aiView) { try { const v = localStorage.getItem("clueso-proto-aiview"); S.aiView = ["side", "float"].includes(v) ? v : aiViewDefault(); } catch (e) { S.aiView = aiViewDefault(); } } return S.aiView; }
function setAiView(v) { if (v !== "full") S.aiPrev = v; S.aiView = v; try { if (v !== "full") localStorage.setItem("clueso-proto-aiview", v); } catch (e) {} }
function aiContext() {
  const [r, a] = route();
  if (r === "edit" && S.ed && S.ed.view === "guide") return { label: "Article", kind: "article", id: a, p: PROJECTS.find(x => x.id === a) };
  if (r === "edit" && S.ed) { const pr = PROJECTS.find(x => x.id === a); const sc = S.ed.scenes[S.ed.scene]; return { label: `Scene ${S.ed.scene + 1}: ${sc.name}`, kind: "project", id: a, p: pr, scene: true }; }
  if (r === "project") { const all = [...PROJECTS, ...PROJECTS.flatMap(p => [...p.versions, ...p.madeFrom])]; const p = all.find(x => x.id === a); return { label: p ? p.name : "This project", kind: "project", id: a, p }; }
  return { label: ({ create: "Home", projects: "Projects", chats: "Chats", analytics: "Analytics", library: route()[1] === "brand" ? "Brand kit" : "Clueprints", integrations: "Integrations", settings: "Settings" }[r] || "Home"), kind: r };
}
// "do" chips run the real flow (no credits); "ask" chips put a question in the composer for you to edit and send.
function aiChips(ctx) {
  const ask = t => ({ t, ask: true });
  // no videos yet: every page's suggestions are about making the first one (not finding, translating or guiding videos that don't exist)
  if (!PROJECTS.some(p => !p.sample) && !["article"].includes(ctx.kind)) return [ask("Help me write a brief for a product demo"), { t: "Record your screen", act: "create", k: "record" }, ask("Which Clueprint fits my first video?")];
  const map = {
    create: [ask("Help me write a brief for a product demo"), { t: "Record your screen", act: "create", k: "record" }, ask("What will my first video cost?")],
    projects: [ask("Which videos don't have an article yet?"), ask("Find my onboarding videos"), { t: "Translate a video", act: "create", k: "translate" }],
    project: [ctx.p && ctx.p.article === false ? { t: "Write the article", act: "genarticle" } : ask("Summarize this video in 3 lines"), { t: "Translate this video", act: "create", k: "translate" }, ask("Suggest a clearer title")],
    article: [ask("Improve the content and writing"), ask("Add screenshots and visuals"), ask("Fix the structure and formatting")],
    chats: [ask("Which conversations still need my reply?"), ask("What can Clueso AI do on Free?")],
    analytics: [ask("Which video loses viewers fastest?"), ask("What counts as a play?")],
    library: [ask("Which Clueprint fits a product demo?"), { t: "Open Brand kit", go: "/brand-kit" }],
    integrations: [ask("How do I use Clueso from Claude?")],
    settings: [ask("What uses AI credits?"), ask("How do export minutes count?")],
  };
  if (ctx.scene) { // In the editor: grouped by what happens, so nothing reads as if it changes the video when it doesn't
    const on = S.aiNoCtx ? "this video" : "this scene";
    return [
      { ...ask(`Summarize ${on}`), g: "ask" }, { ...ask(`Explain ${on}`), g: "ask", more: true },
      { ...ask(`Suggest clearer narration for ${on}`), g: "sug" }, { ...ask("Suggest a clearer title"), g: "sug", more: true }, { ...ask("Where would a zoom help?"), g: "sug", more: true },
      { t: "Translate this video", act: "create", k: "translate", g: "edit", more: true }];
  }
  return map[ctx.kind] || map.create;
}
const AI_GROUPS = [["ask", "Ask about this video", "Clueso AI answers. Nothing in the video changes"], ["sug", "Suggest improvements", "Clueso AI suggests. Nothing changes until you make the change"], ["edit", "Edit this video", "Changing the video by chatting is on Enterprise"]];
function aiChipBtn(c, i) { return `<button class="aichip ${c.ask ? "ask" : "do"}" data-act="aichip" data-i="${i}" ${c.ask ? `title="Puts this in the message box"` : `title="Opens it directly. No credits"`}>${esc(c.t)}${c.ask ? "" : icon("chevRight")}</button>`; }
function aiGrouped(chips) {
  const vis = chips.map((c, i) => [c, i]).filter(([c]) => S.aiMore || !c.more), hidden = chips.some(c => c.more) && !S.aiMore;
  return `<div class="aigroups">${AI_GROUPS.map(([g, l, note]) => { const cs = vis.filter(([c]) => c.g === g);
    const lock = g === "edit" ? `<div class="ailock">${icon("lock")}<span>Chat edits are on <b>Enterprise</b>. On Free, make the change here. <button class="linkbtn" data-act="entcaps" aria-haspopup="menu">What Enterprise adds</button></span></div>` : "";
    return `<div class="aigrp"><div class="aigl" title="${note}"><b>${l}</b></div>${cs.length ? `<div class="aichips">${cs.map(([c, i]) => aiChipBtn(c, i)).join("")}</div>` : ""}${lock}</div>`; }).join("")}
    ${hidden ? `<button class="linkbtn aimore" data-act="aimore">More suggestions</button>` : ""}</div>`;
}
function aiPanel() {
  const v = aiView(); const ctx = aiContext(); const chips = aiChips(ctx); const vw = AI_VIEWS.find(x => x[0] === v);
  const attach = S.aiAttach || [];
  const ctxChip = ctx.kind === "project" && !S.aiNoCtx ? [{ t: ctx.label, ic: "video", ctx: true }] : [];
  const att = [...ctxChip, ...attach];
  const chat = S.pChat && chatById(S.pChat); const left = S.credits.total - S.credits.used; const ci = CHECKIN.find(c => c[0] === S.mode) || CHECKIN[0];
  const sent = !!chat; const title = chat ? chat.t : "Clueso AI";
  const rz = route()[0] === "edit" && v === "side" && ["wide", "mid"].includes(edTier()) ? edAiHandle() : "";
  return `<aside class="aipanel v-${v}" id="aipanel" role="${v === "full" ? "dialog" : "complementary"}" aria-label="Clueso AI">${rz}
    <div class="ah">${chat ? `<button class="iconbtn" data-act="aiback" aria-label="Back to suggestions" title="Back">${icon("chevLeft")}</button>` : `<span class="aic">${icon("sparkle")}</span>`}<div class="grow">${S.aiRenaming ? `<input id="aititle" class="aititle" value="${esc(title)}" aria-label="Conversation name" maxlength="80">`
        : `<button class="aititle trunc" ${sent ? `data-act="airename" title="Rename this conversation"` : `disabled title="Named after your first message"`}>${esc(title)}</button>`}
        <span class="actx">${ctx.kind === "chats" ? (chat ? "Clueso AI" : "Your conversations") : `${chat ? "Clueso AI · " : ""}On: ${ctx.scene ? (S.aiNoCtx ? "the whole video" : `Scene ${S.ed.scene + 1} only`) : esc(ctx.label.length > 38 ? ctx.label.slice(0, 38) + "…" : ctx.label)}`}</span></div>
      ${route()[0] === "edit" ? `<button class="iconbtn" data-act="aihist" aria-haspopup="menu" aria-label="Chat history" title="Chat history">${icon("history")}</button><button class="iconbtn" data-act="ainew" aria-label="New chat" title="New chat" ${chat ? "" : "disabled"}>${icon("newchat")}</button>` : ""}
      ${innerWidth > 760 ? `<button class="iconbtn" data-act="aiviewmenu" aria-haspopup="menu" aria-label="Panel view: ${vw[1]}" title="Panel view: ${vw[1]}">${icon(vw[3])}</button>` : ""}
      <button class="iconbtn" data-act="ai" aria-label="Close Clueso AI" title="Close (Esc)">${icon("close")}</button></div>
    <div class="abody">
      ${chat ? aiThread(chat, left)
      : `${route()[0] === "edit" || !TASKS.length ? "" : `<div class="aisec"><span>Pick up where you left off</span><a class="btn ghost" href="#/chats" style="height:22px;font-size:11px">All chats${icon("chevRight")}</a></div>
      <div class="hist">${TASKS.slice(0, 3).map(c => { const pr = c.pid && PROJECTS.find(p => p.id === c.pid); return `<button data-act="openchat" data-id="${c.id}">${icon("sparkle")}<span>${esc(c.t)}<br><span class="mut" style="margin:0">${pr ? "→ " + esc(pr.name) : c.st}</span></span><span class="mut">${agoLabel(c.at)}</span></button>`; }).join("")}</div>`}
      <div class="aistart">
        <span class="aispark" aria-hidden="true">${icon("sparkle")}</span>
        <h4>${ctx.kind === "article" ? "How would you like to improve this article?" : ctx.kind === "project" ? "How can I help with this video?" : ctx.kind === "chats" ? "Start a new conversation" : `How can I help with ${esc(ctx.label.toLowerCase())}?`}</h4>
        ${ctx.scene ? aiGrouped(chips) : `<div class="aichips">${chips.map((c, i) => aiChipBtn(c, i)).join("")}</div>`}
        ${chips.some(c => !c.ask && (S.aiMore || !c.more)) ? `<span class="aileg">${icon("chevRight")}Opens directly, no credits</span>` : ""}
        ${ctx.kind === "project" && !ctx.scene ? `<div class="ailock">${icon("lock")}<span>Editing a video by chatting is on <b>Enterprise</b>. Here, open the editor or ask for suggestions.</span></div>` : ""}
      </div>`}
    </div>
    <div class="afoot">${aiComposer(chat, ctx)}</div>
  </aside>`;
}
function aiComposer(chat, ctx) {
  const left = S.credits.total - S.credits.used; const ci = CHECKIN.find(c => c[0] === S.mode) || CHECKIN[0];
  const ctxChip = ctx.kind === "project" && !S.aiNoCtx && !chat ? [{ t: ctx.label, ic: "video", ctx: true }] : [];
  const att = [...ctxChip, ...(S.aiAttach || [])];
  return `      ${left < LOW_CREDITS ? `<div class="ailow" role="status"><span>${left} credits left, about one video</span><button class="btn" data-act="toast" data-m="Opens plan comparison">Upgrade plan</button></div>` : ""}
      <div class="prompt aiprompt">
      ${att.length || (ctx.scene && S.aiNoCtx && !chat) ? `<div class="aiatt">${att.map((c, i) => `<span class="attchip" ${c.ctx ? `title="Clueso AI looks at this scene only. Remove it to ask about the whole video"` : ""}>${icon(c.ic)}<span>${esc(c.t.length > 28 ? c.t.slice(0, 28) + "…" : c.t)}</span><button data-act="aidetach" data-i="${c.ctx ? "ctx" : i - ctxChip.length}" aria-label="Remove ${esc(c.t)} from context">${icon("close")}</button></span>`).join("")}${ctx.scene && S.aiNoCtx && !chat ? `<button class="attchip addback" data-act="aireattach" title="Ask about this scene only">${icon("plus")}<span>${esc(ctx.label.length > 28 ? ctx.label.slice(0, 28) + "…" : ctx.label)}</span></button>` : ""}</div>` : ""}
      <textarea id="aiq" aria-label="${chat ? "Reply to Clueso AI" : "Ask Clueso AI"}" placeholder="${chat ? (chat.q && !chat.answer ? "Answer Clueso AI…" : chat.st === "Done" ? "Ask for a change…" : chat.st === "Building" ? "Ask while it builds…" : chat.st === "Failed" ? "Tell Clueso AI what to change…" : "Reply…") : ctx.kind === "article" ? "Ask AI to improve your article…" : ctx.kind === "project" ? "Ask about this video…" : "Describe a video, or ask anything…"}" rows="2">${esc(S.aiDraft || "")}</textarea>
      <div class="prow"><button class="pill sq" data-act="aiadd" aria-haspopup="menu" aria-label="Add: record, files, a project or a Clueprint" title="Record, attach files, add a project or a Clueprint">${icon("plus")}</button>
        ${firstRun() ? "" : `<button class="pill" data-act="aicheckin" aria-haspopup="menu" aria-label="Check in: ${ci[1]}" title="Check in: ${ci[1]}. ${ci[2]}">${ci[0]}${icon("chevDown")}</button>
        ${modelPill()}
        <button class="pill" data-act="brandchip" aria-haspopup="menu" aria-label="Brand: ${curKit().name}">${kitDots(curKit())}${curKit().name}${icon("chevDown")}</button>`}
        <button class="sendbtn" data-act="aisend" aria-label="Send" ${S.aiDraft && S.aiDraft.trim() && !outOfCredits() ? "" : "disabled"}>${icon("send")}</button></div></div>
      <div class="aimeta ${outOfCredits() ? "warn" : ""}" title="An estimate for ${curModel().n}. Longer answers and attached files use more, shorter ones less. Credits are taken only when Clueso AI replies">${icon("coin")}${outOfCredits() ? `Not enough credits for a reply · <a href="#/settings/plan-and-usage">See plans</a>` : `About ${replyCr()} credits a reply, estimated · ${left.toLocaleString("en-US")} left`}</div>`;
}
function aiThread(c, left, full) {
  const pr = c.pid && PROJECTS.find(p => p.id === c.pid);
  const gen = c.pid && S.generating && S.generating.id === c.pid ? S.generating : null;
  const ci = CHECKIN.find(x => x[0] === S.mode) || CHECKIN[0];
  const long = (c.ask || "").length > 180, open = (S.briefOpen || {})[c.id];
  let out = `<div class="msg you"><span class="btext ${long && !open ? "clamp" : ""}">${esc(c.ask)}</span>${long ? `<button class="linkbtn more" data-act="briefmore" data-id="${c.id}" aria-expanded="${!!open}">${open ? "Show less" : "Show more"}</button>` : ""}</div>`;
  const cred = n => `<span class="mcr">${icon("coin")}${n} credits</span>`;
  const steps = c.steps && full ? `<details class="steps"><summary>Ran ${c.steps.length} steps</summary><ol>${c.steps.map((x, i) => `<li class="${c.st === "Failed" && i === c.steps.length - 1 ? "bad" : ""}">${esc(x)}</li>`).join("")}</ol></details>` : "";
  // a question: Clueso's numbered choices, plus a way to say something else
  if (c.q) { out += `<div class="msg ai qa"><span>${esc(c.q)}</span>${c.opts && !c.answer ? `<div class="qopts" role="group" aria-label="Suggested answers">${c.opts.map((o, i) => `<button class="qopt" data-act="chatopt" data-id="${c.id}" data-i="${i}"><b>${i + 1}</b>${esc(o)}</button>`).join("")}<button class="qopt" data-act="aifocus"><b>${c.opts.length + 1}</b>Something else…</button></div>` : ""}${full ? cred(13) : ""}</div>`;
    if (c.answer) out += `<div class="msg you">${esc(c.answer)}</div>`; }
  if (c.plan && !c.pid) out += `<div class="plancard" role="group" aria-label="Plan to approve">
      <div class="phd"><b>Here's the plan: ${esc(VTYPES[c.vtype || inferType(c.ask + " " + (c.answer || ""))])}${/[^\u0000-\u024f\s\d\p{P}\p{S}]/u.test(c.ask) ? ", in the language you wrote in" : ""}</b><button class="linkbtn" data-act="vtypemenu" data-id="${c.id}" aria-haspopup="menu">Change</button></div>
      ${(() => { const m = !S.brandSet && (c.ask + " " + (c.answer || "")).match(/\b((?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|io|ai|co|app|dev|org|net|so|xyz|in|uk|de)))\b/i); return m ? `<div class="brandoffer inplan"><span class="grow">Use the logo and colours from ${esc(m[2])}?</span><button class="btn" data-act="brandfromemail" data-k="${esc(m[2])}">Use them</button></div>` : ""; })()}
      ${(() => { const anim = !c.sbShown; c.sbShown = true; const ttl = shortTitle(c.answer || c.ask) || "Your video", sc = scenesFor(c.vtype || inferType(c.ask + " " + (c.answer || ""))); return `<div class="sboard ${anim ? "anim" : ""}" role="list" aria-label="Storyboard: ${sc.length} scenes">${sc.map((n, k) => `<span role="listitem" class="sbtile" style="--i:${k}" title="${k + 1} · ${esc(n)}">${sceneThumb(ttl, k, sc.length, "t-plum", c.vtype || inferType(c.ask + " " + (c.answer || "")))}<span class="trunc">${k + 1} · ${esc(n)}</span></span>`).join("")}</div>
      <p class="sbinc">${esc(includesFor(c.vtype || inferType(c.ask + " " + (c.answer || ""))))}</p>`; })()}
      ${freeFirst() ? `<div class="pcost free"><span>${icon("sparkle")}Your first video is on us</span><span class="mut">About 10 minutes</span></div>` : quietCost() ? "" : `<div class="pcost ${canBuild() ? "" : "short"}"><span>${icon("coin")}About ${costRange()} credits</span><span class="mut">${left.toLocaleString("en-US")} left · about 10 minutes</span></div>`}${canBuild() ? "" : `<div class="callout warnbox" role="status">${icon("info")}<span>${shortNote()}<a href="#/settings/plan-and-usage">See plans</a></span></div>`}
      ${firstRun() ? "" : `<div class="puses"><span>Uses ${modelPillMini()} · ${ci[0]} · ${kitMini(curKit())}${curKit().name}</span><span class="mut">Change these in the box below</span></div>`}
      <div class="pact"><span class="pleft">${quietCost() ? `<span class="pquiet" title="About ${costRange()} credits of your ${left.toLocaleString("en-US")}">${icon("coin")}Uses about 1 of your ${videosFor(left)} free videos · about 10 minutes</span>` : ""}${S.guest ? `<span class="pnote">You'll create an account to build it. Your brief is kept.</span>` : ci[0] === "Auto" ? `<span class="pnote">Runs without checking in after you build.</span>` : ""}</span><button class="btn" data-act="${S.frChat === c.id ? "frback" : "aieditbrief"}">Change brief</button><button class="btn pink" data-act="aibuild" ${canBuild() ? "" : 'disabled aria-describedby="shortnote"'}>${icon("sparkle")}Build video</button></div>
      </div>`;
  else if (!c.q && !c.pid && !c.fail) out += `<div class="msg ai">Clueso AI answers here, using what's on the page you asked from. Replies aren't part of this prototype.</div>`;
  // building: progress with an end, and a way out
  if (gen) out += `${steps}<div class="statecard" role="status"><div class="kv"><b><span class="spin" aria-hidden="true"></span>Building · scene ${Math.min(gen.step + 1, 6)} of 6</b><span class="mut">about ${Math.max(1, Math.round((6 - gen.step) * 10 / 6))} min left</span></div><div class="meter"><i style="width:${gen.step / 6 * 100}%"></i></div><span class="mut" style="font-size:12px">You can leave; it keeps building and shows in the top bar. You can also keep chatting here.</span><div class="sact"><a class="btn" href="#/project/${gen.id}">Open project</a><button class="btn ghost" data-act="cancelbuild" data-id="${gen.id}">Cancel build</button></div></div>`;
  else if (c.st === "Queued") out += `<div class="statecard" role="status"><b>Queued</b><span class="mut" style="font-size:12px">It starts when the video that's building now finishes. Nothing is charged until then.</span><div class="sact"><button class="btn ghost" data-act="cancelbuild" data-id="${c.pid}">Remove from queue</button></div></div>`;
  else if (c.st === "Cancelled") out += `<div class="statecard" role="status"><b>Build cancelled</b><span class="mut" style="font-size:12px">${+c.cr ? `${c.cr} credits were used for the scenes already made.` : "Nothing was charged."}</span><div class="sact"><button class="btn" data-act="rebuild" data-id="${c.pid}">${icon("sparkle")}Build again</button></div></div>`;
  // failed: what broke, what it cost, and the user's choice of how to recover
  else if (c.st === "Failed" && c.fail) { const rest = c.fail.of - c.fail.done, lo = Math.round(lowCost() * rest / c.fail.of), hi = Math.round(+costRange().split("–")[1] * rest / c.fail.of);
    out += `${steps}<div class="statecard bad" role="status"><b>${icon("info")}Couldn't finish: scene ${c.fail.done + 1} (“${esc(c.fail.at)}”) failed twice</b><span class="mut" style="font-size:12px">Scenes 1 to ${c.fail.done} are made and kept. ${c.cr} credits were used for them.</span><div class="sact"><button class="btn pink" data-act="failcontinue" data-id="${c.id}">Continue from scene ${c.fail.done + 1}<small>about ${lo}–${hi} credits</small></button><button class="btn ghost" data-act="failrestart" data-id="${c.id}">Start over<small>about ${costRange()} credits</small></button></div></div>`; }
  // done: the result first, then what to check before sharing, then what people usually do next
  else if (pr && !gen) { const done = c.st === "Done";
    out += `${steps}<div class="madecard ${full ? "lg" : ""}"><div class="thumb ${pr.th}">${full ? esc(pr.label || "") : ""}</div><div class="tw"><b>${esc(pr.name)}</b><span class="mut" style="font-size:11px">${pr.type} · ${pr.dur}${pr.madeFrom && pr.madeFrom.length ? ` · plus ${pr.madeFrom.length} more` : ""}</span>${full && done ? `<span class="sact"><a class="btn" href="#/project/${pr.id}">${icon("play")}Open video</a><button class="btn pink" data-act="sharefrom" data-id="${pr.id}">${icon("link")}Share</button></span>` : ""}</div>${full && done ? "" : `<a class="btn" href="#/project/${pr.id}">Open</a>`}</div>`;
    if (full && done && c.checks) out += `<div class="msg ai checks"><span>Before you share it, check:</span><ul>${c.checks.map((x, i) => { const on = ((S.checked || {})[c.id] || []).includes(i); return `<li><label><input type="checkbox" data-act="checkitem" data-id="${c.id}" data-i="${i}" ${on ? "checked" : ""}> ${esc(x)}</label></li>`; }).join("")}</ul></div>`;
    if (full && done) { const fb = (S.fb || {})[c.id];
      out += `<div class="mfoot"><button class="iconbtn ${fb === "up" ? "on" : ""}" data-act="feedback" data-id="${c.id}" data-k="up" aria-label="Good result" aria-pressed="${fb === "up"}">${icon("thumbup")}</button><button class="iconbtn ${fb === "down" ? "on" : ""}" data-act="feedback" data-id="${c.id}" data-k="down" aria-label="Not what I wanted" aria-pressed="${fb === "down"}">${icon("thumbdown")}</button><button class="iconbtn" data-act="toast" data-m="Copied" aria-label="Copy reply">${icon("copy")}</button><span style="flex:1"></span>${cred(c.cr)}</div>
      <div class="followups" role="group" aria-label="Next steps"><button class="pill" data-act="followup" data-k="Shorten the intro to 5 seconds">Shorten the intro</button><button class="pill" data-act="create" data-k="translate">${icon("translate")}Translate it</button>${pr.article ? "" : `<button class="pill" data-act="genarticle">${icon("doc")}Make the article</button>`}</div>`; } }
  if (c.extra) out += c.extra.map(m => `<div class="msg you">${esc(m)}</div><div class="msg ai">Replies aren't part of this prototype.</div>`).join("");
  return out;
}
function aiFocusComposer() { const q = $("#aiq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }

/* ---------- theme ----------
   Clueso offers Light, Dark and System as three unlabeled icon tabs in the account menu. Here they keep Clueso's icons and
   place, add visible labels and act as one radio group (NN/g: icons need labels; WAI-ARIA radio group). The choice is kept
   in this browser only; System follows the OS setting. */
function readTheme() { try { const t = localStorage.getItem("clueso-proto-theme"); return ["light", "dark", "system"].includes(t) ? t : "system"; } catch (e) { return "system"; } }
function applyTheme(t) {
  S.theme = t; const r = document.documentElement;
  if (t === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", t);
  try { localStorage.setItem("clueso-proto-theme", t); } catch (e) {}
}
function themeControl() {
  const cur = S.theme || "system";
  return `<div class="themeseg" role="radiogroup" aria-label="Theme">${[["light", "sun", "Light"], ["dark", "moon", "Dark"], ["system", "monitor", "System"]].map(([k, ic, l]) =>
    `<button role="radio" aria-checked="${cur === k}" tabindex="${cur === k ? 0 : -1}" data-act="theme" data-k="${k}">${icon(ic)}<span>${l}</span></button>`).join("")}</div>`;
}

/* ---------- dialogs ---------- */
// Dialogs follow the WAI-ARIA dialog pattern: focus moves in, Tab stays inside, and closing returns focus to what opened it.
let layerOpener = null;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function holdFocus(layer) {
  layer.addEventListener("keydown", e => {
    if (e.key !== "Tab" || e.defaultPrevented) return;
    const f = [...layer.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const target = layer.querySelector("input:not([disabled]), textarea, select") || layer.querySelector(".df .btn.pink, .df .btn, " + FOCUSABLE);
  if (target) target.focus({ preventScroll: true });
}
function openerNow() { return document.querySelector(".scrim,.drawer") ? layerOpener : document.activeElement; }
function dialog(html, cls = "") {
  const opener = openerNow(); closeLayers(true); layerOpener = opener;
  const d = document.createElement("div"); d.className = "scrim";
  d.innerHTML = `<div class="dlg ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  const h = d.querySelector("h3"); if (h) { h.id = "dlgtitle"; d.firstElementChild.setAttribute("aria-labelledby", "dlgtitle"); }
  d.addEventListener("click", e => { if (e.target === d) closeLayers(); });
  document.body.appendChild(d); holdFocus(d.firstElementChild);
}
const dh = (t, p) => `<div class="dh"><div><h3>${t}</h3>${p ? `<p>${p}</p>` : ""}</div><button class="iconbtn" data-act="closedlg" aria-label="Close">${icon("close")}</button></div>`;
function closeLayers(keepOpener) {
  const had = document.querySelector(".scrim,.drawer");
  document.querySelectorAll(".scrim,.pop,.drawer").forEach(x => x.remove());
  if (had && !keepOpener) { if (layerOpener && document.contains(layerOpener)) layerOpener.focus({ preventScroll: true }); layerOpener = null; }
}

const guideToggle = (on = true) => `<div class="kv"><span>Also make a step-by-step article <span class="mut" style="font-size:11px">· screenshots and written steps</span></span><span class="swlab">${on ? "On" : "Off"}<span class="sw ${on ? "on" : ""}"></span></span></div>`;
function openCreate(k) {
  if (k === "style") return go("/clueprints");
  if (k === "blank") { const id = "b" + Date.now(); PROJECTS.unshift({ id, name: "Untitled project", type: "Blank", th: "t-white", label: "Untitled project", dur: "0:00", mod: "just now", created: "just now", chat: null, article: false, versions: [], madeFrom: [] }); toast("Blank project created"); return go("/project/" + id); } // your own empty project (it used to open a seeded one a new account doesn't have)
  if (k === "translate") { S.tr = null; return translateDialog(false); }
  if (k === "record") return dialog(dh("Record your screen", "Talk as you go. Clueso writes the script, voiceover and steps from your recording.") + `<div class="db">
    <div class="seg" role="group" aria-label="What to record"><button class="on">This browser tab</button><button>A window</button><button>Entire screen</button></div>
    <div class="callout grey" ${fix(1)}>${icon("info")}<span>Records right here, nothing to install. Add the free Chrome extension later for click highlights and auto-zoom.</span></div>
    <span class="mut" style="font-size:12px">You get a video and a step-by-step article.</span></div>
    <div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn pink" data-act="startgen" data-id="new" data-name="Screen recording">${icon("record")}Start recording</button></div>`);
  if (k === "upload") return dialog(dh("Upload videos or slides", "Get a studio-quality video and a step-by-step article.") + `<div class="db">
    ${S.dropped ? `<div class="stdone">${icon("check")}<span class="grow"><b>${esc(S.dropped)}</b><span>Ready to use</span></span><button class="btn ghost" data-act="undrop">Remove</button></div>` : ""}<div class="drop" ${S.dropped ? "hidden" : ""}>${icon("upload")}<b style="color:var(--ink);font-weight:500">Drag and drop files here or click to select</b>Videos (.mp4 .mov .wav .webm) · slides, documents and images (.pdf .ppt .pptx .png .jpg)<span class="mut" style="font-size:11px">Videos up to 10 min on Free</span></div>
    <button class="btn" data-act="toast" data-m="Google Drive picker">${icon("external")}Choose from Google Drive</button>
    <label class="field">Instructions <span class="mut" style="font-weight:400">(optional)</span><textarea id="upnote" rows="2" placeholder="Anything about audience, tone or what to focus on. This shapes the script and voiceover."></textarea></label>
    <label class="field">Input language<select><option>English</option><option>Spanish</option><option>Hindi</option></select></label></div>
    <div class="df"><span class="note">${freeFirst() ? `${icon("sparkle")}Your first video is on us` : `${icon("coin")}Clueso shows the credit cost before it builds`}</span><button class="btn" data-act="closedlg">Cancel</button><button class="btn pink" data-act="uploadnext">Create</button></div>`);
}
// Translate (IA fix W10, 21 Oct 2026): opens from New project, search, the project page, the editor and the AI panel. It takes an
// upload or one of your projects (the one you're on is preselected) and adds the language version under its original.
const TR_LANGS = ["Spanish", "French", "German", "Hindi", "Japanese", "Portuguese"];
function trContext() { const [r, a] = route(); if (r !== "project" && r !== "edit") return ""; const own = PROJECTS.find(p => p.id === a) || PROJECTS.find(p => p.versions.some(v => v.id === a) || p.madeFrom.some(m => m.id === a)); return own ? own.id : ""; }
function trRead() { const to = $("#trto"), pid = $("#trpid"); if (to) S.tr.to = to.value; if (pid) S.tr.pid = pid.value; }
function translateDialog(rules) {
  const T = S.tr = S.tr || { to: "Spanish", pid: trContext(), file: "" }; const mine = PROJECTS.filter(p => !p.sample);
  dialog(dh("Translate a video", mine.length ? "Upload a video, or pick one of your projects. The translation is grouped under the original." : "Upload a video to make a copy in another language. The translation is grouped under it.") + `<div class="db ${rules ? "two" : ""}">
    <div style="display:grid;gap:12px"><div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end"><label class="field">Input<select><option>English</option></select></label><span style="padding-bottom:8px">→</span><label class="field">Output<select id="trto">${TR_LANGS.map(l => `<option ${l === T.to ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    ${T.file ? `<div class="stdone">${icon("check")}<span class="grow"><b>${esc(T.file)}</b><span>Ready to translate</span></span><button class="btn ghost" data-act="trunpick">Remove</button></div>`
      : `<button class="drop" style="padding:16px;width:100%" data-act="trpick">${icon("upload")}<b style="color:var(--ink);font-weight:500">Drag and drop a video or click to select</b>.mp4 .mov .wav .webm</button>`}
    ${mine.length && !T.file ? `<label class="field">Or choose an existing project<select id="trpid"><option value="">None</option>${mine.map(p => `<option value="${p.id}" ${p.id === T.pid ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>` : ""}
    <p class="ferr" id="trErr" role="alert" hidden></p>
    <div class="callout grey">${icon("info")}<span>Each language version counts as its own video when exported: a 1-minute video in 2 languages uses 2 minutes.</span></div></div>
    ${rules ? `<div class="box" ${fix(1)}><h3>${icon("translate")}Translation rules</h3><label class="field">Keep these words as they are<input placeholder="Taskly, Kanban"></label><label class="field">Rule<input placeholder="Use formal Spanish (usted)"></label><span class="hint mut" style="font-size:11px">Saved to Settings › Language and voice, for every translation.</span></div>` : ""}
  </div><div class="df"><button class="btn ghost" data-act="rules">${icon("settings")}${rules ? "Hide rules" : "Customize translation rules"}</button><span style="flex:1"></span><button class="btn" data-act="closedlg">Cancel</button><button class="btn pink" data-act="dotranslate">Translate</button></div>`, rules ? "wide" : "");
}
// SSO as a box over the try screen (the only entry screen). Back returns to the box it came from, with what was waiting.
function ssoBox() { closeLayers(); dialog(dh("Continue with SSO", "Enter your work email to continue.") + `<form class="db gate" data-form="sso" novalidate>
    <label class="field" for="ssoem">Work email address<input id="ssoem" type="email" autocomplete="email" placeholder="you@company.com" aria-describedby="ssoErr"></label><p class="ferr" id="ssoErr" role="alert" hidden></p>
    <div class="gfoot"><button type="button" class="btn ghost" data-act="ssoback">Back</button><button class="btn pink lg" type="submit">Continue</button></div></form>`); setTimeout(() => { const i = $("#ssoem"); if (i) i.focus(); }, 0); }
function verifyDialog(shareId) {
  dialog(dh("Verify your email to share", `We sent a link to <b>${esc(S.user.email)}</b>. Shared links come from a verified account, so viewers know they're from you.`) + `<div class="db"><span class="mut" style="font-size:12px">Didn't get it? Check spam, or send it again. Wrong address? Change it.</span></div><div class="df"><button class="btn ghost" data-act="changeemail">Change email</button><button class="btn" data-act="resendverify">Resend</button><button class="btn pink" data-act="verified" ${shareId ? `data-k="share" data-id="${shareId}"` : ""}>I've verified</button></div>`);
}
function shareDialog(id) {
  const p = (id && PROJECTS.find(x => x.id === id)) || PROJECTS[0]; if (!p) return toast("Make a video first, then share it");
  if (S.verified === false) return verifyDialog(p.id);
  const noMin = S.minutes.used >= S.minutes.total;
  dialog(dh("Share “" + esc(p.name) + "”") + `<div class="db"><div class="seg"><button class="on">${icon("link")}View-only link</button><button>Embed</button><button>Export video</button><button>Export article</button></div>
    ${noMin ? `<div class="callout warnbox" ${fix(1)}>${icon("info")}<span>You've used all ${S.minutes.total} free export minutes this month. New links can be made after they reset on 15 Nov, or <a href="#/settings/plan-and-usage">see plans</a>. Links you already shared keep working.</span></div>` : `<div class="callout" ${fix(1)}>${icon("coin")}<span>Creating a link uses about <b style="font-weight:500">1 of your ${S.minutes.total - S.minutes.used}</b> free export minutes left this month. Free links include a Clueso watermark.</span></div>`}
    <div class="kv"><span class="lab">Resolution</span><div class="seg"><button>720p</button><button class="on">1080p</button><button disabled title="Solo plan">${icon("lock")}2K</button><button disabled title="Business plan">${icon("lock")}4K</button></div></div>
    <span class="mut" style="font-size:11px">2K is on Solo, 4K on Business.</span>
    <div class="kv"><span>Include article <span class="mut" style="font-size:11px">· no article yet</span></span><span class="swlab">Off<span class="sw"></span></span></div></div>
    <div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn pink" data-act="mklink" ${noMin ? "disabled" : ""}>Create link</button></div>`);
}
function inviteDialog() {
  dialog(dh("Invite a teammate", "Free includes 1 editor: you.") + `<div class="db"><label class="field">Email<input placeholder="name@company.com"></label>
    <div class="callout" ${fix(4)}>${icon("info")}<span><b style="font-weight:500">Business</b> includes 2 editors, lets you add more, and adds roles and permissions. <b style="font-weight:500">Reviewer</b> seats (watch and comment only) are on Enterprise. Want feedback today? Share a view-only link instead.</span></div></div>
    <div class="df"><button class="btn" data-act="share">${icon("link")}Share a link instead</button><button class="btn pink" data-act="toast" data-m="Opens plan comparison">See Business plan</button></div>`);
}
function planDialog(open) {
  dialog(dh("Ready to build", "Clueso plans, writes, voices and animates it. You can edit everything after.") + `<div class="db">
    <div class="box" style="background:var(--main)"><span class="mut" style="font-size:11px">Your brief</span><div style="font-size:14px">${esc(S.prompt)}</div></div>
    <div class="buildbar"><div><b>${freeFirst() ? "Your first video is on us" : `About ${costRange()} credits`}</b><span>${freeFirst() ? "" : credLeft().toLocaleString("en-US") + " left · "}about 10 minutes · an article is included</span></div><button class="btn ghost" data-act="planopts">${open ? "Hide" : "Options"}${icon(open ? "chevDown" : "chevRight")}</button></div>
    ${open ? `<div class="optbox">
      <div class="kv"><span class="lab">Model</span>${modelPill()}</div>
      <div class="kv"><span class="lab">Check in with me</span><div class="seg">${[["Ask", "When unsure"], ["Plan", "After the plan"], ["Auto", "Never"]].map(([m, l]) => `<button class="${S.mode === m ? "on" : ""}" data-act="setmode" data-m2="${m}">${l}</button>`).join("")}</div></div>
      <div class="kv"><span class="lab">Brand</span><button class="pill kname" data-act="brandchip" aria-haspopup="menu" aria-label="Brand: ${curKit().name}">${kitMini(curKit())}${curKit().name}${icon("chevDown")}</button></div>
      ${guideToggle(true)}</div>` : ""}</div>
    <div class="df"><button class="btn" data-act="closedlg">Edit brief</button><button class="btn pink" data-act="startgen" data-id="new">${icon("sparkle")}Build video</button></div>`);
}
/* ---------- Clueprint preview ----------
   As live: a centred window over the grid, built around the video (player, scenes, previous / next Clueprint, Edit this
   Clueprint, Create video), instead of a side drawer with a small still and a form. Previous / next (and ← →) compare
   templates without closing. Create video takes you to Home with the Clueprint attached, where the brief is written once. */
const clueScenes = s => { const m = s[3].match(/:\s*([^.]+)\./); const parts = (m ? m[1] : s[2]).split(/,\s*/).filter(Boolean); return (parts.length >= 3 ? parts : ["Opening", "Walkthrough", "Key moment", "Close"]).slice(0, 5).map(x => x.charAt(0).toUpperCase() + x.slice(1)); };
const clueDur = i => 40 + (i * 7) % 30;
let clueTimer = null;
function styleDrawer(i, keep) { S.clueView = { i: (i + STYLES.length) % STYLES.length, t: 0, playing: false }; clearInterval(clueTimer); if (!keep) dialog(cluePreviewHTML(), "cluedlg"); if (!matchMedia("(prefers-reduced-motion: reduce)").matches) cluePlay(true, keep || null); else clueRedraw(keep || null); }
// What each Clueprint gives you and suits (shown beside the preview, so "will this fit my video?" is answered without reading the description)
const CLUE_META = [
  { gets: ["Chapters from one recording", "Zooms and callouts", "AI voice and captions", "A step-by-step article"], good: "Onboarding, feature walkthroughs, help articles" },
  { gets: ["Statement slides between clips", "AI voice and captions", "Music bed"], good: "Feature teasers, social posts" },
  { gets: ["Hook, reveal and demo", "Animated text", "Music bed"], good: "Landing pages, ads, launches" },
  { gets: ["A 72-second product story", "Customer logo wall", "AI voice and captions"], good: "Homepage hero, sales decks" },
  { gets: ["Cinematic reveal", "Your words as voiceover", "Captions"], good: "Feature launches, release notes" },
  { gets: ["Music-driven cuts", "Animated titles", "No voiceover"], good: "Launch day, social" },
  { gets: ["Spotlight demo", "Branded chapters", "AI voice and captions"], good: "Customer education, help centre" },
  { gets: ["8 animated scenes", "Your brand colour", "Music bed"], good: "Explainers, intros, social" },
];
// The preview, drawn as a short video: an opening card in the Clueprint's style, product shots per chapter (a zoom on the key moment),
// and an end card. It plays muted on open (not with reduced motion); the chapter strip is the timeline.
function clueFrame(s, sc, at) {
  const last = sc.length - 1, name = sc[at];
  if (at === 0) return `<span class="cfcard">${esc(s[2])}</span>`;
  if (at === last) return `<span class="cfcard end"><span>Ready to try it?</span><i class="cfcta">Start free</i></span>`; // the end card: your call to action
  const body = [`<i class="frl w1"></i><i class="frl w2"></i><i class="frbtn"></i>`, `<i class="frl w1"></i>${"<i class=\"frrow\"><b></b><i class=\"frl w2\"></i></i>".repeat(3)}`, `<i class="frl w1"></i><i class="frbars">${[60, 85, 45, 100, 70].map(h => `<b style="height:${h}%"></b>`).join("")}</i>`][at % 3];
  return `<span class="frwin ${/key|moment|demo|reveal|proof|spotlight/i.test(name) ? "cfzoom" : ""}"><i class="frbar"><b></b><b></b><b></b></i><i class="frbody">${body}</i></span>`;
}
// A sample voiceover line per chapter, shown as the video's caption
const clueLine = (s, sc, k) => { const n = sc.length; if (k === 0) return "Here's how to get set up in under a minute."; if (k === n - 1) return "That's it. Try it free today.";
  const L = ["Start by creating your first project.", "Invite your team and assign the first task.", "Set a due date, and everyone sees it on the board.", "Track progress as tasks move to done."]; return L[(k - 1) % L.length]; };
function cluePreviewHTML() {
  const v = S.clueView, s = STYLES[v.i], m = CLUE_META[v.i] || CLUE_META[0], sc = clueScenes(s), D = clueDur(v.i), n = sc.length, at = Math.min(n - 1, Math.floor(v.t / D * n));
  const seg = D / n, pct = k => Math.max(0, Math.min(100, (v.t - k * seg) / seg * 100));
  return `<div class="dh"><div><h3>${esc(s[0])}</h3><p>by Clueso · ${mmssA(D)} · ${n} chapters</p></div>
      <div class="cluepager"><button class="iconbtn" data-act="cluego" data-k="-1" aria-label="Previous Clueprint" title="Previous (←)">${icon("chevLeft")}</button><span aria-live="polite">${v.i + 1} of ${STYLES.length}</span><button class="iconbtn" data-act="cluego" data-k="1" aria-label="Next Clueprint" title="Next (→)">${icon("chevRight")}</button></div>
      <button class="iconbtn" data-act="closedlg" aria-label="Close">${icon("close")}</button></div>
    <div class="db cluebody">
      <div class="cluemain">
        <div class="cluemedia">
          <div class="clueplayer thumb fr ${s[1]}" role="img" aria-label="Preview of ${esc(s[0])}, chapter ${at + 1} of ${n}: ${esc(sc[at])}">
            <span class="cfstage">${clueFrame(s, sc, at)}</span>
            <span class="cluecap">${esc(clueLine(s, sc, at))}</span>
            <span class="cluectl"><button class="iconbtn" data-act="clueplay" aria-label="${v.playing ? "Pause preview" : "Play preview"}">${icon(v.playing ? "pause" : "play")}</button><span class="cluetime">${mmssA(v.t)} / ${mmssA(D)}</span><span class="grow"></span><span class="cluemute">Muted preview</span></span>
          </div>
          <div class="cluechs" role="group" aria-label="Chapters" style="--n:${n}">${sc.map((c, k) => `<button class="cluech ${k === at ? "on" : ""}" data-act="cluescene" data-k="${k}" aria-label="Chapter ${k + 1}: ${esc(c)}" ${k === at ? 'aria-current="step"' : ""}><span class="thumb fr chmini ${s[1]}" aria-hidden="true"><span class="cfstage">${clueFrame(s, sc, k)}</span></span><span class="chprog"><i style="width:${pct(k)}%"></i></span><span class="trunc">${k + 1} · ${esc(c)}</span></button>`).join("")}</div>
        </div>
        <div class="clueside">
          <div><b>You'll get</b><ul>${m.gets.map(g => `<li>${icon("check")}${esc(g)}</li>`).join("")}</ul></div>
          <div><b>You'll need</b><p>${s[4].map(esc).join(", ")}</p></div>
          <div><b>Good for</b><p>${esc(m.good)}</p></div>
          <div class="clueacts"><button class="btn pink lg block" data-act="cluecreate">Create video</button><button class="btn lg block" data-act="clueedit">Edit this Clueprint</button></div>
        </div>
      </div>
    </div>
`;
}
const mmssA = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
function clueRedraw(focusSel) { const d = $(".dlg.cluedlg"); if (!d) return; d.innerHTML = cluePreviewHTML(); const f = focusSel && d.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
function cluePlay(on, focusSel = '.cluectl [data-act="clueplay"]') { const v = S.clueView; if (!v) return; v.playing = on; clearInterval(clueTimer); if (on) { if (v.t >= clueDur(v.i)) v.t = 0; clueTimer = setInterval(() => { const d = $(".dlg.cluedlg"); if (!d) return clearInterval(clueTimer); v.t += 0.25; if (v.t >= clueDur(v.i)) { v.t = clueDur(v.i); cluePlay(false); return; } clueTick(d); }, 250); } clueRedraw(focusSel); }
function clueTick(d) { const v = S.clueView, s = STYLES[v.i], sc = clueScenes(s), D = clueDur(v.i), n = sc.length, seg = D / n, at = Math.min(n - 1, Math.floor(v.t / D * n));
  d.querySelector(".cluetime").textContent = `${mmssA(v.t)} / ${mmssA(D)}`;
  d.querySelectorAll(".cluech").forEach((b, k) => { b.querySelector(".chprog i").style.width = Math.max(0, Math.min(100, (v.t - k * seg) / seg * 100)) + "%"; const on = k === at; if (b.classList.contains("on") !== on) { b.classList.toggle("on", on); on ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current"); } });
  const st = d.querySelector(".cfstage"); if (st.dataset.at !== String(at)) { st.dataset.at = at; st.innerHTML = clueFrame(s, sc, at); d.querySelector(".cluecap").textContent = clueLine(s, sc, at); d.querySelector(".clueplayer").setAttribute("aria-label", `Preview of ${s[0]}, chapter ${at + 1} of ${n}: ${sc[at]}`); } }

// Menus share one sliding hover highlight, as Clueso's do: it moves to the item under the pointer or keyboard focus
// (transform, width and height over 200 ms ease-out; fade over 100 ms) instead of each item lighting up on its own.
function movePill(item) {
  const pop = item.closest(".pop"); if (!pop) return;
  let pill = pop.querySelector(":scope > .hpill"); if (!pill) { pill = document.createElement("div"); pill.className = "hpill"; pill.setAttribute("aria-hidden", "true"); pop.prepend(pill); }
  const first = pill.style.opacity !== "1";
  if (first) pill.style.transition = "opacity 100ms ease-out";
  Object.assign(pill.style, { transform: `translate3d(${item.offsetLeft}px, ${item.offsetTop}px, 0) scale(1)`, width: item.offsetWidth + "px", height: item.offsetHeight + "px", opacity: "1" });
  if (first) requestAnimationFrame(() => { pill.style.transition = ""; });
}
document.addEventListener("mouseover", e => { const m = e.target.closest && e.target.closest(".pop .mi:not(.mut)"); if (m) movePill(m); });
document.addEventListener("focusin", e => { const m = e.target.closest && e.target.closest(".pop .mi"); if (m) movePill(m); });
document.addEventListener("mouseout", e => { const pop = e.target.closest && e.target.closest(".pop"); if (pop && !pop.contains(e.relatedTarget)) { const pill = pop.querySelector(":scope > .hpill"); if (pill && !pop.contains(document.activeElement)) pill.style.opacity = "0"; } });
function popover(anchor, html, align = "left") {
  // Inside a dialog or drawer, close only other menus, not the dialog the menu belongs to
  if (anchor.closest && anchor.closest(".scrim, .drawer")) document.querySelectorAll(".pop").forEach(x => x.remove()); else closeLayers();
  if (isPhone()) { // a bottom sheet: full width, a grab handle, tapping outside closes it (Claude, ChatGPT and Gemini all do this)
    const p = document.createElement("div"); p.className = "pop sheet"; p.innerHTML = `<div class="sheetb" role="menu"><span class="grab" aria-hidden="true"></span>${html}</div>`;
    p.addEventListener("click", e => { if (e.target === p) p.remove(); }); document.body.appendChild(p); return; }
  const r = anchor.getBoundingClientRect(); const p = document.createElement("div"); p.className = "pop"; p.innerHTML = html;
  document.body.appendChild(p); const pw = p.offsetWidth, ph = p.offsetHeight;
  // Fit the viewport: open below if it fits, else above, else on the roomier side with a scrollable max height.
  const below = innerHeight - r.bottom - 14, above = r.top - 14;
  let top;
  if (ph <= below) top = r.bottom + 6; else if (ph <= above) top = r.top - ph - 6;
  else if (below >= above) { top = r.bottom + 6; p.style.maxHeight = below + "px"; } else { p.style.maxHeight = above + "px"; top = r.top - above - 6; }
  if (p.style.maxHeight) p.style.overflowY = "auto";
  p.style.top = (top + scrollY) + "px"; p.style.left = Math.min(Math.max(8, align === "right" ? r.right - pw : r.left), innerWidth - pw - 8) + "px";
}
const createMenu = () => `${[CREATE.find(o => o.k === "blank"), ...CREATE.filter(o => o.k !== "blank")].map(o => `<button class="mi" data-act="create" data-k="${o.k}">${icon(o.ic)}<span class="desc">${o.label}<span>${o.desc}</span></span>${o.fresh ? '<small style="color:var(--pink)">New</small>' : ""}</button>`).join("")}`;
/* ---------- search (⌘K) ----------
   Measured on web.clueso.io: a fixed-size panel (680 × 480 px, 15vh from the top) with the input pinned in a 48 px header,
   scopes All / Projects / Folders / Navigation / Actions (also typed as p; f; n; a;), Tab to ask AI, and a keyboard footer.
   Kept: the fixed frame, pinned input, scopes, prefixes, Tab to ask AI, bold matches.
   Changed, with the reason:
   - Empty query shows Recent projects and Quick actions instead of a blank panel (recognition over recall, Nielsen #6).
   - Only real matches are listed, ranked title-prefix > word-start > anywhere; Clueso pads every query with 5 projects,
     even "xyzq" (NN/g search results: relevance first; an honest no-results page with next steps).
   - At most 5 rows per group in All, with "Show all N" (Hick's law; the panel never grows past its frame).
   - Groups are ordered by their best match instead of always Navigation first.
   - Every bolded result shows why it matched; old names (Chats, MCP, Styles) find their new home.
   - Scopes are visible tabs with counts, not a dropdown (visibility of options, Nielsen #6). */
const SCOPES = [["all", "All"], ["projects", "Projects"], ["pages", "Pages"], ["actions", "Actions"]];
const PREFIX = { "p;": "projects", "n;": "pages", "a;": "actions" };
function searchIndex() {
  const projs = [
    ...PROJECTS.map(p => ({ g: "projects", t: p.name, s: `${p.type} · edited ${p.mod}`, ic: "video", go: "/project/" + p.id, mod: p.mod })),
    ...PROJECTS.flatMap(p => p.versions.map(v => ({ g: "projects", t: v.name, s: `${v.lang} version of ${p.name}`, ic: "translate", go: "/project/" + v.id, mod: v.mod }))),
    ...PROJECTS.flatMap(p => p.madeFrom.map(m => ({ g: "projects", t: m.name, s: `${m.kind}, made from ${p.name}`, ic: "sparkle", go: "/project/" + m.id, mod: m.mod }))),
    ...(S.folders || []).map(f => ({ g: "projects", t: f, s: `Folder · ${PROJECTS.filter(p => p.folder === f).length} projects`, ic: "folder", go: "/projects/" + encodeURIComponent(f), mod: "folder" })),
  ];
  const pg = (t, s, ic, go, kw = "") => ({ g: "pages", t, s, ic, go, kw });
  const pages = [
    pg("Home", "Start a new video", "home", "/home", "create new video"),
    pg("Projects", "All your videos and articles", "folder", "/projects", "videos guides articles folders"),
    pg("Chats", "Your conversations with Clueso AI, what each made and its credits", "chat", "/chats", "clueso ai chat history tasks agent director conversations"),
    pg("Analytics", "Views and drop-off across all videos", "analytics", "/analytics", "insights views performance"),
    pg("Clueprints", "Recipes for a whole video: look, pacing, voice and structure", "clueprint", "/clueprints", "styles blueprints templates recipes library"),
    pg("Brand kit", "Logo, colors, fonts and tone", "brand", "/brand-kit", "branding visual style library"),
    pg("Integrations", "Chrome extension, MCP for Claude, ChatGPT and Cursor, GitHub", "mcp", "/integrations", "connections developer"),
    pg("Profile", "Settings · account", "users", "/settings/profile", "account name email"),
    pg("General", "Settings · workspace", "settings", "/settings/general", "workspace"),
    pg("Members", "Settings · invite your team", "users", "/settings/members", "team seats invite"),
    pg("Plan and usage", "Settings · credits, minutes and billing", "coin", "/settings/plan-and-usage", "upgrade pricing subscription"),
    pg("Video defaults", "Settings · AI script, voiceover, click highlights and default voices", "video", "/settings/video-defaults", "cuts"),
    pg("Language and voice", "Settings · pronunciation, transcription keywords, glossary", "translate", "/settings/language-and-voice", "translation dictionary"),
    pg("Player and links", "Settings · sharing", "link", "/settings/player-and-links", "share embed player"),
  ];
  const ac = (t, s, ic, attrs, kw = "") => ({ g: "actions", t, s, ic, attrs, kw });
  const actions = [
    ...CREATE.filter(o => !o.menuOnly).map(o => ac(o.label, o.desc, o.ic, `data-act="create" data-k="${o.k}"`, o.k === "translate" ? "new language dub" : "new")),
    ac("Invite a teammate", "Free includes 1 seat", "users", 'data-act="invite"', "team member"),
    ac("Ask Clueso AI", "Opens the assistant", "sparkle", 'data-act="cmdkopenai"', "help chat"),
  ];
  return [...projs, ...pages, ...actions];
}
// Score one item: every query word must match the title, subtitle or keywords.
function scoreItem(it, words) {
  let total = 0;
  for (const w of words) {
    const t = it.t.toLowerCase(), s = (it.s || "").toLowerCase(), k = (it.kw || "").toLowerCase();
    const wordStart = (str) => new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(str);
    const inner = w.length >= 3; // 1–2 letters only match the start of a word; mid-word hits on "ta" are noise
    let sc = t.startsWith(w) ? 100 : wordStart(t) ? 80 : inner && t.includes(w) ? 60 : wordStart(s) || wordStart(k) ? 40 : inner && (s.includes(w) || k.includes(w)) ? 20 : 0;
    if (!sc) return 0; total += sc;
  }
  return total;
}
function hl(text, words) {
  if (!words.length) return esc(text);
  const re = new RegExp("(" + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return text.split(re).map((part, i) => i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)).join("");
}
function cmdk() {
  dialog(`<div class="shd"><span class="sic">${icon("search")}</span>
      <input id="cq" role="combobox" aria-expanded="true" aria-controls="cres" aria-autocomplete="list" aria-label="Search projects, pages and actions" placeholder="Search projects, pages and actions" autocomplete="off" spellcheck="false">
      <button class="saskai" data-act="cmdkai" title="Ask Clueso AI">Ask AI <span class="kbd">Tab</span></button></div>
    <div class="sscopes" role="tablist" aria-label="Search in"></div>
    <div class="sbody" id="cres" role="listbox" aria-label="Results"></div>
    <div class="sft" aria-hidden="true"><span><span class="kbd">↑</span><span class="kbd">↓</span>Move</span><span><span class="kbd">↵</span>Open</span><span><span class="kbd">Tab</span>Ask AI</span><span><span class="kbd">Esc</span>Close</span><span class="grow"></span><span>Type <b>p;</b> <b>n;</b> or <b>a;</b> to narrow</span></div>
    <span class="sr" aria-live="polite" id="cstat"></span>`, "search");
  const scrim = $(".scrim"); scrim.classList.add("sk");
  const idx = searchIndex(); const i = $("#cq"); let scope = "all", active = 0, q = "";
  const rowsEl = () => [...document.querySelectorAll("#cres [role=option]")];
  const setActive = n => { const r = rowsEl(); if (!r.length) return; active = (n + r.length) % r.length; r.forEach((x, k) => x.setAttribute("aria-selected", k === active)); i.setAttribute("aria-activedescendant", r[active].id); r[active].scrollIntoView({ block: "nearest" }); };
  const row = (it, words, n) => `<button class="srow" role="option" id="sr${n}" aria-selected="false" ${it.go ? `data-go="${it.go}"` : it.attrs}>
      <span class="sri">${icon(it.ic)}</span><span class="srt"><b>${hl(it.t, words)}</b>${it.s ? `<span>${hl(it.s, words)}</span>` : ""}</span><span class="sent">${icon("chevRight")}</span></button>`;
  const draw = () => {
    let raw = i.value; const pre = Object.keys(PREFIX).find(p => raw.toLowerCase().startsWith(p));
    if (pre) { scope = PREFIX[pre]; i.value = raw = raw.slice(pre.length).trimStart(); }
    q = raw.trim().toLowerCase(); const words = q.split(/\s+/).filter(Boolean);
    let groups = [], n = 0, count = 0;
    if (!words.length) {
      const recent = idx.filter(x => x.g === "projects" && x.mod !== "folder" && !/version of|made from/.test(x.s)).slice(0, 3);
      const quick = idx.filter(x => x.g === "actions").slice(0, 4);
      const pages = idx.filter(x => x.g === "pages");
      if (scope === "all") groups = [["Recent projects", recent, 0], ["Quick actions", quick, 0]];
      else groups = [[SCOPES.find(s => s[0] === scope)[1], scope === "projects" ? idx.filter(x => x.g === "projects") : scope === "pages" ? pages : idx.filter(x => x.g === "actions"), 0]];
    } else {
      const scored = idx.map(it => ({ it, sc: scoreItem(it, words) })).filter(x => x.sc).sort((a, b) => b.sc - a.sc);
      const by = g => scored.filter(x => x.it.g === g);
      const counts = { projects: by("projects").length, pages: by("pages").length, actions: by("actions").length };
      count = scope === "all" ? scored.length : counts[scope];
      $(".sscopes").innerHTML = SCOPES.map(([k, l]) => `<button role="tab" aria-selected="${scope === k}" data-scope="${k}">${l}${k === "all" ? "" : ` <span>${counts[k]}</span>`}</button>`).join("");
      const order = ["projects", "pages", "actions"].filter(g => counts[g]).sort((a, b) => by(b)[0].sc - by(a)[0].sc);
      const label = { projects: "Projects", pages: "Pages", actions: "Actions" };
      groups = (scope === "all" ? order : [scope]).map(g => [label[g], by(g).map(x => x.it), scope === "all" ? 5 : 0, g]);
    }
    if (!words.length) $(".sscopes").innerHTML = SCOPES.map(([k, l]) => `<button role="tab" aria-selected="${scope === k}" data-scope="${k}">${l}</button>`).join("");
    let html = groups.filter(g => g[1].length).map(([lab, items, cap, g]) => {
      const shown = cap ? items.slice(0, cap) : items;
      return `<div role="group" aria-label="${lab}"><div class="slab">${lab}</div>${shown.map(it => row(it, words, n++)).join("")}${cap && items.length > cap ? `<button class="srow more" role="option" id="sr${n++}" aria-selected="false" data-scope="${g}"><span class="sri">${icon("dots")}</span><span class="srt"><b>Show all ${items.length} ${lab.toLowerCase()}</b></span></button>` : ""}</div>`;
    }).join("");
    if (!html) html = `<div class="sempty"><b>No results for “${esc(raw.trim())}”${scope !== "all" ? ` in ${SCOPES.find(s => s[0] === scope)[1]}` : ""}</b><span>Check the spelling, try a shorter word${scope !== "all" ? ", or search All" : ""}.</span></div>
      <div role="group" aria-label="Next steps">
        <button class="srow" role="option" id="sr${n++}" aria-selected="false" data-act="cmdkai"><span class="sri">${icon("sparkle")}</span><span class="srt"><b>Ask Clueso AI about “${esc(raw.trim())}”</b><span>It can answer questions and find things by meaning</span></span><span class="kbd">Tab</span></button>
        <button class="srow" role="option" id="sr${n++}" aria-selected="false" data-act="cmdkcreate"><span class="sri">${icon("plus")}</span><span class="srt"><b>Create a video about “${esc(raw.trim())}”</b><span>Puts it in the prompt on Home</span></span></button>
        ${scope !== "all" ? `<button class="srow" role="option" id="sr${n++}" aria-selected="false" data-scope="all"><span class="sri">${icon("search")}</span><span class="srt"><b>Search All instead</b></span></button>` : ""}</div>`;
    $("#cres").innerHTML = html;
    $("#cstat").textContent = words.length ? (count ? `${count} result${count > 1 ? "s" : ""}` : "No results") : "";
    setActive(0);
  };
  const setScope = s => { scope = s; draw(); i.focus(); };
  scrim.addEventListener("click", e => { const sc = e.target.closest("[data-scope]"); if (sc) { e.stopPropagation(); setScope(sc.dataset.scope); } }, true);
  scrim.addEventListener("mousemove", e => { const r = e.target.closest("[role=option]"); if (r) { const k = rowsEl().indexOf(r); if (k !== active) setActive(k); } });
  i.addEventListener("input", draw);
  i.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); const r = rowsEl()[active]; if (r) r.click(); }
    else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); askAI(i.value.trim()); }
    else if (e.key === "Backspace" && !i.value && scope !== "all") { setScope("all"); }
  });
  draw(); i.focus();
}
function askAI(q) {
  closeLayers(); S.ai = true; render();
  const ta = $(".aipanel textarea"); if (ta) { ta.value = q; ta.focus(); }
}

/* ---------- fix layer ---------- */
// The prototype's own improvements bar. It can be dragged by its grip (or moved with arrow keys on the grip), minimized
// to a small pill, and remembers both in this browser. Double-click the grip to put it back in the corner.
function fixPrefs() { try { return JSON.parse(localStorage.getItem("clueso-proto-fixbar") || "{}"); } catch (e) { return {}; } }
function saveFixPrefs() { try { localStorage.setItem("clueso-proto-fixbar", JSON.stringify({ pos: S.fixPos || null, min: !!S.fixMin })); } catch (e) {} }
const GRIP = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></g></svg>`;
function placeFixbar(bar) {
  if (S.fixPos && !S.fixMin) {
    const w = bar.offsetWidth, h = bar.offsetHeight;
    const x = Math.min(Math.max(8, S.fixPos.x), innerWidth - w - 8), y = Math.min(Math.max(8, S.fixPos.y), innerHeight - h - 8);
    Object.assign(bar.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
  } else { const ap = $("#aipanel"); const r = ap && !ap.classList.contains("v-full") ? ap.getBoundingClientRect() : null;
    Object.assign(bar.style, { left: "", top: "", right: r && r.left > innerWidth / 2 ? (innerWidth - r.left + 8) + "px" : "", bottom: "" }); } // stay clear of the Clueso AI panel
  const l = $(".fixlist"); if (l) { const r = bar.getBoundingClientRect(); const lw = l.offsetWidth;
    const below = r.top < innerHeight / 2;
    Object.assign(l.style, { left: Math.min(Math.max(8, r.right - lw), innerWidth - lw - 8) + "px", right: "auto", top: below ? (r.bottom + 8) + "px" : "auto", bottom: below ? "auto" : (innerHeight - r.top + 8) + "px" }); }
}
function wireFixGrip(bar) {
  const g = bar.querySelector(".fixgrip"); if (!g) return;
  g.addEventListener("pointerdown", e => {
    e.preventDefault(); g.setPointerCapture(e.pointerId); const r = bar.getBoundingClientRect(); const dx = e.clientX - r.left, dy = e.clientY - r.top;
    bar.classList.add("dragging");
    const move = ev => { S.fixPos = { x: ev.clientX - dx, y: ev.clientY - dy }; placeFixbar(bar); };
    const up = () => { g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up); bar.classList.remove("dragging"); saveFixPrefs(); };
    g.addEventListener("pointermove", move); g.addEventListener("pointerup", up);
  });
  g.addEventListener("dblclick", () => { S.fixPos = null; placeFixbar(bar); saveFixPrefs(); });
  g.addEventListener("keydown", e => {
    const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key]; if (!d) return;
    e.preventDefault(); const r = bar.getBoundingClientRect(); S.fixPos = { x: r.left + d[0], y: r.top + d[1] }; placeFixbar(bar); saveFixPrefs();
  });
}
// Review mode: the improvements bar, its numbered markers and list, and the follow-up emails page are for design reviews.
// They show on this computer (localhost) and on any URL with ?review=1. The deployed site (GitHub Pages) shows the product
// with one small "Viewing as" switcher, so people trying it can see the visitor, new-user and returning-user states.
const REVIEW = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]review=1\b/.test(location.search);
const SCENARIOS = [["visitor", "Visitor"], ["new", "New user"], ["returning", "Returning user"]];
const curScenario = () => S.guest ? "visitor" : S.scenario === "returning" ? "returning" : "new";
function fixLayer(key) {
  if (!REVIEW) { // the deployed site: a single "Viewing as" button, nothing else
    S.showFix = false; document.body.classList.remove("showfix"); document.querySelectorAll(".fixlist").forEach(x => x.remove());
    let bar = $(".fixbar"); if (!bar) { bar = document.createElement("div"); bar.className = "fixbar demo"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Prototype"); document.body.appendChild(bar); }
    const cur = SCENARIOS.find(x => x[0] === curScenario());
    bar.innerHTML = `<button data-act="demomenu" aria-haspopup="menu" title="Prototype: switch between a visitor, a new user and a returning user">Viewing as: ${cur[1]}${icon("chevDown")}</button>`;
    return;
  }
  const list = FIXES[key] || [];
  if (S.fixPos === undefined) { const p = fixPrefs(); S.fixPos = p.pos || null; S.fixMin = !!p.min; }
  document.body.classList.toggle("showfix", S.showFix);
  let bar = $(".fixbar"); if (!bar) { bar = document.createElement("div"); bar.className = "fixbar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Prototype improvements"); document.body.appendChild(bar); }
  bar.classList.toggle("min", !!S.fixMin);
  const grip = `<button class="fixgrip" aria-label="Move the improvements bar (drag, or use arrow keys; double-click to reset)" title="Drag to move · double-click to reset">${GRIP}</button>`;
  bar.innerHTML = S.fixMin
    ? `<button class="fixpill" data-act="fixmin" aria-label="Show the improvements bar, ${list.length} improvements on this screen" title="${list.length} improvements on this screen · click to show">${list.length}</button>`
    : `${grip}<span>Redesign prototype · ${list.length} improvements on this screen</span><span class="fixsc" role="group" aria-label="Scenario">${[["visitor", "Visitor"], ["new", "New user"], ["returning", "Returning"]].map(([k, l]) => `<button data-act="scenario" data-k="${k}" aria-pressed="${k === "visitor" ? !!S.guest : !S.guest && S.scenario === k}" class="${(k === "visitor" ? S.guest : !S.guest && S.scenario === k) ? "on" : ""}">${l}</button>`).join("")}</span><button class="${S.showFix ? "on" : ""}" data-act="togglefix">${S.showFix ? "Hide" : "Show"} improvements</button><button data-act="fixlist">${S.fixList ? "Close list" : "List"}</button><button data-go="/emails" title="Follow-up emails (review page)">Emails</button><button class="fixx" data-act="fixmin" aria-label="Minimize the improvements bar" title="Minimize">${icon("chevDown")}</button>`;
  document.querySelectorAll(".fixlist").forEach(x => x.remove());
  if (S.fixList && !S.fixMin) { const l = document.createElement("div"); l.className = "fixlist"; l.innerHTML = `<h4>What changed on this screen, and why</h4><ol>${list.map(([t, ids, ev]) => `<li>${t}<br><span>Findings ${ids}</span>${ev ? `<div class="ev">${ev}</div>` : ""}</li>`).join("")}</ol>`; document.body.appendChild(l); }
  wireFixGrip(bar); placeFixbar(bar);
}

function markCancelled(id, cr) {
  const p = PROJECTS.find(x => x.id === id); if (p) { p.cancelled = { cr }; p.dur = "—"; p.mod = "just now"; }
  const ch = TASKS.find(x => x.pid === id); if (ch) { ch.st = "Cancelled"; ch.kind = "Build cancelled"; ch.cr = String(cr); }
}
/* ---------- floating panel ----------
   Floating is a window, not a second sidebar: shorter, bottom right, clear of the page toolbar, and draggable by its
   header. The position is remembered; double-click the header to put it back. */
function floatPos() { if (S.floatPos === undefined) { try { S.floatPos = JSON.parse(localStorage.getItem("clueso-proto-float") || "null"); } catch (e) { S.floatPos = null; } } return S.floatPos; }
function placeFloat() {
  const ap = $(".aipanel.v-float"); if (!ap) return; const pos = floatPos();
  if (!pos) { ap.style.left = ap.style.top = ap.style.right = ap.style.bottom = ""; return; }
  const r = ap.getBoundingClientRect(); const x = Math.min(Math.max(8, pos.x), innerWidth - r.width - 8), y = Math.min(Math.max(52, pos.y), innerHeight - r.height - 8);
  Object.assign(ap.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
}
document.addEventListener("pointerdown", e => {
  const head = e.target.closest(".aipanel.v-float .ah"); if (!head || e.target.closest("button, input, a")) return;
  const ap = head.closest(".aipanel"); const r = ap.getBoundingClientRect(); const dx = e.clientX - r.left, dy = e.clientY - r.top;
  const move = ev => { S.floatPos = { x: ev.clientX - dx, y: ev.clientY - dy }; placeFloat(); };
  const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); try { localStorage.setItem("clueso-proto-float", JSON.stringify(S.floatPos)); } catch (er) {} };
  addEventListener("pointermove", move); addEventListener("pointerup", up); e.preventDefault();
});
document.addEventListener("dblclick", e => { if (!e.target.closest(".aipanel.v-float .ah") || e.target.closest("button")) return; S.floatPos = null; try { localStorage.removeItem("clueso-proto-float"); } catch (er) {} placeFloat(); });
let wasPhone = isPhone();
addEventListener("resize", () => { placeFloat(); placeCoach(); if (isPhone() !== wasPhone) { wasPhone = isPhone(); S.navopen = false; closeLayers(); render(); } });

/* ---------- render ---------- */
let genTimer = null;
let lastPage = null, lastAi = false, lastAiBody = false;
function render() {
  saveProgress(); saveWorkSoon();
  const ab0 = document.querySelector(".abody"); const keepAiScroll = ab0 ? ab0.scrollTop : null;
  const canon = canonicalPath(); if (canon) { location.replace("#/" + canon); return; } // old link: the hashchange renders the new path
  const [r, a] = route(); let html, key = r;
  if (S.ai && NO_PANEL.includes(r)) S.ai = false;
  // One entry screen: Sign in, Sign up, SSO, an invite and links that need an account all open a box over the try screen
  const BOX = { signin: { kind: "signin", mode: "signin" }, signup: { kind: "signup" }, invite: { kind: "invite" } };
  if ((S.guest && NEEDS_ACCOUNT.includes(r)) || BOX[r] || r === "sso") {
    if (r === "invite" && !S.guest) { go("/home"); setTimeout(inviteSignedIn, 60); return; }
    if (BOX[r] || r === "sso") { if (!S.guest) return go("/home"); } else S.after = location.hash.replace(/^#/, "");
    if (r === "invite") S.invite = "taskly.io";
    const box = r === "sso" ? null : BOX[r] || { kind: "continue", mode: "signin" };
    if (!S.guest) { toEntry(); } go("/home"); setTimeout(() => box ? signupGate(box) : ssoBox(), 60); return; }
  else if (r === "emails") { if (!REVIEW) return go("/home"); html = vEmails(); } // a review page, not part of the product

  else if (r === "try") { if (!S.guest) toEntry(); return go("/home"); } // try Clueso before an account (value before commitment)
  else if (r === "welcome") { return go("/home"); }
  else if (r === "start") { return go("/home"); } // no onboarding wizard: the first Home visit is the onboarding
  else if (r === "projects") html = vProjects(a);
  else if (r === "project") html = vProject(a);
  else if (r === "edit") { key = "edit"; html = vEditor(a); }
  else if (r === "library") html = vLibrary(a);
  else if (r === "integrations") html = vIntegrations();
  else if (r === "agent") { return go("/chats"); }
  else if (r === "chats") html = vChats();
  else if (r === "analytics") html = vAnalytics(a);
  else if (r === "settings") html = vSettings(a);
  else { key = "create"; html = vCreate(); }
  document.title = ({ start: "Get started", signin: "Sign in", signup: "Sign up", sso: "Continue with SSO", emails: "Follow-up emails", create: "Home", projects: "Projects", project: "Project", edit: "Editor", library: a === "brand" ? "Brand kit" : "Clueprints", integrations: "Integrations", settings: "Settings", chats: "Chats", analytics: "Analytics" }[r] || "Home") + " · Clueso (redesign)";
  // Settings pages and folders get their own tab title, so tabs and history can be told apart (IA fix W7)
  if (r === "settings") document.title = `${SET_LABEL[S.setPage] || "Settings"} · Settings · Clueso (redesign)`;
  if (r === "projects" && a) document.title = `${decodeURIComponent(a)} · Projects · Clueso (redesign)`;
  $("#root").innerHTML = html;
  // Animate only when the feature changes (a new route or the AI panel opening), not on every re-render.
  const page = location.hash.split("?")[0];
  if (page !== lastPage) { const m = $(".main > *, .stage > main, .signin"); if (m) m.classList.add("arrive"); const n = $(".navitem.on"); if (n && lastPage !== null) n.classList.add("arrive"); }
  if (S.ai && !lastAi) { const ap = $(".aipanel"); if (ap) ap.classList.add("arrive"); }
  lastPage = page; lastAi = !!S.ai;
  fixLayer(ROUTE_FIX[key] || key); placeCoach();
  placeFloat();
  // The panel's starters sit next to the composer, so it opens scrolled to the bottom; re-renders keep the reader's place.
  if (S.ai) { const ab = $(".abody"); if (ab) ab.scrollTop = lastAiBody && keepAiScroll !== null ? keepAiScroll : ab.scrollHeight; }
  lastAiBody = S.ai;
  const at = $("#aititle");
  if (at) { const done = save => { if (save && at.value.trim()) { const c = chatById(curChatId()); if (c) c.t = at.value.trim(); } S.aiRenaming = false; render(); const b = $(".aititle"); if (b) b.focus(); };
    at.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); done(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); } });
    at.addEventListener("blur", () => { if (S.aiRenaming) done(true); }); }
  const aq = $("#aiq");
  if (aq) { aq.addEventListener("input", () => { S.aiDraft = aq.value; const sb = $('[data-act="aisend"]'); if (sb) sb.disabled = !aq.value.trim() || outOfCredits(); });
    aq.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const sb = $('[data-act="aisend"]'); if (sb && !sb.disabled) sb.click(); } }); }
  const chq = $("#chq");
  if (chq) chq.addEventListener("input", () => { S.chatQ = chq.value; const pos = chq.selectionStart; render(); const n = $("#chq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
  const pq = $("#pq");
  if (pq) pq.addEventListener("input", () => { S.projQ = pq.value; const pos = pq.selectionStart; render(); const n = $("#pq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
  const ta = $("#prompt");
  if (ta) {
    ta.addEventListener("input", () => { S.prompt = ta.value; const g = $(".psug"); if (g) g.hidden = !!ta.value; refreshPromptRow(); });
    ta.addEventListener("keydown", e => { if (e.key === "Tab" && !e.shiftKey && !ta.value && $(".psug")) { e.preventDefault(); ta.value = S.prompt = ghostSug(); const g = $(".psug"); if (g) g.hidden = true; refreshPromptRow(); ta.setSelectionRange(ta.value.length, ta.value.length); } });
    startGhost();
  } else { clearTimeout(ghostTimer); ghostRun++; }
}
function refreshPromptRow() {
  const has = S.prompt.trim();
  const c = $(".create .cost:not(.free)"); if (c) c.innerHTML = `${icon("coin")}${has ? `About ${costRange()} credits · ${credLeft().toLocaleString("en-US")} left` : credWords(credLeft())}`;
  const b = $(".create .sendbtn"); if (b) b.disabled = !S.prompt.trim();
}

document.addEventListener("dblclick", e => { const r = e.target.closest(".chatrow"); if (!r || innerWidth <= 900) return; S.chatId = r.dataset.id; setChatFocus(true); render(); const b = $(".fback"); if (b) b.focus(); });
let dropDepth = 0;
document.addEventListener("dragenter", e => { const z = e.target.closest && e.target.closest("[data-drop]"); if (!z) return; dropDepth++; z.classList.add("dragging"); });
document.addEventListener("dragleave", e => { const z = e.target.closest && e.target.closest("[data-drop]"); if (!z) return; if (--dropDepth <= 0) { dropDepth = 0; z.classList.remove("dragging"); } });
document.addEventListener("dragover", e => { if (e.target.closest && e.target.closest("[data-drop]")) e.preventDefault(); });
document.addEventListener("drop", e => { const z = e.target.closest && e.target.closest("[data-drop]"); if (!z) return; e.preventDefault(); dropDepth = 0; z.classList.remove("dragging"); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f && !/\.(mp4|mov|webm|wav|m4v|pdf|pptx?|key|docx?|png|jpe?g)$/i.test(f.name)) { toast(`Clueso can't use ${f.name.split(".").pop().toUpperCase()} files. Use a video (.mp4, .mov, .webm), slides (.pdf, .pptx), a document or an image`); return; } if (f && f.size > 2e9) { toast("That file is over 2 GB. Free plans take videos up to 10 minutes: trim it, or upload a shorter part"); return; } S.dropped = f ? f.name : "screen-recording.mp4"; openCreate("upload"); });
document.addEventListener("change", e => { if (e.target.id === "cffrom" || e.target.id === "cfto") { S.cf[e.target.id === "cffrom" ? "from" : "to"] = e.target.value; S.chatId = null; render(); cfReopen(); } });
document.addEventListener("click", e => {
  if (S.navopen && !e.target.closest(".side, [data-act=navopen]")) { S.navopen = false; render(); return; }
  if (e.target.closest("a[href]") && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; // let the browser open links in a new tab
  const g = e.target.closest("[data-go]"); const t = e.target.closest("[data-act]");
  if (t && t.dataset.act === "expand") { e.stopPropagation(); const id = t.dataset.id; S.expanded.has(id) ? S.expanded.delete(id) : S.expanded.add(id); return render(); }
  if (!t && g) { closeLayers(); return go(g.dataset.go); }
  if (!t) { if (!e.target.closest(".pop")) document.querySelectorAll(".pop").forEach(x => x.remove()); return; }
  const k = t.dataset.k, act = t.dataset.act;
  if (t.tagName === "A" && act !== "toggleLib") { /* normal nav */ }
  switch (act) {
    // Google's "Use another account" (prototype stand-in for Google's own screen): any email and name, verified, as Google accounts are
    case "ganother": { const g = $(".gpick"); if (!g) break; g.innerHTML = `<div class="gph">${icon("google")}<b>Sign in</b><span>to continue to Clueso</span></div><form class="gother" data-form="gother" data-k="${esc(k || "signin")}" novalidate>
      <label class="field" for="gaem">Email<input id="gaem" type="email" autocomplete="email" placeholder="name@company.com" aria-describedby="gaemErr"></label><p class="ferr" id="gaemErr" role="alert" hidden></p>
      <label class="field" for="gann">Name<input id="gann" autocomplete="name" placeholder="Sam Lee"></label>
      <div class="gfoot"><button type="button" class="btn ghost" data-act="google" data-k="${esc(k || "signin")}">Back</button><button class="btn dark" type="submit">Next</button></div></form>`; setTimeout(() => { const i = $("#gaem"); if (i) i.focus(); }, 0); break; }
    case "google": googleChooser(k); break;
    case "googlepick": closeLayers(); if (S.guest) { if (!S.pending && signInRestore(DEMO_ACCT.email, S.after)) break; finishGate("Alex", "Rivera", "alex.rivera@gmail.com", true); break; } if (k === "signup" || S.scenario === "new" && !PROJECTS.length) { newAccount("Alex", "Rivera", "alex.rivera@gmail.com", true); } else { go("/home"); toast("Welcome back"); } break; // Google gives us the name and a verified email
    case "signupemail": if (S.guest) signupGate({ kind: "signup" }); else go("/signup"); break; case "_oldsignupemail": applyScenario("new"); seeUpdates(); S.user.known = false; go("/home"); break; // an email sign-up doesn't
    case "scenario": if (k === "visitor") { try { localStorage.removeItem(HAD_KEY); } catch (e) {} closeLayers(); toEntry(); go("/try"); toast("Visitor: never signed in on this browser"); break; } applyScenario(k); closeLayers(); go("/home"); render(); toast(k === "new" ? "New user: empty workspace, first run" : "Returning user: projects and conversations"); break;
    case "vtypemenu": { const c = chatById(t.dataset.id); const cur = c.vtype || inferType(c.ask + " " + (c.answer || "")); popover(t, `<div class="lab">Make it</div>${Object.entries(VTYPES).map(([k2, l]) => `<button class="mi" role="menuitemradio" aria-checked="${k2 === cur}" data-act="vtypeset" data-id="${c.id}" data-k="${k2}"><span class="grow">${l.charAt(0).toUpperCase() + l.slice(1)}</span><span class="ck">${k2 === cur ? icon("check") : ""}</span></button>`).join("")}`); break; }
    case "vtypeset": { const c = chatById(t.dataset.id); c.vtype = k; closeLayers(); render(); break; }
    case "joininvite": closeLayers(); joinTeam("taskly.io"); render(); break;
    case "teamjoin": { const d = emailDom(); if (TEAMS[d]) { joinTeam(d); render(); } break; }
    case "teamno": { const t = teamForEmail(); S.teamOffer = "no"; render(); if (t) toast(`Kept in your own workspace. You can join ${t.name} from Settings`); break; }
    case "brandfromemail": { const nm = k.split(".")[0]; KITS.acme.name = nm.charAt(0).toUpperCase() + nm.slice(1); KITS.acme.logo = nm.charAt(0).toUpperCase(); S.brandUrl = k; S.brandSet = true; S.brandOn = true; S.checklist.brand = true; toast(`Logo and colours pulled from ${k}. Your next video uses them`); render(); break; }
    case "undrop": S.dropped = null; openCreate("upload"); break;
    case "tipok": S.tipProjects = "done"; render(); { const n = $('.side .navitem[data-label="Projects"]'); if (n && innerWidth > 760) n.focus(); } break;
    case "switchacct": signOut(); setTimeout(() => signupGate({ kind: "signin", mode: "signin" }), 80); break;
    case "forgotpw": dialog(dh("Reset your password", "We'll email you a link to set a new one.") + `<div class="db"><label class="field">Email address<input id="fpem" type="email" value="${esc(($("#em") || {}).value || "")}" placeholder="name@company.com"></label></div><div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn pink" data-act="fpsend">Send link</button></div>`); break;
    case "fpsend": { const em = ($("#fpem").value || "").trim(); if (!/@.+\./.test(em)) { toast("Enter your email address"); break; } closeLayers(); toast(`If there's an account for ${em}, a reset link is on its way`); break; }
    case "verifystrip": verifyDialog(null); break;
    case "resendverify": toast(`Sent again to ${S.user.email}. It can take a minute; check spam too`); break;
    case "changeemail": dialog(dh("Change your email", `It's ${esc(S.user.email)} now. We'll send the verification link to the new address. Your videos stay where they are.`) + `<form class="db gate" data-form="chemail" novalidate><label class="field" for="chem">New email address<input id="chem" type="email" autocomplete="email" placeholder="name@company.com" aria-describedby="chemErr"></label><p class="ferr" id="chemErr" role="alert" hidden></p><div class="gfoot"><button type="button" class="btn ghost" data-act="closedlg">Cancel</button><button class="btn pink" type="submit">Send link</button></div></form>`); setTimeout(() => { const i = $("#chem"); if (i) i.focus(); }, 0); break;
    case "verified": S.verified = true; closeLayers(); toast("Email verified"); render(); if (t.dataset.k === "share") shareDialog(t.dataset.id || null); break;
    case "frback": { const c = chatById(S.frChat); if (c) { S.prompt = c.ask; TASKS.splice(TASKS.indexOf(c), 1); } S.frChat = null; S.chatId = null; render(); const ta = $("#prompt"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } break; }
    case "watch": { const p = PROJECTS.find(x => x.id === t.dataset.id) || PROJECTS[0]; if (!p) break; const total = durSec(p.dur) || 60;
      dialog(`<div class="player" role="region" aria-label="Video player: ${esc(p.name)}"><div class="thumb ${p.th || "t-plum"} plv">${esc(p.label || p.name)}<span class="plcap" id="plcap">Let's walk through it, step by step.</span></div>
        <div class="plbar"><button class="iconbtn" data-act="plpause" id="plpp" aria-label="Pause">${icon("pause")}</button><div class="meter plm" role="progressbar" aria-label="Playback" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><i id="plfill" style="width:0"></i></div><span class="mut" id="pltime">0:00 / ${mmss(total)}</span><button class="btn ghost" data-act="closedlg">Close</button></div>
        <div class="plend" id="plend" hidden><b>That's your video</b><span>Share a link so your team can watch it, or open the editor to change anything.</span><span class="sact"><a class="btn" href="#/edit/${p.id}" data-act="closedlg">Open editor</a><button class="btn pink" data-act="share">${icon("link")}Share link</button></span></div></div>`);
      S.watched = true; let s = 0; const caps = ["Let's walk through it, step by step.", "First, here's where you start.", "Then do the main task, like this.", "That's it. You're ready."]; clearInterval(window.plT); window.plPaused = false;
      window.plT = setInterval(() => { if (window.plPaused) return; const f = $("#plfill"); if (!f) return clearInterval(window.plT); s = Math.min(total, s + total / 20); f.style.width = s / total * 100 + "%"; f.parentElement.setAttribute("aria-valuenow", Math.round(s)); $("#pltime").textContent = mmss(Math.round(s)) + " / " + mmss(total); $("#plcap").textContent = caps[Math.min(3, Math.floor(s / total * 4))]; if (s >= total) { clearInterval(window.plT); $("#plend").hidden = false; const b = $("#plend .btn.pink"); if (b) b.focus(); } }, 250); break; }
    case "plpause": { window.plPaused = !window.plPaused; t.innerHTML = icon(window.plPaused ? "play" : "pause"); t.setAttribute("aria-label", window.plPaused ? "Play" : "Pause"); break; }
    case "gate": signupGate({ kind: k || "signup" }); break;
    case "gatesignin": signupGate({ kind: "signin", mode: "signin" }); break;
    // Go back from SSO returns to where it was opened: the sign-up box (reopened, brief and plan kept) or the previous page
    case "signout": signOut(); break;
    case "ssoback": signupGate(S.pending || { kind: "signin", mode: "signin" }); break;
    case "ssohandoff": ssoBox(); break;
    case "gatemode": signupGate({ ...(S.pending || {}), mode: k }); break;
    case "gategoogle": googleChooser("signup"); break; // the box's brief, plan and pending build are kept in S.pending
    case "readscript": { const p = PROJECTS.find(x => x.id === t.dataset.id); const g = S.generating; const n = (p && (p.label || p.name).split(" ").slice(0, 3).join(" ")) || "your product";
      dialog(dh("The script", "Written from your brief. You can change any line in the editor once the video is built.") + `<div class="db"><ol class="scriptlist">${SCRIPT(n).map(([h, l], i) => `<li><b>${i + 1} · ${h}</b><span>${esc(l)}</span>${g && i < g.step ? `<button class="linkbtn" data-act="watchscene" data-id="${p.id}" data-i="${i}">${icon("play")}Watch</button>` : `<span class="mut">${g ? "Building" : ""}</span>`}</li>`).join("")}</ol></div><div class="df"><button class="btn" data-act="closedlg">Close</button></div>`); break; }
    case "watchscene": { const p = PROJECTS.find(x => x.id === t.dataset.id); const i = +t.dataset.i; const nm = ["Hook", "Meet the product", "Create and assign", "Track progress", "Stay in sync", "Outro"][i]; const line = SCRIPT((p.label || p.name).split(" ").slice(0, 3).join(" "))[i][1]; S.sawScene = true;
      dialog(`<div class="player"><div class="thumb ${p.th || "t-plum"} plv">${esc(nm)}<span class="plcap">${esc(line)}</span></div><div class="plbar"><div class="meter plm" role="progressbar" aria-label="Scene ${i + 1} playback" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0"><i id="plfill" style="width:0"></i></div><span class="mut" id="pltime">0:00 / 0:08</span><button class="btn ghost" data-act="closedlg">Close</button></div>
        <div class="plend" id="plend" hidden><b>Scene ${i + 1} of 6</b><span>${S.generating && S.generating.step < 6 ? "The rest is on its way. We'll show the whole video when it's done." : "The whole video is ready."}</span><span class="sact">${S.generating && i + 1 < S.generating.step ? `<button class="btn" data-act="watchscene" data-id="${p.id}" data-i="${i + 1}">${icon("play")}Next scene</button>` : ""}<button class="btn pink" data-act="closedlg">Back to the build</button></span></div></div>`);
      clearInterval(window.plT); let s = 0; window.plT = setInterval(() => { const f = $("#plfill"); if (!f) return clearInterval(window.plT); s = Math.min(8, s + 0.4); f.style.width = s / 8 * 100 + "%"; $("#pltime").textContent = mmss(Math.round(s)) + " / 0:08"; if (s >= 8) { clearInterval(window.plT); $("#plend").hidden = false; const b = $("#plend .btn.pink"); if (b) b.focus(); } }, 120); break; }
    case "starter": { const j = JOBS.find(x => x.k === k); S.prompt = S.prompt === j.brief ? "" : j.brief; S.goals = new Set([k]); render(); const ta = $("#prompt"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } break; }
    case "recordlater": if (S.guest) { signupGate({ kind: "recordlater" }); break; } toast(`We emailed ${S.user.email} a link to record on your computer`); break; // a guest has no email to send it to yet
    case "askmake": S.askedMake = true; if (k) { S.goals = new Set([k]); toast("Thanks. Your suggestions now follow it"); } render(); break;
    case "stexplore": { if (!PROJECTS.some(p => p.id === "sample")) PROJECTS.push({ id: "sample", name: "Sample: Taskly product demo", type: "Sample", th: "t-plum", label: "Work is everywhere.", dur: "0:57", mod: "just now", created: "just now", chat: null, article: true, versions: [], madeFrom: [], sample: true }); S.firstRun = true; go("/edit/sample"); break; }
    case "hidehow": S.firstRun = false; render(); break;
    case "back": history.back(); break;
    case "fetchbrand2": S.brandSet = true; S.brandOn = true; S.checklist.brand = true; toast("Brand pulled from acme.io"); render(); break;
    case "collapse": {
      if (innerWidth <= 760) { S.navopen = false; render(); break; }
      // Animate the existing sidebar instead of re-rendering, so the width eases like Clueso's (350 ms) and focus stays on the button.
      S.collapsed = !S.collapsed; const app = $(".app"); app.classList.add("anim"); app.classList.toggle("collapsed", S.collapsed);
      const l = S.collapsed ? "Expand sidebar" : "Collapse sidebar"; t.setAttribute("aria-label", l); t.title = l;
      clearTimeout(window.__colT); window.__colT = setTimeout(() => app.classList.remove("anim"), 380); break; }
    case "navopen": S.navopen = true; render(); { const f = $(".side .phsearch"); if (f) f.focus(); } break;
    case "phchat": e.preventDefault(); S.navopen = false; S.chatId = t.dataset.id; S.chatFocus = false; if (route()[0] === "chats") render(); else go("/chats"); break;
    case "ai": e.preventDefault(); S.ai = !S.ai; if (!S.ai && S.aiView === "full") S.aiView = S.aiPrev || aiViewDefault(); render(); if (S.ai) aiFocusComposer(); else { const b = $("#aibtn"); if (b) b.focus(); } break;
    case "aiviewmenu": { const v = aiView(); popover(t, AI_VIEWS.filter(x => x[0] !== "full").map(([k, l, d, ic]) => `<button class="mi mi2" role="menuitemradio" aria-checked="${v === k}" data-act="aiview" data-k="${k}"><span class="ck">${v === k ? icon("check") : ""}</span>${icon(ic)}<span class="mt"><span>${l}</span><small>${d}</small></span></button>`).join("") + `<div class="sep"></div><button class="mi mi2" data-act="aiopenpage"><span class="ck"></span>${icon("fullscreen")}<span class="mt"><span>Full screen</span><small>Opens this conversation on the Chats page</small></span></button>`, "right"); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break; }
    // In the editor, as live: past chats sit behind Chat history, and New chat starts over.
    case "aihist": popover(t, `<div class="lab">Recent chats</div>${TASKS.slice(0, 6).map(c => `<button class="mi" data-act="openchat" data-id="${c.id}">${icon("sparkle")}<span class="desc">${esc(c.t)}<span>${agoLong(c.at)}</span></span></button>`).join("")}<div class="sep"></div><button class="mi" data-go="/chats">${icon("chat")}All chats</button>`, "right"); { const f = $(".pop .mi"); if (f) f.focus(); } break;
    case "ainew": S.pChat = null; S.aiDraft = ""; render(); aiFocusComposer(); break;
    case "aiopenpage": S.ai = false; if (S.pChat) S.chatId = S.pChat; go("/chats"); break;
    case "chatlist": S.chatId = null; S.chatListOnly = true; render(); { const f = $(".chatrow"); if (f) f.focus(); } break;
    case "aiview": setAiView(k); closeLayers(); render(); aiFocusComposer(); break;
    case "aichip": { const c = aiChips(aiContext())[+t.dataset.i]; if (c.ask) { S.aiDraft = c.t; render(); aiFocusComposer(); }
      else if (c.go) { go(c.go); }
      else if (c.act === "genarticle") { const ctx = aiContext(); if (ctx.p) ctx.p.article = true; S.credits.used += 30; toast("Writing the article"); render(); }
      else if (c.act === "create") { openCreate(c.k); }
      break; }
    case "aiadd": popover(t, `<div class="lab">Add to the conversation</div><button class="mi" data-act="create" data-k="record">${icon("record")}Record your screen</button><button class="mi" data-act="aiattach" data-k="file">${icon("upload")}Attach files</button><button class="mi" data-act="aiattach" data-k="project">${icon("video")}Add a project</button><button class="mi" data-act="aiattach" data-k="clueprint">${icon("clueprint")}Add a Clueprint</button>`); { const f = $(".pop .mi"); if (f) f.focus(); } break;
    case "aiattach": { S.aiAttach = S.aiAttach || []; S.aiAttach.push(k === "file" ? { t: "taskly-walkthrough.mp4", ic: "upload" } : k === "project" ? { t: PROJECTS[1].name, ic: "video" } : { t: STYLES[0][0], ic: "clueprint" }); closeLayers(); render(); aiFocusComposer(); break; }
    case "anrange": if (k === "custom") { const d = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; const td = AN_TODAY, f = anDay(29); popover(t, `<div class="lab">Custom range</div><div class="anpick"><label>From<input type="date" id="anfrom" value="${S.anFrom || d(f)}" max="${d(td)}"></label><label>To<input type="date" id="anto" value="${S.anTo || d(td)}" max="${d(td)}"></label><span class="mut" style="font-size:11px">Data runs up to today, ${anFmt(td)}.</span><button class="btn dark" data-act="anapply">Apply</button></div>`, "right"); break; } S.anRange = k; render(); break;
    case "anapply": { const f = $("#anfrom").value, to = $("#anto").value; if (!f || !to) { toast("Pick both dates"); break; } const [a1, b1] = f <= to ? [f, to] : [to, f]; S.anFrom = a1; S.anTo = b1; S.anRange = "custom"; closeLayers(); render(); break; }
    case "ansort": { const so = S.anSort || { k: "imp", dir: -1 }; S.anSort = so.k === k ? { k, dir: -so.dir } : { k, dir: k === "n" ? 1 : -1 }; render(); { const b = document.querySelector(`[data-act="ansort"][data-k="${k}"]`); if (b) b.focus(); } break; }
    case "aimore": S.aiMore = true; render(); { const b = document.querySelectorAll(".aigroups .aichip")[1]; if (b) b.focus(); } break;
    case "aireattach": S.aiNoCtx = false; render(); aiFocusComposer(); break;
    case "aidetach": { if (t.dataset.i === "ctx") S.aiNoCtx = true; else (S.aiAttach || []).splice(+t.dataset.i, 1); render(); aiFocusComposer(); break; }
    case "aiquality": case "quality": case "model": popover(t, modelMenu(), t.closest(".aipanel, .chatmain") ? "right" : "left"); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "setmodel": { S.model = k; try { localStorage.setItem("clueso-proto-model", k); } catch (e) {} const inAI = !!$("#aiq"); closeLayers(); render(); refreshPromptRow && $("#prompt") && refreshPromptRow(); if (inAI) aiFocusComposer(); else { const b = $('[data-act="model"]'); if (b) b.focus(); } break; }
    case "aicheckin": popover(t, `<div class="lab">Check in with me</div>${CHECKIN.map(([m, l, d]) => `<button class="mi mi2" role="menuitemradio" aria-checked="${S.mode === m}" data-act="aisetmode" data-k="${m}"><span class="ck">${S.mode === m ? icon("check") : ""}</span><span class="mt"><span>${m} · ${l.toLowerCase()}</span><small>${d}</small></span></button>`).join("")}<div class="sep"></div><div class="lab" style="text-transform:none;letter-spacing:0">Builds always show the cost before they start.</div>`); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "aisetmode": S.mode = k; closeLayers(); render(); aiFocusComposer(); break;
    case "airename": S.aiRenaming = true; render(); { const i = $("#aititle"); if (i) { i.focus(); i.select(); } } break;
    case "aisend": { const v = (($("#aiq") || {}).value || "").trim(); if (!v) break; const c = curChatId() && chatById(curChatId());
      if (c) { if (c.q && !c.answer) { answerChat(c, v); } else { (c.extra = c.extra || []).push(v); touch(c); S.credits.used += replyCr(); } S.aiDraft = ""; render(); aiFocusComposer(); } else startChat(v, route()[0] !== "chats"); break; }
    case "openchat": openChat(t.dataset.id); break;
    case "aiback": S.pChat = null; render(); aiFocusComposer(); break;
    case "ainewchat": S.pChat = null; S.ai = true; render(); aiFocusComposer(); break;
    case "aiplanopts": S.planOpen = !S.planOpen; render(); { const b = $('[data-act="aiplanopts"]'); if (b) b.focus(); } break;
    case "aieditbrief": { const c = chatById(curChatId()); TASKS.splice(TASKS.indexOf(c), 1); setCurChat(null); if (onChatsPage()) { S.prompt = c.ask; go("/home"); break; } S.aiDraft = c.ask; render(); aiFocusComposer(); break; }
    case "aibuild": { if (S.guest) { signupGate({ kind: "build", chat: curChatId() }); break; } if (!canBuild()) break; const c = chatById(curChatId()); const brief = c.q && c.answer ? c.answer : c.ask; S.prompt = brief; startBuild("new", brief, c.id); break; } // a vague first brief builds from the answer
    case "ainew": S.aiTitle = null; S.aiSent = null; S.aiAttach = []; S.aiNoCtx = false; render(); aiFocusComposer(); break;
    case "newmenu": popover(t, createMenu(), "right"); break;
    case "attach": if (firstRun()) { popover(t, `<div class="lab">Add to your brief</div><button class="mi" data-act="create" data-k="record">${icon("record")}Record your screen</button><button class="mi" data-act="create" data-k="upload">${icon("upload")}Attach a file<small>A recording, slides or a document</small></button>`); { const f = $(".pop .mi"); if (f) f.focus(); } break; }
      popover(t, `<div class="lab">Add to your brief</div><button class="mi" data-act="create" data-k="record">${icon("record")}Record your screen</button><button class="mi" data-act="toast" data-m="File picker">${icon("upload")}Attach files<small>Videos, slides, documents</small></button><button class="mi" data-act="toast" data-m="Project picker">${icon("folder")}Add a project</button><button class="mi" data-act="libgo">${icon("clueprint")}Add a Clueprint</button>`); { const f = $(".pop .mi"); if (f) f.focus(); } break;
    case "libgo": go("/clueprints"); closeLayers(); break;
    case "mode": popover(t, `<div class="lab">Check in with me</div>${CHECKIN.map(([m, l, d]) => `<button class="mi mi2" role="menuitemradio" aria-checked="${S.mode === m}" data-act="setmode" data-m2="${m}"><span class="ck">${S.mode === m ? icon("check") : ""}</span><span class="mt"><span>${m}</span><small>${d}${m === "Auto" ? ". Builds as soon as you send, at the cost shown" : ""}</small></span></button>`).join("")}`); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "planopts": planDialog(!$(".optbox")); break;
    case "setmode": S.mode = t.dataset.m2; if ($(".scrim")) planDialog(true); else { closeLayers(); render(); } break;
    case "brandchip": popover(t, `<div class="lab">Brand for this video</div>
      ${[["default", KITS.default, "Neutral, no logo"], ...(S.brandSet ? [["own", KITS.acme, "From " + esc(S.brandUrl || "acme.io")]] : [])].map(([k, kit, d]) => { const on = k === "own" ? !!S.brandOn : !S.brandOn; return `<button class="mi mi2 kopt" role="menuitemradio" aria-checked="${on}" data-act="setbrand" data-k="${k}"><span class="ck">${on ? icon("check") : ""}</span><span class="mt"><span>${kit.name}<small style="display:inline;margin-left:6px">${d}</small></span>${kitMini(kit)}</span></button>`; }).join("")}
      <div class="sep"></div>${S.brandSet ? `<button class="mi" data-go="/brand-kit">${icon("brand")}Edit brand kit</button>` : `<button class="mi" data-go="/brand-kit">${icon("plus")}<span class="mt"><span>Add your brand</span><small>Pull your logo, colors and fonts from your website</small></span></button>`}`); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "setbrand": S.brandOn = k === "own"; closeLayers(); render(); { const b = $('[data-act="brandchip"]'); if (b) b.focus(); } break;
    case "sug": S.prompt = t.dataset.p; render(); $("#prompt").focus(); break;
    case "send": { if (!navigator.onLine) { toast("You're offline. Your brief is kept; send it when you're back"); break; } const fr = firstRun(); if (S.clue != null && STYLES[S.clue]) { S.prompt = `Use the “${STYLES[S.clue][0]}” Clueprint. ${S.prompt}`; S.clue = null; } startChat(S.prompt); const c = TASKS[0]; if (!fr && S.mode === "Auto" && c && c.plan && canBuild()) { S.prompt = c.ask; startBuild("new", c.ask, c.id); } break; }
    case "create": closeLayers(); openCreate(k); break;
    case "check": if (k === "video") $("#prompt") && $("#prompt").focus(); if (k === "brand") go("/brand-kit"); if (k === "share") shareDialog(); break;
    case "hidecheck": S.gsHidden = true; render(); toast("Getting started hidden. Your progress is kept", { label: "Undo", act: "showcheck" }); break;
    case "showcheck": S.gsHidden = false; closeLayers(); render(); break;
    case "opt": t.parentElement.querySelectorAll(".opt").forEach(o => o.classList.toggle("on", o === t)); break;
    case "uploadnext": { const v = (($("#upnote") || {}).value || "").trim(); const f = S.dropped || "taskly-add-task-recording.mp4"; S.dropped = null; closeLayers(); startChat((v || "Make a video") + ": " + f); break; }
    case "agentsend": { const v = ($("#agentq") || {}).value || ""; if (!v.trim()) { toast("Describe the video first"); break; } S.prompt = v; planDialog(); break; }
    case "startgen": closeLayers(); if (S.guest) { signupGate({ kind: "record", name: t.dataset.name }); break; } startBuild(t.dataset.id, t.dataset.name); break;
    case "cluego": { const v = S.clueView; if (!v) break; styleDrawer(v.i + +k, `[data-act="cluego"][data-k="${k}"]`); break; }
    case "clueplay": cluePlay(!(S.clueView && S.clueView.playing)); break;
    case "cluescene": { const v = S.clueView; if (!v) break; const n = clueScenes(STYLES[v.i]).length; v.t = +k / n * clueDur(v.i) + 0.01; if (v.playing) cluePlay(true, `[data-act="cluescene"][data-k="${k}"]`); else clueRedraw(`[data-act="cluescene"][data-k="${k}"]`); break; }
    case "clueedit": { clearInterval(clueTimer); const v = S.clueView; closeLayers(); if (S.guest) { signupGate({ kind: "clueedit", clue: v.i }); break; } toast(`A copy of “${STYLES[v.i][0]}” is in your Workspace Clueprints, ready to edit`); break; }
    case "cluecreate": { clearInterval(clueTimer); const v = S.clueView; closeLayers(); S.clue = v.i; go("/home"); render(); setTimeout(() => { const p = $("#prompt"); if (p) p.focus(); }, 60); break; }
    case "clueoff": S.clue = null; render(); { const p = $("#prompt"); if (p) p.focus(); } break;
    case "startstyle": closeLayers(); startChat(STYLES[+t.dataset.i][0] + " for Taskly"); break;
    case "aifocus": aiFocusComposer(); break;
    case "entcaps": popover(t, `<div class="lab">Enterprise</div><div class="mi">${icon("video")}Edit a video by chatting</div><div class="mi">${icon("record")}Record your product for you</div><div class="mi">${icon("history")}Keep videos up to date</div><div class="sep"></div><button class="mi" data-act="toast" data-m="Opens Enterprise page">Talk to sales</button>`, "right"); break;
    case "share": shareDialog(); break;
    case "clearpq": S.projQ = ""; render(); $("#pq") && $("#pq").focus(); break;
    case "hideready": S.ready = null; render(); break;
    case "mklink": closeLayers(); S.ready = null; S.minutes.used = 1; S.checklist.share = true; toast("Link copied · 1 of 10 export minutes used"); render(); break;
    case "genarticle": toast("Writing the article"); S.credits.used += 30; PROJECTS[0].article = true; render(); break;
    case "projtab": S.projTab = k; render(); break;
    case "newfolder": folderDialog(null); break;
    case "dofolder": { const v = ($("#fnm").value || "").trim(), old = k || null; S.folders = S.folders || []; const er = folderErr(v, old); const ee = $("#fnmErr");
      if (er) { ee.textContent = er; ee.hidden = false; $("#fnm").setAttribute("aria-invalid", "true"); $("#fnm").focus(); break; }
      if (old) { S.folders[S.folders.indexOf(old)] = v; PROJECTS.forEach(p => { if (p.folder === old) p.folder = v; }); closeLayers(); toast("Folder renamed"); if (decodeURIComponent(route()[1] || "") === old) go("/projects/" + encodeURIComponent(v)); else render(); }
      else { S.folders.push(v); closeLayers(); render(); toast(`Folder “${v}” created`); } break; }
    case "foldermenu": popover(t, `<div class="lab">${esc(k)}</div><button class="mi" data-act="folderren" data-k="${esc(k)}">${icon("doc")}Rename</button><div class="sep"></div><button class="mi danger" data-act="folderdel" data-k="${esc(k)}">${icon("close")}Delete folder<small>Its projects move to Projects</small></button>`, "right"); { const f = $(".pop .mi"); if (f) f.focus(); } break;
    case "folderren": closeLayers(); folderDialog(k); break;
    case "folderdel": { closeLayers(); const n = PROJECTS.filter(p => p.folder === k).length; S.folders = S.folders.filter(f => f !== k); PROJECTS.forEach(p => { if (p.folder === k) p.folder = ""; }); render(); toast(`Folder deleted${n ? `. ${n} project${n === 1 ? "" : "s"} moved to Projects` : ""}`); break; }
    case "mvpick": moveDialog(t.dataset.id, k); break;
    case "mvmk": { const i = $("#mvnew"); const v = (i.value || "").trim(); S.folders = S.folders || []; const er = folderErr(v, null); if (er) { toast(er); i.focus(); break; } S.folders.push(v); moveDialog(t.dataset.id, v); toast(`Folder “${v}” created`); break; }
    case "mvdo": { const p = PROJECTS.find(x => x.id === t.dataset.id); if (!p) break; p.folder = k === ROOT_F ? "" : k; closeLayers(); render(); toast(`Moved to ${k}`); break; }
    case "cancelbuild": { const qi = (S.queue || []).findIndex(x => x.id === k || x.id === t.dataset.id); const id = t.dataset.id;
      if (qi > -1) { S.queue.splice(qi, 1); markCancelled(id, 0); render(); toast("Removed from the queue. Nothing was charged"); break; }
      if (!S.generating || S.generating.id !== id) break;
      const used = Math.round(S.generating.cost / 3);
      dialog(dh("Cancel this build?", "The video stops at the scene it's on.") + `<div class="db"><div class="callout grey">${icon(S.generating && S.generating.free ? "sparkle" : "coin")}<span>${S.generating && S.generating.free ? "Nothing is charged, and your first video is still on us after you cancel." : `${used} credits are already used for the scenes made so far. Cancelling stops further charges.`}</span></div></div><div class="df"><button class="btn" data-act="closedlg">Keep building</button><button class="btn dark" data-act="confirmcancel" data-id="${id}">Cancel build</button></div>`); break; }
    case "confirmcancel": { const id = t.dataset.id; if (!S.generating || S.generating.id !== id) { closeLayers(); break; } const used = Math.round(S.generating.cost / 3); clearInterval(genTimer); S.generating = null; markCancelled(id, used); closeLayers(); const nx = (S.queue || []).shift(); if (nx) startBuild(nx.id, null, nx.chatId, true); render(); toast(`Build cancelled · ${used} credits used`); break; }
    case "rebuild": { const id = t.dataset.id; const p = PROJECTS.find(x => x.id === id); if (!p) break; if (!canBuild()) { toast(shortNote().trim()); break; } p.cancelled = null; p.dur = "~1:00"; const ch = TASKS.find(x => x.pid === id); startBuild(id, p.name, ch && ch.id); break; }
    case "chatfilter": popover(t, chatFilterPop(), "right"); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "cfstatus": { const inPop = !!t.closest(".pop"); S.cf.status = S.cf.status === k && !inPop && k !== "all" ? "all" : k; S.chatId = null; S.chatListOnly = false; render(); if (inPop) cfReopen(); break; }
    case "cfbasis": S.cf.basis = k; render(); cfReopen(); break;
    case "cfdate": { const inPop = !!t.closest(".pop"); S.cf.date = k; S.chatId = null; render(); if (inPop) cfReopen(); if (k === "custom") setTimeout(() => { const i = $("#cffrom"); if (i) i.focus(); }, 0); break; }
    case "cfclear": S.cf = { status: "all", basis: S.cf.basis, date: "any", from: "", to: "" }; S.chatId = null; closeLayers(); render(); break;
    case "chatfocus": setChatFocus(true); render(); { const b = $(".fback"); if (b) b.focus(); } break;
    case "chatunfocus": setChatFocus(false); render(); { const r = $(`.chatrow[data-id="${S.chatId}"]`); if (r) r.focus(); } break;
    case "chatpanel": S.chatPanel = !S.chatPanel; try { localStorage.setItem("clueso-proto-chatpanel", S.chatPanel ? "1" : "0"); } catch (e) {} render(); { const b = $('[data-act="chatpanel"]'); if (b) b.focus(); } break;
    case "chatnew": S.chatId = "new"; S.chatListOnly = false; S.prompt = ""; if (!onChatsPage()) go("/chats"); else render(); setTimeout(() => { const p = $("#prompt"); if (p) p.focus(); }, 0); break;
    case "chatsort": popover(t, `<div class="lab">Sort by</div>${[["at", "Last activity"], ["made", "Date created"]].map(([k2, l]) => `<button class="mi" role="menuitemradio" aria-checked="${(S.chatSort || "at") === k2}" data-act="setchatsort" data-k="${k2}"><span class="ck">${(S.chatSort || "at") === k2 ? icon("check") : ""}</span>${l}</button>`).join("")}`, "right"); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "setchatsort": S.chatSort = k; closeLayers(); render(); { const b = $('.chatq [data-act="chatsort"]'); if (b) b.focus(); } break;
    case "chatmenu": { const id = t.dataset.id; popover(t, `<button class="mi" data-act="chatrename" data-id="${id}">${icon("doc")}Rename</button><div class="sep"></div><button class="mi danger" data-act="chatdel" data-id="${id}">${icon("close")}Delete conversation</button>`, "right"); { const f = $(".pop .mi"); if (f) f.focus(); } break; }
    case "chatrename": closeLayers(); S.chatId = t.dataset.id; S.chatListOnly = false; S.aiRenaming = true; render(); { const i = $("#aititle"); if (i) { i.focus(); i.select(); } } break;
    case "chatdel": { closeLayers(); const i = TASKS.findIndex(c => c.id === t.dataset.id); if (i < 0) break; const [c] = TASKS.splice(i, 1); S.lastDel = { c, i }; if (S.chatId === c.id) S.chatId = null; if (S.pChat === c.id) S.pChat = null; render(); toast(`Deleted “${c.t.length > 28 ? c.t.slice(0, 28) + "…" : c.t}”${c.pid ? ". Its video stays in Projects" : ""}`, { label: "Undo", act: "chatundo" }); break; }
    case "chatundo": if (S.lastDel) { TASKS.splice(S.lastDel.i, 0, S.lastDel.c); S.chatId = S.lastDel.c.id; S.lastDel = null; render(); } break;
    case "chatopt": { const c = chatById(t.dataset.id); if (c && c.opts) { answerChat(c, c.opts[+t.dataset.i]); render(); const b = $('[data-act="aibuild"]'); if (b) b.focus(); } break; }
    case "briefmore": S.briefOpen = S.briefOpen || {}; S.briefOpen[t.dataset.id] = !S.briefOpen[t.dataset.id]; render(); break;
    case "checkitem": { S.checked = S.checked || {}; const a = S.checked[t.dataset.id] = S.checked[t.dataset.id] || []; const i = +t.dataset.i; const j = a.indexOf(i); j > -1 ? a.splice(j, 1) : a.push(i); break; }
    case "feedback": S.fb = S.fb || {}; S.fb[t.dataset.id] = S.fb[t.dataset.id] === k ? null : k; render(); if (S.fb[t.dataset.id]) toast(k === "up" ? "Thanks. This helps Clueso AI" : "Thanks. Say what's wrong below and Clueso AI will fix it"); break;
    case "followup": S.aiDraft = k; render(); aiFocusComposer(); break;
    case "sharefrom": shareDialog(t.dataset.id); break;
    case "failcontinue": case "failrestart": { const c = chatById(t.dataset.id); if (!c || !c.fail) break; if (!canBuild()) { toast(shortNote().trim()); break; } const cont = act === "failcontinue"; const rest = c.fail.of - c.fail.done; S.prompt = c.t; const step = cont ? c.fail.done : 0; c.fail = null; c.steps = null; startBuild("new", c.t, c.id, false, cont ? { cost: Math.round(videoCr() * rest / 6), step } : {}); toast(cont ? "Continuing from where it stopped" : "Starting over"); break; }
    case "opendeleted": S.projTab = "deleted"; go("/projects"); break;
    case "filter": popover(t, projFilterPop(), "right"); break;
    case "pftype": { S.pf.types.has(k) ? S.pf.types.delete(k) : S.pf.types.add(k); const pop = t.closest(".pop"); render(); const np = $(".pop"); if (pop && np) np.innerHTML = projFilterPop(); break; }
    case "pfedited": { S.pf.edited = k; const pop = t.closest(".pop"); render(); const np = $(".pop"); if (pop && np) np.innerHTML = projFilterPop(); break; }
    case "pfclear": S.pf = { types: new Set(), edited: "any" }; closeLayers(); render(); break;
    case "psort": { const cur = S.projSort; S.projSort = cur.key === k ? { key: k, dir: cur.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }; render(); const b = document.querySelector(`[data-act="psort"][data-k="${k}"]`); if (b) b.focus(); break; }
    case "rowmenu": popover(t, projRowMenu(t.dataset.id), "right"); { const f = $(".pop .mi"); if (f) f.focus(); } break;
    case "pm": { const id = t.dataset.id, op = t.dataset.op; const p = PROJECTS.find(x => x.id === id); closeLayers();
      if (op === "copy") toast("Link copied. Only people in your workspace can open it.");
      else if (op === "pin") { S.pinned.has(id) ? S.pinned.delete(id) : S.pinned.add(id); render(); toast(S.pinned.has(id) ? "Pinned to the top" : "Unpinned"); }
      else if (op === "dup") { const c = { ...p, id: "c" + Date.now(), name: "Copy of " + p.name, mod: "just now", versions: [], madeFrom: [] }; PROJECTS.splice(PROJECTS.indexOf(p) + 1, 0, c); render(); toast("Duplicated. Versions stay with the original."); }
      else if (op === "move") moveDialog(id);
      else if (op === "rename") renameDialog(id);
      else if (op === "del") { const i = PROJECTS.indexOf(p); PROJECTS.splice(i, 1); S.pinned.delete(id); S.deleted.unshift({ p, at: Date.now(), i }); render(); toast(`Moved “${p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name}” to Deleted`, { label: "Undo", act: "restore", id }); }
      break; }
    case "restore": { const d = S.deleted.find(x => x.p.id === t.dataset.id); if (d) { S.deleted = S.deleted.filter(x => x !== d); PROJECTS.splice(Math.min(d.i, PROJECTS.length), 0, d.p); document.querySelectorAll(".toast").forEach(x => x.remove()); render(); toast("Restored"); } break; }
    case "dorename": { const v = $("#rnm").value.trim(); const p = PROJECTS.find(x => x.id === t.dataset.id); if (v && p) { p.name = v; p.mod = "just now"; } closeLayers(); render(); toast("Renamed"); break; }
    case "libtab": go(k === "brand" ? "/brand-kit" : "/clueprints"); break;
    case "cptab": S.cpTab = k; render(); break;
    case "style": styleDrawer(+t.dataset.i); break;
    case "langtab": S.langTab = k; render(); break;
    case "invite": closeLayers(); inviteDialog(); break;
    case "rules": trRead(); translateDialog(!$(".dlg.wide")); break;
    case "trpick": trRead(); S.tr.file = "product-walkthrough.mp4"; S.tr.pid = ""; translateDialog(!!$(".dlg.wide")); break; // stands in for the file picker
    case "trunpick": trRead(); S.tr.file = ""; translateDialog(!!$(".dlg.wide")); break;
    case "dotranslate": { trRead(); const T = S.tr, lang = T.to; let p = T.pid && PROJECTS.find(x => x.id === T.pid);
      const err = m => { const e = $("#trErr"); e.textContent = m; e.hidden = false; };
      if (!p && !T.file) { err($("#trpid") ? "Upload a video, or pick one of your projects" : "Upload a video to translate"); break; }
      if (p && p.versions.some(v => v.lang === lang)) { err(`“${p.name}” already has a ${lang} version`); break; }
      if (!p) { const nm = T.file.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/^./, c => c.toUpperCase()); p = { id: "u" + Date.now(), name: nm, type: "Upload", th: "t-white", label: nm, dur: "1:00", mod: "just now", created: "just now", chat: null, article: false, versions: [], madeFrom: [] }; PROJECTS.unshift(p); }
      p.versions.push({ id: p.id + "-" + lang.slice(0, 2).toLowerCase(), name: `${p.name} (${lang})`, lang, dur: p.dur, mod: "just now" });
      S.expanded.add(p.id); S.tr = null; closeLayers(); toast(`${lang} version added under ${p.name}`); go("/project/" + p.id); render(); break; }
    case "closedlg": closeLayers(); break;
    case "theme": { applyTheme(k); const inPop = t.closest(".pop"); document.querySelectorAll(".themeseg").forEach(g => g.outerHTML = themeControl()); const again = document.querySelector((inPop ? ".pop " : ".setcard ") + `.themeseg [data-k="${k}"]`); if (again) again.focus(); break; }
    case "cmdk": cmdk(); break;
    case "cmdkai": askAI(($("#cq") || {}).value ? $("#cq").value.trim() : ""); break;
    case "cmdkopenai": askAI(""); break;
    case "cmdkcreate": { const v = $("#cq").value.trim(); closeLayers(); S.prompt = v; go("/home"); break; }
    case "help": seeUpdates(); popover(t, helpMenu(), "right"); document.querySelectorAll(".udot").forEach(d => d.remove()); document.querySelectorAll('[data-act="help"]').forEach(b => b.setAttribute("aria-label", HELP_NAME)); { const f = $(".pop .mi"); if (f) f.focus(); } break;
    case "selopen": { const sel = t._sel || t.previousElementSibling; if (!sel) break; selFor = { sel, b: t }; popover(t, [...sel.options].map((o, i) => `<button class="mi mi2" role="menuitemradio" aria-checked="${i === sel.selectedIndex}" data-act="selpick" data-i="${i}"><span class="ck">${i === sel.selectedIndex ? icon("check") : ""}</span><span class="mt"><span>${esc(o.text)}</span></span></button>`).join("")); { const p = $(".pop"); if (p) { p.style.minWidth = Math.round(t.getBoundingClientRect().width) + "px"; const f = p.querySelector('[aria-checked="true"]') || p.querySelector(".mi"); if (f) f.focus(); } } break; }
    case "selpick": { const f = selFor; document.querySelectorAll(".pop").forEach(x => x.remove()); if (!f) break; f.sel.selectedIndex = +t.dataset.i; selSync(f.sel, f.b); f.sel.dispatchEvent(new Event("change", { bubbles: true })); if (document.contains(f.b)) f.b.focus(); selFor = null; break; }
    case "helpchat": dialog(dh("Chat with Clueso support", `We're offline right now. Leave a message and we'll reply here and by email to ${esc(S.user.email)}.`) + `<div class="db"><label class="field">Message<textarea id="helpmsg" rows="4" placeholder="What can we help with?"></textarea></label></div><div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="helpsend">Send</button></div>`); break;
    case "helpsend": { const v = ($("#helpmsg").value || "").trim(); if (!v) { $("#helpmsg").focus(); toast("Write a message first"); break; } closeLayers(); toast("Sent. We'll reply by email"); break; }
    case "helpreq": dialog(dh("Request a feature", "Tell us what would make Clueso better for you. The team reads every request.") + `<div class="db"><label class="field">What should Clueso do?<input id="reqt" maxlength="120" placeholder="For example: export captions as .ass"></label><label class="field">Why would it help? <span class="mut">(optional)</span><textarea id="reqd" rows="3"></textarea></label></div><div class="df"><button class="btn" data-act="closedlg">Cancel</button><button class="btn dark" data-act="helpreqsend">Submit request</button></div>`); break;
    case "helpreqsend": { const v = ($("#reqt").value || "").trim(); if (!v) { $("#reqt").focus(); toast("Describe the feature first"); break; } closeLayers(); toast("Request sent. Thank you"); break; }
    case "helpkeys": closeLayers(); if (typeof edKeysDialog === "function") edKeysDialog(route()[0] === "edit" ? "Playback" : "Navigation"); break;
    case "edkeystab": if (route()[0] !== "edit" && typeof edKeysDialog === "function") { edKeysDialog(k); const b = document.querySelector(`[data-act="edkeystab"][data-k="${k}"]`); if (b) b.focus(); } break;
    case "helpnews": closeLayers(); newsDialog(t.dataset.i); break;
    case "account": case "ws": if (firstRun() && S.guest) { popover(t, `<div class="me"><span class="ava person" aria-hidden="true">${userIni()}</span><span>${S.user.known === false ? "" : `<b>${esc(S.user.first)} ${esc(S.user.last)}</b>`}${esc(S.user.email)}</span></div>
      <div class="themerow">${themeControl()}</div><div class="sep"></div><button class="mi" data-act="switchacct">${icon("users")}Use a different account</button><button class="mi" data-act="signout">${icon("chevLeft")}Sign out</button>`, "right"); break; }
      popover(t, accountMenu()); break;
    case "toast": toast(t.dataset.m); break;
    case "togglefix": S.showFix = !S.showFix; fixLayer(currentFixKey()); break;
    case "demomenu": popover(t, `<div class="lab">View the prototype as</div>${SCENARIOS.map(([k2, l]) => `<button class="mi" role="menuitemradio" aria-checked="${k2 === curScenario()}" data-act="scenario" data-k="${k2}"><span class="grow">${l}</span><span class="ck">${k2 === curScenario() ? icon("check") : ""}</span></button>`).join("")}`, "right"); { const f = $(".pop [aria-checked=true]"); if (f) f.focus(); } break;
    case "fixlist": S.fixList = !S.fixList; fixLayer(currentFixKey()); break;
    case "fixmin": S.fixMin = !S.fixMin; saveFixPrefs(); fixLayer(currentFixKey()); { const b = $(S.fixMin ? ".fixpill" : ".fixx"); if (b) b.focus(); } break;
  }
});
function currentFixKey() { const [r, a] = route(); return r === "start" ? "s" + (a || 1) : (FIXES[r] ? r : "create"); }
document.addEventListener("dblclick", e => { const r = e.target.closest(".chatrow"); if (!r || innerWidth <= 900) return; S.chatId = r.dataset.id; setChatFocus(true); render(); const b = $(".fback"); if (b) b.focus(); });
document.addEventListener("change", e => { if (e.target.dataset.act === "role") { S.role = e.target.value; render(); } if (e.target.dataset.act2 === "anproj") go("/analytics/" + e.target.value); });
document.addEventListener("keydown", e => {
  const tr = e.target.closest && e.target.closest(".themeseg [role=radio]");
  if (tr && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) { e.preventDefault(); const all = [...tr.parentElement.children]; const n = all[(all.indexOf(tr) + (/Right|Down/.test(e.key) ? 1 : all.length - 1)) % all.length]; n.click(); return; }
 if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); cmdk(); } if (e.key === "Escape") { const pop = document.querySelector(".pop"); if (pop) { pop.remove(); const a = document.activeElement; if (!a || a === document.body) aiFocusComposer(); } else if (document.querySelector(".scrim,.drawer")) closeLayers(); else if (onChatsPage() && S.chatFocus && !S.aiRenaming && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.value)) { setChatFocus(false); render(); const r = $(`.chatrow[data-id="${S.chatId}"]`); if (r) r.focus(); } else if (S.ai && (aiView() === "full" || (document.activeElement && document.activeElement.closest("#aipanel")))) { if (S.aiView === "full" && innerWidth > 760) { setAiView(S.aiPrev || aiViewDefault()); render(); aiFocusComposer(); } else { S.ai = false; render(); const b = $("#aibtn"); if (b) b.focus(); } } } });
addEventListener("resize", () => { const b = $(".fixbar"); if (b) placeFixbar(b); });
/* ---------- keep work across reloads ----------
   The prototype has no server, so a reload used to wipe everything made in the session (a project built from a chat was lost
   twice in review). Projects, chats, Deleted, folders, a build in progress and the editor are kept in this tab's
   sessionStorage and restored on reload. A new tab, or switching scenario in the review bar, starts fresh. */
const WORK_KEY = "clueso-proto-work";
const WORK_S = ["after", "guest", "user", "wsName", "team", "teamOffer", "invite", "frChat", "watched", "verified", "tipProjects", "askedMake", "ai", "edAiW", "deleted", "folders", "credits", "minutes", "generating", "queue", "ready", "chatId", "pChat", "firstRun", "role", "cf", "projSort", "chatFocus"];
const WORK_SETS = ["pinned", "expanded", "goals"];
function saveWork() { try { const ed = S.ed ? { ...S.ed, hist: [], fut: [], playing: false, scenes: S.ed.scenes.map(x => ({ ...x, updating: false })) } : null;
  sessionStorage.setItem(WORK_KEY, JSON.stringify({ v: 1, scenario: S.scenario, projects: PROJECTS, tasks: TASKS, ed, s: Object.fromEntries(WORK_S.filter(k => k in S).map(k => [k, S[k]])), sets: Object.fromEntries(WORK_SETS.filter(k => S[k] instanceof Set).map(k => [k, [...S[k]]])) })); } catch (e) {} }
let saveWorkT = null;
const saveWorkSoon = () => { clearTimeout(saveWorkT); saveWorkT = setTimeout(saveWork, 150); };
addEventListener("pagehide", saveWork);
(() => { let w = null; try { w = JSON.parse(sessionStorage.getItem(WORK_KEY) || "null"); } catch (e) {} if (!w || w.v !== 1 || w.scenario !== S.scenario || !Array.isArray(w.projects) || !Array.isArray(w.tasks)) return;
  PROJECTS.splice(0, PROJECTS.length, ...w.projects); TASKS.splice(0, TASKS.length, ...w.tasks);
  Object.entries(w.s || {}).forEach(([k, v]) => { if (WORK_S.includes(k)) S[k] = v; });
  Object.entries(w.sets || {}).forEach(([k, v]) => { if (WORK_SETS.includes(k) && Array.isArray(v)) S[k] = new Set(v); });
  if (w.ed && Array.isArray(w.ed.scenes) && PROJECTS.some(p => p.id === w.ed.pid)) S.ed = w.ed;
  S.deleted = (Array.isArray(S.deleted) ? S.deleted : []).filter(d => d && d.p && d.p.id); if (!Array.isArray(S.queue)) S.queue = [];
  S.checklist.video = S.checklist.video || PROJECTS.length > 0;
  // A build that was running carries on from its step; its first-third charge was already made.
  if (S.generating && PROJECTS.some(p => p.id === S.generating.id)) { const g = S.generating, ch = TASKS.find(c => c.pid === g.id && c.st === "Building"); S.credits.used -= Math.round(g.cost / 3); S.generating = null; startBuild(g.id, null, ch && ch.id, true, { cost: g.cost, step: g.step }); } else S.generating = null; })();

// In the Clueprint preview: ← → move between Clueprints, Space plays
document.addEventListener("keydown", e => { if (!S.clueView || !$(".dlg.cluedlg")) return; const a = document.activeElement;  if (a && /INPUT|TEXTAREA/.test(a.tagName)) return; if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const b = $(`.dlg.cluedlg [data-act="cluego"][data-k="${e.key === "ArrowLeft" ? -1 : 1}"]`); if (b) b.click(); } if (e.key === " " && !(a && a.tagName === "BUTTON")) { e.preventDefault(); cluePlay(!S.clueView.playing); } });
/* ---------- Dropdowns ----------
   Native <select>s opened the operating system's own list and lost their chevron on hover, unlike every other menu here.
   Each select is now shown as the app's own dropdown: a button with the current value and a chevron, opening the same menu
   as the canvas size or zoom (tick on the right, same hover and keys). The select stays underneath, hidden, and is set and
   sent a change event on pick, so forms and handlers (Analytics' project filter) work as before. */
function enhanceSelects(root = document) {
  root.querySelectorAll("select:not([data-enh])").forEach(sel => {
    sel.setAttribute("data-enh", "1"); sel.classList.add("selhidden"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    const lab = sel.getAttribute("aria-label") || (sel.closest("label") && sel.closest("label").firstChild && sel.closest("label").firstChild.textContent.trim()) || "Choose";
    const b = document.createElement("button"); b.type = "button"; b.className = (sel.classList.contains("btn") ? "btn " : "selfield ") + "selbtn"; b.dataset.act = "selopen"; b.setAttribute("aria-haspopup", "menu");
    if (sel.style.maxWidth) b.style.maxWidth = sel.style.maxWidth;
    b.dataset.lab = lab; selSync(sel, b); sel.after(b); b._sel = sel;
  });
}
function selSync(sel, b) { const o = sel.options[sel.selectedIndex]; b.innerHTML = `<span class="trunc">${esc(o ? o.text : "")}</span>${icon("chevDown")}`; b.setAttribute("aria-label", `${b.dataset.lab}: ${o ? o.text : ""}`); }
let selFor = null;
new MutationObserver(() => enhanceSelects()).observe(document.body, { childList: true, subtree: true });
// "?" opens the keyboard shortcuts from anywhere, as the Help menu shows
document.addEventListener("keydown", e => { if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return; const a = document.activeElement; if (a && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName)) || document.querySelector(".scrim, .pop")) return; e.preventDefault(); if (typeof edKeysDialog === "function") edKeysDialog(route()[0] === "edit" ? "Playback" : "Navigation"); });
addEventListener("hashchange", () => { closeLayers(); S.navopen = false; render(); });
applyTheme(readTheme());
render();
