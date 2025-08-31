(() => {
  const RE_AV=/\bavailable\b/gi, RE_UN=/\bunavailable\b/gi, AR=/\s*→\s*/;
  const fr = s => s.replace(RE_UN,'indisponible').replace(RE_AV,'disponible');
  document.querySelectorAll('#events-table tbody td, table tbody td').forEach(td=>{
    const t = td.textContent || '';
    if(!/available|unavailable/i.test(t)) return;
    td.textContent = AR.test(t) ? t.split(AR).map(s=>fr(s.trim())).join(' → ') : fr(t.trim());
  });
})();
