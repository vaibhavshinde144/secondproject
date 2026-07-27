# Atrangi Scanner

Responsive PWA document scanner for mobile, laptop and tablet browsers.

## Features
- Camera capture and multi-image gallery upload
- Single or multi-page document scans
- Aadhaar, Driving Licence, Voter ID, generic ID and vehicle presets that place front + back on the same output page
- PAN, passport, receipt/bill, certificate, bank/passbook, insurance, medical, book/notes, photo and custom scan presets
- Crop, rotate, enhance, grayscale and black/white filters
- Page reorder and removal
- Export to dependency-free PDF, Word-compatible `.doc`, JPEG or PNG
- Quality: Low, Medium, High, Very High, Ultra High, Excellent
- A4, A3, A5, Letter, Legal, ID Card and original-ratio page sizes
- Auto, Portrait and Landscape orientation
- Installable PWA and device-side processing

## Test
```bash
npm test
```
For a browser self-test, open `?selftest=1` on the app URL and check `data-self-test="PASS"` on the document body.

## Privacy
Atrangi Scanner has no upload API. Images are processed in the user's browser. Files only leave the device if the user explicitly shares or uploads exported files elsewhere.
