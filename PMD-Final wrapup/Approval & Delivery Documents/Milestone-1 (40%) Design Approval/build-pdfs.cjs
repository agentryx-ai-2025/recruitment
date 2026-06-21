/* Govt-formatted PDF generator — Milestone-1 design-approval package.
 * Markdown -> richly styled HTML -> PDF (A4) via Playwright Chromium.
 * HTIS-branded (real logo), generated cover + TOC, section number badges,
 * status chips, and a CSS architecture diagram.
 * Run from the hirestream dir so `require('playwright')` resolves:
 *   cd ~/Projects/Recruitment/hirestream && NODE_PATH="$(pwd)/node_modules" \
 *     node "<this folder>/build-pdfs.cjs"
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR  = '/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Approval & Delivery Documents/Milestone-1 (40%) Design Approval';
const LOGO = '/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/htis_logo.png';
const LOGO_B64 = fs.readFileSync(LOGO).toString('base64');
const LOGO_URI = `data:image/png;base64,${LOGO_B64}`;

const FILES = [
  {
    md: '00_README_Index.md', out: '00_README_Index.pdf', kind: 'sheet',
    bandTitle: 'Design-Approval Submission — Package Index',
    bandNote: 'Milestone 1 (40%) · Overseas Placement Portal &amp; Mobile Application (HPSEDC)',
    footerDoc: 'Submission Index · WO HPSEDC-SOFT/08/2025',
  },
  {
    md: '01_SRS_System_Design_Document.md', out: '01_SRS_System_Design_Document.pdf', kind: 'report',
    docType: 'Software Requirements Specification & System Design Document',
    title: 'Overseas Placement Portal &amp; Mobile Application',
    subtitle: 'HPSEDC &nbsp;·&nbsp; <em>HireStream</em>',
    startMarker: '### Document Control',
    footerDoc: 'SRS &amp; System Design · WO HPSEDC-SOFT/08/2025',
    cover: {
      facts: [
        ['Prepared by', 'M/s HTIS Telecom Private Limited, Mohali'],
        ['Submitted to', 'HPSEDC, Shimla (Himachal Pradesh)'],
        ['Work Order', 'HPSEDC-SOFT/08/2025 · E-File 287782 · 13.01.2026'],
        ['RFE', 'SEDC/Software-EMP/2K24-22560'],
        ['Governing FRS', 'FRS for Overseas Placement Portal (HPSEDC)'],
        ['Document version', '1.0 — Design-Approval Submission'],
        ['Milestone', 'Payment Term 1 — Design approval (SRS/FRS) — 40%'],
        ['Classification', 'Government — Project Deliverable'],
      ],
    },
  },
  {
    md: '02_Forwarding_Letter.md', out: '02_Forwarding_Letter.pdf', kind: 'letter',
    startMarker: '**Ref. No.:**',
    footerDoc: 'Forwarding Letter · WO HPSEDC-SOFT/08/2025',
  },
  {
    md: '03_Design_Approval_Signoff.md', out: '03_Design_Approval_Signoff.pdf', kind: 'sheet',
    bandTitle: 'Design Approval — Departmental Sign-off',
    bandNote: 'For completion &amp; execution by the concerned department, HPSEDC',
    startMarker: '**Project:**',
    footerDoc: 'Design-Approval Sign-off · WO HPSEDC-SOFT/08/2025',
  },
  {
    md: '04_Milestone1_Deliverables_Checklist.md', out: '04_Milestone1_Deliverables_Checklist.pdf', kind: 'sheet',
    bandTitle: 'Milestone-1 (40%) — Deliverables Checklist',
    bandNote: 'Work Order Payment Term 1 · Design approval (SRS/FRS)',
    startMarker: '**Project:**',
    footerDoc: 'Deliverables Checklist · WO HPSEDC-SOFT/08/2025',
  },
];

/* ----------------------------- markdown -> html ----------------------------- */
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function chips(t){
  return t
    .replace(/✅/g,'<span class="chip ok">✓ Implemented</span>')
    .replace(/🔌/g,'<span class="chip plug">◑ Pluggable</span>')
    .replace(/⚠️?/g,'<span class="chip warn">! Note</span>')
    .replace(/☐/g,'<span class="ck"></span>')
    .replace(/✔/g,'<span class="tick">✔</span>');
}
function inline(text){
  const codes=[];
  text=text.replace(/`([^`]+)`/g,(_,c)=>{codes.push(c);return `  ${codes.length-1}  `;});
  text=escapeHtml(text);
  text=text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,t,u)=>`<a href="${u}">${t}</a>`);
  text=text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  text=text.replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
  text=text.replace(/(^|[^_\w])_([^_]+)_/g,'$1<em>$2</em>');
  text=text.replace(/  (\d+)  /g,(_,i)=>`<code>${escapeHtml(codes[+i])}</code>`);
  return chips(text);
}
function splitRow(line){let s=line.trim();if(s.startsWith('|'))s=s.slice(1);if(s.endsWith('|'))s=s.slice(0,-1);return s.split('|').map(c=>c.trim());}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}

/* bespoke CSS architecture diagram (replaces the ASCII block) */
const ARCH = `
<figure class="archfig"><figcaption>Figure 1 — Logical system architecture</figcaption>
<div class="arch">
  <div class="tier t-pres">
    <div class="tl">Presentation Tier</div>
    <div class="tb">Responsive Web SPA — React + Vite · Tailwind · Radix UI &nbsp;•&nbsp; Native Android / iOS apps (same REST API)</div>
  </div>
  <div class="flow">▼&nbsp;&nbsp;HTTPS / TLS &nbsp;·&nbsp; REST · JSON &nbsp;·&nbsp; <code>/api/v1</code></div>
  <div class="tier t-app">
    <div class="tl">Application Tier — Node.js + Express (PM2)</div>
    <div class="tb">
      <span class="bx">Auth &amp; session</span><span class="bx">RBAC middleware</span><span class="bx">Domain routes</span>
      <span class="bx">Matching engine</span><span class="bx">Notifications</span><span class="bx">Provider-config</span>
      <span class="bx">Security: Helmet · rate-limit · Zod</span><span class="bx">Audit &amp; logging</span>
    </div>
  </div>
  <div class="flow">▼&nbsp;&nbsp;SQL &nbsp;·&nbsp; Drizzle ORM</div>
  <div class="tier t-data">
    <div class="tl">Data Tier — PostgreSQL</div>
    <div class="tb">~36 relational tables + immutable audit log &nbsp;•&nbsp; Namespaced file store (documents / photos)</div>
  </div>
  <div class="sides">
    <div class="side"><b>Nginx</b><span>TLS termination · reverse proxy</span></div>
    <div class="side"><b>Pluggable integrations</b><span>HPSEDC-side credentials: HIM SSO · UIDAI/Aadhaar · DigiLocker · Email/SMS</span></div>
  </div>
</div></figure>`;

function mdToHtml(md, toc, softBreak){
  const lines=md.replace(/\r\n/g,'\n').split('\n');
  const out=[];let i=0;let para=[];let fig=1;
  const flush=()=>{if(para.length){const j=softBreak?para.map(inline).join('<br>'):inline(para.join(' '));out.push(`<p>${j}</p>`);para=[];}};
  while(i<lines.length){
    let line=lines[i];const tr=line.trim();
    if(tr.startsWith('```')){
      flush();const buf=[];i++;
      while(i<lines.length&&!lines[i].trim().startsWith('```')){buf.push(lines[i]);i++;}i++;
      if(buf.join('\n').includes('PRESENTATION TIER')){out.push(ARCH);}
      else{fig++;out.push(`<figure class="diagram"><figcaption>Figure ${fig}</figcaption><pre>${escapeHtml(buf.join('\n'))}</pre></figure>`);}
      continue;
    }
    if(tr.includes('|')&&i+1<lines.length&&/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i+1])&&lines[i+1].includes('-')){
      flush();const header=splitRow(line);
      const aligns=splitRow(lines[i+1]).map(c=>{const l=c.startsWith(':'),r=c.endsWith(':');return l&&r?'center':r?'right':'left';});
      i+=2;const rows=[];
      while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()!==''){rows.push(splitRow(lines[i]));i++;}
      let t='<table><thead><tr>';
      header.forEach((h,k)=>t+=`<th style="text-align:${aligns[k]}">${inline(h)}</th>`);
      t+='</tr></thead><tbody>';
      rows.forEach(r=>{t+='<tr>';r.forEach((c,k)=>t+=`<td style="text-align:${aligns[k]}">${inline(c)}</td>`);t+='</tr>';});
      t+='</tbody></table>';out.push(t);continue;
    }
    let m;
    if((m=tr.match(/^(#{1,6})\s+(.*)$/))){
      flush();const lvl=m[1].length;const txt=m[2];const id=slug(txt);
      if(lvl===2){
        toc.push({id,txt});
        const nm=txt.match(/^(\d+)\.\s+(.*)$/);
        if(nm){out.push(`<h2 id="${id}"><span class="secnum">${nm[1]}</span><span class="sectitle">${inline(nm[2])}</span></h2>`);}
        else{out.push(`<h2 id="${id}"><span class="sectitle">${inline(txt)}</span></h2>`);}
      } else {out.push(`<h${lvl} id="${id}">${inline(txt)}</h${lvl}>`);}
      i++;continue;
    }
    if(/^-{3,}$/.test(tr)||/^\*{3,}$/.test(tr)){flush();out.push('<hr/>');i++;continue;}
    if(tr.startsWith('>')){
      flush();const buf=[];
      while(i<lines.length&&lines[i].trim().startsWith('>')){buf.push(lines[i].trim().replace(/^>\s?/,''));i++;}
      out.push(`<div class="callout">${inline(buf.join(' '))}</div>`);continue;
    }
    if(/^\s*[-*]\s+/.test(line)){
      flush();let t='<ul>';
      while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){t+=`<li>${inline(lines[i].replace(/^\s*[-*]\s+/,''))}</li>`;i++;}
      t+='</ul>';out.push(t);continue;
    }
    if(/^\s*\d+\.\s+/.test(line)){
      flush();let t='<ol>';
      while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i])){t+=`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/,''))}</li>`;i++;}
      t+='</ol>';out.push(t);continue;
    }
    if(tr===''){flush();i++;continue;}
    para.push(tr);i++;
  }
  flush();return out.join('\n');
}

/* --------------------------------- styling --------------------------------- */
const NAVY='#0b3d6b', NAVY2='#16557f', GOLD='#c79a3a', INK='#1c2733', GREEN='#1c9a4b';
const CSS=`
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:Georgia,"Liberation Serif","DejaVu Serif",serif;font-size:10.4pt;color:${INK};line-height:1.5;}
  h1,h2,h3,h4,.san{font-family:"Liberation Sans","DejaVu Sans","Segoe UI",Arial,sans-serif;}

  /* cover */
  .cover{height:297mm;width:210mm;page-break-after:always;position:relative;}
  .cover .top{display:flex;justify-content:space-between;align-items:center;padding:11mm 16mm 7mm;border-bottom:3px solid ${GOLD};}
  .cover .top img{height:46px;}
  .cover .top .site{text-align:right;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;}
  .cover .top .site .a{font-size:9pt;color:${NAVY};font-weight:700;letter-spacing:.4px;}
  .cover .top .site .b{font-size:7.6pt;color:#7a8896;letter-spacing:1.6px;text-transform:uppercase;}
  .cover .band{background:linear-gradient(135deg,${NAVY} 0%,#08305a 100%);color:#fff;padding:26mm 16mm 22mm;position:relative;}
  .cover .band .doctype{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;text-transform:uppercase;letter-spacing:2.5px;font-size:9.5pt;color:#bcd4ec;margin-bottom:14px;}
  .cover .band h1{font-size:29pt;line-height:1.12;margin:0 0 10px;color:#fff;font-weight:700;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;}
  .cover .band .sub{font-size:15pt;color:#dbe8f5;}
  .cover .band .pf{margin-top:20px;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8.4pt;text-transform:uppercase;letter-spacing:1.4px;color:#8fb3d6;}
  .cover .band .pf b{color:#fff;font-weight:700;}
  .cover .controls{margin:13mm 16mm 0;}
  .cover .controls .title{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:10pt;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid ${GOLD};padding-bottom:5px;margin-bottom:8px;}
  .cover table.facts{width:100%;border-collapse:collapse;font-size:9.6pt;}
  .cover table.facts td{padding:6px 4px;border-bottom:1px solid #e3e9f0;vertical-align:top;}
  .cover table.facts td.k{width:33%;color:#5a6b7b;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8.6pt;text-transform:uppercase;letter-spacing:.5px;}
  .cover table.facts td.v{color:${INK};font-weight:600;}
  .cover .foot{position:absolute;bottom:12mm;left:16mm;right:16mm;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.6pt;color:#8696a6;border-top:1px solid #e3e9f0;padding-top:8px;text-align:center;letter-spacing:.3px;line-height:1.6;}

  /* TOC */
  .toc{page-break-after:always;padding-top:3mm;}
  .toc h2{background:transparent;color:${NAVY};font-size:17pt;margin:0 0 16px;padding:0 0 6px;border:none;border-bottom:2px solid ${GOLD};border-radius:0;}
  .toc h2 .sectitle{padding:0;}
  .toc ol{list-style:none;margin:0;padding:0;}
  .toc li{display:flex;align-items:baseline;padding:7px 0;border-bottom:1px dotted #cdd8e4;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:10.5pt;}
  .toc li .n{color:${GOLD};font-weight:700;width:26px;}
  .toc li .t{color:${INK};}

  /* body headings */
  h2{display:flex;align-items:center;gap:11px;font-size:13.5pt;color:#fff;background:${NAVY};padding:8px 14px;margin:22px 0 11px;border-left:5px solid ${GOLD};border-radius:3px;page-break-after:avoid;}
  h2 .secnum{flex:none;width:23px;height:23px;border-radius:50%;background:${GOLD};color:#10243a;font-size:11pt;font-weight:800;display:inline-flex;align-items:center;justify-content:center;}
  h2 .sectitle{font-weight:700;}
  h3{font-size:11.6pt;color:${NAVY2};margin:16px 0 6px;page-break-after:avoid;border-left:3px solid ${GOLD};padding-left:8px;}
  h4{font-size:10.4pt;color:${NAVY2};margin:12px 0 4px;page-break-after:avoid;}
  p{margin:6px 0;text-align:justify;}
  a{color:${NAVY};text-decoration:none;}
  strong{color:#10243a;}
  code{font-family:"Liberation Mono","DejaVu Sans Mono",monospace;background:#eef2f6;padding:1px 4px;border-radius:3px;font-size:8.8pt;color:#0a2f52;}
  hr{border:none;border-top:1px solid #d7e0ea;margin:14px 0;}
  ul,ol{margin:6px 0 6px 2px;padding-left:22px;}
  li{margin:3px 0;}

  .callout{border-left:4px solid ${GOLD};background:#fbf6ea;margin:12px 0;padding:9px 14px;color:#5a4a22;font-size:9.8pt;border-radius:0 4px 4px 0;}
  .callout strong{color:#7a5e16;}

  /* generic ascii figure (fallback) */
  figure.diagram{margin:12px 0;border:1px solid #cdd8e4;border-radius:5px;background:#f6f9fc;overflow:hidden;page-break-inside:avoid;}
  figure.diagram figcaption{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.6pt;text-transform:uppercase;letter-spacing:1.2px;color:#fff;background:${NAVY2};padding:3px 10px;}
  figure.diagram pre{font-family:"Liberation Mono","DejaVu Sans Mono",monospace;font-size:7.9pt;line-height:1.34;margin:0;padding:11px 13px;white-space:pre;color:#16314a;}

  /* CSS architecture diagram */
  figure.archfig{margin:14px 0;page-break-inside:avoid;}
  figure.archfig figcaption{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.8pt;text-transform:uppercase;letter-spacing:1.3px;color:${NAVY2};margin-bottom:7px;font-weight:700;}
  .arch{border:1px solid #cdd8e4;border-radius:7px;background:#f4f8fc;padding:14px 16px;}
  .arch .tier{border-radius:5px;overflow:hidden;border:1px solid #cdd8e4;}
  .arch .tl{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-weight:700;font-size:9pt;color:#fff;padding:5px 11px;}
  .arch .tb{font-size:8.6pt;padding:8px 11px;background:#fff;color:#2a3947;}
  .arch .t-pres .tl{background:${NAVY2};}
  .arch .t-app  .tl{background:${NAVY};}
  .arch .t-data .tl{background:#0a3358;}
  .arch .flow{text-align:center;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.8pt;color:#5a6b7b;padding:5px 0;letter-spacing:.4px;}
  .arch .bx{display:inline-block;background:#eaf1f8;border:1px solid #c9d8e6;color:#1d4063;border-radius:4px;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.7pt;padding:2px 7px;margin:2px 3px 2px 0;}
  .arch .sides{display:flex;gap:12px;margin-top:12px;}
  .arch .side{flex:1;background:#fff;border:1px dashed #b9c6d4;border-radius:5px;padding:7px 10px;}
  .arch .side b{display:block;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8.2pt;color:${NAVY};margin-bottom:2px;}
  .arch .side span{font-size:7.8pt;color:#5a6b7b;}

  table{width:100%;border-collapse:collapse;margin:11px 0;font-size:9.2pt;page-break-inside:auto;}
  th,td{border:1px solid #c4d0dd;padding:5px 8px;vertical-align:top;}
  th{background:${NAVY};color:#fff;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-weight:600;font-size:8.8pt;}
  tbody tr:nth-child(even){background:#f2f7fb;}
  tr{page-break-inside:avoid;}

  .chip{display:inline-block;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.8pt;font-weight:700;padding:1px 7px;border-radius:10px;white-space:nowrap;line-height:1.5;}
  .chip.ok{background:#e3f5e9;color:${GREEN};border:1px solid #9bd6b0;}
  .chip.plug{background:#fdf0db;color:#a5681a;border:1px solid #f0c98a;}
  .chip.warn{background:#fde8e8;color:#9e2a2a;border:1px solid #f0a9a9;}
  .ck{display:inline-block;width:11px;height:11px;border:1.4px solid #6b7d8c;border-radius:2px;vertical-align:-1px;}
  .tick{color:${GREEN};font-weight:700;}

  /* letterhead (forwarding letter) */
  .letterhead{display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:3px solid ${GOLD};margin-bottom:6px;}
  .letterhead img{height:44px;}
  .letterhead .addr{text-align:right;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8pt;color:#5a6b7b;line-height:1.5;}
  .letterhead .addr b{color:${NAVY};font-size:9pt;}
  .letterbody{font-size:11pt;line-height:1.74;margin-top:18px;}
  .letterbody p{margin:13px 0;text-align:justify;}
  .letterbody ol,.letterbody ul{margin:12px 0 12px 4px;padding-left:24px;}
  .letterbody li{margin:7px 0;}
  .letterbody hr{margin:20px 0;border-top:1px solid #d7e0ea;}
  .sigspace{height:46px;}

  /* sheet header band (index / sign-off / checklist) */
  .sheettop{display:flex;justify-content:space-between;align-items:center;padding-bottom:7px;border-bottom:2px solid ${GOLD};}
  .sheettop img{height:38px;}
  .sheettop .site{text-align:right;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;}
  .sheettop .site .a{font-size:8.6pt;color:${NAVY};font-weight:700;}
  .sheettop .site .b{font-size:7.2pt;color:#7a8896;letter-spacing:1.4px;text-transform:uppercase;}
  .bandbar{background:linear-gradient(135deg,${NAVY} 0%,#08305a 100%);color:#fff;border-left:5px solid ${GOLD};border-radius:3px;padding:11px 15px;margin:12px 0 14px;}
  .bandbar .bt{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:14pt;font-weight:700;}
  .bandbar .bn{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8.6pt;color:#bcd4ec;margin-top:3px;}
  .sheet h2{font-size:12pt;}
`;

function coverHtml(f){
  const facts=f.cover.facts.map(([k,v])=>`<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join('');
  return `<section class="cover">
    <div class="top">
      <img src="${LOGO_URI}"/>
      <div class="site"><div class="a">htistelecom.in</div><div class="b">System Integrators · Mohali</div></div>
    </div>
    <div class="band">
      <div class="doctype">${f.docType}</div>
      <h1>${f.title}</h1>
      <div class="sub">${f.subtitle}</div>
      <div class="pf">Prepared by <b>M/s HTIS Telecom Pvt. Ltd.</b> &nbsp;·&nbsp; Submitted to <b>HPSEDC, Shimla</b></div>
    </div>
    <div class="controls">
      <div class="title">Document Control</div>
      <table class="facts">${facts}</table>
    </div>
    <div class="foot">M/s HTIS Telecom Private Limited · E-94, 1st Floor, Eltop Area, Industrial Area Phase 8, Mohali · htistelecom.in<br/>
    Confidential — submitted to HPSEDC as a contractual project deliverable under Work Order HPSEDC-SOFT/08/2025, solely for evaluation &amp; design approval.</div>
  </section>`;
}
function tocHtml(toc){
  const items=toc.map(t=>`<li><span class="n">§</span><span class="t"><a href="#${t.id}">${t.txt}</a></span></li>`).join('');
  return `<section class="toc"><h2><span class="sectitle">Table of Contents</span></h2><ol>${items}</ol></section>`;
}
const { execFileSync } = require('child_process');
function wrap(pageCss, inner){
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{${pageCss}} ${CSS}</style></head><body>${inner}</body></html>`;
}
function readBody(f){
  let md=fs.readFileSync(path.join(DIR,f.md),'utf8');
  if(f.startMarker){const idx=md.indexOf(f.startMarker);if(idx>=0)md=md.slice(idx);}
  return md;
}
function coverDoc(f){ return wrap('size:A4;margin:0;', coverHtml(f)); }
function reportBodyDoc(f){
  const toc=[];const body=mdToHtml(readBody(f),toc);
  return wrap('size:A4;margin:20mm 15mm 16mm 15mm;', tocHtml(toc)+body);
}
function letterheadHtml(){
  return `<div class="letterhead"><img src="${LOGO_URI}"/>
    <div class="addr"><b>M/s HTIS Telecom Private Limited</b><br/>E-94, 1st Floor, Eltop Area, Industrial Area Phase 8, Mohali<br/>htistelecom.in</div></div>`;
}
function sheetTopHtml(f){
  return `<div class="sheettop"><img src="${LOGO_URI}"/>
    <div class="site"><div class="a">htistelecom.in</div><div class="b">System Integrators · Mohali</div></div></div>
    <div class="bandbar"><div class="bt">${f.bandTitle}</div>${f.bandNote?`<div class="bn">${f.bandNote}</div>`:''}</div>`;
}
function letterDoc(f){
  let body=mdToHtml(readBody(f),[],true);
  body=body.replace('<p>[SIGSPACE]</p>','<div class="sigspace"></div>');
  return wrap('size:A4;margin:16mm 18mm 16mm 18mm;', letterheadHtml()+`<div class="letterbody">${body}</div>`);
}
function sheetDoc(f){
  const body=mdToHtml(readBody(f),[]);
  return wrap('size:A4;margin:13mm 15mm 15mm 15mm;', `<div class="sheet">${sheetTopHtml(f)}${body}</div>`);
}
const SIMPLE_FOOTER=`<div style="width:100%;font-family:Arial;font-size:7pt;color:#9aa8b6;padding:0 15mm;display:flex;justify-content:space-between;">
  <span>M/s HTIS Telecom Pvt. Ltd. — Confidential · Project Deliverable</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;

(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage();
  for(const f of FILES){
    if(f.kind==='report'){
      const cov=path.join(DIR,'.cover.tmp.pdf'), bod=path.join(DIR,'.body.tmp.pdf');
      await page.setContent(coverDoc(f),{waitUntil:'networkidle'});
      await page.pdf({path:cov,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
      await page.setContent(reportBodyDoc(f),{waitUntil:'networkidle'});
      await page.pdf({
        path:bod,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,
        headerTemplate:`<div style="width:100%;padding:0 15mm;display:flex;justify-content:space-between;align-items:center;">
          <img src="${LOGO_URI}" style="height:13px;"/>
          <span style="font-family:Arial;font-size:7pt;color:#9aa8b6;">${f.footerDoc}</span></div>`,
        footerTemplate:SIMPLE_FOOTER,
      });
      execFileSync('pdfunite',[cov,bod,path.join(DIR,f.out)]);
      fs.unlinkSync(cov); fs.unlinkSync(bod);
    } else {
      const html = f.kind==='letter' ? letterDoc(f) : sheetDoc(f);
      await page.setContent(html,{waitUntil:'networkidle'});
      await page.pdf({
        path:path.join(DIR,f.out),printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,
        headerTemplate:'<div></div>', footerTemplate:SIMPLE_FOOTER,
      });
    }
    console.log('  ✓',f.out);
  }
  await browser.close();
  console.log('Done.');
})().catch(e=>{console.error(e);process.exit(1);});
