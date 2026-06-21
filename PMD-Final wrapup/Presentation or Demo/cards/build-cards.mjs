// Build branded HTIS title/bookend cards for the HireStream showcase video.
// For each card:  Piper TTS -> WAV (+duration)  ->  Playwright PNG (1280x720)  ->  ffmpeg still-image MP4 with narration.
//
// Run from the hirestream dir so `playwright` + `ffmpeg-static` resolve:
//   cd ~/Projects/Recruitment/hirestream && \
//   NODE_PATH="$(pwd)/node_modules" node "<this file>" [cardId]
//
// Output: <Presentation or Demo>/build/segments/<id>.mp4  + segments.json (durations)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
// Resolve playwright + ffmpeg-static from the hirestream install (ESM ignores NODE_PATH).
const require = createRequire("/home/subhash.thakur.india/Projects/Recruitment/hirestream/package.json");
const { chromium } = require("playwright");
const ffmpegStatic = require("ffmpeg-static");

const BASE = "/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup";
const PRES = path.join(BASE, "Presentation or Demo");
const CARDS_DIR = path.join(PRES, "cards");
const OUT_DIR = path.join(PRES, "build", "segments");
const WAV_DIR = path.join(PRES, "build", "narration");
const PNG_DIR = path.join(PRES, "build", "png");
const LOGO = path.join(BASE, "htis_logo.png");

const PIPER_BIN = "/tmp/piper/piper/piper";
const PIPER_MODEL = "/tmp/piper/en_US-lessac-medium.onnx";
const FF = ffmpegStatic;

for (const d of [OUT_DIR, WAV_DIR, PNG_DIR]) fs.mkdirSync(d, { recursive: true });

const vo = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, "narration.json"), "utf8"));
const logoB64 = "data:image/png;base64," + fs.readFileSync(LOGO).toString("base64");
const onlyCard = process.argv[2];

// ---- brand tokens (match the HTIS PDFs) ----
const NAVY = "#0b3d6b", NAVY2 = "#16557f", GOLD = "#c79a3a";
const SANS = `"Liberation Sans","DejaVu Sans","Segoe UI",Arial,sans-serif`;
const SERIF = `Georgia,"Liberation Serif","DejaVu Serif",serif`;

function piper(text, outWav) {
  execFileSync(PIPER_BIN, ["--model", PIPER_MODEL, "--output_file", outWav], {
    input: text, env: { ...process.env, LD_LIBRARY_PATH: "/tmp/piper/piper" },
    stdio: ["pipe", "ignore", "ignore"],
  });
}
function durSec(file) {
  let out = "";
  try { execFileSync(FF, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] }); }
  catch (e) { out = e.stderr?.toString() || ""; }
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}

// ---- card chrome + per-card bodies ----
const CHROME = `
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:1280px;height:720px;overflow:hidden;}
  body{font-family:${SERIF};color:#eaf1f8;
    background:radial-gradient(120% 120% at 80% -10%, #16557f 0%, ${NAVY} 42%, #06294a 100%);}
  .frame{position:absolute;inset:0;padding:54px 70px;display:flex;flex-direction:column;}
  .top{display:flex;justify-content:space-between;align-items:center;}
  .top img{height:30px;display:block;}
  .top .logo{background:#fff;padding:6px 11px;border-radius:7px;box-shadow:0 2px 10px rgba(0,0,0,.25);}
  .top .site{text-align:right;font-family:${SANS};}
  .top .site .a{font-size:13px;color:#fff;font-weight:700;letter-spacing:.3px;}
  .top .site .b{font-size:10px;color:#9fc0e0;letter-spacing:2.5px;text-transform:uppercase;}
  .goldrule{height:4px;background:${GOLD};border-radius:3px;margin:14px 0 0;}
  .foot{position:absolute;left:70px;right:70px;bottom:30px;font-family:${SANS};font-size:12px;
    color:#7fa6cc;display:flex;justify-content:space-between;border-top:1px solid #1d4d7a;padding-top:10px;}
  .body{flex:1;display:flex;flex-direction:column;justify-content:center;}
  h1{font-family:${SANS};font-weight:800;color:#fff;line-height:1.05;}
  h2{font-family:${SANS};font-weight:800;color:#fff;font-size:38px;margin-bottom:6px;}
  h2 .gold{color:${GOLD};}
  .lead{color:#bcd6f0;font-size:20px;line-height:1.5;}
  .chip{display:inline-block;font-family:${SANS};font-size:15px;font-weight:600;color:#0b3d6b;
    background:${GOLD};border-radius:20px;padding:6px 16px;margin:6px 8px 0 0;}
  .pill{display:inline-block;font-family:${SANS};font-size:16px;color:#dbe9f7;
    background:rgba(255,255,255,.08);border:1px solid #2f5f8c;border-radius:8px;padding:8px 14px;margin:6px 8px 0 0;}
  .card{background:rgba(255,255,255,.06);border:1px solid #2c557d;border-radius:12px;}
`;
const foot = `<div class="foot"><span>M/s HTIS Telecom Pvt. Ltd. &middot; htistelecom.in</span><span>Prepared for HPSEDC</span></div>`;
function chrome(bodyHtml, opts = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CHROME}</style></head>
  <body><div class="frame">
    <div class="top"><span class="logo"><img src="${logoB64}"></span><div class="site"><div class="a">htistelecom.in</div><div class="b">System Integrators &middot; Mohali</div></div></div>
    <div class="goldrule"></div>
    <div class="body">${bodyHtml}</div>
    ${opts.noFoot ? "" : foot}
  </div></body></html>`;
}

const node = (n, title, sub, col) => `
  <div style="flex:1;text-align:center;">
    <div style="width:96px;height:96px;margin:0 auto 12px;border-radius:50%;background:${col};
      display:flex;align-items:center;justify-content:center;font-family:${SANS};font-size:34px;font-weight:800;color:#fff;
      box-shadow:0 6px 22px rgba(0,0,0,.35);">${n}</div>
    <div style="font-family:${SANS};font-weight:700;font-size:20px;color:#fff;">${title}</div>
    <div style="font-size:14px;color:#9fc0e0;margin-top:3px;">${sub}</div>
  </div>`;
const arrow = `<div style="font-size:34px;color:${GOLD};align-self:center;padding:0 6px;margin-bottom:34px;">&rarr;</div>`;

const tier = (label, items, bg) => `
  <div style="border-radius:9px;overflow:hidden;margin-bottom:10px;border:1px solid #2c557d;">
    <div style="background:${bg};font-family:${SANS};font-weight:700;font-size:17px;color:#fff;padding:9px 16px;">${label}</div>
    <div style="background:rgba(255,255,255,.07);padding:11px 16px;font-size:15px;color:#cfe2f5;">${items}</div>
  </div>`;
const sidebox = (title, body) => `
  <div style="background:rgba(255,255,255,.06);border:1px dashed #3a6a98;border-radius:9px;padding:13px 16px;margin-bottom:12px;">
    <div style="font-family:${SANS};font-weight:700;font-size:16px;color:${GOLD};margin-bottom:5px;">${title}</div>
    <div style="font-size:14.5px;color:#cfe2f5;line-height:1.5;">${body}</div>
  </div>`;
const check = (t) => `<div style="display:flex;align-items:flex-start;gap:13px;margin:11px 0;">
  <div style="flex:none;width:30px;height:30px;border-radius:50%;background:${GOLD};color:#0b3d6b;font-family:${SANS};
    font-weight:800;display:flex;align-items:center;justify-content:center;font-size:17px;">&#10003;</div>
  <div style="font-size:19px;color:#e7f1fb;padding-top:2px;">${t}</div></div>`;

const bridge = (n, title, sub, col) => chrome(`
  <div style="display:flex;align-items:center;gap:40px;">
    <div style="width:150px;height:150px;border-radius:24px;background:${col};display:flex;align-items:center;justify-content:center;
      font-family:${SANS};font-size:74px;font-weight:800;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.4);">${n}</div>
    <div><h1 style="font-size:54px;">${title}</h1><div class="lead" style="margin-top:8px;">${sub}</div></div>
  </div>`);

const BODIES = {
  "01-title": chrome(`
    <div style="text-align:center;">
      <h1 style="font-size:104px;letter-spacing:-1px;">HireStream</h1>
      <div class="lead" style="font-size:26px;margin-top:14px;color:#dbe9f7;">HPSEDC Overseas Placement Portal &amp; Mobile Application</div>
      <div style="margin-top:26px;"><span class="chip">Secure</span><span class="chip">Bilingual</span><span class="chip">Web &amp; Mobile</span></div>
    </div>`),

  "02-problem": chrome(`
    <h2>The Problem <span class="gold">&amp;</span> The Mandate</h2>
    <div style="display:flex;gap:26px;margin-top:18px;">
      <div style="flex:1;background:rgba(140,30,30,.18);border:1px solid #7a3b3b;border-radius:12px;padding:20px 22px;">
        <div style="font-family:${SANS};font-weight:700;font-size:19px;color:#f3b4b4;margin-bottom:12px;">The problem today</div>
        <div style="font-size:17px;line-height:1.9;color:#f0dada;">&bull; Unregulated agents<br>&bull; Illegal recruitment fees<br>&bull; Unseen contracts<br>&bull; No protection &amp; no record abroad</div>
      </div>
      <div style="flex:1;background:rgba(199,154,58,.14);border:1px solid #7a5e16;border-radius:12px;padding:20px 22px;">
        <div style="font-family:${SANS};font-weight:700;font-size:19px;color:${GOLD};margin-bottom:12px;">The mandate</div>
        <div style="font-size:17px;line-height:1.9;color:#f0e6cf;">&bull; Work Order HPSEDC-SOFT/08/2025<br>&bull; Built to the agreed FRS<br>&bull; One government-supervised window<br>&bull; Safe, regulated overseas recruitment</div>
      </div>
    </div>`),

  "03-overview": chrome(`
    <h2>How HireStream Works</h2>
    <div style="background:rgba(11,61,107,.5);border:1px solid ${GOLD};border-radius:10px;text-align:center;
      font-family:${SANS};font-weight:700;font-size:15px;color:${GOLD};padding:8px;margin:14px 0 22px;letter-spacing:1px;">
      HPSEDC AUTHORITY &mdash; OVERSIGHT &middot; VERIFICATION &middot; AUDIT</div>
    <div style="display:flex;align-items:flex-start;">
      ${node("1", "Employer", "posts requisition", NAVY2)}${arrow}
      ${node("2", "Agency", "sources &amp; screens", "#1b6b8f")}${arrow}
      ${node("3", "Job Seeker", "applies &amp; is placed", "#2e7d5b")}
    </div>
    <div style="text-align:center;margin-top:20px;"><span class="pill">Bilingual &mdash; English &amp; Hindi</span><span class="pill">Web &amp; Mobile</span></div>`),

  "04-bridge-employer": bridge("1", "Employer", "Posts demand &middot; reviews &middot; interviews &middot; selects", NAVY2),
  "05-bridge-agency": bridge("2", "Recruiting Agency", "Picks up &middot; sources &middot; screens &middot; places", "#1b6b8f"),
  "06-bridge-candidate": bridge("3", "Job Seeker", "One profile &middot; apply &middot; track &middot; safe placement", "#2e7d5b"),
  "07-bridge-admin": bridge("4", "HPSEDC Authority", "Oversee &middot; verify &middot; audit", "#7a5e16"),

  "08-built": chrome(`
    <h2>How It&rsquo;s Built</h2>
    <div style="display:flex;gap:24px;margin-top:14px;">
      <div style="flex:1.25;">
        ${tier("Presentation", "Responsive web app &bull; React Native apps (Android / iOS)", NAVY2)}
        ${tier("Application &mdash; Node.js", "RBAC &bull; matching engine &bull; notifications &bull; hardened security", NAVY)}
        ${tier("Data &mdash; PostgreSQL", "~36 tables &bull; immutable audit log &bull; namespaced storage", "#0a3358")}
      </div>
      <div style="flex:1;">
        ${sidebox("Secure by design", "RBAC &middot; TLS in transit &middot; encryption at rest &middot; bcrypt &middot; OTP &middot; full audit trail")}
        ${sidebox("Standards", "GIGW accessibility &middot; ISO 27001-aligned &middot; GDPR-equivalent protection")}
        ${sidebox("Integrations &mdash; ready", "HIM SSO &middot; Aadhaar &middot; DigiLocker &middot; Email/SMS &mdash; pluggable, switch on with prod credentials")}
      </div>
    </div>`),

  "09-status": chrome(`
    <h2>Where We Stand</h2>
    <div style="margin-top:14px;">
      ${check("<b>Built</b> &mdash; across the full contracted scope")}
      ${check("<b>UAT-tested</b> by the HPSEDC team &mdash; UAT Final Report on record")}
      ${check("<b>Milestone-1 (40%) design approval</b> submitted &mdash; SRS + requirement traceability")}
      ${check("<b>Live on secure staging</b> &mdash; everything shown is the real platform")}
      ${check("<b>Ready for production hosting</b> on government infrastructure")}
    </div>`),

  "10-ask": chrome(`
    <h2>What We Need From IT</h2>
    <div style="display:flex;gap:24px;margin-top:14px;">
      <div style="flex:1;">
        ${sidebox("Two VMs &mdash; State Data Centre", "<b>STG</b> 4 vCPU / 8 GB / 100 GB<br><b>PROD</b> 8 vCPU / 16 GB / 200 GB<br>Sized for 5,000 concurrent users")}
        ${sidebox("Base software (pre-installed)", "Ubuntu 24.04 &middot; Node 20 &middot; PostgreSQL 16 &middot; Nginx")}
      </div>
      <div style="flex:1;">
        ${sidebox("Air-gapped model", "Isolated from internet &middot; SSH via jump host &middot; app delivered as pre-built artifact")}
        ${sidebox("Plus", "CA-issued TLS certs &middot; integration egress &middot; service account &middot; backup target")}
      </div>
    </div>
    <div style="text-align:center;margin-top:6px;font-size:15px;color:#9fc0e0;font-family:${SANS};">Full itemised request &mdash; HireStream Infrastructure Provisioning document</div>`),

  "11-close": chrome(`
    <div style="text-align:center;">
      <h1 style="font-size:72px;">HireStream</h1>
      <div class="lead" style="font-size:24px;margin-top:18px;color:#dbe9f7;">Safe &middot; Regulated &middot; Accountable overseas employment<br>for the youth of Himachal Pradesh</div>
      <div style="margin-top:30px;font-family:${SANS};font-size:16px;color:#9fc0e0;">Thank you &mdash; M/s HTIS Telecom Pvt. Ltd. &middot; htistelecom.in</div>
    </div>`),
};

// tail padding (seconds of held card after narration ends)
const TAIL = { default: 0.7, bridge: 0.5 };

const ids = Object.keys(vo).filter((id) => !onlyCard || id === onlyCard);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const manifest = {};

for (const id of ids) {
  const html = BODIES[id];
  if (!html) { console.log(`!! no body for ${id}, skipping`); continue; }
  // 1) TTS
  const wav = path.join(WAV_DIR, `${id}.wav`);
  piper(vo[id], wav);
  const aDur = durSec(wav);
  const tail = id.includes("bridge") ? TAIL.bridge : TAIL.default;
  const vDur = +(aDur + tail).toFixed(3);
  // 2) render PNG
  const png = path.join(PNG_DIR, `${id}.png`);
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  // 3) still-image MP4 with narration
  const out = path.join(OUT_DIR, `${id}.mp4`);
  execFileSync(FF, ["-y", "-loop", "1", "-i", png, "-i", wav,
    "-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast", "-crf", "20",
    "-pix_fmt", "yuv420p", "-r", "30", "-vf", "scale=1280:720", "-t", String(vDur),
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-movflags", "+faststart", out],
    { stdio: ["ignore", "ignore", "ignore"] });
  manifest[id] = { audioSec: +aDur.toFixed(2), videoSec: vDur };
  console.log(`${id.padEnd(20)} audio ${aDur.toFixed(1)}s  -> ${path.basename(out)}`);
}

await browser.close();
fs.writeFileSync(path.join(PRES, "build", "segments.json"), JSON.stringify(manifest, null, 2));
const total = Object.values(manifest).reduce((s, m) => s + m.videoSec, 0);
console.log(`\nCards total: ${(total / 60).toFixed(1)} min across ${Object.keys(manifest).length} segments`);
console.log("Wrote build/segments.json");
