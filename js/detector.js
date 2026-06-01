/**
 * detector.js — 图片格式自动检测
 * 三层级：扩展名 → MIME → 魔术字节
 */

// ─── 扩展名映射 ───
const EXT_MAP = {
  '.bmp':  'BMP',  '.dib':  'BMP',
  '.jpg':  'JPEG', '.jpeg': 'JPEG', '.jfif': 'JPEG', '.jpe': 'JPEG',
  '.png':  'PNG',
  '.gif':  'GIF',
  '.webp': 'WebP',
  '.avif': 'AVIF',
  '.heic': 'HEIF', '.heif': 'HEIF', '.hif': 'HEIF',
  '.tif':  'TIFF', '.tiff': 'TIFF',
  '.svg':  'SVG',
  '.ico':  'ICO', '.cur':  'ICO',
  '.tga':  'TGA', '.targa':'TGA','.vda':'TGA','.vst':'TGA',
  '.pnm':  'PNM', '.ppm':  'PNM', '.pgm':'PNM','.pbm':'PNM',
};

// ─── MIME 映射 ───
const MIME_MAP = {
  'image/bmp':                'BMP',
  'image/x-bmp':              'BMP',
  'image/x-ms-bmp':           'BMP',
  'image/jpeg':               'JPEG',
  'image/png':                'PNG',
  'image/gif':                'GIF',
  'image/webp':               'WebP',
  'image/avif':               'AVIF',
  'image/heic':               'HEIF',
  'image/heif':               'HEIF',
  'image/tiff':               'TIFF',
  'image/svg+xml':            'SVG',
  'image/x-icon':             'ICO',
  'image/vnd.microsoft.icon': 'ICO',
  'image/x-tga':              'TGA',
  'image/x-targa':            'TGA',
  'image/x-portable-pixmap':  'PNM',
  'image/x-portable-graymap': 'PNM',
  'image/x-portable-bitmap':  'PNM',
};

// ─── 魔术字节 ───
const MAGIC_SIGS = [
  { bytes: [0x42,0x4D],                     fmt: 'BMP'  },
  { bytes: [0xFF,0xD8,0xFF],                fmt: 'JPEG' },
  { bytes: [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A], fmt: 'PNG' },
  { bytes: [0x47,0x49,0x46,0x38],           fmt: 'GIF'  },  // GIF87a / GIF89a
  { bytes: [0x52,0x49,0x46,0x46],           fmt: 'WebP' },  // RIFF....WEBP
  { bytes: [0x00,0x00,0x00],                fmt: 'AVIF' },  // ftyp box: xx xx xx xx 66 74 79 70 61 76 69 66
  { bytes: [0x3C,0x73,0x76,0x67],           fmt: 'SVG'  },  // <svg
  { bytes: [0x49,0x49,0x2A,0x00],           fmt: 'TIFF' },  // little-endian
  { bytes: [0x4D,0x4D,0x00,0x2A],           fmt: 'TIFF' },  // big-endian
  { bytes: [0x00,0x00,0x01,0x00],           fmt: 'ICO'  },  // ICO header: reserved + type=1
  { bytes: [0x00,0x00,0x02,0x00],           fmt: 'ICO'  },  // CUR (cursor, treated as ICO)
  { bytes: [0x50,0x31],                     fmt: 'PNM'  },  // P1 (PBM ASCII)
  { bytes: [0x50,0x32],                     fmt: 'PNM'  },  // P2 (PGM ASCII)
  { bytes: [0x50,0x33],                     fmt: 'PNM'  },  // P3 (PPM ASCII)
  { bytes: [0x50,0x34],                     fmt: 'PNM'  },  // P4 (PBM binary)
  { bytes: [0x50,0x35],                     fmt: 'PNM'  },  // P5 (PGM binary)
  { bytes: [0x50,0x36],                     fmt: 'PNM'  },  // P6 (PPM binary)
];

/**
 * 检测文件格式（含参考格式识别）
 * @returns {Promise<{fmt: string, confidence: string, source: string, isRef: boolean}>}
 */
async function detectFormat(file) {
  const name = file.name.toLowerCase();
  const ext = name.lastIndexOf('.') >= 0 ? name.slice(name.lastIndexOf('.')) : '';

  if (EXT_MAP[ext]) {
    return { fmt: EXT_MAP[ext], confidence: 'high', source: `扩展名 ${ext}` };
  }

  // 第二层：MIME
  if (file.type && MIME_MAP[file.type]) {
    return { fmt: MIME_MAP[file.type], confidence: 'medium', source: `MIME ${file.type}` };
  }

  // 第三层：魔术字节
  try {
    const head = await readFileHead(file, 12);
    for (const sig of MAGIC_SIGS) {
      if (matches(head, sig.bytes)) {
        // WebP 需额外确认（RIFF 也是 AVI/WAV 的签名）
        if (sig.fmt === 'WebP') {
          const riff = await readFileHead(file, 16);
          const webpId = String.fromCharCode(...riff.slice(8, 12));
          if (webpId !== 'WEBP') continue;
        }
        // AVIF 需确认 ftyp 盒子
        if (sig.fmt === 'AVIF') {
          const ftyp = await readFileHead(file, 24);
          const brand = String.fromCharCode(...ftyp.slice(8, 12));
          if (brand !== 'avif' && brand !== 'avis') continue;
        }
        return { fmt: sig.fmt, confidence: 'medium', source: '魔术字节' };
      }
    }
  } catch (_) { /* fall through */ }

  return { fmt: null, confidence: 'low', source: '未知' };
}

function readFileHead(file, bytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

function matches(head, sig) {
  if (head.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (head[i] !== sig[i]) return false;
  }
  return true;
}
