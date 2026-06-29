// nexus/auth.js
// Authentication: register, login, session management, sign out.
//
// Depends on: data.js (USERS, USER_PROFILES, CINFO, COUNTRY_USERS)
// Called by:  index.html event listeners on login/register buttons
//
// Flow:
//   Register → doRegister() → USERS[] + USER_PROFILES[] → startSession()
//   Login    → doLogin()    → USERS[] lookup            → startSession()
//   Sign out → clears CU, resets UI to login screen

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
// ── Auth helpers ──────────────────────────────────────────────────────────
function showError(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function clearError(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}
function startSession(u) {
  CU = u;
  // Persist session so page refresh doesn't log the user out
  try { localStorage.setItem('nexus_session', JSON.stringify(u)); } catch(e) {}

  var initials = u.initials || u.name.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
  var roleLabel = {partnership_manager:'Partnership Manager', implementation_engineer:'Implementation Engineer', admin:'Admin', viewer:'Viewer'}[u.role] || u.role;
  document.getElementById('sbav').textContent = initials;
  document.getElementById('sbun').textContent = u.name;
  document.getElementById('sbur').textContent = roleLabel;
  // Default CIS.country to first visible country for this user
  var codes = visibleCountryCodes();
  if (codes.length > 0 && !codes.includes(CIS.country)) CIS.country = codes[0];
  document.getElementById('login').classList.remove('active');
  document.getElementById('app').classList.add('active');
  go('dashboard');
}

// Restore session on page load — called at the bottom of events.js after loadSavedUsers()
function restoreSession() {
  try {
    var saved = localStorage.getItem('nexus_session');
    if (!saved) return false;
    var u = JSON.parse(saved);
    // Verify the user still exists in the registered users list
    var still = USERS.find(function(x){ return x.email === u.email; });
    if (!still) { localStorage.removeItem('nexus_session'); return false; }
    startSession(still);
    return true;
  } catch(e) { return false; }
}

// ── Sign In ────────────────────────────────────────────────────────────────
function doLogin() {
  clearError('lerr');
  var e = document.getElementById('lem').value.trim().toLowerCase();
  var p = document.getElementById('lpw').value;
  if (!e || !p) { showError('lerr', 'Please enter your email and password.'); return; }
  // Check registered users first, then fall back to hardcoded USERS
  var u = USERS.find(function(x){ return x.email.toLowerCase() === e; });
  if (!u || u.password !== p) { showError('lerr', 'Invalid email or password.'); return; }
  startSession(u);
}
document.getElementById('lbtn').addEventListener('click', doLogin);
document.getElementById('lpw').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
document.getElementById('lem').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

// ── Register ───────────────────────────────────────────────────────────────
function buildCountryCheckboxes() {
  var wrap = document.getElementById('rcountries');
  if (!wrap) return;

  var REGION_GROUPS = [
    {
      label: 'APAC',
      codes: ['Singapore','HongKong','Japan','Australia','NewZealand']
    },
    {
      label: 'Europe',
      codes: ['Germany','Spain','Italy']
    },
    {
      label: 'Americas',
      codes: ['USA','Canada']
    }
  ];

  var html = REGION_GROUPS.map(function(group) {
    var validCodes = group.codes.filter(function(k){ return CINFO[k]; });
    if (!validCodes.length) return '';

    return '<div style="margin-bottom:10px">'
      // Group header with select-all
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      +   '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,234,.4)">' + group.label + '</span>'
      +   '<button type="button" class="rg-all" data-group="' + group.label + '" style="background:none;border:none;color:rgba(91,173,3,.7);font-size:11px;font-weight:600;cursor:pointer;padding:0">Select all</button>'
      + '</div>'
      // Country checkboxes
      + '<div style="display:flex;flex-direction:column;gap:6px">'
      + validCodes.map(function(k) {
          var c = CINFO[k];
          return '<label style="display:flex;align-items:center;gap:10px;padding:8px 11px;background:rgba(255,255,234,.06);border:1px solid rgba(255,255,234,.12);border-radius:8px;cursor:pointer">'
            + '<input type="checkbox" class="rg-cb rg-' + group.label + '" data-country="' + k + '" style="width:15px;height:15px;accent-color:var(--jl);cursor:pointer"/>'
            + '<span style="font-size:13px;color:var(--nt)">' + c.flag + ' ' + c.name + '</span>'
            + '</label>';
        }).join('')
      + '</div>'
      + '</div>';
  }).join('');

  wrap.innerHTML = html;

  // Wire select-all buttons
  wrap.querySelectorAll('.rg-all').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = btn.dataset.group;
      var boxes = wrap.querySelectorAll('.rg-' + group);
      var allChecked = Array.from(boxes).every(function(cb){ return cb.checked; });
      boxes.forEach(function(cb){ cb.checked = !allChecked; });
      btn.textContent = allChecked ? 'Select all' : 'Deselect all';
    });
  });
}

function doRegister() {
  clearError('rerr');
  var name     = document.getElementById('rname').value.trim();
  var email    = document.getElementById('remail').value.trim().toLowerCase();
  var pw       = document.getElementById('rpw').value;
  var role     = document.getElementById('rrole').value;
  var checked  = Array.from(document.querySelectorAll('#rcountries input[type=checkbox]:checked'));
  var countries = checked.map(function(cb){ return cb.dataset.country; });

  if (!name)              { showError('rerr', 'Full name is required.');              return; }
  if (!email || !email.includes('@')) { showError('rerr', 'A valid email is required.'); return; }
  if (pw.length < 8)     { showError('rerr', 'Password must be at least 8 characters.'); return; }
  var isAdmin = role === 'admin';
  if (!isAdmin && countries.length === 0) { showError('rerr', 'Please select at least one region.'); return; }
  if (isAdmin) countries = ['*'];

  // Check email not already registered
  if (USERS.find(function(u){ return u.email.toLowerCase() === email; })) {
    showError('rerr', 'An account with this email already exists.'); return;
  }

  // Create login credential
  var initials = name.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
  var newUser = { email: email, name: name, role: role, initials: initials, password: pw };
  USERS.push(newUser);

  // Create profile with country assignments
  var newProfile = {
    id:                'usr-' + Date.now(),
    name:              name,
    email:             email,
    role:              role,
    assignedCountries: countries,
    active:            true
  };
  USER_PROFILES.push(newProfile);

  // Rebuild country users index
  countries.forEach(function(code) {
    if (!COUNTRY_USERS[code]) COUNTRY_USERS[code] = [];
    COUNTRY_USERS[code].push(newProfile);
  });

  // Persist to localStorage so account survives refresh
  saveRegisteredUser(newUser, newProfile);

  // Sign them in immediately
  startSession(newUser);
}

document.getElementById('rbtn').addEventListener('click', doRegister);

// ── Toggle sign in / register ──────────────────────────────────────────────
document.getElementById('show-register').addEventListener('click', function() {
  document.getElementById('lv-signin').style.display   = 'none';
  document.getElementById('lv-register').style.display = 'block';
  document.getElementById('lnt').style.display = 'none';
  buildCountryCheckboxes();
  clearError('rerr');
  syncRegionVisibility();
});

function syncRegionVisibility() {
  var role = document.getElementById('rrole');
  var regionWrap = document.getElementById('region-wrap');
  if (!role || !regionWrap) return;
  var isAdmin = role.value === 'admin';
  regionWrap.style.opacity = isAdmin ? '0.45' : '1';
  regionWrap.style.pointerEvents = isAdmin ? 'none' : 'auto';
  var hint = document.getElementById('region-hint');
  if (hint) hint.style.display = isAdmin ? 'block' : 'none';
}

document.addEventListener('change', function(e) {
  if (e.target.id === 'rrole') syncRegionVisibility();
});
document.getElementById('show-signin').addEventListener('click', function() {
  document.getElementById('lv-register').style.display = 'none';
  document.getElementById('lv-signin').style.display   = 'block';
  document.getElementById('lnt').style.display = 'block';
  clearError('lerr');
});

// ── Sign Out ───────────────────────────────────────────────────────────────
document.getElementById('signout-btn').addEventListener('click', function() {
  CU = null;
  try { localStorage.removeItem('nexus_session'); } catch(e) {}
  document.getElementById('app').classList.remove('active');
  document.getElementById('login').classList.add('active');
  document.getElementById('lv-register').style.display = 'none';
  document.getElementById('lv-signin').style.display   = 'block';
  document.getElementById('lnt').style.display = 'block';
  document.getElementById('export-btn').style.display = 'none';
  document.getElementById('lem').value = '';
  document.getElementById('lpw').value = '';
  clearError('lerr');
});
document.getElementById('sblogo').addEventListener('click', function(){ go('dashboard'); });
document.getElementById('sb-export-btn').addEventListener('click', exportSnapshot);

['dashboard','countries','accounts','contacts','tasks','requirements','risks','import'].forEach(function(p) {
  var el = document.getElementById('nav-' + p);
  if (el) el.addEventListener('click', function(){ go(p); });
});