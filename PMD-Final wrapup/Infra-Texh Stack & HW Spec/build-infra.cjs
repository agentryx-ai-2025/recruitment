/* HireStream Infrastructure Provisioning Request — branded A4 PDF.
 * Run from hirestream dir so `require('playwright')` resolves:
 *   cd ~/Projects/Recruitment/hirestream && NODE_PATH="$(pwd)/node_modules" \
 *     node "../PMD-Final wrapup/Infra-Texh Stack & HW Spec/build-infra.cjs"
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR  = '/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Infra-Texh Stack & HW Spec';
const LOGO = '/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/htis_logo.png';
const LOGO_URI = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`;
const MD = 'HireStream_Infra_Provisioning_Request.md';
const OUT = 'HireStream_Infra_Provisioning_Request.pdf';
const BAND_TITLE = 'HireStream — Infrastructure Provisioning Request';
const BAND_NOTE = 'Hardware · Software · Network · Access — Staging &amp; Production · HPSEDC';

const NAVY='#0b3d6b', NAVY2='#16557f', GOLD='#c79a3a', INK='#1c2733', GREEN='#1c9a4b';

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function chips(t){
  return t
    .replace(/☐/g,'<span class="ck"></span>')
    .replace(/✓/g,'<span class="tick">✓</span>');
}
function inline(text){
  const codes=[];
  text=text.replace(/`([^`]+)`/g,(_,c)=>{codes.push(c);return `  ${codes.length-1}  `;});
  text=escapeHtml(text);
  text=text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  text=text.replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
  text=text.replace(/  (\d+)  /g,(_,i)=>`<code>${escapeHtml(codes[+i])}</code>`);
  return chips(text);
}
function splitRow(line){let s=line.trim();if(s.startsWith('|'))s=s.slice(1);if(s.endsWith('|'))s=s.slice(0,-1);return s.split('|').map(c=>c.trim());}

function mdToHtml(md){
  const lines=md.replace(/\r\n/g,'\n').split('\n');
  const out=[];let i=0;let para=[];
  const flush=()=>{if(para.length){out.push(`<p>${inline(para.join(' '))}</p>`);para=[];}};
  while(i<lines.length){
    let line=lines[i];const tr=line.trim();
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

const CSS=`
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:Georgia,"Liberation Serif","DejaVu Serif",serif;font-size:9.4pt;color:${INK};line-height:1.42;}
  h1,h2,h3,.san{font-family:"Liberation Sans","DejaVu Sans","Segoe UI",Arial,sans-serif;}
  .sheettop{display:flex;justify-content:space-between;align-items:center;padding-bottom:7px;border-bottom:2px solid ${GOLD};}
  .sheettop img{height:40px;}
  .sheettop .site{text-align:right;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;}
  .sheettop .site .a{font-size:8.6pt;color:${NAVY};font-weight:700;}
  .sheettop .site .b{font-size:7.2pt;color:#7a8896;letter-spacing:1.4px;text-transform:uppercase;}
  .bandbar{background:linear-gradient(135deg,${NAVY} 0%,#08305a 100%);color:#fff;border-left:5px solid ${GOLD};border-radius:3px;padding:11px 15px;margin:12px 0 12px;}
  .bandbar .bt{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:14.5pt;font-weight:700;}
  .bandbar .bn{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:8.4pt;color:#bcd4ec;margin-top:3px;}
  p{margin:5px 0;text-align:justify;}
  h2{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:11pt;color:#fff;background:${NAVY};padding:6px 11px;margin:14px 0 6px;border-left:5px solid ${GOLD};border-radius:3px;page-break-after:avoid;}
  h3{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-size:10pt;color:${NAVY2};margin:10px 0 4px;border-left:3px solid ${GOLD};padding-left:8px;page-break-after:avoid;}
  strong{color:#10243a;}
  code{font-family:"Liberation Mono","DejaVu Sans Mono",monospace;background:#eef2f6;padding:1px 4px;border-radius:3px;font-size:8.4pt;color:#0a2f52;}
  hr{border:none;border-top:1px solid #d7e0ea;margin:10px 0;}
  ul,ol{margin:5px 0 5px 2px;padding-left:20px;}
  li{margin:3px 0;}
  .callout{border-left:4px solid ${GOLD};background:#fbf6ea;margin:9px 0;padding:8px 13px;color:#5a4a22;font-size:9.2pt;border-radius:0 4px 4px 0;}
  .callout strong{color:#7a5e16;}
  table{width:100%;border-collapse:collapse;margin:5px 0 9px;font-size:8.7pt;page-break-inside:auto;}
  th,td{border:1px solid #c4d0dd;padding:3px 7px;vertical-align:top;}
  tr{page-break-inside:avoid;}
  thead{display:table-header-group;}
  th{background:${NAVY};color:#fff;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;font-weight:600;font-size:8.4pt;}
  tbody tr:nth-child(even){background:#f2f7fb;}
  .ck{display:inline-block;width:11px;height:11px;border:1.4px solid #6b7d8c;border-radius:2px;vertical-align:-1px;margin-right:5px;}
  .tick{color:${GREEN};font-weight:700;}
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
      <span>HireStream — Infrastructure Provisioning Request · M/s HTIS Telecom Pvt. Ltd. · htistelecom.in</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  await browser.close();
  console.log('  ✓',OUT);
})().catch(e=>{console.error(e);process.exit(1);});
