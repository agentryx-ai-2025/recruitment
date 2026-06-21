/* HireStream Tech Stack — branded A4 PDF (markdown -> styled HTML -> PDF).
 * Run from hirestream dir so `require('playwright')` resolves:
 *   cd ~/Projects/Recruitment/hirestream && NODE_PATH="$(pwd)/node_modules" \
 *     node "../PMD-Final wrapup/Architecture & Logic/build-techstack.cjs"
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR  = '/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Infra-Texh Stack & HW Spec';
const LOGO = '/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/htis_logo.png';
const LOGO_URI = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`;
const MD = 'HireStream_Tech_Stack.md';
const OUT = 'HireStream_Tech_Stack.pdf';
const BAND_TITLE = 'HireStream — Technology Stack';
const BAND_NOTE = 'Overseas Placement Portal &amp; Mobile Application · HPSEDC';

const NAVY='#0b3d6b', NAVY2='#16557f', GOLD='#c79a3a', INK='#1c2733';

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function inline(text){
  const codes=[];
  text=text.replace(/`([^`]+)`/g,(_,c)=>{codes.push(c);return `  ${codes.length-1}  `;});
  text=escapeHtml(text);
  text=text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  text=text.replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
  text=text.replace(/  (\d+)  /g,(_,i)=>`<code>${escapeHtml(codes[+i])}</code>`);
  return text;
}
function splitRow(line){let s=line.trim();if(s.startsWith('|'))s=s.slice(1);if(s.endsWith('|'))s=s.slice(0,-1);return s.split('|').map(c=>c.trim());}

const ARCH = `
<figure class="archfig"><figcaption>System architecture — three logical tiers</figcaption>
<div class="arch">
  <div class="tier t-pres"><div class="tl">Presentation</div><div class="tb">Responsive Web SPA (React + Vite · Tailwind) &nbsp;•&nbsp; React Native + Expo apps (Android / iOS)</div></div>
  <div class="flow">▼&nbsp;&nbsp;HTTPS / TLS · REST · JSON · <code>/api/v1</code></div>
  <div class="tier t-app"><div class="tl">Application — Node.js + Express</div><div class="tb"><span class="bx">RBAC &amp; auth</span><span class="bx">Domain APIs</span><span class="bx">Matching engine</span><span class="bx">Notifications</span><span class="bx">Security: Helmet · rate-limit · Zod</span><span class="bx">Audit log</span></div></div>
  <div class="flow">▼&nbsp;&nbsp;Drizzle ORM</div>
  <div class="tier t-data"><div class="tl">Data — PostgreSQL</div><div class="tb">~36 tables + immutable audit log &nbsp;•&nbsp; namespaced file storage</div></div>
  <div class="sides"><div class="side"><b>Nginx · PM2 · Linux</b><span>TLS reverse proxy · process mgmt · gov-cloud / SDC</span></div><div class="side"><b>Pluggable integrations</b><span>HIM SSO · Aadhaar/UIDAI · DigiLocker · Email/SMS</span></div></div>
</div></figure>`;

function mdToHtml(md){
  const lines=md.replace(/\r\n/g,'\n').split('\n');
  const out=[];let i=0;let para=[];
  const flush=()=>{if(para.length){out.push(`<p>${inline(para.join(' '))}</p>`);para=[];}};
  while(i<lines.length){
    let line=lines[i];const tr=line.trim();
    if(tr.startsWith('```')){
      flush();const buf=[];i++;
      while(i<lines.length&&!lines[i].trim().startsWith('```')){buf.push(lines[i]);i++;}i++;
      out.push(buf.join('').includes('ARCH')?ARCH:`<pre>${escapeHtml(buf.join('\n'))}</pre>`);
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
    if((m=tr.match(/^(#{1,6})\s+(.*)$/))){flush();const l=m[1].length;out.push(`<h${l}>${inline(m[2])}</h${l}>`);i++;continue;}
    if(/^-{3,}$/.test(tr)){flush();out.push('<hr/>');i++;continue;}
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
    if(tr===''){flush();i++;continue;}
    para.push(tr);i++;
  }
  flush();return out.join('\n');
}

const CSS=`
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:Georgia,"Liberation Serif","DejaVu Serif",serif;font-size:9.3pt;color:${INK};line-height:1.38;}
  h1,h2,h3,.san{font-family:"Liberation Sans","DejaVu Sans","Segoe UI",Arial,sans-serif;}
  .sheettop{display:flex;justify-content:space-between;align-items:center;padding-bottom:7px;border-bottom:2px solid ${GOLD};}
  .sheettop img{height:40px;}
  .sheettop .site{text-align:right;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;}
  .sheettop .site .a{font-size:8.6pt;color:${NAVY};font-weight:700;}
  .sheettop .site .b{font-size:7.2pt;color:#7a8896;letter-spacing:1.4px;text-transform:uppercase;}
  .bandbar{background:linear-gradient(135deg,${NAVY} 0%,#08305a 100%);color:#fff;border-left:5px solid ${GOLD};border-radius:3px;padding:11px 15px;margin:12px 0 12px;}
  .bandbar .bt{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:15pt;font-weight:700;}
  .bandbar .bn{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8.6pt;color:#bcd4ec;margin-top:3px;}
  p{margin:5px 0;text-align:justify;}
  h2{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:10.5pt;color:${NAVY};margin:9px 0 4px;padding-left:9px;border-left:4px solid ${GOLD};page-break-after:avoid;}
  strong{color:#10243a;}
  code{font-family:"Liberation Mono","DejaVu Sans Mono",monospace;background:#eef2f6;padding:1px 4px;border-radius:3px;font-size:8.4pt;color:#0a2f52;}
  hr{border:none;border-top:1px solid #d7e0ea;margin:10px 0;}
  ul{margin:5px 0 5px 2px;padding-left:20px;}
  li{margin:2.5px 0;}
  .callout{border-left:4px solid ${GOLD};background:#fbf6ea;margin:8px 0;padding:8px 13px;color:#5a4a22;font-size:9.4pt;border-radius:0 4px 4px 0;}
  .callout strong{color:#7a5e16;}
  table{width:100%;border-collapse:collapse;margin:4px 0 7px;font-size:8.7pt;page-break-inside:avoid;}
  th,td{border:1px solid #c4d0dd;padding:3px 7px;vertical-align:top;}
  th{background:${NAVY};color:#fff;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-weight:600;font-size:8.4pt;}
  td:first-child{width:30%;font-weight:600;color:#2a3947;}
  tbody tr:nth-child(even){background:#f2f7fb;}
  figure.archfig{margin:10px 0;page-break-inside:avoid;}
  figure.archfig figcaption{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.6pt;text-transform:uppercase;letter-spacing:1.2px;color:${NAVY2};margin-bottom:6px;font-weight:700;}
  .arch{border:1px solid #cdd8e4;border-radius:6px;background:#f4f8fc;padding:11px 13px;}
  .arch .tier{border-radius:5px;overflow:hidden;border:1px solid #cdd8e4;}
  .arch .tl{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-weight:700;font-size:8.6pt;color:#fff;padding:4px 10px;}
  .arch .tb{font-size:8.3pt;padding:6px 10px;background:#fff;color:#2a3947;}
  .arch .t-pres .tl{background:${NAVY2};}.arch .t-app .tl{background:${NAVY};}.arch .t-data .tl{background:#0a3358;}
  .arch .flow{text-align:center;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.6pt;color:#5a6b7b;padding:4px 0;}
  .arch .bx{display:inline-block;background:#eaf1f8;border:1px solid #c9d8e6;color:#1d4063;border-radius:4px;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:7.5pt;padding:2px 7px;margin:2px 3px 2px 0;}
  .arch .sides{display:flex;gap:11px;margin-top:10px;}
  .arch .side{flex:1;background:#fff;border:1px dashed #b9c6d4;border-radius:5px;padding:6px 9px;}
  .arch .side b{display:block;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8pt;color:${NAVY};margin-bottom:2px;}
  .arch .side span{font-size:7.6pt;color:#5a6b7b;}
`;

(async()=>{
  const body=mdToHtml(fs.readFileSync(path.join(DIR,MD),'utf8'));
  const html=`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:13mm 15mm 15mm 15mm;} ${CSS}</style></head><body>
    <div class="sheettop"><img src="${LOGO_URI}"/><div class="site"><div class="a">htistelecom.in</div><div class="b">System Integrators · Mohali</div></div></div>
    <div class="bandbar"><div class="bt">${BAND_TITLE}</div><div class="bn">${BAND_NOTE}</div></div>
    ${body}</body></html>`;
  const browser=await chromium.launch();
  const page=await browser.newPage();
  await page.setContent(html,{waitUntil:'networkidle'});
  await page.pdf({
    path:path.join(DIR,OUT),printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,
    headerTemplate:'<div></div>',
    footerTemplate:`<div style="width:100%;font-family:Arial;font-size:7pt;color:#9aa8b6;padding:0 15mm;display:flex;justify-content:space-between;">
      <span>HireStream — Technology Stack · M/s HTIS Telecom Pvt. Ltd. · htistelecom.in</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  await browser.close();
  console.log('  ✓',OUT);
})().catch(e=>{console.error(e);process.exit(1);});
