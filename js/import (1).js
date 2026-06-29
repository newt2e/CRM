// nexus/js/import.js
// Import Framework — Nexus Global Partnerships Workspace
//
// Pipeline:
//   1. ACCEPT   — user selects a file
//   2. EXTRACT  — pull raw content from the file (text, rows, slides, paragraphs)
//   3. MAP      — user selects Country, Account, Site, Category
//   4. COMMIT   — write structured data into the correct Nexus store
//
// AI classification slot:
//   classifyExtracted() runs between EXTRACT and MAP.
//   Currently uses keyword signals only.
//   To add AI: replace the body of classifyExtracted() with a fetch() to your
//   chosen API. Receive structured JSON, populate IMP.hint, call renderStep3().
//
// Supported file types:
//   .xlsx  — Excel workbooks (sheet-by-sheet extraction)
//   .docx  — Word documents (paragraph extraction)
//   .pdf   — PDF documents (page-by-page text extraction via pdf.js)
//   .pptx  — PowerPoint (slide text extraction via JSZip + DOMParser)
//   .mov / .mp4 — Video (metadata only; user adds notes manually)
//
// External dependencies (loaded in index.html):
//   XLSX    — https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
//   JSZip   — https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
//   pdf.js  — https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Maps common country name variants to the CINFO key used throughout the app.
// Add entries here when importing from new regions.
var COUNTRY_MAP = {
  'usa':'USA', 'us':'USA', 'united states':'USA', 'united states of america':'USA',
  'germany':'Germany', 'de':'Germany', 'deutschland':'Germany',
  'singapore':'Singapore', 'sg':'Singapore',
  'australia':'Australia', 'au':'Australia',
  'hong kong':'HongKong', 'hk':'HongKong', 'hongkong':'HongKong',
  'new zealand':'NewZealand', 'nz':'NewZealand',
  'japan':'Japan', 'jp':'Japan',
  'spain':'Spain', 'es':'Spain',
  'canada':'Canada', 'ca':'Canada',
  'italy':'Italy', 'it':'Italy'
};

function normaliseCountry(raw) {
  if (!raw) return '';
  return COUNTRY_MAP[raw.toString().toLowerCase().trim()] || raw;
}

function normaliseSector(raw) {
  var s = (raw || '').toLowerCase();
  if (s.indexOf('health') > -1) return 'Healthcare';
  if (s.indexOf('edu')    > -1) return 'Education';
  if (s.indexOf('levy')   > -1) return 'Levy';
  return 'B & I';
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT STATE OBJECT
// ─────────────────────────────────────────────────────────────────────────────
//
// IMP holds all state for the current import session.
// Reset on each new file upload via resetIMP().
//
// IMP.file        — source file metadata (name, type, size, uploadedAt)
//                   IMP.file.raw (ArrayBuffer) is kept for future AI use
//
// IMP.extracted   — raw content pulled from the file, before any mapping:
//   .text         — full plain text (all file types)
//   .sheets[]     — [{name, rows[]}] for xlsx
//   .slides[]     — [{index, texts[]}] for pptx
//   .paragraphs[] — string[] for docx and pdf
//   .pdfPages     — page count for pdf
//   .videoMeta    — {filename, sizeMB} for video
//
// IMP.mapping     — user selections from Step 3:
//   .country      — CINFO key e.g. 'Germany'
//   .accountId    — ADATA key or null (country-level if null)
//   .siteId       — site identifier within the account or null
//   .category     — key from IMPORT_CATEGORIES
//
// IMP.hint        — output of classifyExtracted() (AI hook output slot):
//   .signals[]    — detected content signals e.g. ['license-sheet', 'hardware']
//   .suggested    — suggested category key or null
//
// IMP.source      — audit record stored with committed data:
//   .filename, .type, .uploadedAt, .uploadedBy, .sizeMB

var IMP = {
  file:      { name:'', type:'', size:0, uploadedAt:'', raw:null },
  extracted: { text:'', sheets:[], slides:[], paragraphs:[], pdfPages:0, videoMeta:null },
  mapping:   { country:null, accountId:null, siteId:null, category:null },
  hint:      { signals:[], suggested:null },
  source:    { filename:'', type:'', uploadedAt:'', uploadedBy:'', sizeMB:'' }
};

function resetIMP() {
  IMP.file      = { name:'', type:'', size:0, uploadedAt:'', raw:null };
  IMP.extracted = { text:'', sheets:[], slides:[], paragraphs:[], pdfPages:0, videoMeta:null };
  IMP.mapping   = { country: IMP.mapping.country, accountId:null, siteId:null, category:null };
  IMP.hint      = { signals:[], suggested:null };
  IMP.source    = { filename:'', type:'', uploadedAt:'', uploadedBy:'', sizeMB:'' };
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
//
// Each category defines where extracted content is written on commit.
// Groups control how categories are displayed in the UI.
//
// To add a new category:
//   1. Add an entry here
//   2. Add a handler block in commitImport()

var IMPORT_CATEGORIES = [
  // ── Account data ──────────────────────────────────────────────────────────
  {
    key:   'accounts',
    label: 'Accounts & Sites',
    icon:  '🏢',
    dest:  'Creates or updates accounts',
    group: 'Account Data'
  },
  {
    key:   'contacts',
    label: 'Contacts',
    icon:  '👤',
    dest:  'Account → Contacts tab',
    group: 'Account Data'
  },
  {
    key:   'hardware',
    label: 'Hardware',
    icon:  '🖥',
    dest:  'Account → Hardware tab',
    group: 'Account Data'
  },
  // ── Operations ────────────────────────────────────────────────────────────
  {
    key:   'activity',
    label: 'Activity / Meeting Notes',
    icon:  '📝',
    dest:  'Account or Country → Activities',
    group: 'Operations'
  },
  {
    key:   'requirement',
    label: 'Requirements',
    icon:  '📋',
    dest:  'Account or Country → Requirements tab',
    group: 'Operations'
  },
  {
    key:   'risk',
    label: 'Risks',
    icon:  '⚠️',
    dest:  'Account or Country → Risks tab',
    group: 'Operations'
  },
  // ── Intelligence ──────────────────────────────────────────────────────────
  {
    key:   'intel-payments',
    label: 'Payment Landscape',
    icon:  '💳',
    dest:  'Country → Market Intelligence',
    group: 'Intelligence'
  },
  {
    key:   'intel-hardware',
    label: 'Hardware Landscape',
    icon:  '🔧',
    dest:  'Country → Market Intelligence',
    group: 'Intelligence'
  },
  {
    key:   'intel-competitors',
    label: 'Competitors',
    icon:  '⚔',
    dest:  'Country → Market Intelligence',
    group: 'Intelligence'
  },
  {
    key:   'intel-operations',
    label: 'Local Practices',
    icon:  '🌍',
    dest:  'Country → Market Intelligence',
    group: 'Intelligence'
  },
  {
    key:   'intel-account',
    label: 'Account Intelligence',
    icon:  '💡',
    dest:  'Account → Intelligence tab',
    group: 'Intelligence'
  },
  // ── Stakeholders ──────────────────────────────────────────────────────────
  {
    key:   'stakeholders',
    label: 'Stakeholders',
    icon:  '🤝',
    dest:  'Country → Stakeholders',
    group: 'Stakeholders'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — ACCEPT
// ─────────────────────────────────────────────────────────────────────────────

function handleImportFile(files) {
  var file = files[0];
  if (!file) return;

  resetIMP();

  var now = new Date().toISOString();
  IMP.file.name      = file.name;
  IMP.file.size      = file.size;
  IMP.file.uploadedAt= now;
  IMP.file.type      = detectFileType(file.name);

  IMP.source = {
    filename:   file.name,
    type:       IMP.file.type,
    uploadedAt: now,
    uploadedBy: CU ? CU.name : '',
    sizeMB:     (file.size / (1024 * 1024)).toFixed(2)
  };

  var reader = new FileReader();
  reader.onload = function(e) {
    IMP.file.raw = e.target.result;  // keep buffer — AI transcription / re-processing
    extractContent(IMP.file.type, e.target.result);
  };
  reader.onerror = function() {
    showImportError('Could not read the file. Please try again.');
  };
  reader.readAsArrayBuffer(file);
}

function detectFileType(name) {
  var n = name.toLowerCase();
  if (n.match(/\.xlsx?$/))         return 'xlsx';
  if (n.match(/\.pptx?$/))         return 'pptx';
  if (n.match(/\.docx?$/))         return 'docx';
  if (n.match(/\.pdf$/))           return 'pdf';
  if (n.match(/\.(mov|mp4|m4v)$/)) return 'video';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — EXTRACT
// ─────────────────────────────────────────────────────────────────────────────
// Each extractor populates IMP.extracted then calls classifyExtracted().
// Video is the exception — it skips classify and goes straight to renderVideoStep().

function extractContent(type, buffer) {
  IMP.extracted = { text:'', sheets:[], slides:[], paragraphs:[], pdfPages:0, videoMeta:null };

  if      (type === 'xlsx')  extractXLSX(buffer);
  else if (type === 'pptx')  extractPPTX(buffer);
  else if (type === 'docx')  extractDOCX(buffer);
  else if (type === 'pdf')   extractPDF(buffer);
  else if (type === 'video') extractVideo();
  else showImportError('Unsupported file type. Use .xlsx, .pptx, .docx, .pdf, .mov or .mp4.');
}

// ── Excel ────────────────────────────────────────────────────────────────────

// Sheet names to always include (known data formats)
var SHEET_INCLUDE = [ /^fy\d+/i, /live sites/i, /sync/i, /open items/i ];

// Sheet names to skip (billing, pivot, system sheets)
var SHEET_SKIP = [
  /^sheet\d+$/i, /revenue/i, /invoice/i, /billing/i,
  /cost/i, /product line/i, /pivot/i, /development/i,
  /mobilisation/i, /mobilization/i
];

function extractXLSX(buffer) {
  try {
    var wb   = XLSX.read(buffer, { type:'array', cellDates:true });
    var text = [];

    wb.SheetNames.forEach(function(sheetName) {
      var n           = sheetName.toLowerCase().trim();
      var forceIn     = SHEET_INCLUDE.some(function(p){ return p.test(n); });
      var shouldSkip  = !forceIn && SHEET_SKIP.some(function(p){ return p.test(n); });
      if (shouldSkip) return;

      var ws   = wb.Sheets[sheetName];
      var rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (rows.length < 2) return;  // header-only sheets carry no data

      // Skip sheets that look like billing based on column names
      var colStr = Object.keys(rows[0]).join(' ').toLowerCase();
      var isBilling = (colStr.indexOf('invoice') > -1 || colStr.indexOf('price') > -1 ||
                       colStr.indexOf('revenue') > -1)
                    && colStr.indexOf('organization') === -1
                    && colStr.indexOf('food court')   === -1;
      if (isBilling) return;

      IMP.extracted.sheets.push({ name:sheetName, rows:rows });
      rows.forEach(function(row) {
        var vals = Object.values(row)
          .map(function(v){ return (v || '').toString().trim(); })
          .filter(Boolean);
        if (vals.length) text.push(vals.join(' | '));
      });
    });

    // Fallback: if all sheets were filtered, take all non-empty sheets
    if (!IMP.extracted.sheets.length) {
      wb.SheetNames.forEach(function(sn) {
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval:'', raw:false });
        if (rows.length >= 2) IMP.extracted.sheets.push({ name:sn, rows:rows });
      });
    }

    IMP.extracted.text = text.join('\n');
    classifyExtracted();
  } catch(e) {
    showImportError('Could not read Excel file: ' + e.message);
  }
}

// ── PowerPoint ───────────────────────────────────────────────────────────────

function extractPPTX(buffer) {
  if (typeof JSZip === 'undefined') {
    showImportError('JSZip is not loaded. Check your internet connection.');
    return;
  }
  JSZip.loadAsync(buffer).then(function(zip) {
    var slideFiles = [];
    zip.forEach(function(path, file) {
      if (/^ppt\/slides\/slide[0-9]+\.xml$/.test(path)) {
        slideFiles.push({ path:path, file:file });
      }
    });
    slideFiles.sort(function(a, b) {
      return parseInt(a.path.match(/slide(\d+)/)[1]) -
             parseInt(b.path.match(/slide(\d+)/)[1]);
    });
    if (!slideFiles.length) { showImportError('No slides found in this file.'); return; }

    Promise.all(slideFiles.map(function(s){ return s.file.async('string'); }))
      .then(function(xmlStrings) {
        var text = [];
        xmlStrings.forEach(function(xml, idx) {
          var texts = extractXMLTexts(xml);
          IMP.extracted.slides.push({ index:idx + 1, texts:texts });
          if (texts.length) text.push(texts.join(' '));
        });
        IMP.extracted.text = text.join('\n');
        classifyExtracted();
      });
  }).catch(function(e) {
    showImportError('Could not open PowerPoint: ' + e.message);
  });
}

function extractXMLTexts(xml) {
  var texts = [];
  try {
    var doc   = new DOMParser().parseFromString(xml, 'text/xml');
    var nodes = doc.getElementsByTagNameNS(
      'http://schemas.openxmlformats.org/drawingml/2006/main', 't'
    );
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].textContent.trim();
      if (t) texts.push(t);
    }
  } catch(e) {
    // Regex fallback for environments where DOMParser is restricted
    (xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || []).forEach(function(m) {
      var t = m.replace(/<[^>]+>/g, '').trim();
      if (t) texts.push(t);
    });
  }
  return texts;
}

// ── Word ─────────────────────────────────────────────────────────────────────

function extractDOCX(buffer) {
  if (typeof JSZip === 'undefined') {
    showImportError('JSZip is not loaded. Check your internet connection.');
    return;
  }
  JSZip.loadAsync(buffer).then(function(zip) {
    var docFile = zip.file('word/document.xml');
    if (!docFile) { showImportError('Invalid Word document — missing document.xml.'); return; }

    docFile.async('string').then(function(xml) {
      var paragraphs = [];
      (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).forEach(function(p) {
        var t = (p.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [])
          .map(function(m){ return m.replace(/<[^>]+>/g, ''); })
          .join('').trim();
        if (t) paragraphs.push(t);
      });
      IMP.extracted.paragraphs = paragraphs;
      IMP.extracted.text       = paragraphs.join('\n');
      classifyExtracted();
    });
  }).catch(function(e) {
    showImportError('Could not open Word document: ' + e.message);
  });
}

// ── PDF ──────────────────────────────────────────────────────────────────────

function extractPDF(buffer) {
  if (typeof pdfjsLib === 'undefined') {
    showImportError('PDF.js is not loaded. Check your internet connection.');
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    .then(function(pdf) {
      IMP.extracted.pdfPages = pdf.numPages;
      var pagePromises = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        pagePromises.push(
          pdf.getPage(i).then(function(page) {
            return page.getTextContent().then(function(tc) {
              return tc.items.map(function(item){ return item.str; }).join(' ');
            });
          })
        );
      }
      return Promise.all(pagePromises);
    })
    .then(function(pages) {
      var paragraphs = pages.map(function(p){ return p.trim(); }).filter(Boolean);
      IMP.extracted.paragraphs = paragraphs;
      IMP.extracted.text       = paragraphs.join('\n');
      classifyExtracted();
    })
    .catch(function(e) {
      showImportError('Could not read PDF: ' + e.message);
    });
}

// ── Video ────────────────────────────────────────────────────────────────────
// Browsers cannot extract audio without a server-side transcription service.
// The buffer is kept in IMP.file.raw for future AI integration.
// The user provides notes/transcript manually.

function extractVideo() {
  IMP.extracted.videoMeta = {
    filename: IMP.file.name,
    sizeMB:   IMP.source.sizeMB
  };
  renderVideoStep();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFY — AI HOOK
// ─────────────────────────────────────────────────────────────────────────────
//
// This function runs after extraction is complete.
// It produces IMP.hint.suggested — a category key to pre-select in the UI.
//
// ── To add AI classification ──────────────────────────────────────────────
// Replace this function body with:
//
//   fetch('/api/classify', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ text: IMP.extracted.text, filename: IMP.file.name })
//   })
//   .then(function(r){ return r.json(); })
//   .then(function(result) {
//     IMP.hint.signals   = result.signals   || [];
//     IMP.hint.suggested = result.suggested || null;
//     renderStep3();
//   })
//   .catch(function() { renderStep3(); });  // fail open — show UI anyway
//
// The API should return: { signals: string[], suggested: string|null }
// where `suggested` is a key from IMPORT_CATEGORIES.

function classifyExtracted() {
  var signals = [];
  var text    = IMP.extracted.text.toLowerCase();

  // ── Sheet name signals ────────────────────────────────────────────────────
  IMP.extracted.sheets.forEach(function(sheet) {
    var n = sheet.name.toLowerCase();
    if (/fy2\d/.test(n))                              signals.push('license-sheet');
    if (n.indexOf('sync') > -1 || n.indexOf('open items') > -1) signals.push('sync-sheet');
    if (n.indexOf('live sites') > -1)                 signals.push('live-sites');

    // ── Column name signals ───────────────────────────────────────────────
    if (sheet.rows[0]) {
      var cols = Object.keys(sheet.rows[0]).join(' ').toLowerCase();
      if (cols.indexOf('module') > -1 && cols.indexOf('description') > -1) signals.push('intel-module');
      if (cols.indexOf('food court') > -1)           signals.push('license-sheet');
      if (cols.indexOf('task') > -1 && cols.indexOf('status') > -1)        signals.push('sync-sheet');
      if (cols.indexOf('risk') > -1 || cols.indexOf('severity') > -1)      signals.push('risk-sheet');
      if (cols.indexOf('requirement') > -1 || cols.indexOf('feature') > -1) signals.push('req-sheet');
      if (cols.indexOf('name') > -1 && (cols.indexOf('email') > -1 || cols.indexOf('phone') > -1)) signals.push('contact-sheet');
    }
  });

  // ── File type signals ─────────────────────────────────────────────────────
  if (IMP.extracted.slides.length)     signals.push('presentation');
  if (IMP.extracted.pdfPages)          signals.push('pdf');
  if (IMP.extracted.paragraphs.length) signals.push('document');

  // ── Content keyword signals ───────────────────────────────────────────────
  if (text.indexOf('kiosk') > -1 || text.indexOf(' ort ') > -1 || text.indexOf('printer') > -1) signals.push('hardware-content');
  if (text.indexOf('payment') > -1 || text.indexOf('gateway') > -1)   signals.push('payment-content');
  if (text.indexOf('competitor') > -1 || text.indexOf('rival') > -1)  signals.push('competitor-content');
  if (text.indexOf('risk') > -1 || text.indexOf('issue') > -1)        signals.push('risk-content');
  if (text.indexOf('meeting') > -1 || text.indexOf('discussion') > -1 || text.indexOf('attendee') > -1) signals.push('meeting-content');

  IMP.hint.signals = signals;

  // ── Derive suggested category from signals ────────────────────────────────
  var suggested = null;

  if      (signals.indexOf('license-sheet') > -1 || signals.indexOf('live-sites') > -1) suggested = 'accounts';
  else if (signals.indexOf('sync-sheet')    > -1)    suggested = 'requirement';
  else if (signals.indexOf('risk-sheet')    > -1)    suggested = 'risk';
  else if (signals.indexOf('req-sheet')     > -1)    suggested = 'requirement';
  else if (signals.indexOf('contact-sheet') > -1)    suggested = 'contacts';
  else if (signals.indexOf('intel-module')  > -1)    suggested = 'intel-operations';
  else if (signals.indexOf('presentation')  > -1) {
    if (signals.indexOf('payment-content')    > -1)  suggested = 'intel-payments';
    else if (signals.indexOf('hardware-content') > -1) suggested = 'intel-hardware';
    else                                             suggested = 'intel-hardware';
  }
  else if (signals.indexOf('meeting-content') > -1)  suggested = 'activity';
  else if (signals.indexOf('risk-content')   > -1)   suggested = 'risk';
  else if (signals.indexOf('pdf')            > -1 || signals.indexOf('document') > -1) suggested = 'intel-account';

  IMP.hint.suggested = suggested;
  if (!IMP.mapping.category && suggested) IMP.mapping.category = suggested;

  renderStep3();
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — MAP (UI)
// ─────────────────────────────────────────────────────────────────────────────

function renderStep3() {
  var el = document.getElementById('imp-step3');
  if (!el) return;

  var f    = IMP.file;
  var ext  = IMP.extracted;
  var hint = IMP.hint;
  var map  = IMP.mapping;

  var typeLabel = { xlsx:'Excel Spreadsheet', pptx:'PowerPoint', docx:'Word Document', pdf:'PDF', video:'Video' }[f.type] || f.type;

  var contentSummary =
    ext.sheets.length     ? ext.sheets.length + ' sheet' + (ext.sheets.length > 1 ? 's' : '') +
                            ' · ' + ext.sheets.reduce(function(s, sh){ return s + sh.rows.length; }, 0) + ' rows'
  : ext.slides.length     ? ext.slides.length + ' slide' + (ext.slides.length > 1 ? 's' : '')
  : ext.pdfPages          ? ext.pdfPages + ' page' + (ext.pdfPages > 1 ? 's' : '')
  : ext.paragraphs.length ? ext.paragraphs.length + ' paragraph' + (ext.paragraphs.length > 1 ? 's' : '')
  : 'extracted';

  var preview = ext.text
    ? ext.text.slice(0, 600).replace(/</g, '&lt;').replace(/>/g, '&gt;') + (ext.text.length > 600 ? '…' : '')
    : '(no text extracted)';

  // ── Accounts in selected country for the Account dropdown ─────────────────
  var countryAccounts = ACCOUNTS.filter(function(a) {
    return !map.country || a.country === map.country;
  });

  // ── Sites in selected account for the Site dropdown ───────────────────────
  var accountSites = [];
  if (map.accountId && ADATA[map.accountId]) {
    accountSites = ADATA[map.accountId].hardware || [];
  }

  el.innerHTML =
    '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;overflow:hidden;margin-top:4px">' +

      // ── Header ─────────────────────────────────────────────────────────────
      '<div style="padding:12px 16px;background:var(--s1);border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:8px">' +
        '<div style="width:20px;height:20px;border-radius:50%;background:var(--fo);color:var(--nt);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">3</div>' +
        '<span style="font-size:13px;font-weight:600;color:var(--t1)">Map Content</span>' +
        '<span class="bdg bg" style="margin-left:auto">Extracted</span>' +
      '</div>' +

      // ── File summary ────────────────────────────────────────────────────────
      '<div style="padding:13px 16px;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:26px">' + ({ xlsx:'📊', pptx:'📊', docx:'📄', pdf:'📄', video:'🎥' }[f.type] || '📁') + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:600;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + f.name + '</div>' +
          '<div style="font-size:11px;color:var(--t3)">' + typeLabel + ' · ' + contentSummary + ' · ' + IMP.source.sizeMB + ' MB</div>' +
        '</div>' +
      '</div>' +

      // ── Content preview ─────────────────────────────────────────────────────
      '<div style="padding:13px 16px;border-bottom:1px solid var(--b1)">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:7px">Content Preview</div>' +
        '<div style="font-size:11px;color:var(--t3);line-height:1.7;background:var(--s1);padding:10px 12px;border-radius:8px;font-family:DM Mono,monospace;max-height:100px;overflow:hidden;white-space:pre-wrap">' + preview + '</div>' +
      '</div>' +

      // ── Map: Country ────────────────────────────────────────────────────────
      '<div style="padding:13px 16px;border-bottom:1px solid var(--b1);display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">' +

        '<div>' +
          '<label style="font-size:11px;font-weight:600;color:var(--t3);display:block;margin-bottom:6px">Country <span style="color:var(--rd)">*</span></label>' +
          '<select id="imp-map-country" style="width:100%;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px">' +
            '<option value="">— Select country —</option>' +
            visibleCountryCodes().map(function(c) {
              var sel = map.country === c ? ' selected' : '';
              return '<option value="' + c + '"' + sel + '>' + CINFO[c].flag + ' ' + CINFO[c].name + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +

        '<div>' +
          '<label style="font-size:11px;font-weight:600;color:var(--t3);display:block;margin-bottom:6px">Account <span style="font-weight:400">(optional)</span></label>' +
          '<select id="imp-map-account" style="width:100%;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px">' +
            '<option value="">— Country level —</option>' +
            countryAccounts.map(function(a) {
              var sel = map.accountId === a.id ? ' selected' : '';
              return '<option value="' + a.id + '"' + sel + '>' + a.name + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +

        '<div>' +
          '<label style="font-size:11px;font-weight:600;color:var(--t3);display:block;margin-bottom:6px">Site <span style="font-weight:400">(optional)</span></label>' +
          '<select id="imp-map-site" style="width:100%;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px"' + (!map.accountId ? ' disabled' : '') + '>' +
            '<option value="">— Account level —</option>' +
            accountSites.map(function(s) {
              var sel = map.siteId === s.site ? ' selected' : '';
              return '<option value="' + s.site + '"' + sel + '>' + s.site + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +

      '</div>' +

      // ── Map: Category ───────────────────────────────────────────────────────
      '<div style="padding:13px 16px;border-bottom:1px solid var(--b1)">' +
        '<div style="font-size:11px;font-weight:600;color:var(--t3);margin-bottom:12px">What type of data is this? <span style="color:var(--rd)">*</span></div>' +
        (function() {
          var groups = {}, groupOrder = [];
          IMPORT_CATEGORIES.forEach(function(cat) {
            if (!groups[cat.group]) { groups[cat.group] = []; groupOrder.push(cat.group); }
            groups[cat.group].push(cat);
          });
          return groupOrder.map(function(g) {
            return '<div style="margin-bottom:14px">' +
              '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t4);margin-bottom:7px">' + g + '</div>' +
              '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' +
              groups[g].map(function(cat) {
                var on  = map.category === cat.key;
                var sug = hint.suggested === cat.key && !on;
                return '<button class="imp-cat" data-cat="' + cat.key + '" style="padding:9px 11px;border-radius:8px;text-align:left;cursor:pointer;border:1.5px solid ' + (on ? 'var(--fo)' : 'var(--b2)') + ';background:' + (on ? 'var(--fo)' : '#fff') + ';transition:all .12s">' +
                  '<div style="font-size:14px;margin-bottom:3px">' + cat.icon + '</div>' +
                  '<div style="font-size:12px;font-weight:600;color:' + (on ? 'var(--nt)' : 'var(--t1)') + ';margin-bottom:1px">' + cat.label + '</div>' +
                  '<div style="font-size:10px;color:' + (on ? 'rgba(255,255,234,.55)' : 'var(--t4)') + '">' + cat.dest + '</div>' +
                  (sug ? '<div style="font-size:9px;color:var(--cr);font-weight:700;margin-top:2px">✦ Suggested</div>' : '') +
                '</button>';
              }).join('') +
              '</div></div>';
          }).join('');
        })() +
      '</div>' +

      // ── Confirm bar ─────────────────────────────────────────────────────────
      '<div style="padding:13px 16px;background:var(--s1);display:flex;align-items:center;justify-content:space-between;gap:12px">' +
        '<div style="font-size:12px;color:var(--t3)">' +
          (map.country && CINFO[map.country]
            ? '<strong>' + CINFO[map.country].flag + ' ' + CINFO[map.country].name + '</strong>'
            : '<span style="color:var(--rd)">Select a country</span>') +
          (map.accountId
            ? ' → ' + ((ACCOUNTS.find(function(a){ return a.id === map.accountId; }) || {}).name || '')
            : '') +
          (map.category
            ? ' → ' + ((IMPORT_CATEGORIES.find(function(c){ return c.key === map.category; }) || {}).label || '')
            : ' · <span style="color:var(--t4)">Choose a category</span>') +
        '</div>' +
        '<button class="btn btn-p" id="imp-confirm-btn">Import into Nexus</button>' +
      '</div>' +

    '</div>';

  // Live update mapping when dropdowns change
  var cSel = document.getElementById('imp-map-country');
  var aSel = document.getElementById('imp-map-account');
  var sSel = document.getElementById('imp-map-site');

  if (cSel) cSel.addEventListener('change', function() {
    IMP.mapping.country   = this.value || null;
    IMP.mapping.accountId = null;
    IMP.mapping.siteId    = null;
    renderStep3();
  });
  if (aSel) aSel.addEventListener('change', function() {
    IMP.mapping.accountId = this.value || null;
    IMP.mapping.siteId    = null;
    renderStep3();
  });
  if (sSel) sSel.addEventListener('change', function() {
    IMP.mapping.siteId = this.value || null;
  });
}

// ── Video manual notes UI ─────────────────────────────────────────────────────

function renderVideoStep() {
  var el = document.getElementById('imp-step3');
  if (!el) return;

  el.innerHTML =
    '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;overflow:hidden;margin-top:4px">' +

      '<div style="padding:12px 16px;background:var(--s1);border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:8px">' +
        '<div style="width:20px;height:20px;border-radius:50%;background:var(--fo);color:var(--nt);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">3</div>' +
        '<span style="font-size:13px;font-weight:600;color:var(--t1)">Add Notes</span>' +
        '<span class="bdg ba" style="margin-left:auto">Video · Manual entry</span>' +
      '</div>' +

      '<div style="padding:14px 16px;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:32px">🎥</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + IMP.file.name + '</div>' +
          '<div style="font-size:11px;color:var(--t3)">' + IMP.source.sizeMB + ' MB · Audio transcription requires server-side AI (not yet enabled)</div>' +
        '</div>' +
      '</div>' +

      '<div style="padding:14px 16px;border-bottom:1px solid var(--b1)">' +
        '<label style="font-size:11px;font-weight:600;color:var(--t3);display:block;margin-bottom:7px">Meeting Notes / Transcript</label>' +
        '<textarea id="vid-notes" placeholder="Paste a transcript or type meeting notes here..." rows="6" style="width:100%;padding:10px 12px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px;color:var(--t1);resize:vertical;font-family:inherit"></textarea>' +
      '</div>' +

      '<div style="padding:13px 16px;border-bottom:1px solid var(--b1);display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div>' +
          '<label style="font-size:11px;font-weight:600;color:var(--t3);display:block;margin-bottom:6px">Country</label>' +
          '<select id="vid-country" style="width:100%;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px">' +
            '<option value="">— Select —</option>' +
            visibleCountryCodes().map(function(c) {
              return '<option value="' + c + '">' + CINFO[c].flag + ' ' + CINFO[c].name + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label style="font-size:11px;font-weight:600;color:var(--t3);display:block;margin-bottom:6px">Account <span style="font-weight:400">(optional)</span></label>' +
          '<select id="vid-account" style="width:100%;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px">' +
            '<option value="">— Country level —</option>' +
            ACCOUNTS.map(function(a) {
              return '<option value="' + a.id + '">' + a.name + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div style="padding:13px 16px;background:var(--s1);display:flex;justify-content:flex-end">' +
        '<button class="btn btn-p" id="vid-confirm-btn">Save Notes</button>' +
      '</div>' +

    '</div>';
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — COMMIT
// ─────────────────────────────────────────────────────────────────────────────
//
// Reads IMP.mapping and IMP.extracted, writes into the appropriate Nexus store.
// Each category has its own handler block.
// After commit, an audit entry is written to the country's activities log.

function commitImport() {
  var map        = IMP.mapping;
  var countryKey = map.country || visibleCountryCodes()[0];
  var accountId  = map.accountId || '';
  var category   = map.category;
  var ci         = CINFO[countryKey];
  var cd         = CDATA[countryKey];
  var ext        = IMP.extracted;
  var tally      = { accounts:0, contacts:0, hardware:0, activities:0, requirements:0, risks:0, intel:0 };

  if (!category)   { showImportError('Please select a category first.'); return; }
  if (!countryKey) { showImportError('Please select a country first.');  return; }

  var fullText = ext.text;

  // ── Helper: column reader for Excel rows ───────────────────────────────────
  function colVal(row, names) {
    var keys = Object.keys(row);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i].toLowerCase().replace(/[\\\/]/g, ' ').trim();
      for (var j = 0; j < names.length; j++) {
        if (k.indexOf(names[j]) > -1) return (row[keys[i]] || '').toString().trim();
      }
    }
    return '';
  }
  function colNum(row, names) {
    var v = parseInt(colVal(row, names));
    return isNaN(v) ? 0 : v;
  }

  // ── Accounts & Sites ───────────────────────────────────────────────────────
  if (category === 'accounts') {
    var accountMap = {};
    var colors     = ['#4285F4','#003928','#CC0000','#0066CC','#E20074','#009999','#236CFF','#5BAD03'];

    ext.sheets.forEach(function(sheet) {
      sheet.rows.forEach(function(row) {
        // Use a stricter lookup to avoid matching 'Global Client Name' column.
        // Try organization/organisation first, then fall back to exact 'client' match.
        var client = (function() {
          var keys = Object.keys(row);
          // Pass 1: exact organization column (handles 'Organization\Client')
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i].toLowerCase().replace(/[\\\/]/g, ' ').trim();
            if (k === 'organization client' || k === 'organisation client' ||
                k === 'organization' || k === 'organisation') {
              var v = (row[keys[i]] || '').toString().trim();
              if (v) return v;
            }
          }
          // Pass 2: any column containing 'organization' or 'organisation'
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i].toLowerCase().replace(/[\\\/]/g, ' ').trim();
            if ((k.indexOf('organization') > -1 || k.indexOf('organisation') > -1) &&
                k.indexOf('global') === -1) {
              var v = (row[keys[i]] || '').toString().trim();
              if (v) return v;
            }
          }
          return '';
        })();
        if (!client || client.toLowerCase() === 'organization' || client.toLowerCase() === 'organisation') return;

        var region  = colVal(row, ['region']);
        var sector  = colVal(row, ['sector']);
        var site    = colVal(row, ['food court','cafe name','site name','site']);
        var status  = colVal(row, ['status']);
        var goLive  = colVal(row, ['go live date','go live']);
        var ort     = colNum(row, ['ort']);
        var pos     = colNum(row, ['pos']);
        var kiosk   = colNum(row, ['kiosk']);
        var imd     = colNum(row, ['imd']);
        var tds     = colNum(row, ['tds']);
        var app     = colNum(row, ['app/pwa licenses','app/pwa','app']);

        var country = normaliseCountry(region) || countryKey;
        if (!CINFO[country]) country = countryKey;

        var key = client.toLowerCase().trim();
        if (!accountMap[key]) {
          accountMap[key] = {
            name:    client,
            country: country,
            sector:  normaliseSector(sector),
            status:  (status || '').toLowerCase() === 'active' ? 'active' : 'inactive',
            sites:   []
          };
        }

        var hw = [];
        if (ort   > 0) hw.push(ort   + ' ORT');
        if (pos   > 0) hw.push(pos   + ' POS');
        if (kiosk > 0) hw.push(kiosk + ' Kiosk');
        if (imd   > 0) hw.push(imd   + ' IMD');
        if (tds   > 0) hw.push(tds   + ' TDS');
        if (app   > 0) hw.push(app   + ' App/PWA');

        if (site && site !== 'Food Court/ Cafe name') {
          accountMap[key].sites.push({
            name: site, goLive: goLive, status: status,
            hardware: hw.join(', '),
            ort:ort, pos:pos, kiosk:kiosk, imd:imd, tds:tds, app:app
          });
          if ((status || '').toLowerCase() === 'active') accountMap[key].status = 'active';
        }
      });
    });

    Object.keys(accountMap).forEach(function(k) {
      var acc      = accountMap[k];
      var existing = ACCOUNTS.find(function(a){ return a.name.toLowerCase() === acc.name.toLowerCase(); });
      var id;

      if (!existing) {
        id = 'a-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
        ACCOUNTS.push({
          id: id, name: acc.name,
          initials: acc.name.split(' ').map(function(w){ return w[0] || ''; }).join('').slice(0, 2).toUpperCase(),
          color: colors[ACCOUNTS.length % colors.length],
          status: acc.status || 'active', sector: acc.sector || 'B & I',
          country: acc.country, sites: acc.sites.length,
          products: [], relationshipStatus:'active', relationshipOwner:'', intelligence:''
        });
        ADATA[id] = {
          tab:'overview', summaryOpen:false,
          meetings:[], weeklies:[], risks:[], tasks:[],
          requirements:[], contacts:[], hardware:[], sites:[],
          intelligence:{ businessContext:'', clientSetup:'', productsUsed:'', importantNotes:'', expansionOpportunities:'' }
        };
        tally.accounts++;
      } else {
        id = existing.id;
        existing.sites = acc.sites.length;
      }

      acc.sites.forEach(function(s) {
        if (!s.name) return;
        var already = ADATA[id].hardware.some(function(h){ return h.site === s.name || h.device === s.name; });
        if (already) return;
        ADATA[id].hardware.push({
          device:s.name, model:s.hardware||'', site:s.name,
          qty: (s.ort + s.pos + s.kiosk + s.imd + s.tds + s.app) || '—',
          ort:s.ort||0, pos:s.pos||0, kiosk:s.kiosk||0, imd:s.imd||0, tds:s.tds||0, app:s.app||0,
          goLive:s.goLive, status:s.status
        });
        tally.hardware++;
      });
    });
  }

  // ── Contacts ───────────────────────────────────────────────────────────────
  else if (category === 'contacts') {
    ext.sheets.forEach(function(sheet) {
      sheet.rows.forEach(function(row) {
        var name  = colVal(row, ['name','contact','person','full name']);
        var title = colVal(row, ['title','role','position','designation']);
        var email = colVal(row, ['email','mail']);
        var phone = colVal(row, ['phone','mobile','tel','number']);
        if (!name) return;
        var c = { name:name, title:title||'', email:email||'', phone:phone||'' };
        if (accountId && ADATA[accountId]) { ADATA[accountId].contacts.push(c); tally.contacts++; }
        else if (ci) { ci.stakeholders.push(c); tally.contacts++; }
      });
    });
    if (!tally.contacts) {
      fullText.split('\n').filter(function(l){ return l.trim().length > 2; }).forEach(function(line) {
        var c = { name:line.trim(), title:'', email:'', phone:'' };
        if (accountId && ADATA[accountId]) { ADATA[accountId].contacts.push(c); tally.contacts++; }
        else if (ci) { ci.stakeholders.push(c); tally.contacts++; }
      });
    }
  }

  // ── Hardware (account-level) ───────────────────────────────────────────────
  else if (category === 'hardware') {
    if (accountId && ADATA[accountId]) {
      ext.sheets.forEach(function(sheet) {
        sheet.rows.forEach(function(row) {
          var device = colVal(row, ['device','hardware','type','item','equipment']);
          var model  = colVal(row, ['model','make','brand','specification']);
          var site   = colVal(row, ['site','location','cafe','food court']);
          var qty    = colVal(row, ['qty','quantity','count','number']);
          if (!device) return;
          ADATA[accountId].hardware.push({ device:device, model:model||'', site:site||'', qty:qty||'—' });
          tally.hardware++;
        });
      });
    }
    if (!tally.hardware && fullText && ci) {
      ci.intelligence.hardwareLandscape = fullText;
      tally.intel++;
    }
  }

  // ── Activity / Meeting Notes ───────────────────────────────────────────────
  else if (category === 'activity') {
    var entry = {
      id:        'imp-' + Date.now(),
      type:      'note',
      title:     'Imported: ' + IMP.file.name,
      date:      new Date().toISOString().slice(0, 10),
      attendees: '',
      notes:     fullText.slice(0, 3000),
      actions:   [],
      source:    IMP.source     // store file provenance
    };
    if (accountId && ADATA[accountId]) { ADATA[accountId].meetings.push(entry); tally.activities++; }
    else if (cd)                        { cd.activities.push(entry);             tally.activities++; }
  }

  // ── Requirements ──────────────────────────────────────────────────────────
  else if (category === 'requirement') {
    ext.sheets.forEach(function(sheet) {
      sheet.rows.forEach(function(row) {
        var title    = colVal(row, ['requirement','title','description','item','feature']);
        var cat2     = colVal(row, ['category','type','area','module']);
        var owner    = colVal(row, ['owner','assigned','responsible','pm']);
        var priority = colVal(row, ['priority','severity']);
        var status   = colVal(row, ['status','state']);
        if (!title) return;

        var priNorm  = (priority||'').toLowerCase().indexOf('high') > -1 ? 'high'
                     : (priority||'').toLowerCase().indexOf('crit') > -1 ? 'critical' : 'medium';
        var statNorm = ['approved','implemented','done','complete'].indexOf((status||'').toLowerCase()) > -1 ? 'approved'
                     : ['review','in review'].indexOf((status||'').toLowerCase()) > -1 ? 'in_review' : 'submitted';

        var req = { title:title, category:cat2||'General', owner:owner||'—', priority:priNorm, status:statNorm, source:IMP.source };
        if (accountId && ADATA[accountId]) {
          if (!ADATA[accountId].requirements) ADATA[accountId].requirements = [];
          ADATA[accountId].requirements.push(req);
        } else if (cd) { cd.requirements.push(req); }
        tally.requirements++;
      });
    });
    if (!tally.requirements) {
      fullText.split('\n').filter(function(l){ return l.trim().length > 3; }).forEach(function(line) {
        var req = { title:line.trim(), category:'General', owner:'—', priority:'medium', status:'submitted', source:IMP.source };
        if (accountId && ADATA[accountId]) {
          if (!ADATA[accountId].requirements) ADATA[accountId].requirements = [];
          ADATA[accountId].requirements.push(req);
        } else if (cd) { cd.requirements.push(req); }
        tally.requirements++;
      });
    }
  }

  // ── Risks ─────────────────────────────────────────────────────────────────
  else if (category === 'risk') {
    ext.sheets.forEach(function(sheet) {
      sheet.rows.forEach(function(row) {
        var title      = colVal(row, ['risk','title','description','issue','item']);
        var severity   = colVal(row, ['severity','priority','impact','level']);
        var status     = colVal(row, ['status','state']);
        var mitigation = colVal(row, ['mitigation','action','resolution','comment']);
        if (!title) return;

        var sevNorm  = (severity||'').toLowerCase().indexOf('crit') > -1 ? 'critical'
                     : (severity||'').toLowerCase().indexOf('high') > -1 ? 'high'
                     : (severity||'').toLowerCase().indexOf('low')  > -1 ? 'low' : 'medium';
        var statNorm = ['mitigated','closed','resolved','done'].indexOf((status||'').toLowerCase()) > -1 ? 'mitigated' : 'open';

        var risk = { title:title, severity:sevNorm, status:statNorm, description:title, mitigation:mitigation||'', source:IMP.source };
        if (accountId && ADATA[accountId]) { ADATA[accountId].risks.push(risk); }
        else if (cd) { cd.risks.push(risk); }
        tally.risks++;
      });
    });
    if (!tally.risks) {
      fullText.split('\n').filter(function(l){ return l.trim().length > 3; }).forEach(function(line) {
        var risk = { title:line.trim(), severity:'medium', status:'open', description:line.trim(), mitigation:'', source:IMP.source };
        if (accountId && ADATA[accountId]) { ADATA[accountId].risks.push(risk); }
        else if (cd) { cd.risks.push(risk); }
        tally.risks++;
      });
    }
  }

  // ── Country Intelligence ───────────────────────────────────────────────────
  else if (category.indexOf('intel-') === 0 && category !== 'intel-account') {
    var intelField = {
      'intel-payments':    'paymentLandscape',
      'intel-hardware':    'hardwareLandscape',
      'intel-competitors': 'localPractices',    // stored as text; future: structured array
      'intel-operations':  'localPractices'
    }[category] || 'localPractices';
    if (ci) { ci.intelligence[intelField] = fullText; tally.intel++; }
  }

  // ── Account Intelligence ───────────────────────────────────────────────────
  else if (category === 'intel-account') {
    var ad = accountId ? ADATA[accountId] : null;
    if (ad && ad.intelligence) { ad.intelligence.businessContext = fullText; tally.intel++; }
    else if (ci)               { ci.intelligence.localPractices  = fullText; tally.intel++; }
  }

  // ── Stakeholders ──────────────────────────────────────────────────────────
  else if (category === 'stakeholders') {
    ext.sheets.forEach(function(sheet) {
      sheet.rows.forEach(function(row) {
        var name  = colVal(row, ['name','contact','person','stakeholder']);
        var title = colVal(row, ['title','role','position']);
        var email = colVal(row, ['email','mail']);
        var phone = colVal(row, ['phone','mobile','tel']);
        if (!name) return;
        if (ci) { ci.stakeholders.push({ name:name, title:title||'', email:email||'', phone:phone||'' }); tally.contacts++; }
      });
    });
    if (!tally.contacts) {
      fullText.split('\n').filter(function(l){ return l.trim().length > 2; }).forEach(function(line) {
        if (ci) { ci.stakeholders.push({ name:line.trim(), title:'', email:'', phone:'' }); tally.contacts++; }
      });
    }
  }

  // ── Audit trail ────────────────────────────────────────────────────────────
  // Always write an audit entry to the country activities log.
  if (cd) {
    var tallyStr = Object.keys(tally)
      .filter(function(k){ return tally[k] > 0; })
      .map(function(k){ return tally[k] + ' ' + k; })
      .join(', ');
    cd.activities.push({
      id:        'imp-log-' + Date.now(),
      type:      'note',
      title:     'File imported: ' + IMP.file.name,
      date:      new Date().toISOString().slice(0, 10),
      attendees: '',
      notes:     'Category: ' + category + (tallyStr ? ' · ' + tallyStr : '') +
                 '\nUploaded by: ' + IMP.source.uploadedBy +
                 '\nFile size: ' + IMP.source.sizeMB + ' MB',
      actions:   [],
      source:    IMP.source
    });
  }

  saveAppData();
  renderImportSuccess(tally);
}

// ── Video notes commit ─────────────────────────────────────────────────────

function commitVideoNotes() {
  var notes     = (document.getElementById('vid-notes')     || {}).value || '';
  var countryKey= (document.getElementById('vid-country')   || {}).value || '';
  var accountId = (document.getElementById('vid-account')   || {}).value || '';

  if (!countryKey) { showImportError('Please select a country.'); return; }

  IMP.extracted.text = IMP.file.name + '\n' + notes;
  IMP.mapping.country   = countryKey;
  IMP.mapping.accountId = accountId;
  IMP.mapping.category  = 'activity';

  commitImport();
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS & ERROR UI
// ─────────────────────────────────────────────────────────────────────────────

function renderImportSuccess(tally) {
  var el = document.getElementById('imp-step3');
  if (!el) return;

  var lines = Object.keys(tally)
    .filter(function(k){ return tally[k] > 0; })
    .map(function(k){ return tally[k] + ' ' + k; });

  el.innerHTML =
    '<div style="padding:28px;background:rgba(91,173,3,.07);border:1.5px solid rgba(91,173,3,.25);border-radius:12px;text-align:center;margin-top:4px">' +
      '<div style="font-size:28px;margin-bottom:10px">✅</div>' +
      '<div style="font-size:15px;font-weight:700;color:var(--cr);margin-bottom:6px">Import complete</div>' +
      '<div style="font-size:13px;color:var(--t3);margin-bottom:20px">' + (lines.join(' · ') || 'Content stored') + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:center">' +
        '<button class="btn btn-p" id="xl-go-accounts">View Accounts</button>' +
        '<button class="btn btn-g" id="xl-go-countries">View Countries</button>' +
        '<button class="btn btn-g" id="imp-another-btn">Import Another File</button>' +
      '</div>' +
    '</div>';
}

function showImportError(msg) {
  var el = document.getElementById('imp-step3');
  if (el) el.innerHTML =
    '<div style="padding:14px 16px;background:rgba(214,64,69,.08);border:1.5px solid rgba(214,64,69,.25);border-radius:10px;font-size:13px;color:var(--rd);margin-top:4px">' +
    '⚠️ ' + msg + '</div>';
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARDS COMPATIBILITY — keep old function names alive so events.js
// (which wires xl-browse-btn, imp-confirm-btn etc.) continues to work
// without changes. Remove once events.js is updated.
// ─────────────────────────────────────────────────────────────────────────────

var handleXLFiles     = handleImportFile;   // old name → new name
var showImpError      = showImportError;    // old name → new name

function commitImportWrapper() {
  // Read mapping from DOM in case the selects updated after renderStep3
  var cSel = document.getElementById('imp-map-country');
  var aSel = document.getElementById('imp-map-account');
  var sSel = document.getElementById('imp-map-site');
  if (cSel && cSel.value) IMP.mapping.country   = cSel.value;
  if (aSel)               IMP.mapping.accountId = aSel.value || null;
  if (sSel)               IMP.mapping.siteId    = sSel.value || null;
  commitImport();
}

// Boot
go('dashboard');
