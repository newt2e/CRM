// nexus/helpers.js
// Auto-split from nexus-preview-v4.html
// Edit this file, reload index.html

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────
var PAGES = {

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  dashboard: {
    bc: function(){ return '<span class="cur">Dashboard</span>'; },
    render: function() {
      // Admin sees the import/PM view
      if (isAdmin()) return renderAdminDashboard();

      var n = CU ? CU.name : 'there';
      var myAccounts = visibleAccounts();
      var myCodes    = visibleCountryCodes();
      var totT = myAccounts.reduce(function(s,a){ return s + acctTasks(a.id); }, 0);
      var totR = myAccounts.reduce(function(s,a){ return s + acctRisks(a.id); }, 0);
      var totS = myAccounts.reduce(function(s,a){ return s + a.sites; }, 0);
      return (
        '<div style="margin-bottom:24px">' +
          '<h1 style="font-size:22px;font-weight:700;letter-spacing:-.4px;margin-bottom:4px">Good morning, <span style="color:var(--jl)">' + n + '</span></h1>' +
          '<p style="font-size:13px;color:var(--t3)">Here\'s what\'s happening across your partnerships.</p>' +
        '</div>' +
        '<div class="sg">' +
          '<div class="sc"><div class="sl">Accounts</div><div class="sv">' + myAccounts.length + '</div><div class="ss">' + myCodes.map(function(c){ return CINFO[c] ? CINFO[c].flag : ''; }).join(' ') + '</div></div>' +
          '<div class="sc"><div class="sl">Sites</div><div class="sv g">' + totS + '</div><div class="ss">Across ' + myAccounts.length + ' accounts</div></div>' +
          '<div class="sc"><div class="sl">Open Tasks</div><div class="sv a">' + totT + '</div><div class="ss">Needs action</div></div>' +
          '<div class="sc"><div class="sl">Open Risks</div><div class="sv r">' + totR + '</div><div class="ss">Flagged</div></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">' +
          '<div class="card">' +
            '<div class="ch"><span class="ct">Accounts</span><button class="cl" id="d-va">View all</button></div>' +
            myAccounts.slice(0,7).map(function(a) {
              return '<div class="tbl-r" style="grid-template-columns:1fr auto auto;display:grid;align-items:center;gap:12px" data-aid="' + a.id + '">' +
                '<div style="display:flex;align-items:center;gap:10px">' +
                  '<div class="alo" style="background:' + a.color + '">' + a.initials + '</div>' +
                  '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">' + a.name + '</div>' +
                  '<div style="font-size:11px;color:var(--t3)">' + a.sector + ' · ' + a.country + '</div></div>' +
                '</div>' +
                bdg(a.status) +
                '<span style="font-size:11px;color:var(--t4)">›</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:14px">' +
            '<div class="card"><div class="ch"><span class="ct">By Country</span></div>' +
              myCodes.map(function(c) {
                var ac = ACCOUNTS.filter(function(a){ return a.country===c; });
                return '<div class="tbl-r" style="display:flex;align-items:center;justify-content:space-between" data-page="countries">' +
                  '<div style="display:flex;align-items:center;gap:10px">' +
                    '<span style="font-size:22px">' + CINFO[c].flag + '</span>' +
                    '<div><div style="font-size:13px;font-weight:600">' + CINFO[c].name + '</div>' +
                    '<div style="font-size:11px;color:var(--t3)">' + ac.length + ' accounts</div></div>' +
                  '</div>' +
                  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--t4)" stroke-width="2"><path d="M6 3l5 5-5 5"/></svg>' +
                '</div>';
              }).join('') +
            '</div>' +
            '<div class="card"><div class="ch"><span class="ct">Open Risks</span><span class="bdg br">' + totR + '</span></div>' +
              '<div style="padding:20px;font-size:12px;color:var(--t4);text-align:center">' + (totR > 0 ? 'Open risks across accounts' : 'No open risks') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }
  },

  // ── COUNTRIES ──────────────────────────────────────────────────────────────
  countries: {
    bc: function(){ return '<span class="cur">Countries</span>'; },
    render: function() {
      var ci    = CINFO[CIS.country];
      var cd    = CDATA[CIS.country] || {activities:[], requirements:[], risks:[]};
      var accts = ACCOUNTS.filter(function(a){ return a.country === CIS.country; });
      var active = accts.filter(function(a){ return a.status === 'active'; }).length;
      var intel  = ci.intelligence || {};

      var WORKSPACE_TABS = [
        {id:'activities',   label:'Activities ('   + cd.activities.length   + ')'},
        {id:'requirements', label:'Requirements (' + cd.requirements.length + ')'},
        {id:'risks',        label:'Risks ('        + cd.risks.length        + ')'},
        {id:'accounts',     label:'Accounts ('     + accts.length           + ')'},
      ];

      var INTEL_TABS = [
        {id:'paymentLandscape',  label:'Payment Landscape'},
        {id:'hardwareLandscape', label:'Hardware Landscape'},
        {id:'competitors',       label:'Competitors'},
        {id:'localPractices',    label:'Local Practices'}
      ];

      // ── Workspace tab content ──────────────────────────────────────────────
      var workspaceContent = '';
      var sevColor  = {critical:'var(--rd)', high:'var(--am)', medium:'var(--bl)', low:'var(--cr)'};
      var sevBdgCls = {critical:'br', high:'ba', medium:'bb', low:'bx'};
      var actTypeLabel = {meeting:'Meeting', requirement:'Requirement', decision:'Decision', issue:'Issue', client_feedback:'Client Feedback', note:'Note'};

      if (CIS.wtab === 'activities') {
        var acts = cd.activities;
        workspaceContent =
          '<button class="btn btn-p" style="margin-bottom:16px" id="cw-add-activity"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Log Activity</button>' +
          (acts.length === 0
            ? '<div class="empty-box"><p>No activities logged for ' + ci.name + ' yet. Log country-level meetings, decisions and discussions here — not tied to any specific account.</p></div>'
            : [...acts].reverse().map(function(m) {
                var tl = actTypeLabel[m.type] || 'Activity';
                return '<div class="entry">' +
                  '<div class="entry-head">' +
                    '<div><div class="entry-title">' + m.title + '</div>' +
                    '<div class="entry-meta">' + m.date + (m.attendees ? ' · 👥 ' + m.attendees : '') + '</div></div>' +
                    '<span class="bdg bb">' + tl + '</span>' +
                  '</div>' +
                  '<div class="entry-body">' + m.notes + '</div>' +
                  (m.actions && m.actions.length > 0
                    ? '<div class="entry-section"><div class="entry-section-label">Action Items</div>' +
                        m.actions.map(function(ac){ return '<div class="action-item"><span class="action-arrow">→</span>' + ac + '</div>'; }).join('') +
                      '</div>'
                    : '') +
                '</div>';
              }).join(''));

      } else if (CIS.wtab === 'requirements') {
        var reqs = cd.requirements;
        var stMap = {submitted:'bx', in_review:'ba', approved:'bb', implemented:'bg'};
        workspaceContent =
          '<button class="btn btn-p" style="margin-bottom:16px" id="cw-add-req"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Requirement</button>' +
          (reqs.length === 0
            ? '<div class="empty-box"><p>No country-level requirements yet. Add market-wide or regulatory requirements here — things that apply across the whole ' + ci.name + ' market, not a single account.</p></div>'
            : '<div class="card">' +
                reqs.map(function(r, i) {
                  return '<div style="display:flex;align-items:flex-start;gap:12px;padding:13px 16px;border-bottom:' + (i < reqs.length-1 ? '1px solid var(--b1)' : 'none') + '">' +
                    '<div style="flex:1">' +
                      '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">' + r.title + '</div>' +
                      '<div style="font-size:11px;color:var(--t3)">' + r.category + (r.owner ? ' · Owner: ' + r.owner : '') + '</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:5px;flex-shrink:0">' +
                      '<span class="bdg ' + (sevBdgCls[r.priority] || 'bx') + '">' + r.priority + '</span>' +
                      '<span class="bdg ' + (stMap[r.status] || 'bx') + '">' + r.status.replace(/_/g,' ') + '</span>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>');

      } else if (CIS.wtab === 'risks') {
        var risks = cd.risks;
        workspaceContent =
          '<button class="btn btn-p" style="margin-bottom:16px" id="cw-add-risk"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Risk</button>' +
          (risks.length === 0
            ? '<div class="empty-box" style="background:rgba(91,173,3,.06);border-color:rgba(91,173,3,.2)"><p style="color:var(--cr);font-weight:600">No country-level risks. Add market conditions, regulatory or compliance risks for ' + ci.name + ' here.</p></div>'
            : risks.map(function(r) {
                return '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;padding:16px 18px;margin-bottom:10px;display:flex;gap:12px">' +
                  '<div class="risk-bar" style="background:' + (sevColor[r.severity] || 'var(--t4)') + '"></div>' +
                  '<div style="flex:1">' +
                    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px">' +
                      '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + r.title + '</div>' +
                      '<div style="display:flex;gap:5px;flex-shrink:0">' +
                        '<span class="bdg ' + (sevBdgCls[r.severity] || 'bx') + '">' + r.severity + '</span>' +
                        '<span class="bdg ' + (r.status === 'open' ? 'ba' : 'bg') + '">' + r.status + '</span>' +
                      '</div>' +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--t3);line-height:1.6;margin-bottom:6px">' + r.description + '</div>' +
                    (r.mitigation ? '<div style="font-size:12px;padding:8px 12px;background:var(--s1);border-radius:7px;color:var(--t3)"><strong style="color:var(--t1)">Mitigation:</strong> ' + r.mitigation + '</div>' : '') +
                  '</div>' +
                '</div>';
              }).join(''));

      } else if (CIS.wtab === 'accounts') {
        workspaceContent =
          (accts.length === 0
            ? '<div class="empty-box"><p>No accounts in ' + ci.name + ' yet.</p></div>'
            : '<div class="tbl">' +
                '<div class="tbl-h" style="grid-template-columns:2fr 70px 100px 60px 60px 20px">' +
                  ['Account','Status','Sector','Tasks','Risks',''].map(function(h){ return '<div class="tbl-th">' + h + '</div>'; }).join('') +
                '</div>' +
                accts.map(function(a) {
                  return '<div class="tbl-r" style="grid-template-columns:2fr 70px 100px 60px 60px 20px" data-aid="' + a.id + '">' +
                    '<div style="display:flex;align-items:center;gap:10px">' +
                      '<div class="alo" style="background:' + a.color + '">' + a.initials + '</div>' +
                      '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">' + a.name + '</div>' +
                      '<div style="font-size:11px;color:var(--t3)">' + a.sector + '</div></div>' +
                    '</div>' +
                    bdg(a.status) + bdg(a.sector) +
                    '<div class="tbl-td" style="font-family:DM Mono,monospace;font-weight:600;color:' + (acctTasks(a.id)>0?'var(--am)':'var(--t3)') + '">' + acctTasks(a.id) + '</div>' +
                    '<div class="tbl-td" style="font-family:DM Mono,monospace;font-weight:600;color:' + (acctRisks(a.id)>0?'var(--rd)':'var(--t3)') + '">' + acctRisks(a.id) + '</div>' +
                    '<div class="tbl-td" style="color:var(--t4)">›</div>' +
                  '</div>';
                }).join('') +
              '</div>');
      }

      // ── Intel tab content ─────────────────────────────────────────────────
      function intelSection(key, label, icon, placeholder) {
        var val = intel[key];
        var hasVal = val && typeof val === 'string' && val.trim();
        return '<div class="card" style="margin-bottom:12px">' +
          '<div class="ch"><span class="ct">' + icon + ' ' + label + '</span>' +
            '<button class="btn-sm c-intel-edit" data-ikey="' + key + '">' + (hasVal ? 'Edit' : 'Add') + '</button>' +
          '</div>' +
          '<div style="padding:16px">' +
            (hasVal
              ? '<div style="font-size:13px;color:var(--t3);line-height:1.8;white-space:pre-wrap">' + val + '</div>'
              : '<div style="font-size:13px;color:var(--t4);font-style:italic">' + placeholder + '</div>') +
          '</div>' +
        '</div>';
      }

      function competitorsSection() {
        var comps = intel.competitors || [];
        return '<div class="card" style="margin-bottom:12px">' +
          '<div class="ch"><span class="ct">⚔️ Competitors</span><button class="btn-sm" id="c-add-comp">+ Add</button></div>' +
          (comps.length === 0
            ? '<div style="padding:16px;font-size:13px;color:var(--t4);font-style:italic">No competitors added yet.</div>'
            : comps.map(function(c) {
                return '<div class="irow"><div class="ilbl" style="font-weight:600;color:var(--t1)">' + c.name + '</div><div class="ival">' + c.products + '</div><span class="bdg br" style="flex-shrink:0">Competitor</span></div>';
              }).join('')) +
        '</div>';
      }

      var intelContent = (function() {
        if (CIS.itab === 'competitors') return competitorsSection();
        var imap = {
          paymentLandscape:  {label:'Payment Landscape',  icon:'💳', placeholder:'Payment gateways, processors, tax structure used in this market...'},
          hardwareLandscape: {label:'Hardware Landscape', icon:'🖥️', placeholder:'Devices, manufacturers and hardware standards used in this market...'},
          localPractices:    {label:'Local Practices',    icon:'📋', placeholder:'Regional norms, compliance requirements, operational considerations...'}
        };
        var cfg = imap[CIS.itab] || imap['paymentLandscape'];
        return intelSection(CIS.itab, cfg.label, cfg.icon||'', cfg.placeholder);
      })();

      return (
        '<div class="ph"><div><div class="pt">Countries</div><div class="pd">Country workspace and market intelligence.</div></div></div>' +

        // Global stats
        '<div class="sg">' +
          '<div class="sc"><div class="sl">Markets</div><div class="sv">2</div></div>' +
          '<div class="sc"><div class="sl">Total Accounts</div><div class="sv g">' + ACCOUNTS.length + '</div></div>' +
          '<div class="sc"><div class="sl">Total Sites</div><div class="sv">' + ACCOUNTS.reduce(function(s,a){return s+a.sites;},0) + '</div></div>' +
          '<div class="sc"><div class="sl">Open Risks</div><div class="sv r">' + ACCOUNTS.reduce(function(s,a){return s+acctRisks(a.id);},0) + '</div></div>' +
        '</div>' +

        // Country selector
        '<div style="display:flex;gap:8px;margin-bottom:20px">' +
          visibleCountryCodes().map(function(k) {
            var c = CINFO[k]; var on = CIS.country===k;
            return '<button class="c-sel" data-c="' + k + '" style="display:flex;align-items:center;gap:10px;padding:10px 18px;border-radius:10px;border:1.5px solid ' + (on?'var(--fo)':'var(--b2)') + ';background:' + (on?'var(--fo)':'#fff') + ';cursor:pointer">' +
              '<span style="font-size:24px">' + c.flag + '</span>' +
              '<div style="text-align:left">' +
                '<div style="font-size:13px;font-weight:700;color:' + (on?'var(--nt)':'var(--t1)') + '">' + c.name + '</div>' +
                '<div style="font-size:10px;color:' + (on?'rgba(255,255,234,.5)':'var(--t4)') + '">' + ACCOUNTS.filter(function(a){return a.country===k;}).length + ' accounts</div>' +
              '</div>' +
            '</button>';
          }).join('') +
        '</div>' +

        // Two-column layout
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +

          // LEFT — Country workspace
          '<div>' +
            // Country Overview card
            '<div class="card" style="margin-bottom:14px">' +
              '<div class="ch"><span class="ct">Country Overview</span></div>' +
              '<div style="padding:12px 16px;border-bottom:1px solid var(--b1)">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:' + (ci.stakeholders&&ci.stakeholders.length?'10':'0') + 'px">' +
                  '<div style="font-size:12px;font-weight:600;color:var(--t3)">Stakeholders</div>' +
                  '<button class="btn-sm" id="c-add-stakeholder-btn">+ Add</button>' +
                '</div>' +
                (ci.stakeholders && ci.stakeholders.length
                  ? ci.stakeholders.map(function(s) {
                      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--b1)">' +
                        '<div style="width:28px;height:28px;border-radius:50%;background:var(--fo);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--nt);flex-shrink:0">' + ini(s.name) + '</div>' +
                        '<div style="flex:1;min-width:0">' +
                          '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + s.name + '</div>' +
                          '<div style="font-size:11px;color:var(--t3);display:flex;align-items:center;gap:6px;flex-wrap:wrap">' + (s.title ? s.title : '') + (s.title&&s.email?' · ':'') + (s.email?'<span style="color:var(--cr)">' + s.email + '</span><button class="copy-email btn-sm" data-email="' + s.email + '" style="padding:1px 6px;font-size:10px">Copy</button>':'') + '</div>' +
                        '</div>' +
                      '</div>';
                    }).join('')
                  : '<div style="font-size:13px;color:var(--t4);font-style:italic">No stakeholders added yet.</div>') +
              '</div>' +
              '<div class="irow">' +
                '<div class="ilbl">Active Accounts</div>' +
                '<div class="ival" style="display:flex;align-items:center;gap:8px">' +
                  '<span style="font-size:16px;font-weight:700;font-family:DM Mono,monospace;color:var(--cr)">' + active + '</span>' +
                  '<span style="font-size:12px;color:var(--t4)">of ' + accts.length + ' total</span>' +
                '</div>' +
              '</div>' +
              '<div style="padding:12px 16px;background:var(--s1);border-top:1px solid var(--b1)">' +
                '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);margin-bottom:8px">Accounts by Sector</div>' +
                (function() {
                  var bySector = {};
                  accts.forEach(function(a){ if(!bySector[a.sector]) bySector[a.sector]=[]; bySector[a.sector].push(a); });
                  return Object.keys(bySector).map(function(sec) {
                    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' + bdg(sec) +
                      '<span style="font-size:12px;color:var(--t3)">' + bySector[sec].map(function(a){ return a.name; }).join(', ') + '</span>' +
                    '</div>';
                  }).join('') || '<div style="font-size:12px;color:var(--t4)">No accounts yet.</div>';
                })() +
              '</div>' +
            '</div>' +

            // Workspace tabs
            '<div class="tab-bar" style="margin-bottom:16px">' +
              WORKSPACE_TABS.map(function(t) {
                return '<button class="tab-btn ' + (CIS.wtab===t.id?'on':'') + '" data-wtab="' + t.id + '">' + t.label + '</button>';
              }).join('') +
            '</div>' +
            '<div id="cw-content">' + workspaceContent + '</div>' +
          '</div>' +

          // RIGHT — Market Intelligence
          '<div>' +
            '<div style="display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:start">' +
              '<div class="card" style="position:sticky;top:70px">' +
                '<div style="padding:10px 12px;border-bottom:1px solid var(--b1);background:var(--s1)">' +
                  '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)">Market Intelligence</div>' +
                '</div>' +
                INTEL_TABS.map(function(t) {
                  return '<button class="ctab ' + (CIS.itab===t.id?'on':'') + '" data-itab="' + t.id + '">' + t.label + '</button>';
                }).join('') +
              '</div>' +
              '<div>' + intelContent + '</div>' +
            '</div>' +
          '</div>' +

        '</div>'
      );
    }
  },

  // ── ACCOUNTS LIST ──────────────────────────────────────────────────────────
  accounts: {
    bc: function(){ return '<span class="cur">Accounts</span>'; },
    actions: function(){ return '<button class="btn btn-p" id="new-acct-btn"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>New Account</button>'; },
    render: function() {
      if (!AF.selected) AF.selected = {};
      var f = visibleAccounts().filter(function(a) {
        return (!AF.search || a.name.toLowerCase().indexOf(AF.search.toLowerCase())>-1) &&
               (AF.country==='all' || a.country===AF.country) &&
               (AF.sector==='all'  || a.sector===AF.sector);
      });
      return (
        '<div class="ph"><div><div class="pt">Accounts</div><div class="pd">Click an account to open its workspace.</div></div></div>' +
        '<div class="sg">' +
          '<div class="sc"><div class="sl">Total</div><div class="sv">' + ACCOUNTS.length + '</div></div>' +
          '<div class="sc"><div class="sl">Active</div><div class="sv g">' + ACCOUNTS.filter(function(a){return a.status==='active';}).length + '</div></div>' +
          '<div class="sc"><div class="sl">🇺🇸 USA</div><div class="sv">' + ACCOUNTS.filter(function(a){return a.country==='USA';}).length + '</div></div>' +
          '<div class="sc"><div class="sl">🇩🇪 Germany</div><div class="sv">' + ACCOUNTS.filter(function(a){return a.country==='Germany';}).length + '</div></div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">' +
          '<div style="display:flex;align-items:center;gap:7px;padding:7px 12px;background:#fff;border:1.5px solid var(--b1);border-radius:8px;flex:1;max-width:260px">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--t4)" stroke-width="1.8"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>' +
            '<input id="asrch" style="border:none;outline:none;background:none;font-size:13px;color:var(--t1);width:100%" placeholder="Search accounts..." value="' + AF.search + '"/>' +
          '</div>' +
          ['all','USA','Germany'].map(function(c){ return '<button class="fp ' + (AF.country===c?'on':'') + '" data-cf="' + c + '">' + (c==='all'?'All':c==='USA'?'🇺🇸 USA':'🇩🇪 Germany') + '</button>'; }).join('') +
          ['B & I','Healthcare','Education'].map(function(s){ var on=AF.sector===s; return '<button class="fp ' + (on?'on':'') + '" data-sf="' + s + '">' + (on?'✕ ':'') + s + '</button>'; }).join('') +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px" id="acct-sel-bar">' +
          '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t3);cursor:pointer">' +
            '<input type="checkbox" id="acct-sel-all" style="width:15px;height:15px;accent-color:var(--fo);cursor:pointer"' + (f.length > 0 && f.every(function(a){ return AF.selected[a.id]; }) ? ' checked' : '') + '/>' +
            'Select all' +
          '</label>' +
          (Object.keys(AF.selected).filter(function(k){ return AF.selected[k]; }).length > 0
            ? '<button class="btn" style="background:var(--rd);color:#fff;font-size:12px;gap:6px" id="acct-del-selected">' +
                '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h10M6 4V2h4v2M5 4v8h6V4"/></svg>' +
                'Delete ' + Object.keys(AF.selected).filter(function(k){ return AF.selected[k]; }).length + ' selected' +
              '</button>'
            : '<span style="font-size:11px;color:var(--t4)">' + f.length + ' of ' + ACCOUNTS.length + ' accounts</span>') +
        '</div>' +

        '<div class="tbl">' +
          '<div class="tbl-h" style="grid-template-columns:32px 2fr 70px 100px 110px 60px 60px 24px">' +
            ['','Account','Status','Sector','Country','Tasks','Risks',''].map(function(h){ return '<div class="tbl-th">' + h + '</div>'; }).join('') +
          '</div>' +
          (f.length===0 ? '<div style="padding:40px;text-align:center;font-size:13px;color:var(--t4)">No accounts match.</div>' : '') +
          f.map(function(a) {
            var isSel = !!AF.selected[a.id];
            return '<div class="tbl-r" style="grid-template-columns:32px 2fr 70px 100px 110px 60px 60px 24px;background:' + (isSel?'rgba(91,173,3,.06)':'') + '" data-aid="' + a.id + '">' +
              '<div style="display:flex;align-items:center" onclick="event.stopPropagation()">' +
                '<input type="checkbox" class="acct-cb" data-aid="' + a.id + '" style="width:15px;height:15px;accent-color:var(--fo);cursor:pointer"' + (isSel?' checked':'') + '/>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                '<div class="alo" style="background:' + a.color + '">' + a.initials + '</div>' +
                '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">' + a.name + '</div><div style="font-size:11px;color:var(--t3)">' + a.sector + '</div></div>' +
              '</div>' +
              bdg(a.status) + bdg(a.sector) +
              '<div class="tbl-td">' + (CINFO[a.country] ? CINFO[a.country].flag : '') + ' ' + a.country + '</div>' +
              '<div class="tbl-td" style="font-family:DM Mono,monospace;font-weight:600;color:' + (acctTasks(a.id)>0?'var(--am)':'var(--t3)') + '">' + acctTasks(a.id) + '</div>' +
              '<div class="tbl-td" style="font-family:DM Mono,monospace;font-weight:600;color:' + (acctRisks(a.id)>0?'var(--rd)':'var(--t3)') + '">' + acctRisks(a.id) + '</div>' +
              '<div class="tbl-td" style="color:var(--t4)">›</div>' +
            '</div>';
          }).join('') +
        '</div>'
      );
    }
  },

  // ── SIMPLE PAGES ───────────────────────────────────────────────────────────

  contacts: {
    bc: function(){ return '<span class="cur">Contacts</span>'; },
    actions: function(){ return '<button class="btn btn-p" id="new-acct-btn"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>New</button>'; },
    render: function() {
      var all = [];

      // Account-level contacts
      visibleAccounts().forEach(function(a) {
        ((ADATA[a.id]||{}).contacts||[]).forEach(function(c) {
          all.push({
            contact: c,
            source:  a.name,
            sourceColor: a.color,
            sourceInitials: a.initials,
            country: a.country,
            type: 'account'
          });
        });
      });

      // Country-level stakeholders
      visibleCountryCodes().forEach(function(code) {
        var ci = CINFO[code];
        (ci.stakeholders||[]).forEach(function(s) {
          all.push({
            contact: s,
            source:  ci.name,
            sourceColor: 'var(--fo)',
            sourceInitials: ci.flag,
            country: code,
            type: 'country'
          });
        });
      });

      var total       = all.length;
      var acctCount   = all.filter(function(x){ return x.type==='account'; }).length;
      var countryCount= all.filter(function(x){ return x.type==='country'; }).length;

      return (
        '<div class="ph"><div><div class="pt">Contacts</div><div class="pd">People across all accounts and country stakeholders.</div></div></div>' +
        '<div class="sg">' +
          '<div class="sc"><div class="sl">Total</div><div class="sv ' + (total>0?'g':'') + '">' + total + '</div></div>' +
          '<div class="sc"><div class="sl">Account Contacts</div><div class="sv">' + acctCount + '</div></div>' +
          '<div class="sc"><div class="sl">Country Stakeholders</div><div class="sv">' + countryCount + '</div></div>' +
          '<div class="sc"><div class="sl">Regions</div><div class="sv">' + visibleCountryCodes().length + '</div></div>' +
        '</div>' +
        (total === 0
          ? '<div class="empty-box"><p>No contacts yet. Add contacts inside an account workspace, or add stakeholders to a country.</p></div>'
          : '<div class="tbl">' +
              '<div class="tbl-h" style="grid-template-columns:2fr 2fr 80px 160px">' +
                ['Name','Title','Country','Email'].map(function(h){ return '<div class="tbl-th">' + h + '</div>'; }).join('') +
              '</div>' +
              all.map(function(item) {
                var c = item.contact;
                var flag = CINFO[item.country] ? CINFO[item.country].flag : '';
                return '<div class="tbl-r" style="grid-template-columns:2fr 2fr 80px 160px;cursor:default">' +
                  '<div style="display:flex;align-items:center;gap:9px">' +
                    '<div style="width:28px;height:28px;border-radius:50%;background:' + item.sourceColor + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">' + ini(c.name) + '</div>' +
                    '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + c.name + '</div>' +
                  '</div>' +
                  '<div class="tbl-td">' + (c.title||'—') + '</div>' +
                  '<div class="tbl-td">' + flag + ' ' + (CINFO[item.country]?CINFO[item.country].name:item.country) + '</div>' +
                  '<div style="display:flex;align-items:center;gap:6px">' +
                    (c.email
                      ? '<span style="font-size:12px;color:var(--cr);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">' + c.email + '</span>' +
                        '<button class="copy-email btn-sm" data-email="' + c.email + '" style="flex-shrink:0;padding:2px 7px;font-size:10px">Copy</button>'
                      : '<span style="font-size:12px;color:var(--t4)">—</span>') +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>')
      );
    }
  },
  tasks: {
    bc: function(){ return '<span class="cur">Tasks</span>'; },
    actions: function(){ return '<button class="btn btn-p" id="new-task-btn"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Task</button>'; },
    render: function() {
      var all = [];
      visibleAccounts().forEach(function(a) {
        ((ADATA[a.id]||{}).tasks||[]).forEach(function(t){ all.push({task:t, name:a.name, color:a.color, initials:a.initials, aid:a.id}); });
      });
      var open = all.filter(function(x){ return !x.task.done; }).length;
      var done = all.filter(function(x){ return x.task.done; }).length;
      var priMap = {critical:'br', high:'ba', medium:'bb', low:'bx'};
      var sevColor = {critical:'var(--rd)',high:'var(--am)',medium:'var(--bl)',low:'var(--cr)'};
      return (
        '<div class="ph"><div><div class="pt">Tasks</div><div class="pd">Open items across all accounts.</div></div></div>' +
        '<div class="sg">' +
          '<div class="sc"><div class="sl">Total</div><div class="sv">' + all.length + '</div></div>' +
          '<div class="sc"><div class="sl">Open</div><div class="sv a">' + open + '</div></div>' +
          '<div class="sc"><div class="sl">Done</div><div class="sv g">' + done + '</div></div>' +
          '<div class="sc"><div class="sl">Accounts</div><div class="sv">' + visibleAccounts().filter(function(a){ return ((ADATA[a.id]||{}).tasks||[]).length>0; }).length + '</div></div>' +
        '</div>' +
        (all.length===0 ? '<div class="empty-box"><p>No tasks yet. Import a sync sheet or add tasks inside an account.</p></div>' :
          '<div class="tbl">' +
            '<div class="tbl-h" style="grid-template-columns:2fr 1fr 80px 80px 100px">' +
              ['Task','Account','Priority','Status','Due'].map(function(h){ return '<div class="tbl-th">'+h+'</div>'; }).join('') +
            '</div>' +
            all.map(function(x) {
              var t = x.task;
              return '<div class="tbl-r" style="grid-template-columns:2fr 1fr 80px 80px 100px;cursor:default" data-aid="' + x.aid + '">' +
                '<div style="display:flex;align-items:center;gap:8px">' +
                  '<div style="width:14px;height:14px;border-radius:3px;' + (t.done?'background:var(--jl);':'border:2px solid var(--b2);') + 'flex-shrink:0"></div>' +
                  '<span style="font-size:13px;color:' + (t.done?'var(--t4)':'var(--t1)') + ';' + (t.done?'text-decoration:line-through':'') + '">' + t.title + '</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:6px">' +
                  '<div style="width:20px;height:20px;border-radius:5px;background:' + x.color + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">' + x.initials + '</div>' +
                  '<span style="font-size:12px;color:var(--t3)">' + x.name + '</span>' +
                '</div>' +
                '<span class="bdg ' + (priMap[t.priority]||'bx') + '">' + (t.priority||'—') + '</span>' +
                '<span class="bdg ' + (t.done?'bg':'ba') + '">' + (t.done?'done':'open') + '</span>' +
                '<div class="tbl-td">' + (t.due||'—') + '</div>' +
              '</div>';
            }).join('') +
          '</div>')
      );
    }
  },
  activities:   simplePage('Activities','Meetings, decisions, issues and client feedback across all accounts.',['Total','This Month','Action Items','Accounts']),
  requirements: {
    bc: function(){ return '<span class="cur">Requirements</span>'; },
    actions: function(){ return '<button class="btn btn-p" id="new-req-btn"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Requirement</button>'; },
    render: function() {
      // Gather from all visible accounts
      var all = [];
      visibleAccounts().forEach(function(a) {
        var reqs = (ADATA[a.id] || {}).requirements || [];
        reqs.forEach(function(r) { all.push({req:r, scope:'account', name:a.name, color:a.color, initials:a.initials}); });
      });
      // Gather from all visible country workspaces
      visibleCountryCodes().forEach(function(c) {
        var reqs = (CDATA[c] || {}).requirements || [];
        reqs.forEach(function(r) { all.push({req:r, scope:'country', name:CINFO[c].name, color:'var(--fo)', initials:CINFO[c].flag}); });
      });

      var total       = all.length;
      var inReview    = all.filter(function(x){ return x.req.status==='in_review'; }).length;
      var approved    = all.filter(function(x){ return x.req.status==='approved'; }).length;
      var implemented = all.filter(function(x){ return x.req.status==='implemented'; }).length;

      var stMap  = {submitted:'bx', in_review:'ba', approved:'bb', implemented:'bg'};
      var priMap = {critical:'br', high:'ba', medium:'bb', low:'bx'};

      return (
        '<div class="ph"><div><div class="pt">Requirements</div>' +
        '<div class="pd">All requirements across accounts and countries.</div></div></div>' +

        '<div class="sg">' +
          '<div class="sc"><div class="sl">Total</div><div class="sv ' + (total>0?'g':'') + '">' + total + '</div></div>' +
          '<div class="sc"><div class="sl">In Review</div><div class="sv a">' + inReview + '</div></div>' +
          '<div class="sc"><div class="sl">Approved</div><div class="sv">' + approved + '</div></div>' +
          '<div class="sc"><div class="sl">Implemented</div><div class="sv g">' + implemented + '</div></div>' +
        '</div>' +

        (total === 0
          ? '<div class="empty-box"><p>No requirements yet. Import a file or add requirements inside an account or country workspace.</p></div>'
          : '<div class="tbl">' +
              '<div class="tbl-h" style="grid-template-columns:2fr 1fr 80px 90px 100px">' +
                ['Requirement','Source','Priority','Status','Category'].map(function(h){ return '<div class="tbl-th">' + h + '</div>'; }).join('') +
              '</div>' +
              all.map(function(x) {
                var r = x.req;
                return '<div class="tbl-r" style="grid-template-columns:2fr 1fr 80px 90px 100px">' +
                  '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + r.title + '</div>' +
                  '<div style="display:flex;align-items:center;gap:7px">' +
                    '<div style="width:20px;height:20px;border-radius:5px;background:' + x.color + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">' + x.initials + '</div>' +
                    '<span style="font-size:12px;color:var(--t3)">' + x.name + '</span>' +
                  '</div>' +
                  '<span class="bdg ' + (priMap[r.priority]||'bx') + '">' + (r.priority||'—') + '</span>' +
                  '<span class="bdg ' + (stMap[r.status]||'bx') + '">' + (r.status||'—').replace(/_/g,' ') + '</span>' +
                  '<div class="tbl-td">' + (r.category||'—') + '</div>' +
                '</div>';
              }).join('') +
            '</div>')
      );
    }
  },
  risks: {
    bc: function(){ return '<span class="cur">Risks</span>'; },
    actions: function(){ return '<button class="btn btn-p" id="new-risk-btn"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>Add Risk</button>'; },
    render: function() {
      var all = [];
      visibleAccounts().forEach(function(a) {
        ((ADATA[a.id]||{}).risks||[]).forEach(function(r){ all.push({risk:r, scope:'account', name:a.name, color:a.color, initials:a.initials, aid:a.id}); });
      });
      visibleCountryCodes().forEach(function(c) {
        ((CDATA[c]||{}).risks||[]).forEach(function(r){ all.push({risk:r, scope:'country', name:CINFO[c].name, color:'var(--fo)', initials:CINFO[c].flag}); });
      });
      var open      = all.filter(function(x){ return x.risk.status==='open'; }).length;
      var critical  = all.filter(function(x){ return x.risk.severity==='critical'; }).length;
      var mitigated = all.filter(function(x){ return x.risk.status==='mitigated'; }).length;
      var sevColor  = {critical:'var(--rd)',high:'var(--am)',medium:'var(--bl)',low:'var(--cr)'};
      var sevBdg    = {critical:'br',high:'ba',medium:'bb',low:'bx'};
      return (
        '<div class="ph"><div><div class="pt">Risks</div><div class="pd">All risks across accounts and countries.</div></div></div>' +
        '<div class="sg">' +
          '<div class="sc"><div class="sl">Total</div><div class="sv">' + all.length + '</div></div>' +
          '<div class="sc"><div class="sl">Open</div><div class="sv r">' + open + '</div></div>' +
          '<div class="sc"><div class="sl">Critical</div><div class="sv r">' + critical + '</div></div>' +
          '<div class="sc"><div class="sl">Mitigated</div><div class="sv g">' + mitigated + '</div></div>' +
        '</div>' +
        (all.length===0 ? '<div class="empty-box" style="background:rgba(91,173,3,.06);border-color:rgba(91,173,3,.2)"><p style="color:var(--cr);font-weight:600">No risks recorded — all clear.</p></div>' :
          all.map(function(x) {
            var r = x.risk;
            return '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px">' +
              '<div style="width:4px;border-radius:3px;background:' + (sevColor[r.severity]||'var(--t4)') + ';flex-shrink:0;align-self:stretch"></div>' +
              '<div style="flex:1">' +
                '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px">' +
                  '<div style="font-size:13px;font-weight:600;color:var(--t1)">' + r.title + '</div>' +
                  '<div style="display:flex;gap:5px;flex-shrink:0">' +
                    '<span class="bdg ' + (sevBdg[r.severity]||'bx') + '">' + (r.severity||'—') + '</span>' +
                    '<span class="bdg ' + (r.status==='open'?'ba':'bg') + '">' + (r.status||'open') + '</span>' +
                  '</div>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--t3);margin-bottom:4px">' + (r.description||'') + '</div>' +
                '<div style="display:flex;align-items:center;gap:7px">' +
                  '<div style="width:18px;height:18px;border-radius:4px;background:' + x.color + ';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">' + x.initials + '</div>' +
                  '<span style="font-size:11px;color:var(--t4)">' + x.name + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join(''))
      );
    }
  },

  import: {
    bc: function(){ return '<span class="cur">Import</span>'; },
    render: function() {
      var codes = visibleCountryCodes();
      var selC  = IMP.country || codes[0] || '';
      return (
        '<div class="ph"><div><div class="pt">Import</div>' +
        '<div class="pd">Upload a file, extract its content, then map it to the right place in Nexus.</div></div></div>' +

        // Step 1 — Country
        '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;margin-bottom:14px;overflow:hidden">' +
          '<div style="padding:11px 16px;background:var(--s1);border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:8px">' +
            '<div style="width:20px;height:20px;border-radius:50%;background:var(--fo);color:var(--nt);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">1</div>' +
            '<span style="font-size:13px;font-weight:600;color:var(--t1)">Select Country</span>' +
          '</div>' +
          '<div style="padding:14px 16px;display:flex;flex-wrap:wrap;gap:8px">' +
          codes.map(function(k) {
            var c  = CINFO[k];
            var on = selC === k;
            return '<button class="imp-csel" data-c="' + k + '" style="display:flex;align-items:center;gap:7px;padding:7px 13px;border-radius:8px;border:1.5px solid ' + (on?'var(--fo)':'var(--b2)') + ';background:' + (on?'var(--fo)':'transparent') + ';cursor:pointer">' +
              '<span style="font-size:16px">' + c.flag + '</span>' +
              '<span style="font-size:12px;font-weight:' + (on?'700':'400') + ';color:' + (on?'var(--nt)':'var(--t1)') + '">' + c.name + '</span>' +
            '</button>';
          }).join('') +
          '</div>' +
        '</div>' +

        // Step 2 — Upload
        '<div style="background:#fff;border:1.5px solid var(--b1);border-radius:12px;margin-bottom:14px;overflow:hidden">' +
          '<div style="padding:11px 16px;background:var(--s1);border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:8px">' +
            '<div style="width:20px;height:20px;border-radius:50%;background:var(--fo);color:var(--nt);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">2</div>' +
            '<span style="font-size:13px;font-weight:600;color:var(--t1)">Upload File</span>' +
            '<span style="font-size:12px;color:var(--t4);margin-left:4px">.xlsx &nbsp;.pptx &nbsp;.docx &nbsp;.pdf &nbsp;.mov &nbsp;.mp4</span>' +
          '</div>' +
          '<div class="upload-zone" id="xl-drop-zone" style="margin:14px;border-radius:10px">' +
            '<svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="var(--t4)" stroke-width="1.3" style="margin-bottom:8px"><path d="M4 2h5l3 3v9H4V2z"/><path d="M9 2v3h3"/><path d="M8 7v5M6 10l2 2 2-2"/></svg>' +
            '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:4px">Drop file here or browse</div>' +
            '<div style="font-size:12px;color:var(--t4);margin-bottom:12px">Excel, PowerPoint or Word</div>' +
            '<input type="file" id="xl-file-input" accept=".xlsx,.xls,.pptx,.ppt,.docx,.doc,.pdf,.mov,.mp4" style="display:none"/>' +
            '<button class="btn btn-p" id="xl-browse-btn">Browse</button>' +
          '</div>' +
        '</div>' +

        // Step 3 — populated after extract
        '<div id="imp-step3"></div>'
      );
    }
  }
};

function simplePage(title, desc, stats) {
  return {
    bc: function(){ return '<span class="cur">' + title + '</span>'; },
    actions: function(){ return '<button class="btn btn-p"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v10M3 8h10"/></svg>New</button>'; },
    render: function() {
      return '<div class="ph"><div><div class="pt">' + title + '</div><div class="pd">' + desc + '</div></div></div>' +
        '<div class="sg">' + stats.map(function(s,i){ var c=['','g','a',''][i]; return '<div class="sc"><div class="sl">' + s + '</div><div class="sv' + (c?' '+c:'') + '">—</div></div>'; }).join('') + '</div>' +
        '<div class="empty-box"><p>No ' + title.toLowerCase() + ' yet. Connect your data source to load.</p></div>';
    }
  };
}