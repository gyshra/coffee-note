/**
 * scripts/create-icons.js
 * Pure Node.js PNG icon generator (no external deps)
 * Design: dark bg + cream coffee cup (top-view donut) + steam wisps
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── PNG encoder ──────────────────────────────────────────────
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf  = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(w, h, rgba) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB (we'll convert from RGBA by ignoring alpha—use RGB)
  // Actually let's use RGBA: color type 6
  ihdr[9] = 6; // RGBA

  // Raw image data: filter byte (0) + RGBA per row
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      row[1 + x * 4]     = rgba[i];
      row[1 + x * 4 + 1] = rgba[i + 1];
      row[1 + x * 4 + 2] = rgba[i + 2];
      row[1 + x * 4 + 3] = rgba[i + 3];
    }
    rows.push(row);
  }
  const raw  = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG sig
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon pixel logic ─────────────────────────────────────────
function dist(x, y, cx, cy) {
  const dx = x - cx, dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Smooth anti-aliased circle mask (0..1)
function circleMask(d, r, edge) {
  return Math.max(0, Math.min(1, (r + edge - d) / (2 * edge)));
}

// Blend src over dst (alpha compositing)
function blend(dst, src, alpha) {
  return Math.round(dst * (1 - alpha) + src * alpha);
}

function setPixel(buf, w, x, y, r, g, b, a) {
  const i = (y * w + x) * 4;
  const sa = a / 255;
  const da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa < 0.001) return;
  buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa);
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

function drawCircle(buf, w, cx, cy, r, R, G, B, A, edge = 1) {
  const x0 = Math.max(0, Math.floor(cx - r - edge));
  const x1 = Math.min(w - 1, Math.ceil(cx + r + edge));
  const y0 = Math.max(0, Math.floor(cy - r - edge));
  const y1 = Math.min(w - 1, Math.ceil(cy + r + edge));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = dist(x, y, cx, cy);
      const alpha = circleMask(d, r, edge);
      if (alpha > 0) setPixel(buf, w, x, y, R, G, B, Math.round(A * alpha));
    }
  }
}

// Draw a bezier-like wiggly steam line using thick dots
function drawSteam(buf, w, x0, y0, height, amp, color, size) {
  const steps = height * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + amp * Math.sin(t * Math.PI * 2.5);
    const y = y0 - t * height;
    const fade = 1 - t * t;
    drawCircle(buf, w, x, y, size * 0.8, ...color, Math.round(200 * fade), 1.5);
  }
}

function createIconBuffer(size) {
  const buf = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2, cy = size / 2;
  const S = size / 512; // scale factor

  // BG: #121212
  for (let i = 0; i < size * size; i++) {
    buf[i * 4]     = 18;
    buf[i * 4 + 1] = 18;
    buf[i * 4 + 2] = 18;
    buf[i * 4 + 3] = 255;
  }

  // Outer saucer ring (subtle)
  drawCircle(buf, size, cx, cy, 195 * S, 42, 40, 38, 220, 2);

  // Cup outer (cream): F0EDE8
  drawCircle(buf, size, cx, cy + 18 * S, 148 * S, 240, 237, 232, 255, 2);

  // Cup inner (coffee): #3B2214
  drawCircle(buf, size, cx, cy + 18 * S, 110 * S, 59, 34, 20, 255, 2);

  // Coffee surface highlight (crema)
  drawCircle(buf, size, cx - 22 * S, cy, 28 * S, 180, 130, 80, 80, 2);

  // Handle: right side rectangle approximation using dots
  {
    const hx = cx + 148 * S;
    const hy = cy + 18 * S;
    const hW = 26 * S, hH = 70 * S;
    // right arm
    for (let dy = -hH / 2; dy <= hH / 2; dy += 1) {
      drawCircle(buf, size, hx, hy + dy, hW * 0.4, 240, 237, 232, 255, 1);
    }
    // close top arc
    for (let ang = -Math.PI / 2; ang <= 0; ang += 0.05) {
      drawCircle(buf, size,
        hx - 12 * S + Math.cos(ang) * 12 * S,
        hy - hH / 2 + Math.sin(ang) * 12 * S,
        hW * 0.4, 240, 237, 232, 255, 1);
    }
    // close bottom arc
    for (let ang = 0; ang <= Math.PI / 2; ang += 0.05) {
      drawCircle(buf, size,
        hx - 12 * S + Math.cos(ang) * 12 * S,
        hy + hH / 2 + Math.sin(ang) * 12 * S,
        hW * 0.4, 240, 237, 232, 255, 1);
    }
    // hollow middle
    for (let dy = -hH / 2 + 12 * S; dy <= hH / 2 - 12 * S; dy += 1) {
      drawCircle(buf, size, hx, hy + dy, hW * 0.4 - 10 * S, 18, 18, 18, 255, 1);
    }
  }

  // Steam lines (3 wisps above cup)
  const steamY = cy - 130 * S;
  drawSteam(buf, size, cx - 36 * S, steamY, 55 * S, 10 * S, [240, 237, 232], 4 * S);
  drawSteam(buf, size, cx,          steamY, 65 * S, 12 * S, [240, 237, 232], 4 * S);
  drawSteam(buf, size, cx + 36 * S, steamY, 55 * S, 10 * S, [240, 237, 232], 4 * S);

  return buf;
}

// ── Generate ─────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'icons');

[192, 512].forEach(function(size) {
  const pixels = createIconBuffer(size);
  const png    = encodePNG(size, size, pixels);
  const file   = path.join(outDir, 'icon-' + size + '.png');
  fs.writeFileSync(file, png);
  console.log('✓ ' + file + ' (' + png.length + ' bytes)');
});
