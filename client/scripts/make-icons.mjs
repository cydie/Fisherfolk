import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, payload, crc]);
}

function writePng(size, file) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const i = row + 1 + x * 3;
      const cx = x - size / 2 + 0.5;
      const cy = y - size / 2 + 0.5;
      const d = Math.sqrt(cx * cx + cy * cy) / (size / 2);
      if (d > 0.98) {
        raw[i] = 255;
        raw[i + 1] = 255;
        raw[i + 2] = 255;
      } else if (d > 0.86) {
        raw[i] = 248;
        raw[i + 1] = 231;
        raw[i + 2] = 160;
      } else {
        const t = y / size;
        raw[i] = Math.round(30 + t * 15);
        raw[i + 1] = Math.round(80 + t * 40);
        raw[i + 2] = Math.round(148 - t * 40);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(file, png);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public");
writePng(192, join(dir, "icon-192.png"));
writePng(512, join(dir, "icon-512.png"));
console.log("Wrote PWA icons");
