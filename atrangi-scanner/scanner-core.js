(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScannerCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUALITY_PRESETS = {
    low:       { label: 'Low',       dpi: 96,  jpegQuality: 0.66, maxPixels: 4_500_000 },
    medium:    { label: 'Medium',    dpi: 120, jpegQuality: 0.74, maxPixels: 6_500_000 },
    high:      { label: 'High',      dpi: 160, jpegQuality: 0.82, maxPixels: 9_000_000 },
    veryHigh:  { label: 'Very High', dpi: 200, jpegQuality: 0.88, maxPixels: 13_000_000 },
    ultraHigh: { label: 'Ultra High',dpi: 240, jpegQuality: 0.92, maxPixels: 18_000_000 },
    excellent: { label: 'Excellent', dpi: 300, jpegQuality: 0.96, maxPixels: 24_000_000 }
  };

  const PAGE_SIZES = {
    a4:     { label: 'A4', widthPt: 595.28, heightPt: 841.89 },
    a3:     { label: 'A3', widthPt: 841.89, heightPt: 1190.55 },
    a5:     { label: 'A5', widthPt: 419.53, heightPt: 595.28 },
    letter: { label: 'Letter', widthPt: 612, heightPt: 792 },
    legal:  { label: 'Legal', widthPt: 612, heightPt: 1008 },
    id:     { label: 'ID Card', widthPt: 242.65, heightPt: 153.07 },
    original: { label: 'Original', widthPt: null, heightPt: null }
  };

  const DOCUMENT_TYPES = {
    document: { label: 'Document', paired: false },
    multi: { label: 'Multi-page Document', paired: false },
    aadhaar: { label: 'Aadhaar Card', paired: true, layout: 'stack' },
    pan: { label: 'PAN Card', paired: false },
    passport: { label: 'Passport', paired: false },
    drivingLicence: { label: 'Driving Licence', paired: true, layout: 'stack' },
    voterId: { label: 'Voter ID', paired: true, layout: 'stack' },
    idCard: { label: 'ID Card', paired: true, layout: 'stack' },
    receipt: { label: 'Receipt / Bill', paired: false },
    certificate: { label: 'Certificate', paired: false },
    bank: { label: 'Bank / Passbook', paired: false },
    insurance: { label: 'Insurance Document', paired: false },
    medical: { label: 'Medical Document', paired: false },
    vehicle: { label: 'Vehicle Document', paired: true, layout: 'stack' },
    book: { label: 'Book / Notes', paired: false },
    photo: { label: 'Photo', paired: false },
    custom: { label: 'Custom Scan', paired: false }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sanitizeFilename(name) {
    const cleaned = String(name || 'Atrangi_Scan')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_\-.]+|[_\-.]+$/g, '');
    return cleaned || 'Atrangi_Scan';
  }

  function getQuality(key) {
    return QUALITY_PRESETS[key] || QUALITY_PRESETS.high;
  }

  function getPageSize(key, orientation, imageRatio) {
    const preset = PAGE_SIZES[key] || PAGE_SIZES.a4;
    let widthPt = preset.widthPt;
    let heightPt = preset.heightPt;
    if (key === 'original' || !widthPt || !heightPt) {
      const ratio = imageRatio && imageRatio > 0 ? imageRatio : 0.7071;
      widthPt = 595.28;
      heightPt = widthPt / ratio;
      if (heightPt > 1190.55) {
        heightPt = 1190.55;
        widthPt = heightPt * ratio;
      }
    }
    if (orientation === 'landscape' && heightPt > widthPt) [widthPt, heightPt] = [heightPt, widthPt];
    if (orientation === 'portrait' && widthPt > heightPt) [widthPt, heightPt] = [heightPt, widthPt];
    if (orientation === 'auto' && imageRatio) {
      const wantsLandscape = imageRatio > 1;
      if (wantsLandscape && heightPt > widthPt) [widthPt, heightPt] = [heightPt, widthPt];
      if (!wantsLandscape && widthPt > heightPt) [widthPt, heightPt] = [heightPt, widthPt];
    }
    return { label: preset.label, widthPt, heightPt };
  }

  function pagePixelSize(widthPt, heightPt, dpi, maxPixels) {
    const scale = dpi / 72;
    let width = Math.max(1, Math.round(widthPt * scale));
    let height = Math.max(1, Math.round(heightPt * scale));
    const pixels = width * height;
    if (pixels > maxPixels) {
      const factor = Math.sqrt(maxPixels / pixels);
      width = Math.max(1, Math.round(width * factor));
      height = Math.max(1, Math.round(height * factor));
    }
    return { width, height };
  }

  function buildExportGroups(pages, documentType) {
    const type = DOCUMENT_TYPES[documentType] || DOCUMENT_TYPES.document;
    if (!type.paired) return pages.map((p) => [p]);
    const groups = [];
    for (let i = 0; i < pages.length; i += 2) groups.push(pages.slice(i, i + 2));
    return groups;
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1] || '';
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(base64, 'base64'));
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function ascii(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    return Uint8Array.from(Buffer.from(str, 'binary'));
  }

  function concatBytes(chunks) {
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((c) => { out.set(c, offset); offset += c.length; });
    return out;
  }

  function buildPdf(pages) {
    if (!pages || !pages.length) throw new Error('At least one page is required');
    const chunks = [];
    const offsets = [0];
    let byteLength = 0;
    const push = (bytes) => { chunks.push(bytes); byteLength += bytes.length; };
    const pushText = (text) => push(ascii(text));

    push(ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));

    const pageObjNums = pages.map((_, i) => 3 + i * 3);
    const contentObjNums = pages.map((_, i) => 4 + i * 3);
    const imageObjNums = pages.map((_, i) => 5 + i * 3);
    const totalObjects = 2 + pages.length * 3;

    function beginObj(n) { offsets[n] = byteLength; pushText(`${n} 0 obj\n`); }
    function endObj() { pushText('endobj\n'); }

    beginObj(1);
    pushText('<< /Type /Catalog /Pages 2 0 R >>\n');
    endObj();

    beginObj(2);
    pushText(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] >>\n`);
    endObj();

    pages.forEach((page, i) => {
      const pObj = pageObjNums[i], cObj = contentObjNums[i], imObj = imageObjNums[i];
      const w = Number(page.pageWidthPt.toFixed(2));
      const h = Number(page.pageHeightPt.toFixed(2));
      const content = `q\n${w} 0 0 ${h} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
      const contentBytes = ascii(content);

      beginObj(pObj);
      pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i + 1} ${imObj} 0 R >> >> /Contents ${cObj} 0 R >>\n`);
      endObj();

      beginObj(cObj);
      pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
      push(contentBytes);
      pushText('endstream\n');
      endObj();

      beginObj(imObj);
      pushText(`<< /Type /XObject /Subtype /Image /Width ${page.imageWidth} /Height ${page.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\nstream\n`);
      push(page.jpegBytes);
      pushText('\nendstream\n');
      endObj();
    });

    const xrefOffset = byteLength;
    pushText(`xref\n0 ${totalObjects + 1}\n`);
    pushText('0000000000 65535 f \n');
    for (let i = 1; i <= totalObjects; i++) pushText(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    pushText(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return concatBytes(chunks);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  return {
    QUALITY_PRESETS, PAGE_SIZES, DOCUMENT_TYPES, clamp, sanitizeFilename,
    getQuality, getPageSize, pagePixelSize, buildExportGroups, dataUrlToBytes,
    concatBytes, buildPdf, escapeHtml
  };
});
