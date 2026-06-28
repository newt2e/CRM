// nexus/export.js
// Auto-split from nexus-preview-v4.html
// Edit this file, reload index.html

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportSnapshot() {
  if (!CU) return;
  var snapshot = {
    exportedBy:   CU.name,
    exportedAt:   new Date().toISOString(),
    nexusVersion: '4',
    profile:      currentProfile(),
    accounts:     visibleAccounts(),
    adata:        (function() {
      var out = {};
      visibleAccounts().forEach(function(a) { out[a.id] = ADATA[a.id] || {}; });
      return out;
    })(),
    cdata:        (function() {
      var out = {};
      visibleCountryCodes().forEach(function(c) { out[c] = CDATA[c] || {}; });
      return out;
    })(),
    cinfoIntel:   (function() {
      var out = {};
      visibleCountryCodes().forEach(function(c) {
        if (CINFO[c]) out[c] = {owner: CINFO[c].owner, intelligence: CINFO[c].intelligence, stakeholders: CINFO[c].stakeholders};
      });
      return out;
    })()
  };
  var json = JSON.stringify(snapshot, null, 2);
  var blob = new Blob([json], {type: 'application/json'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  var date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = 'nexus-' + (CU.name || 'export').toLowerCase().replace(/\s+/g,'-') + '-' + date + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('export-btn').addEventListener('click', exportSnapshot);

// ── Admin import ──────────────────────────────────────────────────────────
// Imported snapshots are stored by PM name, shown as tabs in Admin dashboard

var IMPORTED = {};  // { pmName: snapshot }

function importSnapshot(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var snap = JSON.parse(e.target.result);
      if (!snap.exportedBy || !snap.accounts) {
        alert('Invalid Nexus export file.'); return;
      }
      IMPORTED[snap.exportedBy] = snap;
      // If on admin dashboard, refresh
      if (CP === 'dashboard' && isAdmin()) render('dashboard');
      showImportSuccess(snap.exportedBy);
    } catch(err) {
      alert('Could not read file. Make sure it is a valid Nexus export.');
    }
  };
  reader.readAsText(file);
}

function showImportSuccess(name) {
  var el = document.getElementById('import-status');
  if (el) {
    el.textContent = '\u2713 ' + name + '\'s data loaded';
    el.style.display = 'block';
    setTimeout(function(){ el.style.display = 'none'; }, 3000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

var ADMIN_TAB = null;  // currently viewed PM in admin dashboard

function renderAdminDashboard() {
  var pmNames = Object.keys(IMPORTED);

  // Upload zone if no imports yet
  if (pmNames.length === 0) {
    return (
      '<div style="margin-bottom:24px">' +
        '<h1 style="font-size:22px;font-weight:700;letter-spacing:-.4px;margin-bottom:4px">Admin Dashboard</h1>' +
        '<p style="font-size:13px;color:var(--t3)">Upload weekly snapshots from your Partnership Managers to see their data.</p>' +
      '</div>' +
      '<div class="upload-zone" id="admin-drop-zone">' +
        '<svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="var(--t4)" stroke-width="1.2" style="margin-bottom:12px"><path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 12h10"/></svg>' +
        '<div style="font-size:14px;font-weight:600;color:var(--t1);margin-bottom:6px">Upload PM Snapshots</div>' +
        '<div style="font-size:13px;color:var(--t3);margin-bottom:16px">Drop .json files here or click to browse. You can upload multiple files at once.</div>' +
        '<input type="file" id="admin-file-input" accept=".json" multiple style="display:none"/>' +
        '<button class="btn btn-p" id="admin-browse-btn">Browse Files</button>' +
        '<div id="import-status" style="display:none;margin-top:12px;font-size:13px;font-weight:600;color:var(--cr)"></div>' +
      '</div>'
    );
  }

  if (!ADMIN_TAB || !IMPORTED[ADMIN_TAB]) ADMIN_TAB = pmNames[0];
  var snap = IMPORTED[ADMIN_TAB];
  var accounts = snap.accounts || [];
  var adata    = snap.adata    || {};
  var cdata    = snap.cdata    || {};

  // Aggregate stats for this PM
  var totT = accounts.reduce(function(s,a){ return s + ((adata[a.id]||{tasks:[]}).tasks||[]).filter(function(t){return!t.done;}).length; }, 0);
  var totR = accounts.reduce(function(s,a){ return s + ((adata[a.id]||{risks:[]}).risks||[]).filter(function(r){return r.status==='open';}).length; }, 0);
  var totM = accounts.reduce(function(s,a){ return s + ((adata[a.id]||{meetings:[]}).meetings||[]).length; }, 0);
  var cCodes = Object.keys(cdata);

  return (
    '<div style="margin-bottom:20px">' +
      '<h1 style="font-size:22px;font-weight:700;letter-spacing:-.4px;margin-bottom:4px">Admin Dashboard</h1>' +
      '<p style="font-size:13px;color:var(--t3)">Viewing snapshots from your Partnership Managers.</p>' +
    '</div>' +

    // PM tabs + upload more
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
      '<div style="display:flex;gap:4px;padding:3px;background:#fff;border:1.5px solid var(--b1);border-radius:10px">' +
        pmNames.map(function(name) {
          var s2 = IMPORTED[name];
          var on = ADMIN_TAB === name;
          return '<button class="pill-tab ' + (on?'on':'') + '" data-pmtab="' + name + '">' +
            name +
            '<span style="font-size:10px;font-family:DM Mono,monospace;margin-left:6px;opacity:.6">' + (s2.accounts||[]).length + ' accts</span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-size:11px;color:var(--t4)">Exported ' + (snap.exportedAt ? snap.exportedAt.slice(0,10) : '—') + '</span>' +
        '<input type="file" id="admin-file-input" accept=".json" multiple style="display:none"/>' +
        '<button class="btn btn-g" style="font-size:12px" id="admin-browse-btn">+ Upload More</button>' +
        '<div id="import-status" style="display:none;font-size:12px;font-weight:600;color:var(--cr)"></div>' +
      '</div>' +
    '</div>' +

    // Stats
    '<div class="sg">' +
      '<div class="sc"><div class="sl">Accounts</div><div class="sv">' + accounts.length + '</div><div class="ss">' + cCodes.map(function(c){ return CINFO[c] ? CINFO[c].flag : c; }).join(' ') + '</div></div>' +
      '<div class="sc"><div class="sl">Activities</div><div class="sv g">' + totM + '</div><div class="ss">Logged this period</div></div>' +
      '<div class="sc"><div class="sl">Open Tasks</div><div class="sv a">' + totT + '</div><div class="ss">Across all accounts</div></div>' +
      '<div class="sc"><div class="sl">Open Risks</div><div class="sv r">' + totR + '</div><div class="ss">Flagged</div></div>' +
    '</div>' +

    // Two column — accounts + recent activity
    '<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">' +

      // Accounts
      '<div class="card">' +
        '<div class="ch"><span class="ct">Accounts — ' + snap.exportedBy + '</span></div>' +
        (accounts.length === 0
          ? '<div style="padding:32px;text-align:center;font-size:13px;color:var(--t4)">No accounts in this snapshot.</div>'
          : accounts.map(function(a) {
              var ad = adata[a.id] || {};
              var openT = (ad.tasks||[]).filter(function(t){return!t.done;}).length;
              var openR = (ad.risks||[]).filter(function(r){return r.status==='open';}).length;
              var lastM = (ad.meetings||[]).slice(-1)[0];
              return '<div style="padding:13px 16px;border-bottom:1px solid var(--b1);display:flex;align-items:flex-start;gap:12px">' +
                '<div style="width:30px;height:30px;border-radius:7px;background:' + a.color + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">' + a.initials + '</div>' +
                '<div style="flex:1;min-width:0">' +
                  '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:2px">' + a.name + '</div>' +
                  '<div style="font-size:11px;color:var(--t3)">' + a.sector + ' · ' + (CINFO[a.country] ? CINFO[a.country].flag + ' ' : '') + a.country + '</div>' +
                  (lastM ? '<div style="font-size:11px;color:var(--t4);margin-top:3px;font-style:italic">Last: ' + lastM.title + ' (' + lastM.date + ')</div>' : '') +
                '</div>' +
                '<div style="display:flex;gap:5px;flex-shrink:0">' +
                  (openT > 0 ? '<span class="bdg ba">' + openT + 'T</span>' : '') +
                  (openR > 0 ? '<span class="bdg br">' + openR + 'R</span>' : '') +
                '</div>' +
              '</div>';
            }).join('')) +
      '</div>' +

      // Right column
      '<div style="display:flex;flex-direction:column;gap:14px">' +

        // Recent activities across all accounts
        '<div class="card"><div class="ch"><span class="ct">Recent Activities</span></div>' +
          (function() {
            var all = [];
            accounts.forEach(function(a) {
              ((adata[a.id]||{}).meetings||[]).forEach(function(m) {
                all.push({accountName:a.name, color:a.color, initials:a.initials, title:m.title, date:m.date, type:m.type||'meeting'});
              });
            });
            all.sort(function(a,b){ return b.date.localeCompare(a.date); });
            if (all.length === 0) return '<div style="padding:20px;font-size:12px;color:var(--t4);text-align:center">No activities in this snapshot.</div>';
            return all.slice(0,6).map(function(m) {
              return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--b1)">' +
                '<div style="width:26px;height:26px;border-radius:6px;background:' + m.color + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">' + m.initials + '</div>' +
                '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + m.title + '</div>' +
                '<div style="font-size:11px;color:var(--t3)">' + m.accountName + ' · ' + m.date + '</div></div>' +
              '</div>';
            }).join('');
          })() +
        '</div>' +

        // Open risks across all accounts
        '<div class="card"><div class="ch"><span class="ct">Open Risks</span>' + (totR>0?'<span class="bdg br">'+totR+'</span>':'') + '</div>' +
          (function() {
            var allR = [];
            accounts.forEach(function(a) {
              ((adata[a.id]||{}).risks||[]).filter(function(r){return r.status==='open';}).forEach(function(r) {
                allR.push({accountName:a.name, title:r.title, severity:r.severity});
              });
            });
            if (allR.length === 0) return '<div style="padding:20px;text-align:center;font-size:12px;color:var(--cr);font-weight:600">No open risks</div>';
            var sc = {critical:'var(--rd)',high:'var(--am)',medium:'var(--bl)',low:'var(--cr)'};
            return allR.slice(0,5).map(function(r) {
              return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--b1)">' +
                '<div style="width:6px;height:6px;border-radius:50%;background:' + (sc[r.severity]||'var(--t4)') + ';flex-shrink:0;margin-top:4px"></div>' +
                '<div><div style="font-size:12px;font-weight:600;color:var(--t1)">' + r.title + '</div>' +
                '<div style="font-size:11px;color:var(--t3)">' + r.accountName + '</div></div>' +
              '</div>';
            }).join('');
          })() +
        '</div>' +

      '</div>' +
    '</div>'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT WIRING FOR EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('pg').addEventListener('click', function(e) {
  var t = e.target;

  // PM tab switching in admin dashboard
  if (t.dataset.pmtab) { ADMIN_TAB = t.dataset.pmtab; render('dashboard'); return; }

  // Admin browse / drop zone
  if (t.id === 'admin-browse-btn' || t.id === 'admin-drop-zone') {
    var fi = document.getElementById('admin-file-input');
    if (fi) fi.click();
    return;
  }
});

// ── Topbar actions delegation (buttons rendered in #tbac, outside #pg) ──────
document.getElementById('tbac').addEventListener('click', function(e) {
  var t = e.target.closest('button') || e.target;
  if (t.id === 'new-task-btn')    { M.task();        return; }
  if (t.id === 'new-req-btn')     { M.requirement(); return; }
  if (t.id === 'new-risk-btn')    { M.risk();        return; }
  if (t.id === 'new-acct-btn')    { M.newAccount();  return; }
});

document.getElementById('pg').addEventListener('change', function(e) {
  if (e.target.id === 'xl-file-input') {
    if (e.target.files.length) handleXLFiles(e.target.files);
    e.target.value = '';
  }
  if (e.target.id === 'admin-file-input') {
    Array.from(e.target.files).forEach(function(f) { importSnapshot(f); });
    e.target.value = '';
  }
  if (e.target.id === 'asrch') { AF.search = e.target.value; render('accounts'); }
});

document.getElementById('pg').addEventListener('dragover', function(e) {
  if (document.getElementById('xl-drop-zone')) { e.preventDefault(); }
});
document.getElementById('pg').addEventListener('drop', function(e) {
  if (!document.getElementById('xl-drop-zone')) return;
  e.preventDefault();
  var files = Array.from(e.dataTransfer.files).filter(function(f){ return f.name.match(/\.(xlsx?|pptx?|docx?|pdf|mov|mp4|m4v)$/i); });
  if (files.length) handleXLFiles(files);
});