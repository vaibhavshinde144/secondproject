const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../scanner-core.js');

test('paired document groups front/back together', () => {
  const pages=[{id:1},{id:2},{id:3}];
  const groups=C.buildExportGroups(pages,'aadhaar');
  assert.equal(groups.length,2); assert.deepEqual(groups[0],[pages[0],pages[1]]); assert.deepEqual(groups[1],[pages[2]]);
});

test('normal documents keep one input page per output page', () => {
  const pages=[{id:1},{id:2}]; assert.equal(C.buildExportGroups(pages,'multi').length,2);
});

test('quality and page size presets resolve safely', () => {
  assert.equal(C.getQuality('excellent').dpi,300);
  const a4=C.getPageSize('a4','landscape',1); assert.ok(a4.widthPt>a4.heightPt);
  const px=C.pagePixelSize(a4.widthPt,a4.heightPt,300,1_000_000); assert.ok(px.width*px.height<=1_005_000);
});

test('filename sanitization removes invalid path characters', () => {
  assert.equal(C.sanitizeFilename(' My / Scan: 01? '),'My_-_Scan-_01');
});

test('PDF writer produces PDF/xref/trailer with one JPEG object', () => {
  const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const pdf=C.buildPdf([{jpegBytes:jpeg,imageWidth:1,imageHeight:1,pageWidthPt:595.28,pageHeightPt:841.89}]);
  const text=Buffer.from(pdf).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4')); assert.match(text,/\/Count 1/); assert.match(text,/\/Filter \/DCTDecode/); assert.match(text,/xref\n0 6/); assert.ok(text.endsWith('%%EOF'));
});
