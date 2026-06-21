// Mux the admin narration WAVs onto the recorded admin walkthrough at chapter
// offsets, exporting recordings/admin-oversight.mp4 (1280x720 h264/aac).
// Run AFTER the playwright admin recording:
//   node recordings/postprocess-admin.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/home/subhash.thakur.india/Projects/Recruitment/hirestream/package.json");
const FF = require("ffmpeg-static");

const HS = "/home/subhash.thakur.india/Projects/Recruitment/hirestream";
const VIDEO_DIR = path.join(HS, "test-results/video");
const WAV_DIR = "/tmp/vbuild/narration";
const OUT = "/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Presentation or Demo/recordings/admin-oversight.mp4";
const LEAD_MS = 250;

function vdur(file) {
  let out = ""; try { execFileSync(FF, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] }); }
  catch (e) { out = e.stderr?.toString() || ""; }
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}
function findVideo() {
  const d = fs.readdirSync(VIDEO_DIR).filter((x) => fs.existsSync(path.join(VIDEO_DIR, x, "video.webm")));
  return d.length ? path.join(VIDEO_DIR, d[0], "video.webm") : null;
}

const timing = path.join(VIDEO_DIR, "timing-admin.json");
const video = findVideo();
if (!fs.existsSync(timing) || !video) { console.error("Missing timing-admin.json or video.webm — run the recording first."); process.exit(1); }
const ctx = JSON.parse(fs.readFileSync(timing, "utf8"));
const dur = vdur(video);
console.log(`[admin] video ${dur}s, ${ctx.chapters.length} chapters`);

const clips = ctx.chapters
  .map((ch) => ({ wav: path.join(WAV_DIR, `admin-${ch.key}.wav`), offsetMs: Math.max(0, ch.offsetMs + LEAD_MS), ...ch }))
  .filter((c) => fs.existsSync(c.wav));

const inputs = ["-i", video];
clips.forEach((c) => inputs.push("-i", c.wav));
const parts = clips.map((c, k) => `[${k + 1}]adelay=${c.offsetMs}:all=1[a${k}]`);
const labels = clips.map((_, k) => `[a${k}]`).join("");
const mix = clips.length === 1
  ? `${parts[0]};[a0]anull[aout]`
  : `${parts.join(";")};${labels}amix=inputs=${clips.length}:normalize=0:dropout_transition=0[aout]`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
execFileSync(FF, ["-y", ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[aout]",
  "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart",
  ...(dur ? ["-t", String(dur)] : []), OUT], { stdio: ["ignore", "ignore", "inherit"] });

console.log(`→ ${OUT}  (${dur}s, ${clips.length} narration tracks)`);
