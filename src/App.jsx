import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ldscyogjlkzvnssnfgzt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkc2N5b2dqbGt6dm5zc25mZ3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTk4MzYsImV4cCI6MjA4ODQ5NTgzNn0.TfP-5wvq_hQc12N3BeazHrSqfPq-1_EQ268FXZ3571A";
const ADMIN_EMAIL  = "admin@eltablon.es"; // ← change to your real email

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) { const e = await res.text(); console.error("Supabase error:", e); return null; }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// map DB snake_case → app camelCase
const mapEvent = (e) => e ? ({
  id: e.id, title: e.title, category: e.category,
  date: e.date, time: e.time, location: e.location,
  description: e.description, organizer: e.organizer,
  contactMethod: e.contact_method, contactValue: e.contact_value,
  website: e.website || "", image: e.image || "",
  spots: e.spots, spotsLeft: e.spots_left,
  status: e.status, submittedBy: e.submitted_by,
  approvedBy: e.approved_by,
  submissionRef: e.submission_ref || null,
}) : null;

const mapUser = (u) => u ? ({
  id: u.id, name: u.name, email: u.email, password: u.password,
  role: u.role, avatar: u.avatar,
  organizer: u.organizer || "", contactMethod: u.contact_method || "email",
  contactValue: u.contact_value || "", website: u.website || "",
}) : null;

const mapNewsletter = (n) => n ? ({
  id: n.id, title: n.title, date: n.date,
  status: n.status, blocks: n.blocks || [],
}) : null;


const CATEGORIES = ["Todos","Medio Ambiente","Alimentación","Educación","Personas Mayores","Integración","Salud","Animales","Arte y Cultura","Otros"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DAYS_GRID = ["L","M","X","J","V","S","D"];

const fmt = d => { if(!d) return ""; const x = new Date(d+"T12:00:00"); return x.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); };
const fmtDate = d => { if(!d) return ""; const x = new Date(d+"T12:00:00"); return `${String(x.getDate()).padStart(2,"0")}.${String(x.getMonth()+1).padStart(2,"0")}.${x.getFullYear()}`; };
const toKey = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --white:#ffffff; --off:#f7f6f4; --rule:#d8d6d0; --rule2:#ebebea;
  --ink:#111110; --mid:#6b6b68; --light:#a8a8a4; --xlight:#d0d0cc;
  --accent:#c0390a; --green:#2a6020;
  --mono:'Space Mono',monospace; --serif:'EB Garamond',serif;
}
html { font-size:14px; }
body { font-family:var(--mono); background:var(--white); color:var(--ink); min-height:100vh; -webkit-font-smoothing:antialiased; }
::selection { background:var(--ink); color:var(--white); }
::-webkit-scrollbar { width:4px; }
::-webkit-scrollbar-track { background:var(--white); }
::-webkit-scrollbar-thumb { background:var(--rule); }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideInR { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
.fade { animation:fadeIn .3s ease both; }
.su   { animation:slideUp .45s cubic-bezier(.22,.68,0,1.2) both; }

/* HEADER */
.hdr { position:sticky; top:0; z-index:100; background:var(--white); border-bottom:1px solid var(--rule); }
.hdr-inner { max-width:1200px; margin:0 auto; padding:0 32px; display:flex; align-items:center; justify-content:space-between; height:54px; }
.logo { font-family:var(--mono); font-size:.72rem; font-weight:700; letter-spacing:.05em; color:var(--ink); cursor:pointer; text-transform:uppercase; display:flex; align-items:center; gap:10px; }
.logo-slash { color:var(--light); font-weight:400; }
.logo-sub { font-weight:400; color:var(--mid); font-size:.65rem; }
.hdr-nav { display:flex; align-items:center; }
.hn { font-family:var(--mono); font-size:.64rem; font-weight:400; color:var(--mid); background:none; border:none; cursor:pointer; padding:0 14px; height:54px; letter-spacing:.04em; border-left:1px solid var(--rule2); transition:color .15s; text-transform:lowercase; }
.hn:hover { color:var(--ink); }
.hn.act { color:var(--ink); font-weight:700; }
.hn.add { color:var(--white); background:var(--ink); border-left-color:var(--ink); }
.hn.add:hover { background:var(--accent); }
.usr-pill { display:flex; align-items:center; gap:6px; padding:0 14px; height:54px; border-left:1px solid var(--rule2); cursor:pointer; background:none; border-top:none; border-right:none; border-bottom:none; font-family:var(--mono); font-size:.64rem; color:var(--mid); transition:color .15s; }
.usr-pill:hover { color:var(--ink); }
.usr-dot { width:18px; height:18px; border-radius:50%; background:var(--ink); color:var(--white); font-size:.55rem; font-weight:700; display:flex; align-items:center; justify-content:center; }

/* HOME LAYOUT */
.home-grid { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:220px 1fr; min-height:calc(100vh - 54px); border-left:1px solid var(--rule2); border-right:1px solid var(--rule2); }

/* SIDEBAR */
.sidebar { border-right:1px solid var(--rule); padding:32px 0; position:sticky; top:54px; height:calc(100vh - 54px); overflow-y:auto; }
.sidebar::-webkit-scrollbar { width:0; }
.sb-section { border-bottom:1px solid var(--rule2); padding:0 0 20px; margin-bottom:20px; }
.sb-section:last-child { border-bottom:none; }
.sb-label { font-size:.58rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--light); padding:0 20px; margin-bottom:10px; display:block; }
.sb-item { display:block; width:100%; text-align:left; font-family:var(--mono); font-size:.66rem; color:var(--mid); padding:6px 20px; background:none; border:none; cursor:pointer; transition:all .15s; letter-spacing:.02em; }
.sb-item:hover { color:var(--ink); background:var(--off); }
.sb-item.on { color:var(--ink); font-weight:700; background:var(--off); }
.sb-search { display:flex; align-items:center; padding:0 20px; margin-bottom:14px; }
.sb-search input { width:100%; font-family:var(--mono); font-size:.66rem; color:var(--ink); background:none; border:none; border-bottom:1px solid var(--rule); padding:4px 0; outline:none; letter-spacing:.02em; }
.sb-search input::placeholder { color:var(--xlight); }
.view-row { display:flex; padding:0 20px; }
.vbtn { flex:1; font-family:var(--mono); font-size:.58rem; color:var(--light); background:none; border:1px solid var(--rule2); padding:5px 0; cursor:pointer; transition:all .15s; }
.vbtn:first-child { border-radius:2px 0 0 2px; }
.vbtn:last-child { border-radius:0 2px 2px 0; }
.vbtn:not(:first-child) { border-left:none; }
.vbtn.on { background:var(--ink); color:var(--white); border-color:var(--ink); }

/* MAIN */
.main { }
.main-hdr { padding:20px 32px 16px; border-bottom:1px solid var(--rule); display:flex; align-items:baseline; justify-content:space-between; }
.main-title { font-family:var(--serif); font-size:1.5rem; font-weight:400; font-style:italic; color:var(--ink); }
.main-sub { font-size:.62rem; color:var(--light); letter-spacing:.04em; }
.main-desc { font-size:.82rem; color:var(--mid); padding:14px 32px; border-bottom:1px solid var(--rule2); line-height:1.8; }

/* UPCOMING LIST */
.up-month-hdr { padding:12px 32px 8px; font-size:.58rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--light); border-bottom:1px solid var(--rule2); }
.up-row { display:grid; grid-template-columns:64px 1fr auto; align-items:center; border-bottom:1px solid var(--rule2); cursor:pointer; transition:background .12s; }
.up-row:hover { background:var(--off); }
.up-date-col { padding:16px 0 16px 32px; border-right:1px solid var(--rule2); }
.up-day-n { font-family:var(--serif); font-size:1.6rem; font-weight:400; color:var(--ink); line-height:1; }
.up-day-w { font-size:.56rem; color:var(--light); letter-spacing:.1em; text-transform:uppercase; margin-top:2px; }
.up-info { padding:16px 20px 16px 24px; }
.up-time { font-size:.6rem; color:var(--light); letter-spacing:.08em; margin-bottom:3px; }
.up-ttl { font-family:var(--serif); font-size:1.05rem; font-style:italic; color:var(--ink); line-height:1.25; margin-bottom:2px; }
.up-loc { font-size:.62rem; color:var(--mid); }
.up-meta { padding:16px 32px 16px 0; display:flex; flex-direction:column; align-items:flex-end; gap:5px; }
.up-cat { font-size:.66rem; color:var(--light); letter-spacing:.06em; }
.up-spots { font-size:.6rem; color:var(--mid); }
.up-arr { font-size:.75rem; color:var(--xlight); }
.up-empty { padding:40px 32px; font-size:.66rem; color:var(--light); }

/* CARDS */
.cards-wrap { padding:24px 32px; }
.cards-grid { display:grid; gap:1px; background:var(--rule2); }
.cards-grid.g2 { grid-template-columns:repeat(2,1fr); }
.ecard { background:var(--white); cursor:pointer; transition:background .12s; display:flex; flex-direction:column; }
.ecard:hover { background:var(--off); }
.ecard-img { width:100%; aspect-ratio:16/9; overflow:hidden; background:var(--off); }
.ecard-img img { width:100%; height:100%; object-fit:cover; display:block; filter:saturate(.88); transition:filter .3s; }
.ecard:hover .ecard-img img { filter:saturate(1); }
.ecard-img-ph { width:100%; aspect-ratio:16/9; background:var(--off); display:flex; align-items:center; justify-content:center; }
.ecard-img-ph span { font-size:.6rem; color:var(--xlight); letter-spacing:.08em; text-transform:uppercase; }
.ecard-body { padding:16px 20px 18px; flex:1; display:flex; flex-direction:column; }
.ecard-date { font-size:.58rem; color:var(--light); letter-spacing:.08em; margin-bottom:6px; }
.ecard-title { font-family:var(--serif); font-size:1.05rem; font-style:italic; color:var(--ink); line-height:1.3; margin-bottom:6px; flex:1; }
.ecard-loc { font-size:.62rem; color:var(--mid); margin-bottom:8px; }
.ecard-foot { display:flex; align-items:center; justify-content:space-between; margin-top:auto; }
.ecard-org { font-size:.58rem; color:var(--light); }
.ecard-cat { font-size:.55rem; color:var(--light); letter-spacing:.08em; text-transform:uppercase; border:1px solid var(--rule); padding:2px 6px; }

/* CALENDAR */
.cal-nav-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 32px; border-bottom:1px solid var(--rule); }
.cal-nav-title { font-family:var(--serif); font-size:1.1rem; font-style:italic; color:var(--ink); }
.cal-nav-btn { font-family:var(--mono); font-size:.7rem; color:var(--mid); background:none; border:none; cursor:pointer; padding:4px 8px; transition:color .15s; }
.cal-nav-btn:hover { color:var(--ink); }
.cal-day-hdrs { display:grid; grid-template-columns:repeat(7,1fr); border-bottom:1px solid var(--rule); }
.cal-dhdr { padding:8px; text-align:center; font-size:.58rem; letter-spacing:.1em; text-transform:uppercase; color:var(--light); }
.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); }
.cal-cell { border-right:1px solid var(--rule2); border-bottom:1px solid var(--rule2); min-height:80px; padding:6px; cursor:pointer; transition:background .12s; }
.cal-cell:nth-child(7n) { border-right:none; }
.cal-cell:hover { background:var(--off); }
.cal-cell.om { opacity:.3; cursor:default; }
.cal-cell.om:hover { background:none; }
.cal-cell.td { background:var(--off); }
.cal-cell.sel { background:var(--ink) !important; }
.cal-cell.sel .cal-dn { color:var(--white); }
.cal-dn { font-size:.68rem; font-family:var(--mono); color:var(--mid); width:20px; height:20px; display:flex; align-items:center; justify-content:center; }
.cal-cell.td .cal-dn { color:var(--ink); font-weight:700; }
.cal-ev-pip { height:2px; background:var(--ink); margin-bottom:2px; border-radius:1px; }
.cal-ev-lbl { font-size:.53rem; color:var(--mid); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.4; margin-bottom:1px; }
.cal-ev-more { font-size:.52rem; color:var(--light); }
.cal-cell.sel .cal-ev-lbl { color:rgba(255,255,255,.5); }
.cal-cell.sel .cal-ev-pip { background:rgba(255,255,255,.4); }

/* DAY PANEL */
.day-panel { border-top:1px solid var(--rule); animation:slideUp .25s ease; }
.dp-hdr { display:flex; align-items:center; justify-content:space-between; padding:14px 32px; border-bottom:1px solid var(--rule2); }
.dp-ttl { font-family:var(--serif); font-size:.95rem; font-style:italic; color:var(--ink); }
.dp-dt { font-size:.6rem; color:var(--light); margin-top:2px; letter-spacing:.06em; }
.dp-close { background:none; border:none; cursor:pointer; font-size:.8rem; color:var(--light); padding:4px; transition:color .15s; }
.dp-close:hover { color:var(--ink); }
.dp-row { display:grid; grid-template-columns:48px 1fr auto; align-items:center; border-bottom:1px solid var(--rule2); cursor:pointer; transition:background .12s; }
.dp-row:hover { background:var(--off); }
.dp-img { width:48px; height:48px; object-fit:cover; display:block; border-right:1px solid var(--rule2); filter:saturate(.8); }
.dp-img-ph { width:48px; height:48px; background:var(--off); border-right:1px solid var(--rule2); }
.dp-body { padding:10px 16px; }
.dp-time { font-size:.56rem; color:var(--light); letter-spacing:.08em; margin-bottom:2px; }
.dp-name { font-family:var(--serif); font-style:italic; font-size:.92rem; color:var(--ink); line-height:1.25; }
.dp-loc-s { font-size:.6rem; color:var(--mid); margin-top:2px; }
.dp-spts { font-size:.58rem; color:var(--light); padding:0 24px 0 0; }
.dp-empty { padding:20px 32px; font-size:.64rem; color:var(--light); }

/* EVENT DETAIL PANEL (slide-in right) */
.m-overlay { position:fixed; inset:0; z-index:200; background:rgba(17,17,16,.45); backdrop-filter:blur(3px); display:flex; align-items:flex-start; justify-content:flex-end; animation:fadeIn .2s ease; }
.m-panel { background:var(--white); width:min(560px,100%); height:100vh; overflow-y:auto; border-left:1px solid var(--rule); animation:slideInR .28s cubic-bezier(.22,.68,0,1.1); display:flex; flex-direction:column; }
.m-panel::-webkit-scrollbar { width:0; }
.m-img { width:100%; aspect-ratio:3/2; overflow:hidden; position:relative; background:var(--off); }
.m-img img { width:100%; height:100%; object-fit:cover; display:block; filter:saturate(.85); }
.m-img-ph { width:100%; aspect-ratio:3/2; background:var(--off); display:flex; align-items:center; justify-content:center; }
.m-img-ph span { font-size:.6rem; color:var(--xlight); letter-spacing:.1em; text-transform:uppercase; }
.m-close-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--rule); }
.m-close { font-family:var(--mono); font-size:.6rem; color:var(--mid); background:none; border:none; cursor:pointer; letter-spacing:.06em; transition:color .15s; }
.m-close:hover { color:var(--ink); }
.m-cat-lbl { font-size:.58rem; color:var(--light); letter-spacing:.1em; text-transform:uppercase; }
.m-body { padding:24px 24px 40px; flex:1; }
.m-title { font-family:var(--serif); font-size:1.65rem; font-style:italic; font-weight:400; color:var(--ink); line-height:1.2; margin-bottom:20px; }
.m-meta { border-top:1px solid var(--rule2); border-bottom:1px solid var(--rule2); padding:14px 0; margin-bottom:20px; }
.m-row { display:flex; gap:0; margin-bottom:7px; }
.m-row:last-child { margin-bottom:0; }
.m-lbl { font-size:.58rem; color:var(--light); letter-spacing:.08em; width:90px; flex-shrink:0; margin-top:1px; text-transform:lowercase; }
.m-val { font-size:.68rem; color:var(--ink); line-height:1.6; }
.m-val a { color:var(--ink); text-decoration:underline; text-underline-offset:2px; }
.m-val a:hover { color:var(--accent); }
.m-desc { font-family:var(--serif); font-size:.95rem; color:var(--mid); line-height:1.85; margin-bottom:24px; }
.m-spots { border-top:1px solid var(--rule2); padding-top:16px; margin-bottom:20px; }
.m-spots-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.m-spots-lbl { font-size:.6rem; color:var(--light); letter-spacing:.06em; }
.m-spots-val { font-size:.6rem; color:var(--ink); }
.m-track { height:1px; background:var(--rule2); position:relative; }
.m-fill { height:1px; background:var(--ink); position:absolute; left:0; top:0; transition:width .5s ease; }
.m-actions { display:flex; flex-direction:column; gap:8px; }
.m-btn-p { font-family:var(--mono); font-size:.64rem; letter-spacing:.08em; background:var(--ink); color:var(--white); border:none; padding:12px 0; cursor:pointer; transition:background .15s; text-transform:lowercase; }
.m-btn-p:hover { background:var(--accent); }
.m-btn-s { font-family:var(--mono); font-size:.64rem; letter-spacing:.08em; background:none; color:var(--mid); border:1px solid var(--rule); padding:11px 0; cursor:pointer; transition:all .15s; text-transform:lowercase; }
.m-btn-s:hover { border-color:var(--ink); color:var(--ink); }

/* ── SUBMIT PAGE ── */
.submit-page { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:280px 1fr; min-height:calc(100vh - 54px); border-left:1px solid var(--rule2); border-right:1px solid var(--rule2); }
.submit-info { border-right:1px solid var(--rule); padding:40px 32px; position:sticky; top:54px; height:calc(100vh - 54px); overflow-y:auto; }
.submit-info-title { font-family:var(--serif); font-size:1.6rem; font-style:italic; color:var(--ink); line-height:1.2; margin-bottom:16px; }
.submit-info-body { font-size:.68rem; color:var(--mid); line-height:1.9; margin-bottom:24px; }
.submit-info-steps { display:flex; flex-direction:column; gap:0; border-top:1px solid var(--rule2); }
.submit-step { display:flex; gap:16px; padding:14px 0; border-bottom:1px solid var(--rule2); }
.submit-step-n { font-family:var(--serif); font-size:1.2rem; color:var(--xlight); flex-shrink:0; width:20px; }
.submit-step-txt { font-size:.64rem; color:var(--mid); line-height:1.7; }
.submit-step-txt strong { color:var(--ink); display:block; margin-bottom:2px; font-family:var(--mono); font-size:.6rem; letter-spacing:.04em; }
.submit-note { margin-top:24px; padding:14px; border:1px solid var(--rule2); }
.submit-note-lbl { font-size:.56rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--light); margin-bottom:6px; }
.submit-note-txt { font-size:.62rem; color:var(--mid); line-height:1.7; }
.submit-form { padding:40px 48px; overflow-y:auto; }
.sf-section { margin-bottom:36px; padding-bottom:36px; border-bottom:1px solid var(--rule2); }
.sf-section:last-child { border-bottom:none; }
.sf-section-title { font-size:.58rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--light); margin-bottom:20px; display:flex; align-items:center; gap:10px; }
.sf-section-title::after { content:''; flex:1; height:1px; background:var(--rule2); }
.sf-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.sf-field { margin-bottom:22px; }
.sf-field label { display:block; font-size:.58rem; color:var(--light); letter-spacing:.1em; text-transform:uppercase; margin-bottom:8px; }
.sf-field label span.req { color:var(--accent); margin-left:2px; }
.sf-field input, .sf-field select, .sf-field textarea {
  width:100%; font-family:var(--mono); font-size:.7rem; color:var(--ink);
  background:none; border:none; border-bottom:1px solid var(--rule);
  padding:7px 0; outline:none; letter-spacing:.02em; transition:border-color .15s;
}
.sf-field input:focus, .sf-field select:focus, .sf-field textarea:focus { border-color:var(--ink); }
.sf-field input::placeholder, .sf-field textarea::placeholder { color:var(--xlight); }
.sf-field textarea { resize:vertical; min-height:90px; line-height:1.75; }
.sf-field select { appearance:none; cursor:pointer; }
.sf-field select option { background:#fff; color:var(--ink); }
.sf-field .hint { font-size:.58rem; color:var(--xlight); margin-top:5px; letter-spacing:.02em; line-height:1.5; }
.contact-toggle { display:flex; gap:0; margin-bottom:20px; }
.ct-btn { flex:1; font-family:var(--mono); font-size:.62rem; padding:9px 0; text-align:center; cursor:pointer; background:none; border:1px solid var(--rule2); color:var(--light); transition:all .15s; letter-spacing:.04em; }
.ct-btn:first-child { border-radius:2px 0 0 2px; }
.ct-btn:last-child { border-radius:0 2px 2px 0; border-left:none; }
.ct-btn.on { background:var(--ink); color:var(--white); border-color:var(--ink); }
.img-upload { border:1px dashed var(--rule); padding:28px; text-align:center; cursor:pointer; transition:all .15s; position:relative; }
.img-upload:hover { border-color:var(--ink); }
.img-upload.has-img { padding:4px; border-style:solid; }
.img-upload img { width:100%; max-height:200px; object-fit:cover; display:block; }
.img-upload-hint { font-size:.62rem; color:var(--light); letter-spacing:.04em; line-height:1.7; }
.img-upload-hint strong { display:block; margin-bottom:4px; color:var(--mid); }
.submit-actions { display:flex; gap:12px; align-items:center; padding-top:8px; }
.submit-err { font-size:.62rem; color:var(--accent); margin-bottom:16px; padding:8px 0; border-top:1px solid rgba(192,57,10,.2); border-bottom:1px solid rgba(192,57,10,.2); }

/* SUCCESS STATE */
.submit-success { padding:80px 48px; text-align:center; animation:slideUp .4s ease; }
.ss-icon { font-family:var(--serif); font-size:4rem; color:var(--xlight); margin-bottom:24px; }
.ss-title { font-family:var(--serif); font-size:1.6rem; font-style:italic; color:var(--ink); margin-bottom:12px; }
.ss-body { font-size:.68rem; color:var(--mid); line-height:1.9; max-width:400px; margin:0 auto 28px; }
.ss-ref { display:inline-block; font-family:var(--mono); font-size:.62rem; color:var(--light); border:1px solid var(--rule2); padding:6px 16px; letter-spacing:.06em; margin-bottom:28px; }

/* FORMS / AUTH */
.form-title { font-family:var(--serif); font-size:1.3rem; font-style:italic; color:var(--ink); margin-bottom:4px; }
.form-sub { font-size:.62rem; color:var(--light); margin-bottom:28px; letter-spacing:.04em; }
.fg { margin-bottom:18px; }
.fg label { display:block; font-size:.58rem; color:var(--light); letter-spacing:.1em; text-transform:uppercase; margin-bottom:6px; }
.fg input, .fg select, .fg textarea { width:100%; font-family:var(--mono); font-size:.7rem; color:var(--ink); background:none; border:none; border-bottom:1px solid var(--rule); padding:6px 0; outline:none; letter-spacing:.02em; transition:border-color .15s; }
.fg input:focus, .fg select:focus, .fg textarea:focus { border-color:var(--ink); }
.fg input::placeholder, .fg textarea::placeholder { color:var(--xlight); }
.fg textarea { resize:vertical; min-height:80px; line-height:1.7; }
.fg select { appearance:none; cursor:pointer; }
.fg select option { background:#fff; color:var(--ink); }
.f-err { font-size:.62rem; color:var(--accent); margin-bottom:12px; padding:8px 0; border-top:1px solid rgba(192,57,10,.2); border-bottom:1px solid rgba(192,57,10,.2); }
.f-hint { font-size:.62rem; color:var(--light); margin-bottom:14px; padding:8px 0; border-top:1px solid var(--rule2); border-bottom:1px solid var(--rule2); }
.auth-tabs { display:flex; border-bottom:1px solid var(--rule); margin-bottom:24px; }
.atab { flex:1; padding:10px; text-align:center; font-family:var(--mono); font-size:.64rem; letter-spacing:.06em; color:var(--light); background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-1px; cursor:pointer; transition:all .15s; text-transform:lowercase; }
.atab.on { color:var(--ink); border-bottom-color:var(--ink); }

/* ADMIN */
.page-pad { padding:32px; max-width:1000px; }
.page-title { font-family:var(--serif); font-size:1.5rem; font-style:italic; color:var(--ink); margin-bottom:4px; }
.page-sub { font-size:.62rem; color:var(--light); letter-spacing:.04em; margin-bottom:28px; }
.stat-row { display:flex; border:1px solid var(--rule); margin-bottom:28px; }
.stat-box { flex:1; padding:16px 20px; border-right:1px solid var(--rule); }
.stat-box:last-child { border-right:none; }
.stat-n { font-family:var(--serif); font-size:2rem; color:var(--ink); line-height:1; }
.stat-l { font-size:.56rem; color:var(--light); letter-spacing:.1em; text-transform:uppercase; margin-top:4px; }
.tab-row { display:flex; border-bottom:1px solid var(--rule); margin-bottom:20px; }
.ttab { font-family:var(--mono); font-size:.62rem; letter-spacing:.06em; color:var(--light); background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-1px; padding:10px 16px 10px 0; cursor:pointer; transition:all .15s; text-transform:lowercase; margin-right:16px; }
.ttab.on { color:var(--ink); border-bottom-color:var(--ink); }
.a-item { display:flex; gap:0; border:1px solid var(--rule); margin-bottom:-1px; }
.a-item img { width:72px; height:72px; object-fit:cover; border-right:1px solid var(--rule); flex-shrink:0; }
.a-img-ph { width:72px; height:72px; background:var(--off); border-right:1px solid var(--rule); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:.6rem; color:var(--xlight); }
.a-body { flex:1; padding:12px 16px; }
.a-ttl { font-size:.72rem; color:var(--ink); margin-bottom:3px; font-family:var(--serif); font-style:italic; }
.a-meta { font-size:.6rem; color:var(--light); line-height:1.7; }
.a-contact { font-size:.62rem; color:var(--mid); margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.a-contact-badge { font-size:.54rem; letter-spacing:.08em; text-transform:uppercase; padding:2px 7px; border:1px solid var(--rule2); color:var(--light); }
.a-acts { display:flex; gap:8px; margin-top:10px; align-items:center; flex-wrap:wrap; }
.sbdg { font-size:.55rem; letter-spacing:.08em; text-transform:uppercase; padding:2px 8px; border:1px solid; }
.sbdg.approved { color:var(--green); border-color:rgba(42,96,32,.3); }
.sbdg.pending { color:#7a5a10; border-color:rgba(122,90,16,.3); }
.sbdg.denied { color:var(--accent); border-color:rgba(192,57,10,.3); }

/* BUTTONS */
.btn-ink { font-family:var(--mono); font-size:.62rem; letter-spacing:.08em; background:var(--ink); color:var(--white); border:none; padding:10px 20px; cursor:pointer; transition:background .15s; text-transform:lowercase; }
.btn-ink:hover { background:var(--accent); }
.btn-line { font-family:var(--mono); font-size:.62rem; letter-spacing:.08em; background:none; color:var(--mid); border:1px solid var(--rule); padding:9px 20px; cursor:pointer; transition:all .15s; text-transform:lowercase; }
.btn-line:hover { border-color:var(--ink); color:var(--ink); }
.btn-sm { font-family:var(--mono); font-size:.58rem; letter-spacing:.06em; background:none; color:var(--mid); border:1px solid var(--rule); padding:4px 10px; cursor:pointer; transition:all .15s; }
.btn-sm:hover { border-color:var(--ink); color:var(--ink); }
.btn-sm.danger { color:var(--accent); border-color:rgba(192,57,10,.3); }
.btn-sm.danger:hover { border-color:var(--accent); }
.btn-sm.ok { color:var(--green); border-color:rgba(42,96,32,.3); }
.btn-sm.ok:hover { border-color:var(--green); }

/* TOAST */
.toast-area { position:fixed; bottom:20px; left:32px; z-index:500; display:flex; flex-direction:column; gap:6px; }
.toast { font-family:var(--mono); font-size:.62rem; color:var(--white); background:var(--ink); padding:10px 16px; border-left:2px solid var(--accent); letter-spacing:.04em; animation:slideUp .25s ease; min-width:220px; }
.toast.error { border-left-color:var(--accent); background:var(--accent); }

/* MY EVENTS */
.my-evs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1px; background:var(--rule2); }

/* EMPTY */
.empty-state { padding:60px 32px; text-align:center; }
.empty-line { font-size:.64rem; color:var(--light); letter-spacing:.08em; }

/* FOOTER */
footer { border-top:1px solid var(--rule); padding:24px 32px; display:flex; align-items:center; justify-content:space-between; }
footer .f-name { font-size:.62rem; color:var(--mid); letter-spacing:.08em; }
footer .f-links { display:flex; gap:16px; }
footer a { font-size:.6rem; color:var(--light); text-decoration:none; letter-spacing:.04em; transition:color .15s; }
footer a:hover { color:var(--ink); }

/* ── NEWSLETTER ── */
.nl-page { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:220px 1fr; min-height:calc(100vh - 54px); border-left:1px solid var(--rule2); border-right:1px solid var(--rule2); }
.nl-sidebar { border-right:1px solid var(--rule); padding:0; position:sticky; top:54px; height:calc(100vh - 54px); overflow-y:auto; display:flex; flex-direction:column; }
.nl-sidebar::-webkit-scrollbar { width:0; }
.nl-issues-hdr { padding:16px 20px 12px; border-bottom:1px solid var(--rule2); display:flex; align-items:center; justify-content:space-between; }
.nl-issues-lbl { font-size:.58rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--light); }
.nl-issue-item { padding:12px 20px; border-bottom:1px solid var(--rule2); cursor:pointer; transition:background .12s; }
.nl-issue-item:hover { background:var(--off); }
.nl-issue-item.active { background:var(--off); }
.nl-issue-item.active .nl-issue-title { font-weight:700; }
.nl-issue-n { font-size:.56rem; color:var(--light); letter-spacing:.08em; margin-bottom:3px; }
.nl-issue-title { font-family:var(--serif); font-size:.9rem; font-style:italic; color:var(--ink); line-height:1.25; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nl-issue-date { font-size:.56rem; color:var(--xlight); letter-spacing:.04em; }
.nl-issue-draft { font-size:.52rem; color:#7a5a10; letter-spacing:.08em; text-transform:uppercase; border:1px solid rgba(122,90,16,.25); padding:1px 5px; margin-left:4px; }
.nl-empty-issues { padding:24px 20px; font-size:.62rem; color:var(--xlight); }

/* reader view */
.nl-main { overflow-y:auto; }
.nl-reader { max-width:640px; margin:0 auto; padding:48px 40px 80px; animation:slideUp .35s ease; }
.nl-reader-issue { font-size:.58rem; color:var(--light); letter-spacing:.1em; text-transform:uppercase; margin-bottom:16px; }
.nl-reader-title { font-family:var(--serif); font-size:2.2rem; font-style:italic; font-weight:400; color:var(--ink); line-height:1.15; margin-bottom:8px; }
.nl-reader-date { font-size:.6rem; color:var(--light); letter-spacing:.06em; margin-bottom:40px; padding-bottom:24px; border-bottom:1px solid var(--rule); }
.nl-block-text { font-family:var(--serif); font-size:1rem; color:var(--ink); line-height:1.85; margin-bottom:28px; white-space:pre-wrap; }
.nl-block-text.lead { font-size:1.18rem; color:var(--mid); }
.nl-block-text.quote { border-left:2px solid var(--ink); padding-left:20px; color:var(--mid); font-style:italic; margin-left:0; }
.nl-block-img { margin-bottom:28px; }
.nl-block-img img { width:100%; display:block; }
.nl-block-img figcaption { font-size:.6rem; color:var(--light); letter-spacing:.04em; margin-top:8px; }
.nl-block-divider { border:none; border-top:1px solid var(--rule2); margin:32px 0; }
.nl-block-heading { font-family:var(--serif); font-size:1.4rem; font-style:italic; color:var(--ink); margin-bottom:16px; font-weight:400; }
.nl-empty-reader { padding:80px 40px; text-align:center; }
.nl-empty-reader p { font-size:.64rem; color:var(--light); letter-spacing:.06em; }

/* editor */
.nl-editor { padding:0; }
.nl-editor-topbar { padding:14px 28px; border-bottom:1px solid var(--rule); display:flex; align-items:center; gap:12px; background:var(--white); position:sticky; top:54px; z-index:10; }
.nl-editor-title-input { flex:1; font-family:var(--serif); font-size:1rem; font-style:italic; color:var(--ink); background:none; border:none; border-bottom:1px solid var(--rule); padding:4px 0; outline:none; }
.nl-editor-title-input::placeholder { color:var(--xlight); }
.nl-draft-badge { font-size:.54rem; color:#7a5a10; letter-spacing:.1em; text-transform:uppercase; border:1px solid rgba(122,90,16,.25); padding:3px 8px; flex-shrink:0; }
.nl-pub-badge { font-size:.54rem; color:var(--green); letter-spacing:.1em; text-transform:uppercase; border:1px solid rgba(42,96,32,.25); padding:3px 8px; flex-shrink:0; }
.nl-blocks { padding:28px 40px; max-width:640px; }
.nl-block-row { position:relative; margin-bottom:8px; }
.nl-block-row:hover .nl-block-controls { opacity:1; }
.nl-block-controls { position:absolute; right:-44px; top:4px; display:flex; flex-direction:column; gap:4px; opacity:0; transition:opacity .15s; }
.nl-block-ctrl { width:28px; height:28px; background:none; border:1px solid var(--rule2); cursor:pointer; font-size:.65rem; color:var(--light); display:flex; align-items:center; justify-content:center; transition:all .15s; }
.nl-block-ctrl:hover { border-color:var(--ink); color:var(--ink); }
.nl-block-ctrl.del:hover { border-color:var(--accent); color:var(--accent); }
.nl-textarea { width:100%; font-family:var(--serif); font-size:1rem; color:var(--ink); background:none; border:none; border-bottom:1px dashed var(--rule2); padding:6px 0; outline:none; resize:none; line-height:1.85; letter-spacing:.01em; min-height:60px; }
.nl-textarea.lead { font-size:1.18rem; color:var(--mid); }
.nl-textarea.quote { border-left:2px solid var(--ink); padding-left:20px; font-style:italic; color:var(--mid); border-bottom:none; }
.nl-textarea.heading { font-size:1.4rem; font-style:italic; }
.nl-textarea:focus { border-bottom-color:var(--rule); }
.nl-img-block { border:1px dashed var(--rule); }
.nl-img-block.filled { border:none; border-bottom:1px solid var(--rule2); }
.nl-img-block img { width:100%; display:block; }
.nl-img-block-inner { padding:20px; text-align:center; cursor:pointer; }
.nl-img-block-inner:hover { background:var(--off); }
.nl-img-hint { font-size:.62rem; color:var(--light); letter-spacing:.04em; }
.nl-img-caption { width:100%; font-family:var(--mono); font-size:.6rem; color:var(--light); background:none; border:none; padding:6px 0; outline:none; border-bottom:1px dashed var(--rule2); letter-spacing:.02em; }
.nl-divider-block { border:none; border-top:1px solid var(--rule2); margin:8px 0; cursor:default; }
.nl-add-block-row { display:flex; gap:6px; padding:16px 0 0; flex-wrap:wrap; }
.nl-add-btn { font-family:var(--mono); font-size:.58rem; letter-spacing:.06em; color:var(--light); background:none; border:1px solid var(--rule2); padding:5px 12px; cursor:pointer; transition:all .15s; text-transform:lowercase; }
.nl-add-btn:hover { border-color:var(--ink); color:var(--ink); }

/* ── MOBILE DRAWER & BOTTOM NAV ── */
.mob-hamburger { display:none; }
.mob-drawer-overlay { display:none; }
.mob-bottom-nav { display:none; }

@media(max-width:760px) {
  /* viewport meta safety */
  html { font-size:15px; }

  /* ── Header: hide desktop nav, show hamburger ── */
  .hdr-nav { display:none !important; }
  .mob-hamburger {
    display:flex; align-items:center; justify-content:center;
    width:44px; height:44px; background:none; border:none; cursor:pointer;
    color:var(--ink); flex-direction:column; gap:5px; flex-shrink:0;
  }
  .mob-hamburger span {
    display:block; width:20px; height:1.5px; background:var(--ink);
    transition:all .2s ease; transform-origin:center;
  }
  .mob-hamburger.open span:nth-child(1) { transform:translateY(6.5px) rotate(45deg); }
  .mob-hamburger.open span:nth-child(2) { opacity:0; }
  .mob-hamburger.open span:nth-child(3) { transform:translateY(-6.5px) rotate(-45deg); }
  .hdr-inner { padding:0 16px; }
  .logo { font-size:.68rem; }

  /* ── Slide-in drawer ── */
  .mob-drawer-overlay {
    display:block; position:fixed; inset:0; z-index:300;
    background:rgba(17,17,16,.5); backdrop-filter:blur(4px);
    animation:fadeIn .2s ease;
  }
  .mob-drawer {
    position:fixed; top:0; right:0; bottom:0; width:min(300px,85vw);
    background:var(--white); z-index:301; border-left:1px solid var(--rule);
    display:flex; flex-direction:column; overflow-y:auto;
    animation:slideInR .25s cubic-bezier(.22,.68,0,1.1);
  }
  .mob-drawer-hdr {
    padding:16px 20px; border-bottom:1px solid var(--rule);
    display:flex; align-items:center; justify-content:space-between;
  }
  .mob-drawer-logo { font-family:var(--mono); font-size:.7rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
  .mob-drawer-close { background:none; border:none; cursor:pointer; font-size:1rem; color:var(--mid); padding:4px; line-height:1; }
  .mob-drawer-nav { flex:1; padding:8px 0; }
  .mob-drawer-item {
    display:flex; align-items:center; gap:12px;
    padding:14px 20px; font-family:var(--mono); font-size:.72rem;
    color:var(--mid); background:none; border:none; cursor:pointer;
    width:100%; text-align:left; letter-spacing:.04em; text-transform:lowercase;
    border-bottom:1px solid var(--rule2); transition:all .12s;
    min-height:52px;
  }
  .mob-drawer-item:hover, .mob-drawer-item.act { background:var(--off); color:var(--ink); }
  .mob-drawer-item.act { font-weight:700; }
  .mob-drawer-item .mob-item-icon { font-size:.9rem; width:20px; text-align:center; flex-shrink:0; }
  .mob-drawer-item.add-btn { background:var(--ink); color:var(--white); border-bottom-color:var(--ink); margin:16px; width:calc(100% - 32px); border-radius:1px; }
  .mob-drawer-item.add-btn:hover { background:var(--accent); }
  .mob-drawer-footer { padding:16px 20px; border-top:1px solid var(--rule2); }
  .mob-drawer-user { display:flex; align-items:center; gap:10px; padding:12px 0; }
  .mob-drawer-user .usr-dot { width:28px; height:28px; font-size:.65rem; }
  .mob-drawer-user-name { font-size:.7rem; color:var(--ink); font-family:var(--mono); }
  .mob-drawer-user-role { font-size:.58rem; color:var(--light); letter-spacing:.06em; margin-top:1px; }
  .mob-logout-btn { width:100%; font-family:var(--mono); font-size:.62rem; color:var(--mid); background:none; border:1px solid var(--rule); padding:9px; cursor:pointer; letter-spacing:.06em; transition:all .15s; margin-top:8px; }
  .mob-logout-btn:hover { border-color:var(--accent); color:var(--accent); }

  /* ── Bottom navigation bar ── */
  .mob-bottom-nav {
    display:flex; position:fixed; bottom:0; left:0; right:0; z-index:200;
    background:var(--white); border-top:1px solid var(--rule);
    height:60px; safe-area-inset-bottom:env(safe-area-inset-bottom);
    padding-bottom:env(safe-area-inset-bottom);
  }
  .mob-bnav-item {
    flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:3px; background:none; border:none; cursor:pointer;
    font-family:var(--mono); font-size:.5rem; letter-spacing:.06em; text-transform:lowercase;
    color:var(--light); transition:color .15s; padding:0; min-height:44px;
  }
  .mob-bnav-item.act { color:var(--ink); }
  .mob-bnav-item .mob-bnav-icon { font-size:1.1rem; line-height:1; }
  .mob-bnav-item.mob-bnav-add { color:var(--white); background:var(--ink); border-radius:50%; width:44px; height:44px; flex:0 0 44px; margin:-10px 0 0; box-shadow:0 2px 12px rgba(0,0,0,.18); font-size:.95rem; align-self:center; }
  .mob-bnav-item.mob-bnav-add:active { background:var(--accent); }

  /* ── Body padding for bottom nav ── */
  body { padding-bottom:60px; }

  /* ── Layout reflows ── */
  .home-grid { grid-template-columns:1fr; }
  .sidebar { display:none; } /* sidebar hidden on mobile — use drawer filters instead */
  .main-hdr { padding:16px 20px 12px; }
  .main-desc { padding:12px 20px; }
  .cards-wrap { padding:16px 20px; }
  .cards-grid.g2 { grid-template-columns:1fr; }
  .up-row { grid-template-columns:52px 1fr; padding:0; }
  .up-meta { display:none; }
  .up-date-col { padding:14px 0 14px 16px; }
  .up-info { padding:14px 16px; }
  .up-month-hdr { padding:10px 16px 6px; }

  /* ── Submit page ── */
  .submit-page { grid-template-columns:1fr; }
  .submit-info { display:none; }
  .submit-form { padding:20px; }
  .sf-grid2 { grid-template-columns:1fr; gap:0; }
  .submit-actions { flex-direction:column; }
  .submit-actions .btn-ink, .submit-actions .btn-line { width:100%; text-align:center; padding:14px; }

  /* ── Event detail panel ── */
  .m-panel { width:100%; border-left:none; border-top:1px solid var(--rule); border-radius:0; }
  .m-overlay { align-items:flex-end; }

  /* ── Admin & pages ── */
  .page-pad { padding:20px; }
  .stat-row { flex-wrap:wrap; }
  .stat-box { min-width:50%; border-bottom:1px solid var(--rule); }
  .a-item { flex-wrap:wrap; }
  .a-acts { flex-wrap:wrap; gap:8px; }

  /* ── Newsletter ── */
  .nl-page { grid-template-columns:1fr; }
  .nl-sidebar { position:static; height:auto; border-right:none; border-bottom:1px solid var(--rule); max-height:240px; overflow-y:auto; }
  .nl-blocks { padding:16px; }
  .nl-block-controls { display:none; }
  .nl-reader { padding:24px 20px 80px; }
  .nl-editor-topbar { flex-wrap:wrap; gap:8px; padding:12px 16px; }
  .nl-editor-title-input { width:100%; }

  /* ── Auth modal ── */
  .m-body { padding:20px 20px 32px; }

  /* ── Touch targets — ensure min 44px ── */
  .btn-ink, .btn-line, .btn-sm, .hn, .sb-item, .vbtn, .ct-btn { min-height:44px; }
  .btn-sm { min-height:36px; padding:8px 14px; }
  .up-row { min-height:64px; }
  .ecard { cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .up-row, .dp-row, .nl-issue-item, .a-item { -webkit-tap-highlight-color:transparent; }

  /* ── Toasts ── */
  .toast-area { left:16px; right:16px; bottom:72px; }
  .toast { min-width:0; width:100%; }

  /* ── Footer ── */
  footer { flex-direction:column; gap:12px; text-align:center; padding:20px; }
  footer .f-links { justify-content:center; }
}

/* iOS safe area for notched phones */
@supports(padding-bottom: env(safe-area-inset-bottom)) {
  @media(max-width:760px) {
    .mob-bottom-nav { padding-bottom:env(safe-area-inset-bottom); height:calc(60px + env(safe-area-inset-bottom)); }
    body { padding-bottom:calc(60px + env(safe-area-inset-bottom)); }
  }
}
`;

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,8 82,5 85,88 12,92" fill="#e8e8e4" stroke="#111110" strokeWidth="3.5"/>
      <polygon points="10,8 36,7 38,92 12,92" fill="#1a1a18" stroke="#111110" strokeWidth="3.5"/>
      <polygon points="42,6 85,4 86,46 41,48" fill="white" stroke="#111110" strokeWidth="3.5"/>
      <polygon points="41,52 86,50 87,90 40,92" fill="#b8b8b4" stroke="#111110" strokeWidth="3.5"/>
      <polygon points="36,7 42,6 43,48 38,50" fill="white" stroke="#111110" strokeWidth="3.5"/>
      <line x1="10" y1="50" x2="87" y2="48" stroke="#111110" strokeWidth="3.5"/>
      <circle cx="23" cy="15" r="5" fill="white" stroke="#111110" strokeWidth="2.5"/>
      <circle cx="23" cy="15" r="2" fill="#111110"/>
      <circle cx="65" cy="13" r="5" fill="#111110" stroke="#111110" strokeWidth="2.5"/>
      <circle cx="65" cy="13" r="2" fill="white"/>
      <circle cx="63" cy="72" r="5" fill="white" stroke="#111110" strokeWidth="2.5"/>
      <circle cx="63" cy="72" r="2" fill="#111110"/>
    </svg>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "viewport"; document.head.appendChild(meta); }
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    return () => { try { document.head.removeChild(s); } catch(e){} };
  }, []);

  const [events, setEvents]         = useState([]);
  const [users, setUsers]           = useState([]);
  const [newsletter, setNewsletter] = useState([]);
  const [cu, setCu]                 = useState(null);
  const [page, setPage]             = useState("home");
  const [view, setView]             = useState("list");
  const [selEv, setSelEv]           = useState(null);
  const [showAuth, setShowAuth]     = useState(false);
  const [authTab, setAuthTab]       = useState("login");
  const [search, setSearch]         = useState("");
  const [cat, setCat]               = useState("Todos");
  const [adminTab, setAdminTab]     = useState("pending");
  const [toasts, setToasts]         = useState([]);
  const [banSub, setBanSub]         = useState("Voluntariado en Madrid — encuentra tu próxima oportunidad de hacer el bien en la ciudad.");
  const [calDate, setCalDate]       = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selDay, setSelDay]         = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const handler = () => setPage("status");
    document.addEventListener("goStatus", handler);
    return () => document.removeEventListener("goStatus", handler);
  }, []);

  // ── Load everything on mount ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [evData, usData, nlData, cfData] = await Promise.all([
        sb("events?order=date.asc"),
        sb("users?order=created_at.asc"),
        sb("newsletter?order=created_at.asc"),
        sb("config?key=eq.banner"),
      ]);
      if (evData) setEvents(evData.map(mapEvent));
      if (usData) setUsers(usData.map(mapUser));
      if (nlData) setNewsletter(nlData.map(mapNewsletter));
      if (cfData && cfData[0]) setBanSub(cfData[0].value);
      setLoading(false);
    };
    load();
  }, []);

  const toast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const approved = events.filter(e => e.status === "approved");
  const filtered = approved.filter(e => {
    const ms = [e.title, e.location, e.organizer].join(" ").toLowerCase().includes(search.toLowerCase());
    return ms && (cat === "Todos" || e.category === cat);
  });
  const myEvs  = cu ? events.filter(e => e.submittedBy === cu.id) : [];
  const dayEvs = selDay ? approved.filter(e => e.date === selDay) : [];

  // ── Submit new event ──
  const handleSubmit = async (data) => {
    const row = {
      title: data.title, category: data.category,
      date: data.date, time: data.time,
      location: data.location, description: data.description,
      organizer: data.organizer,
      contact_method: data.contactMethod, contact_value: data.contactValue,
      website: data.website || "", image: data.image || "",
      spots: data.spots, spots_left: data.spots,
      status: "pending",
      submitted_by: cu ? cu.id : "anon",
      approved_by: null,
      submission_ref: data.submissionRef || null,
    };
    const result = await sb("events", { method: "POST", body: JSON.stringify(row) });
    if (result && result[0]) setEvents(ev => [...ev, mapEvent(result[0])]);

    // email notification
    const subject = encodeURIComponent(`[El Tablón] Nueva propuesta: ${data.title}`);
    const body = encodeURIComponent(
`Nueva propuesta de evento recibida en El Tablón.

─────────────────────────────
EVENTO: ${data.title}
ORGANIZACIÓN: ${data.organizer}
CATEGORÍA: ${data.category}
FECHA: ${data.date} a las ${data.time}
LUGAR: ${data.location}
PLAZAS: ${data.spots}
─────────────────────────────
DESCRIPCIÓN:
${data.description}
─────────────────────────────
CONTACTO (${data.contactMethod}): ${data.contactValue}
WEB: ${data.website || "—"}
─────────────────────────────

Entra al panel de administración para aprobar o rechazar este evento.
`);
    window.open(`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`, "_blank");
  };

  // ── Approve event ──
  const handleApprove = async (id) => {
    await sb(`events?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved", approved_by: cu.id }) });
    setEvents(ev => ev.map(e => e.id === id ? { ...e, status: "approved" } : e));
    toast("evento aprobado");
  };

  // ── Deny event ──
  const handleDeny = async (id) => {
    await sb(`events?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "denied" }) });
    setEvents(ev => ev.map(e => e.id === id ? { ...e, status: "denied" } : e));
    toast("evento rechazado");
  };

  // ── Delete event ──
  const handleDelete = async (id) => {
    await sb(`events?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    setEvents(ev => ev.filter(e => e.id !== id));
    toast("evento eliminado");
  };

  // ── Save banner ──
  const handleBanner = async (val) => {
    setBanSub(val);
    await sb("config?key=eq.banner", { method: "PATCH", body: JSON.stringify({ value: val }) });
  };

  // ── Save newsletter ──
  const handleNewsletterSave = async (updated) => {
    setNewsletter(updated);
    const issue = updated[updated.length - 1];
    // find the one that changed by diffing
    for (const iss of updated) {
      const orig = newsletter.find(n => n.id === iss.id);
      if (!orig || JSON.stringify(orig) !== JSON.stringify(iss)) {
        if (typeof iss.id === "number" && iss.id < 1e12) {
          // existing DB row — patch it
          await sb(`newsletter?id=eq.${iss.id}`, {
            method: "PATCH",
            body: JSON.stringify({ title: iss.title, date: iss.date, status: iss.status, blocks: iss.blocks }),
          });
        } else {
          // new row (temp id) — insert and swap id
          const row = { title: iss.title, date: iss.date, status: iss.status, blocks: iss.blocks };
          const res = await sb("newsletter", { method: "POST", body: JSON.stringify(row) });
          if (res && res[0]) {
            setNewsletter(prev => prev.map(n => n.id === iss.id ? mapNewsletter(res[0]) : n));
          }
        }
        break;
      }
    }
  };

  // ── Login ──
  const handleLogin = async (email, password) => {
    const res = await sb(`users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
    if (res && res[0]) return mapUser(res[0]);
    return null;
  };

  // ── Register ──
  const handleRegister = async (data) => {
    const row = {
      id: `u_${Date.now()}`,
      name: data.name, email: data.email, password: data.password,
      role: "user", avatar: data.name[0].toUpperCase(),
      organizer: data.organizer || "",
      contact_method: data.contactMethod || "email",
      contact_value: data.contactValue || "",
      website: data.website || "",
    };
    const res = await sb("users", { method: "POST", body: JSON.stringify(row) });
    if (res && res[0]) {
      const nu = mapUser(res[0]);
      setUsers(u => [...u, nu]);
      return nu;
    }
    return null;
  };


  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16}}>
      <Badge size={48}/>
      <div style={{fontFamily:"var(--mono,monospace)",fontSize:".62rem",color:"#a8a8a4",letterSpacing:".12em"}}>cargando...</div>
    </div>
  );

  return (
    <div>
      <Hdr cu={cu} page={page} setPage={setPage}
        pendingCount={events.filter(e => e.status === "pending").length}
        onLogin={() => { setAuthTab("login"); setShowAuth(true); }}
        onLogout={() => { setCu(null); setPage("home"); toast("sesión cerrada"); }}
        onAdd={() => setPage("submit")} />

      {page === "home" && (
        <div className="home-grid">
          <Sidebar search={search} setSearch={setSearch} cat={cat} setCat={setCat}
            view={view} setView={setView} banSub={banSub}
            setBanSub={val => handleBanner(val)} cu={cu} />
          <div className="main">
            <div className="main-hdr">
              <div className="main-sub">{approved.length} eventos · madrid</div>
            </div>
            <div className="main-desc">{banSub}</div>
            {view === "list" && <UpcomingList events={filtered} onClick={setSelEv} />}
            {view === "grid" && (
              <div className="cards-wrap">
                {filtered.length === 0
                  ? <div className="empty-state"><div className="empty-line">— sin resultados —</div></div>
                  : <div className="cards-grid g2">{filtered.map((e,i) => <EventCard key={e.id} ev={e} onClick={() => setSelEv(e)} delay={i} />)}</div>
                }
              </div>
            )}
            {view === "calendar" && (
              <>
                <CalView events={approved} calDate={calDate} setCalDate={setCalDate} selDay={selDay} setSelDay={setSelDay} />
                {selDay && <DayPanel day={selDay} events={dayEvs} onClose={() => setSelDay(null)} onClick={setSelEv} />}
              </>
            )}
          </div>
        </div>
      )}

      {page === "status" && (
        <StatusPage events={events} onBack={() => setPage("home")} />
      )}

      {page === "submit" && (
        <SubmitPage cu={cu} onBack={() => setPage("home")} onSubmit={async data => {
          await handleSubmit(data); setPage("home"); toast("¡propuesta enviada! revisa tu correo.");
        }} />
      )}

      {page === "newsletter" && (
        <NewsletterPage issues={newsletter} cu={cu} onSave={handleNewsletterSave} toast={toast} />
      )}

      {page === "admin" && cu?.role === "admin" && (
        <div className="page-pad su">
          <AdminPanel events={events} users={users} tab={adminTab} setTab={setAdminTab}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onDelete={handleDelete} />
        </div>
      )}

      {page === "my-events" && cu && (
        <div className="page-pad su">
          <MyEvents evs={myEvs} onAdd={() => setPage("submit")} onClick={setSelEv} />
        </div>
      )}

      {selEv && (
        <EventDetail ev={selEv} onClose={() => setSelEv(null)} cu={cu}
          onLogin={() => { setSelEv(null); setAuthTab("login"); setShowAuth(true); }}
          onJoin={() => toast("¡apuntado al evento!")} />
      )}

      {showAuth && (
        <AuthModal tab={authTab} setTab={setAuthTab} users={users}
          onClose={() => setShowAuth(false)}
          onLogin={async (email, password) => {
            const u = await handleLogin(email, password);
            if (u) { setCu(u); setShowAuth(false); toast(`bienvenid@, ${u.name.toLowerCase()}`); return true; }
            return false;
          }}
          onReg={async data => {
            const nu = await handleRegister(data);
            if (nu) { setCu(nu); setShowAuth(false); toast(`bienvenid@, ${nu.name.toLowerCase()}`); }
          }} />
      )}

      <div className="toast-area">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}</div>

      <footer>
        <span className="f-name">El Tablón / Voluntariado Madrid</span>
        <div className="f-links">
          <a href="#">contacto</a>
          <a href="#">privacidad</a>
          <a href="#">© 2026</a>
        </div>
      </footer>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Hdr({ cu, page, setPage, pendingCount, onLogin, onLogout, onAdd }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = () => setDrawerOpen(false);
  const go = (p) => { setPage(p); close(); };

  const navItems = [
    { key:"home",       label:"eventos",          icon:"◈" },
    { key:"newsletter", label:"boletín",           icon:"◉" },
    { key:"status",     label:"estado propuesta",  icon:"◎" },
    ...(cu ? [{ key:"my-events", label:"mis eventos", icon:"◎" }] : []),
    ...(cu?.role==="admin" ? [{ key:"admin", label:`admin${pendingCount>0?` (${pendingCount})`:""}`, icon:"◆" }] : []),
  ];

  return (
    <>
      <header className="hdr">
        <div className="hdr-inner">
          <div className="logo" onClick={() => go("home")}>
            <Badge size={34} />
            <span>El Tablón</span>
          </div>
          {/* Desktop nav */}
          <nav className="hdr-nav">
            <button className={`hn ${page==="home"?"act":""}`} onClick={() => setPage("home")}>eventos</button>
            <button className={`hn ${page==="newsletter"?"act":""}`} onClick={() => setPage("newsletter")}>boletín</button>
            <button className={`hn ${page==="status"?"act":""}`} onClick={() => setPage("status")}>estado</button>
            {cu && <button className={`hn ${page==="my-events"?"act":""}`} onClick={() => setPage("my-events")}>mis eventos</button>}
            {cu?.role==="admin" && (
              <button className={`hn ${page==="admin"?"act":""}`} onClick={() => setPage("admin")}>
                admin{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </button>
            )}
            <button className={`hn add ${page==="submit"?"act":""}`} onClick={onAdd}>+ proponer evento</button>
            {cu
              ? <button className="usr-pill" onClick={onLogout}><div className="usr-dot">{cu.avatar}</div><span>{cu.name.split(" ")[0].toLowerCase()}</span></button>
              : <button className="hn" onClick={onLogin}>entrar</button>
            }
          </nav>
          {/* Mobile hamburger */}
          <button className={`mob-hamburger ${drawerOpen?"open":""}`} onClick={() => setDrawerOpen(o=>!o)} aria-label="menú">
            <span/><span/><span/>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="mob-drawer-overlay" onClick={close}>
          <div className="mob-drawer" onClick={e=>e.stopPropagation()}>
            <div className="mob-drawer-hdr">
              <span className="mob-drawer-logo">El Tablón</span>
              <button className="mob-drawer-close" onClick={close}>✕</button>
            </div>
            <nav className="mob-drawer-nav">
              {navItems.map(item => (
                <button key={item.key} className={`mob-drawer-item ${page===item.key?"act":""}`} onClick={() => go(item.key)}>
                  <span className="mob-item-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <button className="mob-drawer-item add-btn" onClick={() => { onAdd(); close(); }}>
                <span className="mob-item-icon">+</span>
                proponer evento
              </button>
            </nav>
            <div className="mob-drawer-footer">
              {cu ? (
                <>
                  <div className="mob-drawer-user">
                    <div className="usr-dot">{cu.avatar}</div>
                    <div>
                      <div className="mob-drawer-user-name">{cu.name.toLowerCase()}</div>
                      <div className="mob-drawer-user-role">{cu.role}</div>
                    </div>
                  </div>
                  <button className="mob-logout-btn" onClick={() => { onLogout(); close(); }}>cerrar sesión</button>
                </>
              ) : (
                <button className="mob-drawer-item" style={{borderBottom:"none",width:"100%",padding:"12px 0"}} onClick={() => { onLogin(); close(); }}>
                  <span className="mob-item-icon">→</span>
                  entrar / registrarse
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="mob-bottom-nav">
        <button className={`mob-bnav-item ${page==="home"?"act":""}`} onClick={() => setPage("home")}>
          <span className="mob-bnav-icon">◈</span>eventos
        </button>
        <button className={`mob-bnav-item ${page==="newsletter"?"act":""}`} onClick={() => setPage("newsletter")}>
          <span className="mob-bnav-icon">◉</span>boletín
        </button>
        <button className="mob-bnav-item mob-bnav-add" onClick={onAdd}>+</button>
        <button className={`mob-bnav-item ${page==="my-events"?"act":""}`} onClick={() => cu ? setPage("my-events") : onLogin()}>
          <span className="mob-bnav-icon">◎</span>{cu ? "mis eventos" : "entrar"}
        </button>
        <button className="mob-bnav-item" onClick={() => setDrawerOpen(true)}>
          <span className="mob-bnav-icon">≡</span>menú
        </button>
      </nav>
    </>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ search, setSearch, cat, setCat, view, setView, banSub, setBanSub, cu }) {
  const [editDesc, setEditDesc] = useState(false);
  const [tmp, setTmp] = useState(banSub);
  return (
    <aside className="sidebar">
      <div className="sb-section">
        <span className="sb-label">buscar</span>
        <div className="sb-search">
          <input placeholder="buscar eventos..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="sb-section">
        <span className="sb-label">vista</span>
        <div className="view-row">
          {[["list","lista"],["grid","cuadrícula"],["calendar","calendario"]].map(([k,l]) => (
            <button key={k} className={`vbtn ${view===k?"on":""}`} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="sb-section">
        <span className="sb-label">categoría</span>
        {CATEGORIES.map(c => (
          <button key={c} className={`sb-item ${cat===c?"on":""}`} onClick={() => setCat(c)}>{c.toLowerCase()}</button>
        ))}
      </div>
      {cu?.role === "admin" && (
        <div className="sb-section">
          <span className="sb-label">descripción</span>
          {editDesc
            ? <div style={{ padding:"0 20px" }}>
                <textarea value={tmp} onChange={e => setTmp(e.target.value)} style={{ width:"100%",fontFamily:"var(--mono)",fontSize:".62rem",color:"var(--ink)",background:"none",border:"none",borderBottom:"1px solid var(--rule)",resize:"vertical",outline:"none",padding:"4px 0",lineHeight:1.7,minHeight:60 }} />
                <div style={{ display:"flex",gap:6,marginTop:8 }}>
                  <button className="btn-sm ok" onClick={() => { setBanSub(tmp); setEditDesc(false); }}>guardar</button>
                  <button className="btn-sm" onClick={() => setEditDesc(false)}>cancelar</button>
                </div>
              </div>
            : <button className="sb-item" onClick={() => setEditDesc(true)}>editar descripción ↗</button>
          }
        </div>
      )}
    </aside>
  );
}

// ─── UPCOMING LIST ────────────────────────────────────────────────────────────
function UpcomingList({ events, onClick }) {
  const sorted = [...events].sort((a,b) => a.date.localeCompare(b.date));
  const grouped = [];
  sorted.forEach(ev => {
    const d = new Date(ev.date+"T12:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = MONTHS_ES[d.getMonth()] + " " + d.getFullYear();
    let g = grouped.find(x => x.key===key);
    if (!g) { g={key,label,evs:[]}; grouped.push(g); }
    g.evs.push(ev);
  });
  if (!sorted.length) return <div className="up-empty">— sin eventos —</div>;
  return (
    <div>
      {grouped.map(g => (
        <div key={g.key}>
          <div className="up-month-hdr">{g.label.toLowerCase()}</div>
          {g.evs.map((ev,i) => {
            const d = new Date(ev.date+"T12:00:00");
            return (
              <div key={ev.id} className="up-row su" style={{ animationDelay:`${i*.05}s` }} onClick={() => onClick(ev)}>
                <div className="up-date-col">
                  <div className="up-day-n">{d.getDate()}</div>
                  <div className="up-day-w">{DAYS_ES_SHORT[d.getDay()]}</div>
                </div>
                <div className="up-info">
                  <div className="up-time">{ev.time}</div>
                  <div className="up-ttl">{ev.title}</div>
                  <div className="up-loc">{ev.location}</div>
                </div>
                <div className="up-meta">
                  <div className="up-cat">{ev.category.toLowerCase()}</div>
                  <div className="up-arr">→</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ ev, onClick, delay }) {
  return (
    <div className="ecard su" style={{ animationDelay:`${delay*.05}s` }} onClick={onClick}>
      <div className="ecard-img">
        {ev.image ? <img src={ev.image} alt={ev.title}/> : <div className="ecard-img-ph"><span>{ev.category}</span></div>}
      </div>
      <div className="ecard-body">
        <div className="ecard-date">{fmtDate(ev.date)} · {ev.time}</div>
        <div className="ecard-title">{ev.title}</div>
        <div className="ecard-loc">{ev.location}</div>
        <div className="ecard-foot">
          <span className="ecard-org">{ev.organizer}</span>
          <span className="ecard-cat">{ev.category.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function CalView({ events, calDate, setCalDate, selDay, setSelDay }) {
  const { year, month } = calDate;
  const total   = new Date(year, month+1, 0).getDate();
  const rawStart= new Date(year, month, 1).getDay();
  const offset  = (rawStart+6)%7;
  const today   = new Date();
  const todayKey= toKey(today.getFullYear(), today.getMonth(), today.getDate());
  const eMap = {};
  events.forEach(e => { if(!eMap[e.date]) eMap[e.date]=[]; eMap[e.date].push(e); });
  const cells = [];
  for(let i=0;i<offset;i++) cells.push(null);
  for(let d=1;d<=total;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);
  const prev = () => month===0 ? setCalDate({year:year-1,month:11}) : setCalDate({year,month:month-1});
  const next = () => month===11 ? setCalDate({year:year+1,month:0}) : setCalDate({year,month:month+1});
  return (
    <div>
      <div className="cal-nav-hdr">
        <button className="cal-nav-btn" onClick={prev}>← anterior</button>
        <div className="cal-nav-title">{MONTHS_ES[month].toLowerCase()} {year}</div>
        <button className="cal-nav-btn" onClick={next}>siguiente →</button>
      </div>
      <div className="cal-day-hdrs">{DAYS_GRID.map(d => <div key={d} className="cal-dhdr">{d}</div>)}</div>
      <div className="cal-grid">
        {cells.map((day,i) => {
          const key  = day ? toKey(year,month,day) : null;
          const devs = key ? (eMap[key]||[]) : [];
          return (
            <div key={i} className={`cal-cell${!day?" om":""}${key===todayKey?" td":""}${key===selDay?" sel":""}`}
              onClick={() => { if(!day) return; const k=toKey(year,month,day); setSelDay(p=>p===k?null:k); }}>
              {day && <div className="cal-dn">{day}</div>}
              {day && devs.slice(0,3).map((e,ei) => <div key={ei} className="cal-ev-lbl">{e.title}</div>)}
              {day && devs.length>3 && <div className="cal-ev-more">+{devs.length-3}</div>}
              {day && devs.length>0 && <div className="cal-ev-pip"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DAY PANEL ────────────────────────────────────────────────────────────────
function DayPanel({ day, events, onClose, onClick }) {
  const d = new Date(day+"T12:00:00");
  const label = d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
  return (
    <div className="day-panel">
      <div className="dp-hdr">
        <div><div className="dp-ttl">eventos del día</div><div className="dp-dt">{label}</div></div>
        <button className="dp-close" onClick={onClose}>✕</button>
      </div>
      {events.length===0
        ? <div className="dp-empty">— sin eventos este día —</div>
        : events.map((e,i) => (
          <div key={e.id} className="dp-row su" style={{animationDelay:`${i*.06}s`}} onClick={() => onClick(e)}>
            {e.image ? <img className="dp-img" src={e.image} alt={e.title}/> : <div className="dp-img-ph"/>}
            <div className="dp-body">
              <div className="dp-time">{e.time}</div>
              <div className="dp-name">{e.title}</div>
              <div className="dp-loc-s">{e.location}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── EVENT DETAIL ─────────────────────────────────────────────────────────────
function EventDetail({ ev, onClose, cu, onLogin, onJoin }) {
  const contactHref = ev.contactMethod === "whatsapp"
    ? `https://wa.me/${ev.contactValue.replace(/\D/g,"")}`
    : `mailto:${ev.contactValue}`;
  return (
    <div className="m-overlay" onClick={onClose}>
      <div className="m-panel fade" onClick={e=>e.stopPropagation()}>
        {ev.image ? <div className="m-img"><img src={ev.image} alt={ev.title}/></div>
                  : <div className="m-img-ph"><span>{ev.category}</span></div>}
        <div className="m-close-bar">
          <span className="m-cat-lbl">{ev.category.toLowerCase()}</span>
          <button className="m-close" onClick={onClose}>✕ cerrar</button>
        </div>
        <div className="m-body">
          <div className="m-title">{ev.title}</div>
          <div className="m-meta">
            {[
              ["fecha",    fmt(ev.date)],
              ["hora",     ev.time],
              ["lugar",    ev.location],
              ["organiz.", ev.organizer],
            ].map(([l,v]) => (
              <div key={l} className="m-row"><div className="m-lbl">{l}</div><div className="m-val">{v}</div></div>
            ))}
            {ev.contactValue && (
              <div className="m-row">
                <div className="m-lbl">{ev.contactMethod === "whatsapp" ? "whatsapp" : "email"}</div>
                <div className="m-val"><a href={contactHref} target="_blank" rel="noopener noreferrer">{ev.contactValue}</a></div>
              </div>
            )}
            {ev.website && (
              <div className="m-row">
                <div className="m-lbl">web</div>
                <div className="m-val"><a href={ev.website} target="_blank" rel="noopener noreferrer">{ev.website.replace(/^https?:\/\//,"")}</a></div>
              </div>
            )}
          </div>
          <div className="m-desc">{ev.description}</div>
          <div className="m-actions">
            {cu
              ? <button className="m-btn-p" onClick={onJoin}>apuntarme al evento →</button>
              : <>
                  <button className="m-btn-p" onClick={onLogin}>iniciar sesión para apuntarse →</button>
                  <button className="m-btn-s" onClick={onLogin}>crear cuenta</button>
                </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMIT PAGE ──────────────────────────────────────────────────────────────
function SubmitPage({ cu, onBack, onSubmit }) {
  const fileRef = useRef();
  const [done, setDone] = useState(false);
  const [refNum] = useState(() => "ET-" + Math.floor(Math.random()*90000+10000));
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    title:"", category:"Medio Ambiente", date:"", time:"10:00",
    location:"", description:"",
    organizer:     cu?.organizer    || "",
    contactMethod: cu?.contactMethod || "email",
    contactValue:  cu?.contactValue  || "",
    website:       cu?.website       || "",
    spots:20, image:""
  });
  const sf = (k,v) => setF(x=>({...x,[k]:v}));

  const submit = () => {
    if (!f.title||!f.date||!f.location||!f.description||!f.organizer||!f.contactValue) {
      setErr("por favor completa todos los campos obligatorios (marcados con *).");
      return;
    }
    setErr("");
    onSubmit({ ...f, organizerEmail: f.contactMethod==="email" ? f.contactValue : "", submissionRef: refNum });
    setDone(true);
  };

  if (done) {
    return (
      <div className="submit-page">
        <div className="submit-info" />
        <div className="submit-success">
          <div className="ss-icon">—</div>
          <div className="ss-title">Propuesta recibida</div>
          <div className="ss-body">
            Gracias por proponer un evento en El Tablón. Tu solicitud será revisada en los próximos días.<br /><br />
            Guarda tu número de referencia — puedes usarlo para consultar el estado de tu propuesta en cualquier momento.
          </div>
          <div className="ss-ref">ref. {refNum}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-start"}}>
            <button className="btn-ink" onClick={() => { onBack(); setTimeout(()=>document.dispatchEvent(new CustomEvent("goStatus")),50); }}>comprobar estado →</button>
            <button className="btn-line" onClick={onBack}>← volver a los eventos</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-page su">
      {/* Left info panel */}
      <div className="submit-info">
        <div className="submit-info-title">Propón un evento de voluntariado</div>
        <div className="submit-info-body">
          ¿Organizas una actividad de voluntariado en Madrid? Envíanos los detalles y lo publicaremos en El Tablón tras revisarlo.
        </div>
        <div className="submit-info-steps">
          {[
            ["Rellena el formulario","Proporciona toda la información sobre tu evento: nombre, fecha, lugar y descripción."],
            ["Revisión","El equipo de El Tablón revisará tu propuesta y te contactará si necesita más información."],
            ["Publicación","Una vez aprobado, tu evento aparecerá en el tablón y los voluntarios podrán verlo."],
          ].map(([t,d],i) => (
            <div key={i} className="submit-step">
              <div className="submit-step-n">{i+1}</div>
              <div className="submit-step-txt"><strong>{t}</strong>{d}</div>
            </div>
          ))}
        </div>
        <div className="submit-note">
          <div className="submit-note-lbl">nota</div>
          <div className="submit-note-txt">
            La publicación es gratuita. El Tablón se reserva el derecho de rechazar propuestas que no cumplan con los criterios editoriales.
          </div>
        </div>
        <div style={{marginTop:20}}>
          <button className="btn-line" onClick={onBack}>← volver</button>
        </div>
      </div>

      {/* Right form */}
      <div className="submit-form">

        {/* SECTION: evento */}
        <div className="sf-section">
          <div className="sf-section-title">el evento</div>
          <div className="sf-field">
            <label>nombre del evento <span className="req">*</span></label>
            <input type="text" value={f.title} onChange={e=>sf("title",e.target.value)} placeholder="ej. Limpieza del Parque del Retiro"/>
          </div>
          <div className="sf-grid2">
            <div className="sf-field">
              <label>categoría <span className="req">*</span></label>
              <select value={f.category} onChange={e=>sf("category",e.target.value)}>
                {CATEGORIES.filter(c=>c!=="Todos").map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="sf-grid2">
            <div className="sf-field">
              <label>fecha <span className="req">*</span></label>
              <input type="date" value={f.date} onChange={e=>sf("date",e.target.value)}/>
            </div>
            <div className="sf-field">
              <label>hora de inicio</label>
              <input type="time" value={f.time} onChange={e=>sf("time",e.target.value)}/>
            </div>
          </div>
          <div className="sf-field">
            <label>lugar <span className="req">*</span></label>
            <input type="text" value={f.location} onChange={e=>sf("location",e.target.value)} placeholder="dirección o nombre del lugar, Madrid"/>
          </div>
          <div className="sf-field">
            <label>descripción <span className="req">*</span></label>
            <textarea value={f.description} onChange={e=>sf("description",e.target.value)} placeholder="Describe el evento, qué harán los voluntarios, qué deben llevar, etc."/>
            <div className="hint">Sé específico: qué se va a hacer, para quién, y qué necesitan saber los voluntarios antes de venir.</div>
          </div>
        </div>

        {/* SECTION: organización */}
        <div className="sf-section">
          <div className="sf-section-title">la organización</div>
          <div className="sf-field">
            <label>nombre de la organización <span className="req">*</span></label>
            <input type="text" value={f.organizer} onChange={e=>sf("organizer",e.target.value)} placeholder="ej. Banco de Alimentos de Madrid"/>
          </div>
          <div className="sf-field">
            <label>sitio web</label>
            <input type="url" value={f.website} onChange={e=>sf("website",e.target.value)} placeholder="https://vuestraorganizacion.es"/>
            <div className="hint">Opcional. Aparecerá en la ficha del evento.</div>
          </div>
        </div>

        {/* SECTION: contacto */}
        <div className="sf-section">
          <div className="sf-section-title">contacto para voluntarios</div>
          <div className="sf-field">
            <label>¿cómo prefieren ser contactados? <span className="req">*</span></label>
            <div className="contact-toggle">
              <button className={`ct-btn ${f.contactMethod==="email"?"on":""}`} onClick={() => sf("contactMethod","email")}>
                ✉ email
              </button>
              <button className={`ct-btn ${f.contactMethod==="whatsapp"?"on":""}`} onClick={() => sf("contactMethod","whatsapp")}>
                ◉ whatsapp
              </button>
            </div>
            {f.contactMethod === "email" ? (
              <input type="email" value={f.contactValue} onChange={e=>sf("contactValue",e.target.value)} placeholder="contacto@organizacion.es"/>
            ) : (
              <input type="tel" value={f.contactValue} onChange={e=>sf("contactValue",e.target.value)} placeholder="+34 600 000 000"/>
            )}
            <div className="hint">Este dato se mostrará en la ficha del evento para que los voluntarios puedan contactar directamente.</div>
          </div>
        </div>

        {/* SECTION: foto */}
        <div className="sf-section">
          <div className="sf-section-title">imagen del evento</div>
          <div className="sf-field">
            <label>foto o imagen representativa</label>
            <div className={`img-upload ${f.image?"has-img":""}`} onClick={() => fileRef.current.click()}>
              {f.image
                ? <img src={f.image} alt="preview"/>
                : <div className="img-upload-hint">
                    <strong>click para subir imagen</strong>
                    JPG, PNG o WEBP · recomendado 16:9 · max 5MB
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const fi=e.target.files[0];if(!fi)return;const r=new FileReader();r.onload=ev=>sf("image",ev.target.result);r.readAsDataURL(fi);}}/>
            <div style={{marginTop:10}}>
              <input type="text" value={f.image.startsWith("data:")?"":f.image} onChange={e=>sf("image",e.target.value)} placeholder="o pega una URL de imagen..."/>
            </div>
            <div className="hint">Opcional, pero recomendado. Una buena foto ayuda a que más voluntarios se animen.</div>
          </div>
        </div>

        {/* SUBMIT */}
        {err && <div className="submit-err">{err}</div>}
        <div className="submit-actions">
          <button className="btn-ink" onClick={submit}>enviar propuesta →</button>
          <button className="btn-line" onClick={onBack}>cancelar</button>
        </div>
        <div style={{marginTop:20,fontSize:".6rem",color:"var(--xlight)",lineHeight:1.7}}>
          Al enviar este formulario, aceptas que El Tablón revise y publique la información proporcionada. Tu propuesta llegará a <strong style={{color:"var(--light)"}}>{ADMIN_EMAIL}</strong> para su revisión.
        </div>
      </div>
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ tab, setTab, users, onClose, onLogin, onReg }) {
  const [form, setForm] = useState({ name:"", email:"", password:"", organizer:"", contactMethod:"email", contactValue:"", website:"" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    setBusy(true); setErr("");
    if (tab === "login") {
      const ok = await onLogin(form.email, form.password);
      if (!ok) setErr("email o contraseña incorrectos.");
    } else {
      if (!form.name||!form.email||!form.password) { setErr("nombre, email y contraseña son obligatorios."); setBusy(false); return; }
      if (users.find(u=>u.email===form.email)) { setErr("email ya registrado."); setBusy(false); return; }
      await onReg(form);
    }
    setBusy(false);
  };
  return (
    <div className="m-overlay" onClick={onClose}>
      <div className="m-panel fade" onClick={e=>e.stopPropagation()}>
        <div className="m-close-bar">
          <span className="m-cat-lbl">cuenta</span>
          <button className="m-close" onClick={onClose}>✕ cerrar</button>
        </div>
        <div className="m-body">
          <div style={{textAlign:"center",marginBottom:20}}><Badge size={48}/></div>
          <div className="form-title" style={{textAlign:"center"}}>El Tablón</div>
          <div className="form-sub" style={{textAlign:"center",marginBottom:24}}>voluntariado en madrid</div>
          <div className="auth-tabs">
            <button className={`atab ${tab==="login"?"on":""}`} onClick={()=>{setTab("login");setErr("");}}>entrar</button>
            <button className={`atab ${tab==="register"?"on":""}`} onClick={()=>{setTab("register");setErr("");}}>registrarse</button>
          </div>

          {tab === "register" && <>
            <div style={{fontSize:".6rem",color:"var(--light)",letterSpacing:".06em",marginBottom:16,paddingBottom:12,borderBottom:"1px solid var(--rule2)"}}>
              tu perfil · esta información se usará para rellenar automáticamente tus propuestas de eventos
            </div>
            <div className="fg"><label>nombre completo *</label><input type="text" value={form.name} onChange={e=>sf("name",e.target.value)} placeholder="tu nombre"/></div>
            <div className="fg"><label>nombre de la organización</label><input type="text" value={form.organizer} onChange={e=>sf("organizer",e.target.value)} placeholder="ej. Madrid Verde"/></div>
            <div className="fg">
              <label>contacto preferido para voluntarios</label>
              <div className="contact-toggle" style={{marginBottom:10}}>
                <button className={`ct-btn ${form.contactMethod==="email"?"on":""}`} onClick={()=>sf("contactMethod","email")}>✉ email</button>
                <button className={`ct-btn ${form.contactMethod==="whatsapp"?"on":""}`} onClick={()=>sf("contactMethod","whatsapp")}>◉ whatsapp</button>
              </div>
              {form.contactMethod === "email"
                ? <input type="email" value={form.contactValue} onChange={e=>sf("contactValue",e.target.value)} placeholder="contacto@organizacion.es"/>
                : <input type="tel"   value={form.contactValue} onChange={e=>sf("contactValue",e.target.value)} placeholder="+34 600 000 000"/>
              }
            </div>
            <div className="fg"><label>sitio web</label><input type="url" value={form.website} onChange={e=>sf("website",e.target.value)} placeholder="https://vuestraorganizacion.es"/></div>
            <div style={{borderTop:"1px solid var(--rule2)",paddingTop:14,marginTop:4}}>
              <div style={{fontSize:".6rem",color:"var(--light)",letterSpacing:".06em",marginBottom:12}}>acceso</div>
              <div className="fg"><label>email *</label><input type="email" value={form.email} onChange={e=>sf("email",e.target.value)} placeholder="tu@email.es"/></div>
              <div className="fg"><label>contraseña *</label><input type="password" value={form.password} onChange={e=>sf("password",e.target.value)} placeholder="••••••••"/></div>
            </div>
          </>}

          {tab === "login" && <>
            <div className="fg"><label>email</label><input type="email" value={form.email} onChange={e=>sf("email",e.target.value)} placeholder="tu@email.es"/></div>
            <div className="fg"><label>contraseña</label><input type="password" value={form.password} onChange={e=>sf("password",e.target.value)} placeholder="••••••••"/></div>
          </>}

          {err && <div className="f-err">{err}</div>}

          <div style={{marginTop:20}}>
            <button className="btn-ink" style={{width:"100%",opacity:busy?.6:1}} onClick={submit} disabled={busy}>
              {busy ? "..." : tab==="login" ? "entrar →" : "crear cuenta →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STATUS CHECKER ───────────────────────────────────────────────────────────
function StatusPage({ events, onBack }) {
  const [ref, setRef] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const check = () => {
    const clean = ref.trim().toUpperCase();
    const ev = events.find(e => e.submissionRef && e.submissionRef.toUpperCase() === clean);
    setResult(ev || null);
    setSearched(true);
  };

  const statusInfo = {
    pending:  { label: "en revisión",  desc: "Tu propuesta ha sido recibida y está siendo revisada por el equipo de El Tablón. Te contactaremos si necesitamos más información.", color: "var(--mid)" },
    approved: { label: "publicado",    desc: "¡Enhorabuena! Tu evento ha sido aprobado y ya está visible en el tablón.", color: "var(--green)" },
    denied:   { label: "no publicado", desc: "Tu propuesta no ha sido publicada en esta ocasión. Si tienes dudas, contacta con el equipo.", color: "var(--accent)" },
  };

  return (
    <div className="submit-page su">
      <div className="submit-info" />
      <div style={{padding:"48px 48px 80px",maxWidth:540}}>
        <div style={{fontFamily:"var(--mono)",fontSize:".6rem",color:"var(--light)",letterSpacing:".1em",marginBottom:24}}>comprobar estado</div>
        <div style={{fontFamily:"var(--serif)",fontSize:"1.5rem",fontStyle:"italic",marginBottom:8,lineHeight:1.2}}>¿Cómo va tu propuesta?</div>
        <div style={{fontFamily:"var(--mono)",fontSize:".65rem",color:"var(--mid)",marginBottom:32,lineHeight:1.7}}>
          Introduce el número de referencia que recibiste al enviar tu evento (formato ET-XXXXX).
        </div>

        <div style={{display:"flex",gap:8,marginBottom:32}}>
          <input
            type="text"
            value={ref}
            onChange={e => { setRef(e.target.value); setSearched(false); }}
            onKeyDown={e => e.key === "Enter" && check()}
            placeholder="ET-12345"
            style={{fontFamily:"var(--mono)",fontSize:".8rem",letterSpacing:".1em",border:"none",borderBottom:"2px solid var(--ink)",padding:"8px 0",flex:1,outline:"none",background:"none",color:"var(--ink)"}}
          />
          <button className="btn-ink" onClick={check}>buscar →</button>
        </div>

        {searched && !result && (
          <div style={{fontFamily:"var(--mono)",fontSize:".65rem",color:"var(--accent)",letterSpacing:".04em",padding:"16px 0",borderTop:"1px solid var(--rule)"}}>
            — no se ha encontrado ninguna propuesta con esa referencia.
          </div>
        )}

        {searched && result && (() => {
          const s = statusInfo[result.status] || statusInfo.pending;
          const d = new Date(result.date+"T12:00:00");
          const dateStr = d.toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
          return (
            <div style={{borderTop:"1px solid var(--rule)",paddingTop:24}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                <div style={{fontFamily:"var(--mono)",fontSize:".6rem",letterSpacing:".08em",color:"var(--light)"}}>estado</div>
                <div style={{fontFamily:"var(--mono)",fontSize:".7rem",fontWeight:700,color:s.color,letterSpacing:".06em"}}>{s.label}</div>
              </div>
              <div style={{fontFamily:"var(--serif)",fontSize:"1.1rem",fontStyle:"italic",marginBottom:6}}>{result.title}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:".62rem",color:"var(--mid)",marginBottom:4}}>{dateStr} · {result.location}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:".62rem",color:"var(--light)",marginBottom:20}}>{result.organizer}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:".65rem",color:"var(--mid)",lineHeight:1.7,borderTop:"1px solid var(--rule2)",paddingTop:16}}>{s.desc}</div>
            </div>
          );
        })()}

        <div style={{marginTop:40}}>
          <button className="btn-line" onClick={onBack}>← volver a los eventos</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ events, users, tab, setTab, onApprove, onDeny, onDelete }) {
  const pending = events.filter(e=>e.status==="pending");
  return (
    <div>
      <div className="page-title">administración</div>
      <div className="page-sub">El Tablón / panel de control · {ADMIN_EMAIL}</div>
      <div className="stat-row">
        {[["total",events.length],["pendientes",pending.length],["publicados",events.filter(e=>e.status==="approved").length],["usuarios",users.length]].map(([l,n])=>(
          <div key={l} className="stat-box"><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
        ))}
      </div>
      <div className="tab-row">
        {[["pending",`pendientes (${pending.length})`],["all","todos"],["users","usuarios"]].map(([k,l])=>(
          <button key={k} className={`ttab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="pending" && (
        pending.length===0
          ? <div className="empty-state"><div className="empty-line">— todo al día, sin propuestas pendientes —</div></div>
          : pending.map(e=>(
            <div key={e.id} className="a-item">
              {e.image?<img src={e.image} alt={e.title}/>:<div className="a-img-ph">—</div>}
              <div className="a-body">
                <div className="a-ttl">{e.title}</div>
                <div className="a-meta">{fmtDate(e.date)} · {e.time} · {e.location}</div>
                <div className="a-meta">{e.organizer} · {e.category}</div>
                <div className="a-contact">
                  <span className="a-contact-badge">{e.contactMethod}</span>
                  <span>{e.contactValue}</span>
                  {e.website && <><span style={{color:"var(--xlight)"}}>·</span><a href={e.website} target="_blank" rel="noopener noreferrer" style={{color:"var(--mid)",fontSize:".6rem",textDecoration:"underline"}}>{e.website.replace(/^https?:\/\//,"")}</a></>}
                </div>
                <div className="a-meta" style={{marginTop:4,fontStyle:"italic"}}>{e.description.slice(0,120)}{e.description.length>120?"…":""}</div>
                <div className="a-acts">
                  <button className="btn-sm ok" onClick={()=>onApprove(e.id)}>aprobar</button>
                  <button className="btn-sm danger" onClick={()=>onDeny(e.id)}>rechazar</button>
                  <span style={{fontSize:".58rem",color:"var(--xlight)",marginLeft:4}}>ref. anon</span>
                </div>
              </div>
            </div>
          ))
      )}

      {tab==="all" && events.map(e=>(
        <div key={e.id} className="a-item">
          {e.image?<img src={e.image} alt={e.title}/>:<div className="a-img-ph">—</div>}
          <div className="a-body">
            <div className="a-ttl">{e.title}</div>
            <div className="a-meta">{fmtDate(e.date)} · {e.location}</div>
            <div className="a-contact">
              <span className="a-contact-badge">{e.contactMethod||"email"}</span>
              <span>{e.contactValue}</span>
            </div>
            <div className="a-acts">
              <span className={`sbdg ${e.status}`}>{e.status==="approved"?"publicado":e.status==="pending"?"pendiente":"rechazado"}</span>
              {e.status==="pending"&&<><button className="btn-sm ok" onClick={()=>onApprove(e.id)}>aprobar</button><button className="btn-sm danger" onClick={()=>onDeny(e.id)}>rechazar</button></>}
              <button className="btn-sm danger" onClick={()=>onDelete(e.id)} style={{marginLeft:"auto"}}>eliminar</button>
            </div>
          </div>
        </div>
      ))}

      {tab==="users" && users.map(u=>(
        <div key={u.id} className="a-item">
          <div className="a-img-ph">{u.avatar}</div>
          <div className="a-body">
            <div className="a-ttl">{u.name}</div>
            <div className="a-meta">{u.email}</div>
            <div className="a-acts"><span className={`sbdg ${u.role==="admin"?"approved":"pending"}`}>{u.role}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── NEWSLETTER PAGE ──────────────────────────────────────────────────────────
function NewsletterPage({ issues, cu, onSave, toast }) {
  const fileRefs = useRef({});
  const published = issues.filter(i => i.status === "published");
  const allVisible = cu?.role === "admin" ? issues : published;

  const [selId, setSelId]     = useState(allVisible.length > 0 ? allVisible[allVisible.length - 1].id : null);
  const [editing, setEditing] = useState(false);

  const selIssue = issues.find(i => i.id === selId) || null;
  const isAdmin  = cu?.role === "admin";

  // ── helpers ──
  const uid = () => "b" + Date.now() + Math.random().toString(36).slice(2,6);

  const updateIssue = (updated) => {
    onSave(issues.map(i => i.id === updated.id ? updated : i));
  };

  const addBlock = (type) => {
    if (!selIssue) return;
    const blank = type === "text"    ? { id: uid(), type:"text", style:"normal", value:"" }
                : type === "lead"    ? { id: uid(), type:"text", style:"lead", value:"" }
                : type === "quote"   ? { id: uid(), type:"text", style:"quote", value:"" }
                : type === "heading" ? { id: uid(), type:"heading", value:"" }
                : type === "image"   ? { id: uid(), type:"image", src:"", caption:"" }
                :                     { id: uid(), type:"divider" };
    updateIssue({ ...selIssue, blocks: [...selIssue.blocks, blank] });
  };

  const updateBlock = (blockId, patch) => {
    updateIssue({ ...selIssue, blocks: selIssue.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b) });
  };

  const removeBlock = (blockId) => {
    updateIssue({ ...selIssue, blocks: selIssue.blocks.filter(b => b.id !== blockId) });
  };

  const moveBlock = (blockId, dir) => {
    const blocks = [...selIssue.blocks];
    const idx = blocks.findIndex(b => b.id === blockId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
    updateIssue({ ...selIssue, blocks });
  };

  const newIssue = () => {
    const id = Date.now();
    const issue = { id, title: "Nuevo boletín", date: new Date().toISOString().slice(0,10), status:"draft", blocks: [
      { id: uid(), type:"text", style:"lead", value:"" }
    ]};
    onSave([...issues, issue]);
    setSelId(id);
    setEditing(true);
  };

  const togglePublish = () => {
    if (!selIssue) return;
    const next = selIssue.status === "published" ? "draft" : "published";
    updateIssue({ ...selIssue, status: next });
    toast(next === "published" ? "boletín publicado" : "guardado como borrador");
  };

  const deleteIssue = () => {
    if (!selIssue) return;
    onSave(issues.filter(i => i.id !== selIssue.id));
    setSelId(allVisible.filter(i => i.id !== selIssue.id)[0]?.id || null);
    setEditing(false);
    toast("boletín eliminado");
  };

  // ── auto-resize textarea ──
  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  // ── render a single block in read mode ──
  const renderBlock = (block) => {
    switch (block.type) {
      case "text":
        return <p key={block.id} className={`nl-block-text ${block.style || "normal"}`}>{block.value}</p>;
      case "heading":
        return <h2 key={block.id} className="nl-block-heading">{block.value}</h2>;
      case "image":
        return block.src ? (
          <figure key={block.id} className="nl-block-img">
            <img src={block.src} alt={block.caption || ""}/>
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        ) : null;
      case "divider":
        return <hr key={block.id} className="nl-block-divider"/>;
      default: return null;
    }
  };

  // ── render a single block in edit mode ──
  const renderEditBlock = (block, idx) => {
    const ctrl = (
      <div className="nl-block-controls">
        <button className="nl-block-ctrl" title="subir" onClick={() => moveBlock(block.id, -1)}>↑</button>
        <button className="nl-block-ctrl" title="bajar" onClick={() => moveBlock(block.id, 1)}>↓</button>
        <button className="nl-block-ctrl del" title="eliminar" onClick={() => removeBlock(block.id)}>✕</button>
      </div>
    );

    if (block.type === "divider") {
      return (
        <div key={block.id} className="nl-block-row" style={{position:"relative"}}>
          <hr className="nl-divider-block"/>
          {ctrl}
        </div>
      );
    }

    if (block.type === "image") {
      const fid = block.id;
      if (!fileRefs.current[fid]) fileRefs.current[fid] = { current: null };
      return (
        <div key={block.id} className="nl-block-row">
          <div className={`nl-img-block ${block.src ? "filled" : ""}`}>
            {block.src
              ? <>
                  <img src={block.src} alt={block.caption || ""} style={{cursor:"pointer"}} onClick={() => fileRefs.current[fid]?.current?.click()}/>
                  <input className="nl-img-caption" value={block.caption||""} onChange={e => updateBlock(block.id,{caption:e.target.value})} placeholder="pie de foto (opcional)..." style={{display:"block",padding:"8px 12px",borderTop:"1px solid var(--rule2)"}}/>
                </>
              : <div className="nl-img-block-inner" onClick={() => fileRefs.current[fid]?.current?.click()}>
                  <div className="nl-img-hint">click para subir imagen</div>
                  <input type="text" value={block.src} onChange={e=>updateBlock(block.id,{src:e.target.value})} placeholder="o pega una URL..." style={{marginTop:8,width:"100%",fontFamily:"var(--mono)",fontSize:".6rem",color:"var(--ink)",background:"none",border:"none",borderBottom:"1px solid var(--rule2)",padding:"4px 0",outline:"none"}} onClick={e=>e.stopPropagation()}/>
                </div>
            }
            <input type="file" accept="image/*" style={{display:"none"}} ref={el => { if(!fileRefs.current[fid]) fileRefs.current[fid]={current:null}; fileRefs.current[fid].current=el; }}
              onChange={e => { const fi=e.target.files[0]; if(!fi)return; const r=new FileReader(); r.onload=ev=>updateBlock(block.id,{src:ev.target.result}); r.readAsDataURL(fi); }}/>
          </div>
          {ctrl}
        </div>
      );
    }

    const cls = block.type === "heading" ? "nl-textarea heading"
              : block.style === "lead"   ? "nl-textarea lead"
              : block.style === "quote"  ? "nl-textarea quote"
              :                            "nl-textarea";
    return (
      <div key={block.id} className="nl-block-row">
        <textarea className={cls} value={block.value||""} rows={1}
          ref={el => { if(el){ el.style.height="auto"; el.style.height=el.scrollHeight+"px"; } }}
          onChange={e => { updateBlock(block.id,{value:e.target.value}); autoResize(e.target); }}
          onInput={e => autoResize(e.target)}
          placeholder={block.type==="heading" ? "Título de sección..." : block.style==="lead" ? "Párrafo de introducción..." : block.style==="quote" ? "Cita destacada..." : "Escribe aquí..."}
        />
        {ctrl}
      </div>
    );
  };

  return (
    <div className="nl-page">
      {/* ── Sidebar: issue list ── */}
      <div className="nl-sidebar">
        <div className="nl-issues-hdr">
          <span className="nl-issues-lbl">boletín</span>
          {isAdmin && <button className="btn-ink" style={{padding:"4px 10px",fontSize:".58rem"}} onClick={newIssue}>+ nuevo</button>}
        </div>
        {allVisible.length === 0
          ? <div className="nl-empty-issues">{isAdmin ? "Sin números todavía. Crea el primero." : "Sin boletines publicados todavía."}</div>
          : [...allVisible].reverse().map((issue, i) => (
            <div key={issue.id}
              className={`nl-issue-item ${issue.id === selId ? "active" : ""}`}
              onClick={() => { setSelId(issue.id); setEditing(false); }}>
              <div className="nl-issue-n">
                n.º {allVisible.length - i}
                {issue.status === "draft" && <span className="nl-issue-draft">borrador</span>}
              </div>
              <div className="nl-issue-title">{issue.title || "Sin título"}</div>
              <div className="nl-issue-date">{issue.date}</div>
            </div>
          ))
        }
      </div>

      {/* ── Main: reader or editor ── */}
      <div className="nl-main">
        {!selIssue ? (
          <div className="nl-empty-reader"><p>selecciona un número</p></div>
        ) : editing && isAdmin ? (
          /* EDITOR */
          <div className="nl-editor">
            <div className="nl-editor-topbar">
              <input className="nl-editor-title-input" value={selIssue.title}
                onChange={e => updateIssue({...selIssue, title: e.target.value})}
                placeholder="Título del boletín..."/>
              <input type="date" value={selIssue.date}
                onChange={e => updateIssue({...selIssue, date: e.target.value})}
                style={{fontFamily:"var(--mono)",fontSize:".6rem",color:"var(--light)",background:"none",border:"none",borderBottom:"1px solid var(--rule2)",padding:"4px 0",outline:"none",cursor:"pointer"}}/>
              <span className={selIssue.status === "published" ? "nl-pub-badge" : "nl-draft-badge"}>
                {selIssue.status === "published" ? "publicado" : "borrador"}
              </span>
              <button className="btn-sm ok" onClick={togglePublish}>
                {selIssue.status === "published" ? "volver a borrador" : "publicar"}
              </button>
              <button className="btn-sm" onClick={() => setEditing(false)}>vista previa</button>
              <button className="btn-sm danger" onClick={deleteIssue}>eliminar</button>
            </div>

            <div className="nl-blocks" style={{paddingRight:"60px"}}>
              {selIssue.blocks.map((block, i) => renderEditBlock(block, i))}

              <div className="nl-add-block-row">
                <span style={{fontSize:".56rem",color:"var(--xlight)",letterSpacing:".08em",alignSelf:"center",marginRight:4}}>añadir:</span>
                {[
                  ["text",   "párrafo"],
                  ["lead",   "intro"],
                  ["quote",  "cita"],
                  ["heading","título"],
                  ["image",  "imagen"],
                  ["divider","separador"],
                ].map(([t,l]) => (
                  <button key={t} className="nl-add-btn" onClick={() => addBlock(t)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* READER */
          <div className="nl-reader">
            {isAdmin && (
              <div style={{display:"flex",gap:8,marginBottom:28}}>
                <button className="btn-ink" style={{fontSize:".58rem",padding:"5px 14px"}} onClick={() => setEditing(true)}>editar</button>
                <button className="btn-sm" onClick={togglePublish}>
                  {selIssue.status === "published" ? "volver a borrador" : "publicar"}
                </button>
                <span className={selIssue.status === "published" ? "nl-pub-badge" : "nl-draft-badge"} style={{display:"flex",alignItems:"center"}}>
                  {selIssue.status === "published" ? "publicado" : "borrador"}
                </span>
              </div>
            )}
            <div className="nl-reader-issue">
              boletín n.º {[...issues].filter(i => i.status==="published" || isAdmin).indexOf(selIssue) + 1}
            </div>
            <div className="nl-reader-title">{selIssue.title}</div>
            <div className="nl-reader-date">{selIssue.date}</div>
            {selIssue.blocks.map(renderBlock)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MY EVENTS ────────────────────────────────────────────────────────────────
function MyEvents({ evs, onAdd, onClick }) {
  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div><div className="page-title">mis eventos</div><div className="page-sub">eventos enviados</div></div>
        <button className="btn-ink" onClick={onAdd}>+ proponer evento</button>
      </div>
      {evs.length===0
        ? <div className="empty-state"><div className="empty-line">— sin eventos todavía —</div></div>
        : <div className="my-evs-grid">
            {evs.map(e=>(
              <div key={e.id} className="ecard" onClick={()=>onClick(e)}>
                <div className="ecard-img">
                  {e.image?<img src={e.image} alt={e.title}/>:<div className="ecard-img-ph"><span>{e.category}</span></div>}
                </div>
                <div className="ecard-body">
                  <div className="ecard-date">{fmtDate(e.date)}</div>
                  <div className="ecard-title">{e.title}</div>
                  <div className="ecard-loc">{e.location}</div>
                  <div className="ecard-foot">
                    <span className={`sbdg ${e.status}`}>{e.status==="approved"?"publicado":e.status==="pending"?"pendiente":"rechazado"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
