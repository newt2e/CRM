// nexus/events.js
// Auto-split from nexus-preview-v4.html
// Edit this file, reload index.html

// ─────────────────────────────────────────────────────────────────────────────
// EVENT DELEGATION — single listener, no inline handlers
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('pg').addEventListener('click', function(e) {
  var t = e.target;

  // ── Account checkboxes ──
  if (t.classList && t.classList.contains('acct-cb')) {
    var aid = t.dataset.aid;
    AF.selected = AF.selected || {};
    AF.selected[aid] = t.checked;
    // Refresh just the bar without full re-render
    render('accounts'); return;
  }

  // ── Select all checkbox ──
  if (t.id === 'acct-sel-all') {
    AF.selected = AF.selected || {};
    var va = visibleAccounts().filter(function(a) {
      return (!AF.search || a.name.toLowerCase().indexOf(AF.search.toLowerCase())>-1) &&
             (AF.country==='all' || a.country===AF.country) &&
             (AF.sector==='all'  || a.sector===AF.sector);
    });
    va.forEach(function(a){ AF.selected[a.id] = t.checked; });
    render('accounts'); return;
  }

  // ── Delete selected ──
  if (t.id === 'acct-del-selected') {
    var selIds = Object.keys(AF.selected).filter(function(k){ return AF.selected[k]; });
    if (!selIds.length) return;
    var names = selIds.map(function(id){ var a = ACCOUNTS.find(function(x){return x.id===id;}); return a?a.name:''; }).filter(Boolean);
    if (!confirm('Delete ' + selIds.length + (selIds.length>1?' accounts':' account') + '? ' + names.join(', ') + ' - this cannot be undone.')) return;
    selIds.forEach(function(id) {
      var idx = ACCOUNTS.findIndex(function(a){ return a.id===id; });
      if (idx > -1) ACCOUNTS.splice(idx, 1);
      delete ADATA[id];
      delete AF.selected[id];
    });
    if (CA && selIds.indexOf(CA) > -1) CA = null;
    saveAppData();
    render('accounts'); return;
  }

  // ── Account row click (dashboard or accounts list) ──
  var row = t.closest('[data-aid]');
  if (row) {
    // Don't open account if clicking checkbox area
    if (t.type === 'checkbox' || t.closest('input')) return;
    openAccount(row.dataset.aid); return;
  }

  // ── Page link (e.g. country row on dashboard) ──
  var plink = t.closest('[data-page]');
  if (plink) {
    if (plink.dataset.cf) AF.country = plink.dataset.cf;
    go(plink.dataset.page); return;
  }

  // ── Account tab switching ──
  var atab = t.closest('[data-acctab]');
  if (atab && CA) { ADATA[CA].tab = atab.dataset.acctab; refreshAccount(); return; }

  // ── Task checkbox ──
  var chk = t.closest('.task-chk');
  if (chk && CA) {
    var idx = parseInt(chk.dataset.ti);
    ADATA[CA].tasks[idx].done = !ADATA[CA].tasks[idx].done;
    refreshAccount(); return;
  }

  // ── Country workspace add buttons ──
  if (t.id === 'cw-add-activity') {
    M.show('Log Activity', [
      {id:'type', label:'Activity Type', type:'select', options:[
        {value:'meeting',         label:'Meeting'},
        {value:'decision',        label:'Decision'},
        {value:'requirement',     label:'Requirement'},
        {value:'issue',           label:'Issue'},
        {value:'client_feedback', label:'Client Feedback'},
        {value:'note',            label:'Note'}
      ]},
      {id:'title',     label:'Title',                       placeholder:'e.g. USA Q3 Market Review'},
      {id:'date',      label:'Date',                        placeholder:'e.g. 2024-08-15'},
      {id:'attendees', label:'Attendees',                   placeholder:'e.g. Sydon, Dakshath'},
      {id:'notes',     label:'Notes & Summary', type:'textarea', placeholder:'What was discussed...'},
      {id:'actions',   label:'Action Items (one per line)', type:'textarea', placeholder:'e.g. Review compliance doc by Friday'}
    ], function() {
      var title = M.v('title');
      if (!title) { alert('Title is required'); return; }
      var actType = M.v('type') || 'meeting';
      var entry = {
        id: 'ca-' + Date.now(),
        type: actType, title: title,
        date: M.v('date') || new Date().toISOString().slice(0,10),
        attendees: M.v('attendees'),
        notes: M.v('notes') || '—',
        actions: M.v('actions').split('\n').map(function(s){ return s.trim(); }).filter(Boolean)
      };
      CDATA[CIS.country].activities.push(entry);
      logCountryActivity(CIS.country, actType, title, M.v('notes'));
      M.close(); render('countries');
    });
    return;
  }

  if (t.id === 'cw-add-req') {
    M.show('Add Requirement', [
      {id:'title',    label:'Title',    placeholder:'e.g. GDPR data handling compliance'},
      {id:'category', label:'Category', placeholder:'e.g. Regulatory, Platform, Operational'},
      {id:'owner',    label:'Owner',    placeholder:'e.g. Sydon'},
      {id:'priority', label:'Priority', type:'select', options:[
        {value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}
      ]}
    ], function() {
      var title = M.v('title');
      if (!title) { alert('Title is required'); return; }
      CDATA[CIS.country].requirements.push({
        title: title, category: M.v('category') || 'General',
        owner: M.v('owner') || '—',
        priority: M.v('priority') || 'medium', status: 'submitted'
      });
      M.close(); render('countries');
    });
    return;
  }

  if (t.id === 'cw-add-risk') {
    M.show('Add Risk', [
      {id:'title',       label:'Title',       placeholder:'e.g. EU compliance deadline at risk'},
      {id:'severity',    label:'Severity', type:'select', options:[
        {value:'critical',label:'Critical'},{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}
      ]},
      {id:'description', label:'Description', type:'textarea', placeholder:'Describe the risk...'},
      {id:'mitigation',  label:'Mitigation',  type:'textarea', placeholder:'How will this be addressed?'}
    ], function() {
      var title = M.v('title');
      if (!title) { alert('Title is required'); return; }
      CDATA[CIS.country].risks.push({
        title: title,
        severity: M.v('severity') || 'medium',
        status: 'open',
        description: M.v('description') || '—',
        mitigation: M.v('mitigation')
      });
      M.close(); render('countries');
    });
    return;
  }

  // ── Delete contact ──
  if (t.classList && t.classList.contains('del-contact')) {
    var idx = parseInt(t.dataset.idx);
    var d   = ADATA[CA];
    if (!d || isNaN(idx)) return;
    var name = (d.contacts[idx] || {}).name || 'this contact';
    if (!confirm('Remove ' + name + '?')) return;
    d.contacts.splice(idx, 1);
    saveAppData(); refreshAccount(); return;
  }

  // ── Delete stakeholder ──
  if (t.classList && t.classList.contains('del-stakeholder')) {
    var idx = parseInt(t.dataset.idx);
    var ci  = CINFO[CIS.country];
    if (!ci || isNaN(idx)) return;
    var name = (ci.stakeholders[idx] || {}).name || 'this stakeholder';
    if (!confirm('Remove ' + name + '?')) return;
    ci.stakeholders.splice(idx, 1);
    saveAppData(); render('countries'); return;
  }

  // ── Copy email ──
  var copyBtn = t.closest('.copy-email');
  if (copyBtn) {
    var email = copyBtn.dataset.email;
    if (email) {
      try {
        navigator.clipboard.writeText(email).then(function() {
          copyBtn.textContent = 'Copied!';
          setTimeout(function(){ copyBtn.textContent = 'Copy'; }, 1500);
        });
      } catch(e) {
        var ta = document.createElement('textarea');
        ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        copyBtn.textContent = 'Copied!';
        setTimeout(function(){ copyBtn.textContent = 'Copy'; }, 1500);
      }
    }
    return;
  }

  // ── Import page ──
  var impCsel = t.closest('.imp-csel');
  if (impCsel) { IMP.country = impCsel.dataset.c; IMP.category = null; render('import'); return; }
  var impCat = t.closest('.imp-cat');
  if (impCat) { IMP.category = impCat.dataset.cat; renderStep3(); return; }
  if (t.id === 'xl-browse-btn') {
    var fi = document.getElementById('xl-file-input'); if (fi) fi.click(); return;
  }
  if (t.closest('#xl-drop-zone') && t.id !== 'xl-browse-btn') {
    var fi2 = document.getElementById('xl-file-input'); if (fi2) fi2.click(); return;
  }
  if (t.id === 'imp-confirm-btn')  { commitImport();  return; }
  if (t.id === 'vid-confirm-btn')  {
    var notes = (document.getElementById('vid-notes')||{}).value || '';
    var cat   = IMP.category || 'activities';
    IMP.extracted.text       = IMP.file.name + '\n' + notes;
    IMP.extracted.paragraphs = notes ? [notes] : [];
    commitImport();
    return;
  }
  if (t.id === 'xl-go-accounts')   { go('accounts');  return; }
  if (t.id === 'xl-go-countries')  { go('countries'); return; }
  if (t.id === 'imp-another-btn')  {
    IMP.category = null;
    IMP.file = {name:'',type:'',size:0,uploadedAt:'',raw:null};
    IMP.extracted = {text:'',sheets:[],slides:[],paragraphs:[]};
    render('import'); return;
  }

  // ── Country intel edit ──
  var intelEdit = t.closest('.c-intel-edit');
  if (intelEdit) {
    var ikey = intelEdit.dataset.ikey;
    var ilabels = {paymentLandscape:'Payment Landscape', hardwareLandscape:'Hardware Landscape', localPractices:'Local Practices'};
    var iplaceholders = {
      paymentLandscape:'Payment gateways, processors, tax structure used in this market...',
      hardwareLandscape:'Devices, manufacturers and hardware standards used in this market...',
      localPractices:'Regional norms, compliance requirements, operational considerations...'
    };
    var ci2 = CINFO[CIS.country];
    if (!ci2.intelligence) ci2.intelligence = {};
    var curVal = ci2.intelligence[ikey] || '';
    M.show('Edit — ' + ilabels[ikey], [
      {id:'ival', label:ilabels[ikey], type:'textarea', placeholder:iplaceholders[ikey]}
    ], function() {
      ci2.intelligence[ikey] = M.v('ival');
      M.close(); render('countries');
    });
    setTimeout(function(){ var el=document.getElementById('mf-ival'); if(el) el.value=curVal; }, 20);
    return;
  }

  // ── Country intel competitor ──
  if (t.id === 'c-add-comp') {
    M.show('Add Competitor', [
      {id:'name',     label:'Company Name',       placeholder:'e.g. Agilysys'},
      {id:'products', label:'Products / Services', placeholder:'e.g. POS, Kiosks, Mobile Ordering'}
    ], function() {
      var name = M.v('name');
      if (!name) { alert('Name required'); return; }
      var ci3 = CINFO[CIS.country];
      if (!ci3.intelligence) ci3.intelligence = {};
      if (!ci3.intelligence.competitors) ci3.intelligence.competitors = [];
      ci3.intelligence.competitors.push({name:name, products:M.v('products')||'—'});
      M.close(); render('countries');
    });
    return;
  }

  // ── Country add stakeholder ──
  if (t.id === 'c-add-stakeholder-btn') {
    var ci4 = CINFO[CIS.country];
    M.show('Add Stakeholder — ' + ci4.name, [
      {id:'name',  label:'Full Name',  placeholder:'e.g. George Goeksel'},
      {id:'title', label:'Job Title',  placeholder:'e.g. IT Director'},
      {id:'email', label:'Email',      placeholder:'e.g. george@client.com'},
      {id:'phone', label:'Phone',      placeholder:'e.g. +49 89 1234 5678'}
    ], function() {
      var name = M.v('name');
      if (!name) { alert('Name is required'); return; }
      if (!ci4.stakeholders) ci4.stakeholders = [];
      ci4.stakeholders.push({
        name:  name,
        title: M.v('title') || '',
        email: M.v('email') || '',
        phone: M.v('phone') || ''
      });
      M.close();
      saveAppData();
      render('countries');
    });
    return;
  }

  // ── Country workspace tab ──
  if (t.dataset.wtab) { CIS.wtab = t.dataset.wtab; render('countries'); return; }

  // ── Market intelligence tab ──
  if (t.dataset.itab) { CIS.itab = t.dataset.itab; render('countries'); return; }

  // ── Country selector ──
  var csel = t.closest('.c-sel');
  if (csel) { CIS.country = csel.dataset.c; CIS.itab = CIS.itab || 'paymentLandscape'; CIS.wtab = CIS.wtab || 'activities'; render('countries'); return; }

  // ── Country tab ──
  if (t.dataset.ctab) { CIS.tab = t.dataset.ctab; render('countries'); return; }

  // ── Accounts filter pills ──
  if (t.dataset.cf !== undefined && CP==='accounts') { AF.country = t.dataset.cf; render('accounts'); return; }
  if (t.dataset.sf !== undefined) { AF.sector = AF.sector===t.dataset.sf?'all':t.dataset.sf; render('accounts'); return; }

  // ── Dashboard buttons ──
  if (t.id==='d-va') { go('accounts'); return; }

  // ── Export buttons ──
  if (t.id==='dash-export-btn' || t.id==='export-btn') { exportSnapshot(); return; }

  // ── New account button ──
  if (t.id==='new-acct-btn') { M.newAccount(); return; }
  if (t.id==='new-req-btn')  { M.requirement(); return; }
  if (t.id==='new-task-btn') { M.task();        return; }
  if (t.id==='new-risk-btn') { M.risk();        return; }

  // ── Delete account button ──
  if (t.id==='acc-delete' && CA) { deleteAccount(CA); return; }

  // ── Intelligence edit buttons ──
  var intelBtn = t.closest('.intel-edit');
  if (intelBtn && CA) {
    var key = intelBtn.dataset.key;
    var labels = {businessContext:'Business Context', clientSetup:'Client Setup', productsUsed:'Products Used', importantNotes:'Important Notes', expansionOpportunities:'Expansion Opportunities'};
    var placeholders = {
      businessContext:'What does this client do? Key business drivers and goals...',
      clientSetup:'How are they structured? Key systems, integrations, processes...',
      productsUsed:'Which T2E products are live? ORT, Kiosk, POS, TDS, App/PWA...',
      importantNotes:'Things to always remember about this account...',
      expansionOpportunities:'Where could we grow? New sites, new products, upsell opportunities...'
    };
    M.intelligence(key, labels[key], placeholders[key]);
    return;
  }

  // ── Account summary toggle ──
  if (t.id === 'summary-toggle' || t.closest('#summary-toggle')) {
    if (CA) { ADATA[CA].summaryOpen = !ADATA[CA].summaryOpen; refreshAccount(); }
    return;
  }

  // ── Account summary edit ──
  if (t.id === 'sum-edit-owner') {
    var a2 = ACCOUNTS.find(function(x){ return x.id===CA; });
    M.show('Relationship Owner', [{id:'owner', label:'Stakeholder', placeholder:'e.g. Sydon'}], function() {
      a2.relationshipOwner = M.v('owner');
      M.close(); refreshAccount();
    });
    setTimeout(function(){ var el=document.getElementById('mf-owner'); if(el) el.value=a2.relationshipOwner||''; }, 20);
    return;
  }
  if (t.id === 'sum-edit-products') {
    var d2 = ADATA[CA];
    if (!d2.intelligence) d2.intelligence = {};
    M.show('Products Deployed', [{id:'prod', label:'Products', type:'textarea', placeholder:'e.g. ORT, Kiosk, App/PWA — 3 sites live, 1 in progress'}], function() {
      d2.intelligence.productsUsed = M.v('prod');
      M.close(); refreshAccount();
    });
    setTimeout(function(){ var el=document.getElementById('mf-prod'); if(el) el.value=d2.intelligence.productsUsed||''; }, 20);
    return;
  }

  // ── Account detail add buttons ──
  if (t.id==='a-add-meeting' || t.id==='ov-add-m' || t.id==='acc-log') { M.meeting();     return; }
  if (t.id==='a-add-weekly'  || t.id==='ov-add-w')                      { M.weekly();      return; }
  if (t.id==='a-add-risk')    { M.risk();        return; }
  if (t.id==='a-add-task')    { M.task();        return; }
  if (t.id==='a-add-req')     { M.requirement(); return; }
  if (t.id==='a-add-contact') { M.contact();     return; }
  if (t.id==='a-add-hw')      { M.hardware();    return; }

  // ── Country add button ──
  if (t.id==='c-add-btn') {
    var fn = {stakeholders:'cStakeholder',hardware:'cHardware',payments:'cPayment',competitors:'cCompetitor',operations:'cOperation'}[CIS.tab];
    if (fn) M[fn]();
    return;
  }
});

// Accounts search input
document.getElementById('pg').addEventListener('input', function(e) {
  if (e.target.id==='asrch') { AF.search = e.target.value; render('accounts'); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL SEARCH
// ─────────────────────────────────────────────────────────────────────────────
var GS = {
  open: false,

  run: function(q) {
    if (!q || q.length < 2) { GS.hide(); return; }
    q = q.toLowerCase();
    var results = [];

    // ── Countries ──
    Object.keys(CINFO).forEach(function(k) {
      var c = CINFO[k];
      if (c.name.toLowerCase().indexOf(q) > -1 || c.code.toLowerCase().indexOf(q) > -1) {
        results.push({group:'Countries', title:c.name, sub:c.code + ' · ' + ACCOUNTS.filter(function(a){return a.country===k;}).length + ' accounts', icon:c.flag, iconBg:'var(--fo)', action:function(){ CIS.country=k; go('countries'); }});
      }
      // Search stakeholders within countries
      (c.stakeholders||[]).forEach(function(s) {
        if ((s.name||'').toLowerCase().indexOf(q)>-1 || (s.email||'').toLowerCase().indexOf(q)>-1 || (s.org||'').toLowerCase().indexOf(q)>-1) {
          results.push({group:'Countries', title:s.name, sub:s.title + ' · ' + c.name, icon:ini(s.name), iconBg:'var(--fo)', action:function(){ CIS.country=k; go('countries'); }});
        }
      });
    });

    // ── Accounts ──
    visibleAccounts().forEach(function(a) {
      if (a.name.toLowerCase().indexOf(q)>-1 || a.sector.toLowerCase().indexOf(q)>-1 || a.country.toLowerCase().indexOf(q)>-1) {
        results.push({group:'Accounts', title:a.name, sub:a.sector + ' · ' + a.country, icon:a.initials, iconBg:a.color, action:function(){ openAccount(a.id); }});
      }
      // Account intelligence
      var intel = (ADATA[a.id]||{}).intelligence || {};
      ['businessContext','clientSetup','productsUsed','importantNotes','expansionOpportunities'].forEach(function(k) {
        if (intel[k] && intel[k].toLowerCase().indexOf(q)>-1) {
          results.push({group:'Accounts', title:a.name + ' — Intelligence', sub:intel[k].slice(0,60)+'…', icon:a.initials, iconBg:a.color, action:function(){ openAccount(a.id); ADATA[a.id].tab='intelligence'; refreshAccount(); }});
        }
      });
    });

    // ── Contacts ──
    visibleAccounts().forEach(function(a) {
      (ADATA[a.id]||{contacts:[]}).contacts.forEach(function(c) {
        if ((c.name||'').toLowerCase().indexOf(q)>-1 || (c.email||'').toLowerCase().indexOf(q)>-1 || (c.title||'').toLowerCase().indexOf(q)>-1) {
          results.push({group:'Contacts', title:c.name, sub:c.title + ' · ' + a.name, icon:ini(c.name), iconBg:'#4A8212', action:function(){ openAccount(a.id); ADATA[a.id].tab='contacts'; refreshAccount(); }});
        }
      });
    });

    // ── Activities ──
    visibleAccounts().forEach(function(a) {
      (ADATA[a.id]||{meetings:[]}).meetings.forEach(function(m) {
        var haystack = ((m.title||'') + ' ' + (m.notes||'') + ' ' + (m.attendees||'') + ' ' + (m.actions||[]).join(' ')).toLowerCase();
        if (haystack.indexOf(q)>-1) {
          var typeLabel = {meeting:'Meeting',requirement:'Requirement',decision:'Decision',issue:'Issue',client_feedback:'Client Feedback'}[m.type||'meeting']||'Activity';
          results.push({group:'Activities', title:m.title, sub:typeLabel + ' · ' + a.name + ' · ' + m.date, icon:typeLabel.slice(0,2).toUpperCase(), iconBg:'#0066CC', action:function(){ openAccount(a.id); ADATA[a.id].tab='meetings'; refreshAccount(); }});
        }
      });
    });

    GS.show(q, results);
  },

  show: function(q, results) {
    var panel = '';
    if (results.length === 0) {
      panel = '<div class="gs-panel"><div class="gs-no-results">No results for "<strong>' + q + '</strong>"</div></div>';
    } else {
      var groups = {};
      results.forEach(function(r){ if(!groups[r.group]) groups[r.group]=[]; groups[r.group].push(r); });
      panel = '<div class="gs-panel">';
      Object.keys(groups).forEach(function(g) {
        panel += '<div class="gs-section-label">' + g + ' <span style="color:var(--t4);font-weight:400">(' + groups[g].length + ')</span></div>';
        groups[g].slice(0,5).forEach(function(r, i) {
          panel += '<div class="gs-item" data-gsi="' + (Object.keys(groups).indexOf(g)*100+i) + '">' +
            '<div class="gs-item-icon" style="background:' + r.iconBg + '">' + r.icon + '</div>' +
            '<div><div class="gs-item-title">' + r.title + '</div><div class="gs-item-sub">' + r.sub + '</div></div>' +
          '</div>';
        });
      });
      panel += '</div>';
    }
    document.getElementById('gs-results').innerHTML = panel;
    document.getElementById('gs-results').style.display = 'block';
    GS.open = true;
    GS._results = results;
  },

  hide: function() {
    document.getElementById('gs-results').style.display = 'none';
    GS.open = false;
    GS._results = [];
  },

  _results: []
};

// Input handler
document.getElementById('gs-input').addEventListener('input', function() {
  GS.run(this.value.trim());
});
document.getElementById('gs-input').addEventListener('focus', function() {
  if (this.value.trim().length >= 2) GS.run(this.value.trim());
});

// ⌘K / Ctrl+K shortcut
document.addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    var inp = document.getElementById('gs-input');
    inp.focus(); inp.select();
  }
  if (e.key === 'Escape' && GS.open) {
    GS.hide();
    document.getElementById('gs-input').blur();
  }
});

// Click outside to close
document.addEventListener('click', function(e) {
  if (!e.target.closest('#gs-wrap') && !e.target.closest('#gs-results')) GS.hide();
});

// Click result
document.getElementById('gs-results').addEventListener('click', function(e) {
  var item = e.target.closest('.gs-item');
  if (!item) return;
  var idx = parseInt(item.dataset.gsi);
  // Flatten and find by index
  var flat = [];
  var groups = {};
  GS._results.forEach(function(r){ if(!groups[r.group]) groups[r.group]=[]; groups[r.group].push(r); });
  Object.keys(groups).forEach(function(g, gi) {
    groups[g].slice(0,5).forEach(function(r, i) { flat[gi*100+i] = r; });
  });
  if (flat[idx] && flat[idx].action) {
    GS.hide();
    document.getElementById('gs-input').value = '';
    flat[idx].action();
  }
});

// ── localStorage persistence ─────────────────────────────────────────────────
// Registered users are saved to localStorage so they survive tab closes.
// Hardcoded team accounts always exist; registered accounts are layered on top.
// Nothing is encrypted — this is prototype-only storage.

var LS_USERS_KEY = 'nexus_users';
var LS_DATA_KEY  = 'nexus_data';

// ── User persistence ──────────────────────────────────────────────────────
function loadSavedUsers() {
  try {
    var saved = JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
    saved.forEach(function(u) {
      if (!USERS.find(function(x){ return x.email === u.email; })) USERS.push(u);
      if (!USER_PROFILES.find(function(x){ return x.email === u.email; })) {
        USER_PROFILES.push(u.profile);
        (u.profile.assignedCountries || []).forEach(function(code) {
          if (code === '*') return;
          if (!COUNTRY_USERS[code]) COUNTRY_USERS[code] = [];
          if (!COUNTRY_USERS[code].find(function(p){ return p.email === u.email; }))
            COUNTRY_USERS[code].push(u.profile);
        });
      }
    });
  } catch(e) { console.warn('Nexus: could not load users', e); }
}

function saveRegisteredUser(user, profile) {
  try {
    var saved = JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
    var entry = {email:user.email, name:user.name, role:user.role, initials:user.initials, password:user.password, profile:profile};
    var idx = saved.findIndex(function(u){ return u.email === user.email; });
    if (idx > -1) saved[idx] = entry; else saved.push(entry);
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(saved));
  } catch(e) { console.warn('Nexus: could not save user', e); }
}

// ── App data persistence ───────────────────────────────────────────────────
// Saves and restores ACCOUNTS, ADATA, CDATA, and CINFO intel so data
// entered via the UI survives page refreshes. Admins see everything.

function saveAppData() {
  try {
    localStorage.setItem(LS_DATA_KEY, JSON.stringify({
      accounts:  ACCOUNTS,
      adata:     ADATA,
      cdata:     CDATA,
      cinfoIntel: (function() {
        var out = {};
        Object.keys(CINFO).forEach(function(k) {
          out[k] = {owner: CINFO[k].owner, intelligence: CINFO[k].intelligence, stakeholders: CINFO[k].stakeholders};
        });
        return out;
      })()
    }));
  } catch(e) { console.warn('Nexus: could not save data', e); }
}

function loadAppData() {
  try {
    var raw = localStorage.getItem(LS_DATA_KEY);
    if (!raw) return;
    var d = JSON.parse(raw);

    // Restore accounts
    if (d.accounts && d.accounts.length) {
      ACCOUNTS.length = 0;
      d.accounts.forEach(function(a) { ACCOUNTS.push(a); });
    }

    // Restore per-account workspace data
    if (d.adata) {
      Object.keys(d.adata).forEach(function(id) {
        ADATA[id] = d.adata[id];
      });
    }

    // Restore country workspace data
    if (d.cdata) {
      Object.keys(d.cdata).forEach(function(code) {
        if (CDATA[code]) CDATA[code] = d.cdata[code];
      });
    }

    // Restore country intel / owner / stakeholders
    if (d.cinfoIntel) {
      Object.keys(d.cinfoIntel).forEach(function(code) {
        if (CINFO[code]) {
          CINFO[code].owner         = d.cinfoIntel[code].owner         || '';
          CINFO[code].intelligence  = d.cinfoIntel[code].intelligence  || CINFO[code].intelligence;
          CINFO[code].stakeholders  = d.cinfoIntel[code].stakeholders  || [];
        }
      });
    }
  } catch(e) { console.warn('Nexus: could not load data', e); }
}

// Auto-save whenever data changes — hook into key write operations
var _origGo = null; // patched after go() is defined

// Load on boot
loadSavedUsers();
loadAppData();