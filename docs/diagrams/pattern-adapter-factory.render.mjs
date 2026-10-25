/**
 * Export the five T3 UML diagrams with one PlantUML toolchain.
 * Usage: node docs/diagrams/pattern-adapter-factory.render.mjs
 *   --java <java executable> --plantuml-jar <jar> --sharp-module <module path>
 *   --scratch-dir <absolute directory outside repository>
 *   --output-dir <absolute Presentation/assets/new directory>
 *
 * No dependency installation, network access, or repository PNG writes.
 * PlantUML's DOT SVG export requires its documented UNSECURE profile; these
 * inputs are local, reviewed sources. No global security setting is changed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
for (const key of ['--plantuml-jar', '--scratch-dir', '--output-dir']) {
  if (!args.get(key)) throw new Error(`Required argument: ${key}`);
}
const require = createRequire(import.meta.url);
const sharp = require(args.get('--sharp-module') || 'sharp');
const sources = path.dirname(fileURLToPath(import.meta.url));
const scratch = path.resolve(args.get('--scratch-dir'));
const output = path.resolve(args.get('--output-dir'));
const repository = path.resolve(sources, '../..');
for (const dir of [scratch, output]) {
  const relative = path.relative(repository, dir);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
    throw new Error('Keep raster outputs and render scratch outside the repository.');
  }
  await fs.mkdir(dir, { recursive: true });
}
const diagrams = [
  ['pattern-strategy', 'N5a_strategy.png'],
  ['pattern-chain', 'N5b_chain.png'],
  ['pattern-state', 'N5c_state.png'],
  ['pattern-observer', 'N5d_observer.png'],
  ['pattern-adapter-factory', 'N5e_adapter_factory.png'],
];
execFileSync(args.get('--java') || 'java', [
  '-Djava.awt.headless=true', '-DPLANTUML_SECURITY_PROFILE=UNSECURE',
  '-jar', path.resolve(args.get('--plantuml-jar')), '-nbthread', '1',
  '-charset', 'UTF-8', '-tsvg', '-o', scratch,
  ...diagrams.map(([name]) => path.join(sources, `${name}.puml`)),
], { stdio: 'inherit', windowsHide: true });

async function svg(name) {
  const source = await fs.readFile(path.join(scratch, `${name}.svg`), 'utf8');
  if (/crashed|suppressed|Syntax Error|<script\b/i.test(source)) throw new Error(`Invalid render: ${name}`);
  const bounds = source.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!bounds) throw new Error(`Missing SVG bounds: ${name}`);
  return { source, width: Number(bounds[3]), height: Number(bounds[4]) };
}
const width = 2400, height = 1435, margin = 8;
const previewWidth = 662; // 4.6 in at 144 px/in on a 1920 px, 13 1/3 in slide.
const results = [];
for (const [name, filename] of diagrams) {
  let content, naturalWidth, naturalHeight;
  if (name === 'pattern-adapter-factory') {
    const a = await svg(`${name}-adapter`), f = await svg(`${name}-factory`);
    const gap = 18, noteHeight = 34;
    naturalWidth = a.width + gap + f.width;
    naturalHeight = Math.max(a.height, f.height) + noteHeight;
    const scale = Math.min((width - 2 * margin) / naturalWidth, (height - 2 * margin) / naturalHeight);
    const inputs = [];
    const left = Math.round((width - naturalWidth * scale) / 2);
    const top = Math.round((height - naturalHeight * scale) / 2);
    for (const [panel, x] of [[a, 0], [f, a.width + gap]]) {
      inputs.push({ input: await sharp(Buffer.from(panel.source)).resize({ width: Math.round(panel.width * scale) }).png().toBuffer(), left: left + Math.round(x * scale), top });
    }
    const note = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(naturalWidth * scale)}" height="${Math.ceil(noteHeight * scale)}"><text x="50%" y="${25 * scale}" text-anchor="middle" font-family="Arial" font-size="${22 * scale}" fill="#F17D00">InAppChannel = NotificationDeliveryService behaviour. Dashed = designed.</text></svg>`;
    inputs.push({ input: Buffer.from(note), left, top: top + Math.round(Math.max(a.height, f.height) * scale) });
    content = await sharp({ create: { width, height, channels: 3, background: 'white' } }).composite(inputs).png().toBuffer();
  } else {
    const drawing = await svg(name);
    naturalWidth = drawing.width; naturalHeight = drawing.height;
    const inner = await sharp(Buffer.from(drawing.source)).flatten({ background: 'white' }).resize({ width: width - 2 * margin, height: height - 2 * margin, fit: 'inside' }).png().toBuffer();
    const dimensions = await sharp(inner).metadata();
    content = await sharp({ create: { width, height, channels: 3, background: 'white' } }).composite([{ input: inner, left: Math.floor((width - dimensions.width) / 2), top: Math.floor((height - dimensions.height) / 2) }]).png().toBuffer();
  }
  const target = path.join(output, filename);
  await sharp(content).withMetadata({ density: 522 }).png().toFile(target);
  const metadata = await sharp(target).metadata();
  if (metadata.width !== width || metadata.height !== height) throw new Error(`Bad dimensions: ${filename}`);
  await sharp(content).resize({ width: previewWidth }).png().toFile(path.join(scratch, `${name}-slide-preview.png`));
  const minPreviewFont = 22 * Math.min((width - 2 * margin) / naturalWidth, (height - 2 * margin) / naturalHeight) * previewWidth / width;
  if (minPreviewFont < 14) throw new Error(`Slide text below 14 px: ${filename}`);
  results.push({ filename, width, height, aspect: width / height, minimumFontAt1920pxSlide: Number(minPreviewFont.toFixed(2)) });
}
await fs.writeFile(path.join(scratch, 'export-verification.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
