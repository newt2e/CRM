// nexus/data.js
// Core data model for Nexus — Global Partnerships Workspace
//
// This file defines:
//   - User roles and profiles
//   - Country workspaces (CINFO + CDATA)
//   - Account store (ACCOUNTS + ADATA)
//   - Activity log
//   - Visibility helpers (visibleAccounts, visibleCountryCodes, isAdmin)
//
// All arrays start empty. Data is populated via:
//   - The import pipeline (import.js)
//   - User input through the UI
//   - localStorage persistence (loadAppData in nav.js)
//
// To add a new country: add an entry to the `regions` array in CINFO.
// To add a new role: add an entry to USER_ROLES and update auth.js role checks.

// ─────────────────────────────────────────────────────────────────────────────
// USER DATA MODEL
// ─────────────────────────────────────────────────────────────────────────────
//
// USER_ROLES defines the permission tiers in the platform.
//
// 'admin'                — full access to all countries, accounts, settings
// 'partnership_manager'  — full access to assigned countries + their accounts
// 'implementation_engineer' — access to assigned countries; read-only on intel/risks
// 'viewer'               — read-only across assigned countries
//
// Country assignment:
//   assignedCountries: ['USA', 'Germany']  — matches CINFO keys
//   assignedCountries: ['*']               — all countries (admin / global PM)
//
// Each USER_PROFILE entry is the authoritative record for a named user.
// The USERS array (above) is the login credential store — kept separate
// so auth can be swapped without touching the profile model.
//
// Linking:
//   USER_PROFILES[].email  →  USERS[].email       (identity link)
//   USER_PROFILES[].email  →  CINFO[code].owner   (country stakeholder)
//   USER_PROFILES[].email  →  ACCOUNTS[].relationshipOwner (account owner)
//   USER_PROFILES[].email  →  ACTIVITIES[].createdBy        (activity author)

var USER_ROLES = {
  admin:                    {label: 'Admin',                    level: 4},
  partnership_manager:      {label: 'Partnership Manager',      level: 3},
  implementation_engineer:  {label: 'Implementation Engineer',  level: 2},
  viewer:                   {label: 'Viewer',                   level: 1}
};

// USER_PROFILES — one entry per named team member
// Shape:
// {
//   id,                  // unique string — auto-generated at registration
//   name,                // display name
//   email,               // matches USERS[].email — the identity link
//   role,                // key of USER_ROLES
//   assignedCountries,   // [] of CINFO keys, or ['*'] for all
//   active,              // boolean — false = deactivated, cannot log in
// }

var USER_PROFILES = [];

// ─────────────────────────────────────────────────────────────────────────────

// USERS — populated at runtime from localStorage and new registrations.
// No hardcoded credentials. All accounts are created via the register form.
var USERS = [];

var CU = null, CP = 'dashboard', CA = null;

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────
// Starts empty. Populated via:
//   - Import pipeline (Excel license sheets)
//   - Manual entry via the New Account button
//
// Account shape:
//   { id, name, initials, color, status, sector, country, sites,
//     products, relationshipStatus, relationshipOwner, intelligence }
var ACCOUNTS = [];

// Per-account workspace — all empty, populated via import or UI
var ADATA = {};

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY WORKSPACES
// ─────────────────────────────────────────────────────────────────────────────
// Each country holds top-level intelligence and stakeholder data.
// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY — top-level workspace, independent of any account
// ─────────────────────────────────────────────────────────────────────────────
//
// Structure:
//   Country
//   ├── identity       (flag, name, code, owner/stakeholder)
//   ├── intelligence   (market context — payment, hardware, competitors, practices)
//   ├── activities[]   (country-level meetings, decisions, issues — not account-specific)
//   ├── requirements[] (market-wide requirements e.g. regulatory, platform)
//   ├── risks[]        (country-level risks e.g. market conditions, compliance)
//   └── accounts[]     (derived — filtered from ACCOUNTS by country code)
//
// Account-specific data (client meetings, account risks, tasks) lives in ADATA[accountId].
// Country-level data (market discussions, regulatory risks) lives in CDATA[countryCode].
//
// Separation principle:
//   Country-level → CDATA[countryCode]  (market discussions, regulatory risks, platform requirements)
//   Account-level → ADATA[accountId]    (client meetings, account-specific risks, tasks)

// All 10 regions — each starts empty, populated via UI
var CINFO = (function() {
  var regions = [
    {code:'Singapore',  name:'Singapore',    flag:'🇸🇬', sectors:['B & I','Healthcare','Education']},
    {code:'HongKong',   name:'Hong Kong',    flag:'🇭🇰', sectors:['B & I','Healthcare']},
    {code:'NewZealand', name:'New Zealand',  flag:'🇳🇿', sectors:['B & I','Healthcare','Education']},
    {code:'Japan',      name:'Japan',        flag:'🇯🇵', sectors:['B & I','Healthcare','Education']},
    {code:'Australia',  name:'Australia',    flag:'🇦🇺', sectors:['B & I','Healthcare','Education','Levy']},
    {code:'Spain',      name:'Spain',        flag:'🇪🇸', sectors:['B & I','Healthcare']},
    {code:'Germany',    name:'Germany',      flag:'🇩🇪', sectors:['B & I','Healthcare']},
    {code:'USA',        name:'United States',flag:'🇺🇸', sectors:['B & I','Healthcare','Education','Levy']},
    {code:'Canada',     name:'Canada',       flag:'🇨🇦', sectors:['B & I','Healthcare','Education']},
    {code:'Italy',      name:'Italy',        flag:'🇮🇹', sectors:['B & I','Healthcare']}
  ];
  var map = {};
  regions.forEach(function(r) {
    map[r.code] = {
      flag: r.flag, name: r.name, code: r.code,
      owner: '',
      sectors: r.sectors,
      intelligence: {paymentLandscape:'', hardwareLandscape:'', competitors:[], localPractices:''},
      stakeholders: [], hardware: [], payments: [], operations: []
    };
  });
  return map;
})()
// ─────────────────────────────────────────────────────────────────────────────
// CDATA — country-level workspace (parallel to ADATA for accounts)
// ─────────────────────────────────────────────────────────────────────────────
//
// CDATA[countryCode] shape:
// {
//   tab,           // active UI tab
//   activities:    [],  // country-level activities (not tied to any account)
//   requirements:  [],  // market-wide requirements
//   risks:         [],  // country-level risks
// }
//
// activity shape (same as account-level):
//   { id, type, title, date, attendees, notes, actions[], createdBy }
//   type: 'meeting' | 'requirement' | 'decision' | 'issue' | 'client_feedback' | 'note'
//
// requirement shape (same as account-level):
//   { title, category, owner, priority, status }
//   category: 'Regulatory' | 'Platform' | 'Operational' | 'Commercial' | 'Commercial'
//
// risk shape (same as account-level):
//   { title, severity, status, description, mitigation }
//   Typical entries: compliance/regulatory risk, market risk, commercial risk

var CDATA = {};
Object.keys(CINFO).forEach(function(code) {
  CDATA[code] = {
    tab:          'activities',   // default tab when country workspace opens
    activities:   [],
    requirements: [],
    risks:        []
  };
});

// ── Country → Users index ─────────────────────────────────────────────────
// Derived map: countryCode → USER_PROFILES[] assigned to that country.
// Rebuilt whenever USER_PROFILES changes.
// Usage: COUNTRY_USERS['USA'] → [profile, profile, ...]

var COUNTRY_USERS = {};
(function buildCountryUsers() {
  Object.keys(CINFO).forEach(function(code) { COUNTRY_USERS[code] = []; });
  USER_PROFILES.forEach(function(u) {
    if (!u.active) return;
    var countries = u.assignedCountries[0] === '*'
      ? Object.keys(CINFO)
      : u.assignedCountries;
    countries.forEach(function(code) {
      if (COUNTRY_USERS[code]) COUNTRY_USERS[code].push(u);
    });
  });
})();

// ── Lookup helpers ─────────────────────────────────────────────────────────

function getUserProfile(email) {
  return USER_PROFILES.find(function(u) { return u.email === email; }) || null;
}
function getUsersForCountry(countryCode) {
  return COUNTRY_USERS[countryCode] || [];
}
function userCanAccessCountry(profile, countryCode) {
  if (!profile || !profile.active) return false;
  if (profile.assignedCountries[0] === '*') return true;
  return profile.assignedCountries.indexOf(countryCode) > -1;
}
function getRoleLabel(roleKey) {
  return (USER_ROLES[roleKey] || {label: roleKey}).label;
}
function currentProfile() {
  return CU ? getUserProfile(CU.email) : null;
}

// Returns country codes the current user can see
// Admin / ['*'] → all countries; others → their assigned list
function visibleCountryCodes() {
  var p = currentProfile();
  // Fall back gracefully if profile not found
  var countries = p ? p.assignedCountries : (CU ? CU.assignedCountries || ['*'] : ['*']);
  if (!countries || countries[0] === '*') return Object.keys(CINFO);
  return countries.filter(function(c) { return CINFO[c]; });
}

// Returns accounts visible to the current user
function visibleAccounts() {
  var codes = visibleCountryCodes();
  return ACCOUNTS.filter(function(a) { return codes.indexOf(a.country) > -1; });
}

// Is the current user an admin?
function isAdmin() {
  var p = currentProfile();
  var role = p ? p.role : (CU ? CU.role : '');
  return role === 'admin';
}


// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT — extends ACCOUNTS[], per-account workspace in ADATA
// ─────────────────────────────────────────────────────────────────────────────
//
// ACCOUNTS[] entry shape:
//   { id, name, initials, color, status, sector, country, sites,
//     products,             // T2E products deployed at this account e.g. ['ORT','Kiosk','App/PWA']
//     relationshipStatus,   // 'active' | 'at_risk' | 'new' | 'churned'
//     relationshipOwner,    // PM name
//     intelligence          // free-form account context string
//   }

ACCOUNTS.forEach(function(a) {
  if (!a.products)           a.products           = [];
  if (!a.relationshipStatus) a.relationshipStatus = 'active';
  if (!a.relationshipOwner)  a.relationshipOwner  = '';
  if (!a.intelligence)       a.intelligence       = '';
});

// ─────────────────────────────────────────────────────────────────────────────
// ADATA — per-account workspace
// ─────────────────────────────────────────────────────────────────────────────
//
// ADATA[accountId] shape:
// {
//   tab,
//   summaryOpen,
//   meetings:     [],   // { id, type, title, date, attendees, notes, actions[] }
//   weeklies:     [],   // { week, status, summary, highlights }
//   risks:        [],   // { title, severity, status, description, mitigation }
//   tasks:        [],   // { title, priority, done, due }
//   requirements: [],   // { title, category, owner, priority, status }
//   contacts:     [],   // { name, title, email, phone }
//   hardware:     [],   // { device, model, site, qty }
//   sites:        [],   // { name, location, products[] }
//   intelligence: {     // structured account intel
//     businessContext, clientSetup, productsUsed,
//     importantNotes, expansionOpportunities
//   }
// }

ACCOUNTS.forEach(function(a) {
  if (!ADATA[a.id])       ADATA[a.id]       = {};
  if (!ADATA[a.id].sites) ADATA[a.id].sites = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITIES — global cross-entity activity log
// ─────────────────────────────────────────────────────────────────────────────
//
// Aggregates all activities from both country-level and account-level workspaces.
// Used for the global feed / search / reporting.
//
// activity shape:
// {
//   id,           // unique string
//   scope,        // 'country' | 'account'
//   scopeId,      // countryCode or accountId
//   scopeName,    // country name or account name (for display)
//   date,         // ISO date string
//   type,         // 'meeting' | 'requirement' | 'decision' | 'issue' | 'client_feedback' | 'risk_added' | 'task_added' | 'weekly_update' | 'note'
//   title,        // activity title
//   notes,        // free text
//   createdBy     // user name
// }

var ACTIVITIES = [];

// Log a country-level activity
function logCountryActivity(countryCode, type, title, notes) {
  var c = CINFO[countryCode];
  ACTIVITIES.push({
    id:        'act-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
    scope:     'country',
    scopeId:   countryCode,
    scopeName: c ? c.name : countryCode,
    date:      new Date().toISOString().slice(0,10),
    type:      type,
    title:     title || '',
    notes:     notes || '',
    createdBy: CU ? CU.name : ''
  });
}

// Log an account-level activity (backward-compatible wrapper)
function logActivity(accountId, type, notes) {
  var a = ACCOUNTS.find(function(x){ return x.id === accountId; });
  ACTIVITIES.push({
    id:        'act-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
    scope:     'account',
    scopeId:   accountId,
    scopeName: a ? a.name : accountId,
    date:      new Date().toISOString().slice(0,10),
    type:      type,
    title:     notes || '',
    notes:     notes || '',
    createdBy: CU ? CU.name : ''
  });
}

var CIS = {country:'USA', tab:'stakeholders', itab:'paymentLandscape', wtab:'activities'};
var AF  = {search:'', country:'all', sector:'all', selected:{}};