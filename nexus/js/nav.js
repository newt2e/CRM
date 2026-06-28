// nexus/nav.js
// Auto-split from nexus-preview-v4.html
// Edit this file, reload index.html

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function go(page) {
  CP = page; CA = null;
  document.querySelectorAll('.si').forEach(function(e){ e.classList.remove('on'); });
  var el = document.getElementById('nav-' + page);
  if (el) el.classList.add('on');
  render(page);
}

function render(page) {
  saveAppData();
  var cfg = PAGES[page];
  if (!cfg) return;
  document.getElementById('bc').innerHTML   = cfg.bc();
  document.getElementById('tbac').innerHTML = cfg.actions ? cfg.actions() : '';
  document.getElementById('pg').innerHTML   = cfg.render();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function bdg(s, cls) {
  var map = {active:'bg', inactive:'bx', 'B & I':'bb', Healthcare:'br', Education:'bg', Levy:'ba',
             critical:'br', high:'ba', medium:'bb', low:'bx',
             open:'ba', mitigated:'bg', closed:'bx',
             submitted:'bx', in_review:'ba', approved:'bb', implemented:'bg',
             on_track:'bg', at_risk:'ba', blocked:'br'};
  var c = cls || map[s] || 'bx';
  var label = s ? s.replace(/_/g,' ') : '';
  return '<span class="bdg ' + c + '">' + label + '</span>';
}
function ini(name) { return (name||'').split(' ').map(function(n){ return n[0]||''; }).join('').slice(0,2).toUpperCase(); }
function acctTasks(id)  { return ADATA[id].tasks.filter(function(t){ return !t.done; }).length; }
function acctRisks(id)  { return ADATA[id].risks.filter(function(r){ return r.status==='open'; }).length; }
function sevColor(s)    { return {critical:'var(--rd)',high:'var(--am)',medium:'var(--bl)',low:'var(--cr)'}[s]||'var(--t4)'; }
function sevBdg(s)      { return {critical:'br',high:'ba',medium:'bb',low:'bx'}[s]||'bx'; }