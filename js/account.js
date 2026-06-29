// nexus/account.js
// Auto-split from nexus-preview-v4.html
// Edit this file, reload index.html

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT DETAIL
// ─────────────────────────────────────────────────────────────────────────────
function openAccount(id) {
  CA = id;
  CP = 'account';
  document.querySelectorAll('.si').forEach(function(e){ e.classList.remove('on'); });
  document.getElementById('nav-accounts').classList.add('on');
  refreshAccount();
}

function renderAccountSummary(a, d) {
  var openR  = d.risks.filter(function(r){ return r.status==='open'; });
  var openT  = d.tasks.filter(function(t){ return !t.done; });
  var lastM  = d.meetings[d.meetings.length-1];

  // Current discussions = last 2 meeting titles + open tasks sample
  var discussions = [];
  if (lastM) discussions.push(lastM.title);
  if (d.meetings.length > 1) discussions.push(d.meetings[d.meetings.length-2].title);
  openT.slice(0,2).forEach(function(t){ discussions.push(t.title); });

  var intel = d.intelligence || {};
  var products = (intel.productsUsed && intel.productsUsed.trim()) ? intel.productsUsed : (a.products && a.products.length ? a.products.join(', ') : null);
  var owner = a.relationshipOwner || '';

  function summaryRow(label, content, action) {
    return '<div class="irow" style="align-items:flex-start">' +
      '<div class="ilbl" style="color:rgba(255,255,234,.5);font-size:11px;padding-top:2px">' + label + '</div>' +
      '<div class="ival" style="color:var(--nt);font-size:13px;line-height:1.6">' + content + '</div>' +
      (action ? '<button style="padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid rgba(255,255,234,.2);background:transparent;color:rgba(255,255,234,.6);cursor:pointer;flex-shrink:0;margin-left:8px" ' + action + '>Edit</button>' : '') +
    '</div>';
  }

  return (
    '<div id="acc-summary" style="background:var(--fo);border:1px solid rgba(255,255,234,.15);border-radius:12px;margin-bottom:14px;overflow:hidden">' +
      // Summary header — always visible
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;cursor:pointer;border-bottom:' + (d.summaryOpen ? '1px solid rgba(255,255,234,.1)' : 'none') + '" id="summary-toggle">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,234,.5)">Account Summary</span>' +
          // Quick pills — always visible
          (owner ? '<span style="font-size:11px;background:rgba(255,255,234,.1);color:rgba(255,255,234,.7);padding:2px 9px;border-radius:20px">Owner: ' + owner + '</span>' : '') +
          (openR.length > 0 ? '<span style="font-size:11px;background:rgba(214,64,69,.25);color:#fca5a5;padding:2px 9px;border-radius:20px">' + openR.length + ' risk' + (openR.length>1?'s':'') + '</span>' : '') +
          (openT.length > 0 ? '<span style="font-size:11px;background:rgba(232,168,0,.2);color:#fcd34d;padding:2px 9px;border-radius:20px">' + openT.length + ' task' + (openT.length>1?'s':'') + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="font-size:11px;color:rgba(255,255,234,.35)">' + (d.summaryOpen ? 'Collapse' : 'Expand') + '</span>' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,234,.4)" stroke-width="2" style="transition:transform .2s;transform:rotate(' + (d.summaryOpen?'180':'0') + 'deg)"><path d="M4 6l4 4 4-4"/></svg>' +
        '</div>' +
      '</div>' +
      // Expanded content
      (d.summaryOpen ?
        '<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(255,255,234,.08)">' +
          '<div style="border-right:1px solid rgba(255,255,234,.08)">' +
            summaryRow('Relationship Owner', owner || '<span style="color:rgba(255,255,234,.3);font-style:italic">Not assigned</span>', 'id="sum-edit-owner"') +
            summaryRow('Products Deployed',  products || '<span style="color:rgba(255,255,234,.3);font-style:italic">Not recorded</span>', 'id="sum-edit-products"') +
            summaryRow('Sites', '<span style="font-family:DM Mono,monospace;font-size:16px;font-weight:700;color:var(--jl)">' + a.sites + '</span> <span style="color:rgba(255,255,234,.4);font-size:12px">active deployments</span>', null) +
          '</div>' +
          '<div>' +
            summaryRow('Key Stakeholders',
              d.contacts.length > 0
                ? d.contacts.slice(0,3).map(function(c){ return '<span style="display:inline-flex;align-items:center;gap:5px;margin-right:6px;margin-bottom:4px;background:rgba(255,255,234,.08);padding:3px 9px;border-radius:20px;font-size:12px">' + c.name + '<span style="color:rgba(255,255,234,.35);font-size:10px">· ' + c.title + '</span></span>'; }).join('')
                : '<span style="color:rgba(255,255,234,.3);font-style:italic">No contacts added</span>',
              null) +
            summaryRow('Current Discussions',
              discussions.length > 0
                ? discussions.slice(0,3).map(function(x){ return '<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:3px"><span style="color:var(--jl);flex-shrink:0">·</span><span style="font-size:12px">' + x + '</span></div>'; }).join('')
                : '<span style="color:rgba(255,255,234,.3);font-style:italic">No recent activity</span>',
              null) +
            summaryRow('Open Risks',
              openR.length > 0
                ? openR.slice(0,2).map(function(r){ return '<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + ({critical:'#f87171',high:'#fcd34d',medium:'#93c5fd',low:'var(--jl)'}[r.severity]||'#fff') + ';flex-shrink:0"></span><span style="font-size:12px">' + r.title + '</span></div>'; }).join('') +
                  (openR.length > 2 ? '<span style="font-size:11px;color:rgba(255,255,234,.4)">+' + (openR.length-2) + ' more</span>' : '')
                : '<span style="color:rgba(91,173,3,.7);font-weight:600;font-size:12px">✓ No open risks</span>',
              null) +
          '</div>' +
        '</div>'
      : '') +
    '</div>'
  );
}

function refreshAccount() {
  saveAppData();
  var a = ACCOUNTS.find(function(x){ return x.id === CA; });
  var d = ADATA[CA];
  var openT = d.tasks.filter(function(t){ return !t.done; }).length;
  var openR = d.risks.filter(function(r){ return r.status==='open'; }).length;

  document.getElementById('bc').innerHTML =
    '<button class="lnk" id="bc-back">Accounts</button>' +
    '<span class="sep">›</span>' +
    '<span class="cur">' + a.name + '</span>';
  document.getElementById('bc-back').addEventListener('click', function(){ go('accounts'); });

  document.getElementById('tbac').innerHTML =
    '<button class="btn btn-g" style="font-size:12px" id="acc-edit">Edit</button>' +
    '<button class="btn btn-p" style="font-size:12px" id="acc-log">+ Log Update</button>';
  document.getElementById('acc-log').addEventListener('click', function(){ M.meeting(); });

  var TABS = [
    {id:'overview',     label:'Overview'},
    {id:'activities',     label:'Activities (' + d.meetings.length + ')'},
    {id:'weekly',       label:'Weekly Updates'},
    {id:'risks',        label:'Risks (' + d.risks.length + ')'},
    {id:'tasks',        label:'Tasks (' + d.tasks.length + ')'},
    {id:'requirements', label:'Requirements'},
    {id:'contacts',     label:'Contacts'},
    {id:'hardware',     label:'Hardware'},
    {id:'intelligence', label:'Intelligence'}
  ];

  document.getElementById('pg').innerHTML =
    // Header
    '<div class="acc-header">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;gap:14px">' +
          '<div style="width:48px;height:48px;border-radius:12px;background:' + a.color + ';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">' + a.initials + '</div>' +
          '<div>' +
            '<div style="font-size:19px;font-weight:700;color:var(--nt);letter-spacing:-.3px;margin-bottom:5px">' + a.name + '</div>' +
            '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">' +
              '<span class="bdg bg">' + a.status + '</span>' +
              '<span class="bdg bb">' + a.sector + '</span>' +
              '<span style="font-size:12px;color:rgba(255,255,234,.5)">·</span>' +
              '<span style="font-size:12px;color:rgba(255,255,234,.5)">' + (a.country==='USA'?'🇺🇸':'🇩🇪') + ' ' + a.country + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (function() {
          var all = visibleAccounts();
          var idx = all.findIndex(function(x){ return x.id === a.id; });
          var prev = idx > 0 ? all[idx-1] : null;
          var next = idx < all.length-1 ? all[idx+1] : null;
          return '<div style="display:flex;align-items:center;gap:8px">' +
            '<button id="acc-prev" ' + (prev ? 'data-aid="' + prev.id + '"' : 'disabled') + ' style="width:32px;height:32px;border-radius:8px;border:1.5px solid var(--b2);background:#fff;cursor:' + (prev?'pointer':'default') + ';color:' + (prev?'var(--t1)':'var(--t4)') + ';font-size:16px;display:flex;align-items:center;justify-content:center" title="' + (prev?prev.name:'No previous account') + '">‹</button>' +
            '<button id="acc-next" ' + (next ? 'data-aid="' + next.id + '"' : 'disabled') + ' style="width:32px;height:32px;border-radius:8px;border:1.5px solid var(--b2);background:#fff;cursor:' + (next?'pointer':'default') + ';color:' + (next?'var(--t1)':'var(--t4)') + ';font-size:16px;display:flex;align-items:center;justify-content:center" title="' + (next?next.name:'No next account') + '">›</button>' +
            '<button id="acc-delete" style="padding:6px 12px;border-radius:8px;border:1.5px solid rgba(214,64,69,.4);background:transparent;color:rgba(214,64,69,.8);font-size:12px;font-weight:600;cursor:pointer">Delete Account</button>' +
          '</div>';
        })() +
      '</div>' +
      '<div class="acc-stat">' +
        [
          {l:'Sites',        v:a.sites,          cl:''},
          {l:'Contacts',     v:d.contacts.length, cl:''},
          {l:'Open Tasks',   v:openT,             cl:openT>0?'warn':''},
          {l:'Open Risks',   v:openR,             cl:openR>0?'danger':''},
          {l:'Meetings',     v:d.meetings.length, cl:''},
          {l:'Requirements', v:d.requirements.length, cl:''}
        ].map(function(s){
          return '<div><div class="acc-stat-l">' + s.l + '</div><div class="acc-stat-v ' + s.cl + '">' + s.v + '</div></div>';
        }).join('') +
      '</div>' +
    '</div>' +
    // Account Summary
    renderAccountSummary(a, d) +
    // Tab bar
    '<div class="tab-bar">' +
      TABS.map(function(t){ return '<button class="tab-btn ' + (d.tab===t.id?'on':'') + '" data-acctab="' + t.id + '">' + t.label + '</button>'; }).join('') +
    '</div>' +
    // Tab content
    '<div id="acc-content">' + renderAccTab(a, d) + '</div>';
}

function renderAccTab(a, d) {
  if (d.tab==='overview')     return tabOverview(a, d);
  if (d.tab==='activities')     return tabMeetings(d);
  if (d.tab==='weekly')       return tabWeekly(d);
  if (d.tab==='risks')        return tabRisks(d);
  if (d.tab==='tasks')        return tabTasks(d);
  if (d.tab==='requirements') return tabRequirements(d);
  if (d.tab==='contacts')     return tabContacts(d);
  if (d.tab==='hardware')     return tabHardware(d);
  if (d.tab==='intelligence') return tabIntelligence(a, d);
  return '';
}

// ── TAB: OVERVIEW ────────────────────────────────────────────────────────────
function tabOverview(a, d) {
  var lastM = d.meetings[d.meetings.length-1];
  var lastW = d.weeklies[d.weeklies.length-1];
  var openT = d.tasks.filter(function(t){ return !t.done; });
  var openR = d.risks.filter(function(r){ return r.status==='open'; });
  return (
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
    // Latest meeting
    '<div class="card"><div class="ch"><span class="ct">Latest Meeting Note</span><button class="cl" data-acctab="meetings">View all</button></div>' +
      (lastM ?
        '<div style="padding:16px">' +
          '<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:3px">' + lastM.title + '</div>' +
          '<div style="font-size:11px;font-family:DM Mono,monospace;color:var(--t4);margin-bottom:10px">' + lastM.date + (lastM.attendees?' · '+lastM.attendees:'') + '</div>' +
          '<div style="font-size:13px;color:var(--t3);line-height:1.7">' + lastM.notes + '</div>' +
          (lastM.actions.length>0 ?
            '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--b1)">' +
              '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:6px">Action Items</div>' +
              lastM.actions.map(function(ac){ return '<div class="action-item"><span class="action-arrow">→</span>' + ac + '</div>'; }).join('') +
            '</div>' : '') +
        '</div>' :
        '<div style="padding:32px;text-align:center"><p style="font-size:12px;color:var(--t4);margin-bottom:12px">No meetings logged yet.</p><button class="btn btn-p" style="font-size:12px" id="ov-add-m">+ Log First Meeting</button></div>') +
    '</div>' +
    // Latest weekly
    '<div class="card"><div class="ch"><span class="ct">Latest Weekly Update</span><button class="cl" data-acctab="weekly">View all</button></div>' +
      (lastW ?
        '<div style="padding:16px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
            '<div style="font-size:11px;font-family:DM Mono,monospace;color:var(--t4)">Week of ' + lastW.week + '</div>' +
            bdg(lastW.status) +
          '</div>' +
          '<div style="font-size:13px;color:var(--t3);line-height:1.7;margin-bottom:8px">' + lastW.summary + '</div>' +
          (lastW.highlights ? '<div style="font-size:12px;color:var(--t3);padding:8px 12px;background:var(--s1);border-radius:7px;line-height:1.6"><strong>Highlights:</strong> ' + lastW.highlights + '</div>' : '') +
        '</div>' :
        '<div style="padding:32px;text-align:center"><p style="font-size:12px;color:var(--t4);margin-bottom:12px">No weekly updates yet.</p><button class="btn btn-p" style="font-size:12px" id="ov-add-w">+ Add Weekly Update</button></div>') +
    '</div>' +
    // Open risks
    '<div class="card"><div class="ch"><span class="ct">Open Risks</span>' + (openR.length>0?'<span class="bdg br">'+openR.length+'</span>':'') + '<button class="cl" data-acctab="risks">All risks</button></div>' +
      (openR.length===0 ?
        '<div style="padding:20px;text-align:center;font-size:12px;color:var(--cr);font-weight:600">No open risks — all clear</div>' :
        openR.slice(0,3).map(function(r){ return '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid var(--b1)">' +
          '<div style="width:3px;background:' + sevColor(r.severity) + ';border-radius:2px;align-self:stretch;flex-shrink:0"></div>' +
          '<div><div style="font-size:12px;font-weight:600;color:var(--t1);margin-bottom:2px">' + r.title + '</div>' +
          '<div style="font-size:11px;color:var(--t3)">' + r.description + '</div></div></div>'; }).join('')) +
    '</div>' +
    // Open tasks
    '<div class="card"><div class="ch"><span class="ct">Open Tasks</span>' + (openT.length>0?'<span class="bdg ba">'+openT.length+'</span>':'') + '<button class="cl" data-acctab="tasks">All tasks</button></div>' +
      (openT.length===0 ?
        '<div style="padding:20px;text-align:center;font-size:12px;color:var(--cr);font-weight:600">No open tasks — all clear</div>' :
        openT.slice(0,4).map(function(t){ return '<div style="display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--b1)">' +
          '<div style="width:14px;height:14px;border-radius:3px;border:2px solid var(--b2);flex-shrink:0"></div>' +
          '<div style="flex:1;font-size:12px;color:var(--t1)">' + t.title + '</div>' +
          '<span style="font-size:10px;font-weight:700;color:' + sevColor(t.priority) + '">' + (t.priority||'').toUpperCase() + '</span></div>'; }).join('')) +
    '</div>' +
    '</div>'
  );
}

// ── TAB: MEETINGS ────────────────────────────────────────────────────────────
function tabMeetings(d) {
  return '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-meeting"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Log Activity</button>' +
    (d.meetings.length===0 ? '<div class="empty-box"><p>No meeting notes yet. Log your first call above.</p></div>' :
      [...d.meetings].reverse().map(function(m) {
        return '<div class="entry">' +
          '<div class="entry-head"><div><div class="entry-title">' + m.title + '</div><div class="entry-meta">' + m.date + (m.attendees?' · 👥 '+m.attendees:'') + '</div></div></div>' +
          '<div class="entry-body">' + m.notes + '</div>' +
          (m.actions.length>0 ? '<div class="entry-section"><div class="entry-section-label">Action Items</div>' + m.actions.map(function(ac){ return '<div class="action-item"><span class="action-arrow">→</span>' + ac + '</div>'; }).join('') + '</div>' : '') +
        '</div>';
      }).join(''));
}

// ── TAB: WEEKLY ───────────────────────────────────────────────────────────────
function tabWeekly(d) {
  var sc = {on_track:'bg',at_risk:'ba',blocked:'br'};
  return '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-weekly"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Weekly Update</button>' +
    (d.weeklies.length===0 ? '<div class="empty-box"><p>No weekly updates yet.</p></div>' :
      [...d.weeklies].reverse().map(function(w) {
        return '<div class="entry">' +
          '<div class="entry-head">' +
            '<div><div class="entry-title">Week of ' + w.week + '</div></div>' +
            '<span class="bdg ' + (sc[w.status]||'bx') + '">' + w.status.replace(/_/g,' ') + '</span>' +
          '</div>' +
          '<div class="entry-body">' + w.summary + '</div>' +
          (w.highlights ? '<div class="entry-section"><div class="entry-section-label">Highlights</div><div style="font-size:12px;color:var(--t3);line-height:1.6">' + w.highlights + '</div></div>' : '') +
        '</div>';
      }).join(''));
}

// ── TAB: RISKS ────────────────────────────────────────────────────────────────
function tabRisks(d) {
  if (!d.risks) d.risks = [];
  return '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-risk"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Risk</button>' +
    (d.risks.length===0 ? '<div class="empty-box" style="background:rgba(91,173,3,.06);border-color:rgba(91,173,3,.2)"><p style="color:var(--cr);font-weight:600">No risks recorded — account looks healthy.</p></div>' :
      d.risks.map(function(r) {
        return '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;padding:16px 18px;margin-bottom:10px;display:flex;gap:12px">' +
          '<div class="risk-bar" style="background:' + sevColor(r.severity) + '"></div>' +
          '<div style="flex:1">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px">' +
              '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + r.title + '</div>' +
              '<div style="display:flex;gap:5px;flex-shrink:0">' + bdg(r.severity,sevBdg(r.severity)) + bdg(r.status) + '</div>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--t3);line-height:1.6;margin-bottom:6px">' + r.description + '</div>' +
            (r.mitigation ? '<div style="font-size:12px;padding:8px 12px;background:var(--s1);border-radius:7px;color:var(--t3)"><strong style="color:var(--t1)">Mitigation:</strong> ' + r.mitigation + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join(''));
}

// ── TAB: TASKS ────────────────────────────────────────────────────────────────
function tabTasks(d) {
  if (!d.tasks) d.tasks = [];
  return '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-task"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Task</button>' +
    (d.tasks.length===0 ? '<div class="empty-box"><p>No tasks yet.</p></div>' :
      '<div class="card"><div style="overflow:hidden">' +
        d.tasks.map(function(t, i) {
          return '<div class="task-row">' +
            '<div class="task-chk ' + (t.done?'done':'') + '" data-ti="' + i + '">' +
              (t.done ? '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>' : '') +
            '</div>' +
            '<div style="flex:1;font-size:13px;color:' + (t.done?'var(--t4)':'var(--t1)') + ';' + (t.done?'text-decoration:line-through':'') + '">' + t.title + '</div>' +
            '<span style="font-size:10px;font-weight:700;color:' + sevColor(t.priority) + '">' + (t.priority||'').toUpperCase() + '</span>' +
            '<span style="font-size:11px;font-family:DM Mono,monospace;color:var(--t4)">' + (t.due||'') + '</span>' +
          '</div>';
        }).join('') +
      '</div></div>');
}

// ── TAB: REQUIREMENTS ────────────────────────────────────────────────────────
function tabRequirements(d) {
  if (!d.requirements) d.requirements = [];
  return '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-req"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Requirement</button>' +
    (d.requirements.length===0 ? '<div class="empty-box"><p>No requirements yet.</p></div>' :
      '<div class="card">' +
        d.requirements.map(function(r,i) {
          return '<div style="display:flex;align-items:flex-start;gap:12px;padding:13px 16px;border-bottom:' + (i<d.requirements.length-1?'1px solid var(--b1)':'none') + '">' +
            '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">' + r.title + '</div>' +
            '<div style="font-size:11px;color:var(--t3)">' + r.category + ' · Owner: ' + r.owner + '</div></div>' +
            '<div style="display:flex;gap:5px">' + bdg(r.priority,sevBdg(r.priority)) + bdg(r.status) + '</div>' +
          '</div>';
        }).join('') +
      '</div>');
}

// ── TAB: CONTACTS ─────────────────────────────────────────────────────────────
function tabContacts(d) {
  return '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-contact"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Contact</button>' +
    (d.contacts.length===0 ? '<div class="empty-box"><p>No contacts yet.</p></div>' :
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' +
        d.contacts.map(function(c) {
          return '<div class="contact-card">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
              '<div style="width:36px;height:36px;border-radius:50%;background:var(--fo);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--nt);flex-shrink:0">' + ini(c.name) + '</div>' +
              '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">' + c.name + '</div><div style="font-size:11px;color:var(--t3)">' + c.title + '</div></div>' +
            '</div>' +
            (c.email ? '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:12px;color:var(--cr)">' + c.email + '</span><button class="copy-email btn-sm" data-email="' + c.email + '" style="padding:1px 6px;font-size:10px">Copy</button></div>' : '') +
            (c.phone ? '<div style="font-size:12px;color:var(--t3)">' + c.phone + '</div>' : '') +
          '</div>';
        }).join('') +
      '</div>');
}

// ── TAB: HARDWARE ─────────────────────────────────────────────────────────────
function parseHWString(str) {
  // Parse strings like '1 ORT, 2 POS, 4 Kiosk' into {ort:1, pos:2, kiosk:4, ...}
  var out = {ort:0, pos:0, kiosk:0, imd:0, tds:0, app:0};
  if (!str) return out;
  var parts = str.split(/,|;/);
  parts.forEach(function(p) {
    p = p.trim();
    var m = p.match(/^(\d+)\s*(.+)$/);
    if (!m) return;
    var n = parseInt(m[1]);
    var label = m[2].toLowerCase().trim();
    if (label.indexOf('ort') > -1)   out.ort   = n;
    if (label.indexOf('pos') > -1)   out.pos   = n;
    if (label.indexOf('kiosk') > -1) out.kiosk = n;
    if (label.indexOf('imd') > -1)   out.imd   = n;
    if (label.indexOf('tds') > -1)   out.tds   = n;
    if (label.indexOf('app') > -1 || label.indexOf('pwa') > -1) out.app = n;
  });
  return out;
}

function tabHardware(d) {
  if (!d.hardware) d.hardware = [];

  // Upgrade old entries that don't have typed fields — parse from model string
  d.hardware.forEach(function(h) {
    if (h.ort === undefined && h.model) {
      var parsed = parseHWString(h.model);
      h.ort = parsed.ort; h.pos = parsed.pos; h.kiosk = parsed.kiosk;
      h.imd = parsed.imd; h.tds = parsed.tds; h.app  = parsed.app;
    }
    // Ensure all fields exist
    ['ort','pos','kiosk','imd','tds','app'].forEach(function(k){ if(!h[k]) h[k]=0; });
  });

  // Aggregate by product type across all sites
  var TYPES = [
    {key:'ort',   label:'ORT',     icon:'📟'},
    {key:'pos',   label:'POS',     icon:'🖥'},
    {key:'kiosk', label:'Kiosk',   icon:'📺'},
    {key:'imd',   label:'IMD',     icon:'📱'},
    {key:'tds',   label:'TDS',     icon:'📡'},
    {key:'app',   label:'App/PWA', icon:'📲'},
  ];

  // Sum each type across all hardware entries
  var totals = {};
  TYPES.forEach(function(t){ totals[t.key] = 0; });
  var totalAll = 0;

  d.hardware.forEach(function(h) {
    TYPES.forEach(function(t) {
      var v = parseInt(h[t.key] || 0);
      if (!isNaN(v)) { totals[t.key] += v; totalAll += v; }
    });
    // If no typed breakdown, try parsing qty
    if (TYPES.every(function(t){ return !h[t.key]; }) && h.qty) {
      var q = parseInt(h.qty);
      if (!isNaN(q)) totalAll += q;
    }
  });

  var hasTypedData = TYPES.some(function(t){ return totals[t.key] > 0; });

  // Summary stat strip
  var statStrip = hasTypedData
    ? '<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1.5px solid var(--b1);background:var(--s1)">' +
        TYPES.map(function(t, i) {
          var v = totals[t.key];
          return '<div style="padding:14px 12px;text-align:center;border-right:1px solid var(--b1)">' +
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:6px">' + t.label + '</div>' +
            '<div style="font-size:20px;font-weight:700;font-family:DM Mono,monospace;color:' + (v>0?'var(--t1)':'var(--t4)') + '">' + (v||'—') + '</div>' +
          '</div>';
        }).join('') +
        '<div style="padding:14px 12px;text-align:center">' +
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--fo);margin-bottom:6px">Total</div>' +
          '<div style="font-size:20px;font-weight:700;font-family:DM Mono,monospace;color:var(--fo)">' + totalAll + '</div>' +
        '</div>' +
      '</div>'
    : '';

  // Site-by-site breakdown
  var siteRows = d.hardware.length === 0
    ? '<div class="empty-box"><p>No hardware logged yet.</p></div>'
    : '<div style="margin-top:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:8px">By Site</div>' +
        '<div class="card">' +
          // Table header
          '<div style="display:grid;grid-template-columns:2fr' + (hasTypedData ? ' repeat(6,60px) 60px' : ' 80px') + ';padding:9px 14px;border-bottom:1.5px solid var(--b1);background:var(--s1)">' +
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3)">Site</div>' +
            (hasTypedData
              ? TYPES.map(function(t){ return '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);text-align:center">' + t.label + '</div>'; }).join('') +
                '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--fo);text-align:center">Total</div>'
              : '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);text-align:center">Qty</div>') +
          '</div>' +
          // Rows
          d.hardware.map(function(h, i) {
            var rowTotal = TYPES.reduce(function(s,t){ return s + (parseInt(h[t.key])||0); }, 0) || (parseInt(h.qty)||0);
            return '<div style="display:grid;grid-template-columns:2fr' + (hasTypedData ? ' repeat(6,60px) 60px' : ' 80px') + ';padding:11px 14px;border-bottom:' + (i<d.hardware.length-1?'1px solid var(--b1)':'none') + ';align-items:center">' +
              '<div>' +
                '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + h.device + '</div>' +
                (h.site && h.site !== h.device ? '<div style="font-size:11px;color:var(--t3)">' + h.site + '</div>' : '') +
                (h.goLive ? '<div style="font-size:11px;color:var(--t4)">Go-live: ' + h.goLive + '</div>' : '') +
              '</div>' +
              (hasTypedData
                ? TYPES.map(function(t){
                    var v = parseInt(h[t.key])||0;
                    return '<div style="text-align:center;font-size:13px;font-family:DM Mono,monospace;font-weight:600;color:' + (v>0?'var(--t1)':'var(--t4)') + '">' + (v||'—') + '</div>';
                  }).join('') +
                  '<div style="text-align:center;font-size:13px;font-family:DM Mono,monospace;font-weight:700;color:var(--fo)">' + rowTotal + '</div>'
                : '<div style="text-align:center;font-size:13px;font-family:DM Mono,monospace;font-weight:600;color:var(--t1)">' + (h.qty||'—') + '</div>') +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

  return (
    '<button class="btn btn-p" style="margin-bottom:16px" id="a-add-hw">' +
      '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Hardware' +
    '</button>' +

    (d.hardware.length === 0
      ? '<div class="empty-box"><p>No hardware logged yet. Import a license sheet to populate automatically.</p></div>'
      : '<div class="card">' + statStrip + '</div>' + siteRows)
  );
}

// ── TAB: INTELLIGENCE ────────────────────────────────────────────────────────
function tabIntelligence(a, d) {
  if (!d.intelligence) d.intelligence = {businessContext:'', clientSetup:'', productsUsed:'', importantNotes:'', expansionOpportunities:''};
  var intel = d.intelligence;

  var SECTIONS = [
    {key:'businessContext',        label:'Business Context',       icon:'🏢', placeholder:'What does this client do? What are their key business drivers and goals?'},
    {key:'clientSetup',            label:'Client Setup',           icon:'⚙️', placeholder:'How are they structured? Key systems, integrations, processes...'},
    {key:'productsUsed',           label:'Products Used',          icon:'📦', placeholder:'Which T2E products are live? ORT, Kiosk, POS, TDS, App/PWA...'},
    {key:'importantNotes',         label:'Important Notes',        icon:'📌', placeholder:'Things to always remember about this account...'},
    {key:'expansionOpportunities', label:'Expansion Opportunities',icon:'🚀', placeholder:'Where could we grow? New sites, new products, upsell opportunities...'}
  ];

  return (
    '<div style="display:flex;flex-direction:column;gap:12px">' +
    SECTIONS.map(function(s) {
      var hasValue = intel[s.key] && intel[s.key].trim();
      return (
        '<div class="card">' +
          '<div class="ch">' +
            '<span class="ct">' + s.icon + ' ' + s.label + '</span>' +
            '<button class="btn-sm intel-edit" data-key="' + s.key + '">' + (hasValue ? 'Edit' : 'Add') + '</button>' +
          '</div>' +
          '<div style="padding:16px">' +
            (hasValue
              ? '<div style="font-size:13px;color:var(--t3);line-height:1.8;white-space:pre-wrap">' + intel[s.key] + '</div>'
              : '<div style="font-size:13px;color:var(--t4);font-style:italic">' + s.placeholder + '</div>') +
          '</div>' +
        '</div>'
      );
    }).join('') +
    '</div>'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
var M = {
  show: function(title, fields, saveFn) {
    var html = '<div class="modal-head"><div class="modal-title">' + title + '</div><button class="modal-close" id="modal-x">×</button></div>' +
      fields.map(function(f) {
        if (f.type === 'select') {
          return '<div class="mfield"><label>' + f.label + '</label><select id="mf-' + f.id + '">' +
            f.options.map(function(o){ return '<option value="' + o.value + '">' + o.label + '</option>'; }).join('') +
            '</select></div>';
        }
        var tag = f.type==='textarea' ? 'textarea rows="3"' : 'input type="text"';
        var close = f.type==='textarea' ? '</textarea>' : '</input>';
        return '<div class="mfield"><label>' + f.label + '</label><' + tag + ' id="mf-' + f.id + '" placeholder="' + (f.placeholder||'') + '"></' + (f.type==='textarea'?'textarea':'input') + '></div>';
      }).join('') +
      '<div class="modal-foot"><button class="btn btn-g" id="modal-cancel">Cancel</button><button class="btn btn-p" id="modal-save">Save</button></div>';
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-x').addEventListener('click', M.close);
    document.getElementById('modal-cancel').addEventListener('click', M.close);
    document.getElementById('modal-save').addEventListener('click', saveFn);
    document.getElementById('modal-overlay').addEventListener('click', function(e){ if(e.target.id==='modal-overlay') M.close(); });
    // focus first input
    var first = document.querySelector('#modal-box input, #modal-box textarea');
    if (first) setTimeout(function(){ first.focus(); }, 50);
  },
  close: function() { document.getElementById('modal-overlay').style.display = 'none'; },
  v: function(id) { var el = document.getElementById('mf-'+id); return el ? el.value.trim() : ''; },

  meeting: function() {
    M.show('Log Activity', [
      {id:'type', label:'Activity Type', type:'select', options:[
        {value:'meeting',          label:'Meeting'},
        {value:'requirement',      label:'Requirement'},
        {value:'decision',         label:'Decision'},
        {value:'issue',            label:'Issue'},
        {value:'client_feedback',  label:'Client Feedback'}
      ]},
      {id:'title',     label:'Title',                       placeholder:'e.g. Weekly Sync — Wk 26'},
      {id:'date',      label:'Date',                        placeholder:'e.g. 2024-08-15'},
      {id:'attendees', label:'Attendees',                   placeholder:'e.g. Sydon, Jamie, Sarah'},
      {id:'notes',     label:'Notes & Summary', type:'textarea', placeholder:'What was discussed...'},
      {id:'actions',   label:'Action Items (one per line)', type:'textarea', placeholder:'e.g. Send SLA doc by Friday'}
    ], function() {
      var title = M.v('title');
      if (!title) { alert('Title is required'); return; }
      var actType = M.v('type') || 'meeting';
      var entry = {type:actType, title:title, date:M.v('date')||new Date().toISOString().slice(0,10), attendees:M.v('attendees'), notes:M.v('notes')||'—', actions:M.v('actions').split('\n').map(function(s){ return s.trim(); }).filter(Boolean)};
      ADATA[CA].meetings.push(entry);
      logActivity(CA, actType, title);
      M.close(); refreshAccount();
    });
  },

  weekly: function() {
    M.show('Add Weekly Update', [
      {id:'week',   label:'Week of (date)', placeholder:'e.g. 2024-08-19'},
      {id:'status', label:'Status', type:'select', options:[
        {value:'on_track',label:'On Track'},{value:'at_risk',label:'At Risk'},{value:'blocked',label:'Blocked'}
      ]},
      {id:'summary',    label:'Summary',            type:'textarea', placeholder:'What happened this week...'},
      {id:'highlights', label:'Highlights / Wins',  type:'textarea', placeholder:'Key wins or milestones (optional)'}
    ], function() {
      ADATA[CA].weeklies.push({week:M.v('week')||new Date().toISOString().slice(0,10), status:M.v('status')||'on_track', summary:M.v('summary')||'—', highlights:M.v('highlights')});
      logActivity(CA, 'weekly_update', 'Week of ' + (M.v('week')||new Date().toISOString().slice(0,10)));
      M.close(); refreshAccount();
    });
  },

  risk: function() {
    M.show('Add Risk', [
      {id:'title',      label:'Title',       placeholder:'e.g. Contract renewal at risk'},
      {id:'severity',   label:'Severity', type:'select', options:[
        {value:'critical',label:'Critical'},{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}
      ]},
      {id:'description', label:'Description', type:'textarea', placeholder:'Describe the risk...'},
      {id:'mitigation',  label:'Mitigation',  type:'textarea', placeholder:'How will this be addressed? (optional)'}
    ], function() {
      var title = M.v('title');
      if (!title) { alert('Title is required'); return; }
      ADATA[CA].risks.push({title:title, severity:M.v('severity')||'medium', status:'open', description:M.v('description')||'—', mitigation:M.v('mitigation')});
      logActivity(CA, 'risk_added', title);
      M.close(); refreshAccount();
    });
  },

  task: function(targetAccountId) {
    var acctId = targetAccountId || CA;
    var fields = [
      {id:'title',    label:'Task',     placeholder:'e.g. Send updated SLA document'},
      {id:'priority', label:'Priority', type:'select', options:[
        {value:'critical',label:'Critical'},{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}
      ]},
      {id:'due', label:'Due date', placeholder:'YYYY-MM-DD'}
    ];
    // If called from the global Tasks page (no current account), add account picker
    if (!acctId) {
      fields.splice(1, 0, {
        id:'account', label:'Account', type:'select',
        options: [{value:'',label:'— Select account —'}].concat(
          visibleAccounts().map(function(a){ return {value:a.id, label:a.name}; })
        )
      });
    }
    M.show('Add Task', fields, function() {
      var title = M.v('title');
      if (!title) { alert('Task title is required'); return; }
      var id = acctId || M.v('account');
      if (!id) { alert('Please select an account'); return; }
      if (!ADATA[id]) { alert('Account not found'); return; }
      if (!ADATA[id].tasks) ADATA[id].tasks = [];
      ADATA[id].tasks.push({title:title, priority:M.v('priority')||'medium', done:false, due:M.v('due')});
      logActivity(id, 'task_added', title);
      saveAppData();
      M.close();
      if (CA === id) refreshAccount(); else render('tasks');
    });
  },

  requirement: function() {
    M.show('Add Requirement', [
      {id:'title',    label:'Title',    placeholder:'e.g. SSO integration with client AD'},
      {id:'category', label:'Category', placeholder:'e.g. Technical, Operational, Compliance'},
      {id:'owner',    label:'Stakeholder',    placeholder:'e.g. Sydon'},
      {id:'priority', label:'Priority', type:'select', options:[
        {value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}
      ]}
    ], function() {
      var title = M.v('title');
      if (!title) { alert('Title is required'); return; }
      ADATA[CA].requirements.push({title:title, category:M.v('category')||'General', owner:M.v('owner')||'—', priority:M.v('priority')||'medium', status:'submitted'});
      M.close(); refreshAccount();
    });
  },

  contact: function() {
    M.show('Add Contact', [
      {id:'name',  label:'Full Name', placeholder:'e.g. Jamie Donnelly'},
      {id:'title', label:'Job Title', placeholder:'e.g. VP Technology'},
      {id:'email', label:'Email',     placeholder:'e.g. jamie@client.com'},
      {id:'phone', label:'Phone',     placeholder:'e.g. +1 212 555 0100'}
    ], function() {
      var name = M.v('name');
      if (!name) { alert('Name is required'); return; }
      ADATA[CA].contacts.push({name:name, title:M.v('title')||'—', email:M.v('email'), phone:M.v('phone')});
      M.close(); refreshAccount();
    });
  },

  hardware: function() {
    M.show('Add Hardware', [
      {id:'device', label:'Device / Type', placeholder:'e.g. Kiosk'},
      {id:'model',  label:'Model',         placeholder:'e.g. ELO 15"'},
      {id:'site',   label:'Site',          placeholder:'e.g. NYC HQ'},
      {id:'qty',    label:'Quantity',      placeholder:'e.g. 12'}
    ], function() {
      var device = M.v('device');
      if (!device) { alert('Device type is required'); return; }
      ADATA[CA].hardware.push({device:device, model:M.v('model'), site:M.v('site'), qty:M.v('qty')||'—'});
      M.close(); refreshAccount();
    });
  },

  // Intelligence section editor
  intelligence: function(key, label, placeholder) {
    var d = ADATA[CA];
    if (!d.intelligence) d.intelligence = {};
    var current = d.intelligence[key] || '';
    M.show('Edit — ' + label, [
      {id:'value', label:label, type:'textarea', placeholder:placeholder}
    ], function() {
      d.intelligence[key] = M.v('value');
      logActivity(CA, 'note', 'Updated: ' + label);
      M.close();
      refreshAccount();
    });
    // Pre-fill textarea after modal renders
    setTimeout(function() {
      var el = document.getElementById('mf-value');
      if (el) el.value = current;
    }, 20);
  },


  // New account
  newAccount: function() {
    M.show('New Account', [
      {id:'name',    label:'Account Name',  placeholder:'e.g. Amazon'},
      {id:'sector',  label:'Sector', type:'select', options:[
        {value:'B & I',label:'B & I'},{value:'Healthcare',label:'Healthcare'},{value:'Education',label:'Education'},{value:'Levy',label:'Levy'}
      ]},
      {id:'country', label:'Country', type:'select', options:[
        {value:'USA',label:'🇺🇸 USA'},{value:'Germany',label:'🇩🇪 Germany'}
      ]},
      {id:'sites',   label:'Number of Sites', placeholder:'e.g. 3'}
    ], function() {
      var name = M.v('name');
      if (!name) { alert('Account name is required'); return; }
      var id = 'a' + Date.now();
      var initials = name.split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();
      var colors = ['#4285F4','#003928','#CC0000','#0066CC','#E20074','#009999','#236CFF','#5BAD03','#B8820A','#7B5EA7'];
      var color = colors[ACCOUNTS.length % colors.length];
      var sector = M.v('sector') || 'B & I';
      var country = M.v('country') || 'USA';
      var sites = parseInt(M.v('sites')) || 0;
      ACCOUNTS.push({id:id, name:name, initials:initials, color:color, status:'active', sector:sector, country:country, sites:sites, products:[], relationshipStatus:'active', intelligence:''});
      ADATA[id] = {tab:'overview', summaryOpen:false, meetings:[], weeklies:[], risks:[], tasks:[], requirements:[], contacts:[], hardware:[], sites:[], intelligence:{businessContext:'', clientSetup:'', productsUsed:'', importantNotes:'', expansionOpportunities:''}};
      logActivity(id, 'note', 'Account created');
      M.close();
      render('accounts');
    });
  },

  // Country modals
  cStakeholder: function() {
    M.show('Add Stakeholder', [
      {id:'name',  label:'Full Name',   placeholder:'e.g. Jamie Donnelly'},
      {id:'title', label:'Job Title',   placeholder:'e.g. VP Information Technology'},
      {id:'org',   label:'Organisation',placeholder:'e.g. Bon Appetit'},
      {id:'email', label:'Email',       placeholder:'e.g. jamie@client.com'}
    ], function() {
      var name = M.v('name');
      if (!name) { alert('Name is required'); return; }
      CINFO[CIS.country].stakeholders.push({name:name, title:M.v('title')||'—', org:M.v('org')||'—', email:M.v('email')||'—'});
      M.close(); render('countries');
    });
  },
  cHardware: function() {
    M.show('Add Hardware', [
      {id:'type',   label:'Device / Type', placeholder:'e.g. Kiosk / ORT Devices'},
      {id:'detail', label:'Details', type:'textarea', placeholder:'e.g. ELO devices used for Kiosks and ORTs'}
    ], function() {
      var type = M.v('type');
      if (!type) { alert('Type is required'); return; }
      CINFO[CIS.country].hardware.push({type:type, detail:M.v('detail')||'—'});
      M.close(); render('countries');
    });
  },
  cPayment: function() {
    M.show('Add Payment / Tax Entry', [
      {id:'label', label:'Label', placeholder:'e.g. Online PG'},
      {id:'value', label:'Value', placeholder:'e.g. Freedom Pay'}
    ], function() {
      var label = M.v('label');
      if (!label) { alert('Label is required'); return; }
      CINFO[CIS.country].payments.push({label:label, value:M.v('value')||'—'});
      M.close(); render('countries');
    });
  },
  cCompetitor: function() {
    M.show('Add Competitor', [
      {id:'name',     label:'Company Name',      placeholder:'e.g. Agilysys Systems'},
      {id:'products', label:'Products / Services',placeholder:'e.g. POS, Kiosks, Mobile Ordering'}
    ], function() {
      var name = M.v('name');
      if (!name) { alert('Name is required'); return; }
      CINFO[CIS.country].competitors.push({name:name, products:M.v('products')||'—'});
      M.close(); render('countries');
    });
  },
  cOperation: function() {
    M.show('Add Operational Detail', [
      {id:'label', label:'Label', placeholder:'e.g. Login Methodology'},
      {id:'value', label:'Value', type:'textarea', placeholder:'e.g. SSO, Email'}
    ], function() {
      var label = M.v('label');
      if (!label) { alert('Label is required'); return; }
      CINFO[CIS.country].operations.push({label:label, value:M.v('value')||'—'});
      M.close(); render('countries');
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ACCOUNT
// ─────────────────────────────────────────────────────────────────────────────
function deleteAccount(id) {
  var a = ACCOUNTS.find(function(x){ return x.id === id; });
  if (!a) return;
  if (!confirm('Delete "' + a.name + '"? This cannot be undone.')) return;
  ACCOUNTS.splice(ACCOUNTS.indexOf(a), 1);
  delete ADATA[id];
  CA = null;
  go('accounts');
}