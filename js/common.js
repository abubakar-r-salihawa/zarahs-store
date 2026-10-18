// Shared storage, output encoding and interaction helpers.
['admin_credentials','vendor_credentials_registry','adminSession','vendorSession','users'].forEach(key => {
  try { localStorage.removeItem(key); } catch { /* Storage may be disabled by the browser. */ }
});
const StoreStorage = {
  read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; } // A full cache must never turn a successful server save into a failure.
  }
};
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeURL(value, fallback = 'index.html') {
  const s = String(value || '').trim();
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(s)) return s;
  try { const u = new URL(s, location.href); return ['http:', 'https:'].includes(u.protocol) ? u.href : fallback; }
  catch { return fallback; }
}
function inlineArg(value) { return escapeHTML(JSON.stringify(String(value ?? ''))); }
function badgeClass(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]/g,'-'); }
function exposeActions(actions) {
  const pending = new Set();
  Object.entries(actions).forEach(([name, action]) => {
    window[name] = (...args) => {
      if (pending.has(name)) return;
      try {
        const result = action(...args);
        if (result?.then) {
          pending.add(name);
          return result.catch(error => alert(error.message || 'Unable to save. Please retry.')).finally(() => pending.delete(name));
        }
        return result;
      } catch (error) { alert(error.message || 'Unable to complete this action.'); }
    };
  });
}
async function runAction(button, action) {
  if (button?.disabled) return;
  const label = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Saving…'; }
  try { return await action(); }
  catch (error) { alert(error.message || 'The request failed. Please try again.'); }
  finally { if (button) { button.disabled = false; button.textContent = label; } }
}
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.navbar');
  if (nav) new ResizeObserver(() => {
    document.documentElement.style.setProperty('--nav-offset', `${nav.offsetHeight + 20}px`);
  }).observe(nav);
  document.querySelectorAll('.hamburger').forEach(button => {
    button.setAttribute('role', 'button'); button.tabIndex = 0;
    button.setAttribute('aria-label', 'Toggle navigation');
    button.setAttribute('aria-controls', 'mobileMenu');
    const menu = document.getElementById('mobileMenu');
    const sync = () => button.setAttribute('aria-expanded', String(menu?.classList.contains('open') || false));
    if (menu) new MutationObserver(sync).observe(menu, {attributes:true, attributeFilter:['class']});
    sync();
  });
  document.querySelectorAll('label:not([for])').forEach(label => {
    const field = label.nextElementSibling;
    if (field?.matches('input, select, textarea') && field.id) label.htmlFor = field.id;
  });
  document.querySelectorAll('input,textarea,select').forEach(field => {
    if (!field.labels?.length && !field.hasAttribute('aria-label')) field.setAttribute('aria-label', field.placeholder || field.id || 'Value');
  });
  document.querySelectorAll('.nav-search-btn').forEach(button => button.setAttribute('aria-label', 'Search products'));
  document.querySelectorAll('.nav-search').forEach(search => {
    const input = search.querySelector('input');
    if (input && !input.id) {
      const run = () => { if (input.value.trim()) location.href = `store.html?search=${encodeURIComponent(input.value.trim())}`; };
      input.onkeydown = e => { if (e.key === 'Enter') run(); };
      search.querySelector('button').onclick = run;
    }
  });
  document.querySelectorAll('.filter-panel').forEach(panel => {
    const toggle = document.createElement('button');
    toggle.className = 'mobile-filter-toggle'; toggle.textContent = 'Search & filters';
    toggle.setAttribute('aria-expanded','false');
    toggle.onclick = () => toggle.setAttribute('aria-expanded', String(panel.classList.toggle('filters-open')));
    panel.before(toggle);
  });
  document.querySelectorAll('.error-message,.form-err-fk,.error-banner').forEach(el => el.setAttribute('role', 'alert'));
  let lastFocus = null;
  let activeDialog = null;
  document.addEventListener('click', e => { if (!activeDialog) lastFocus = e.target.closest('button,a,[role=button]') || document.activeElement; }, true);
  document.querySelectorAll('#productModal,#editModal,#otpOverlay').forEach(dialog => {
    dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-label',dialog.querySelector('h2,h3')?.textContent || 'Dialog');
    new MutationObserver(() => {
      const open=['open','active','show'].some(c=>dialog.classList.contains(c));
      if(open) { activeDialog=dialog; dialog.querySelector('input:not([type=hidden]),button')?.focus(); }
      else if(activeDialog===dialog) {activeDialog=null;lastFocus?.focus();}
    }).observe(dialog,{attributes:true,attributeFilter:['class']});
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab' || !activeDialog) return;
    const fields=[...activeDialog.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href]')].filter(el=>!el.disabled && el.getClientRects().length);
    const first=fields[0],last=fields.at(-1);
    if(e.shiftKey && document.activeElement===first) {e.preventDefault();last?.focus();}
    else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first?.focus();}
  });
  const enhance = root => {
    root.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not([tabindex])').forEach(el => {
      if (el.getAttribute('onclick') === 'event.stopPropagation()') return;
      el.tabIndex = 0; el.setAttribute('role', 'button');
    });
    root.querySelectorAll('[class*="wishlist"]').forEach(el => { if(el.matches('button')) el.setAttribute('aria-label','Toggle wishlist'); });
  };
  enhance(document);
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {if(n.nodeType === 1) enhance(n.parentElement || n);})))
    .observe(document.body, {childList:true,subtree:true});
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]:not(button)')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Escape') {
    document.querySelectorAll('.mobile-menu.open,.sidebar.mobile-open').forEach(el => el.classList.remove('open','mobile-open'));
    if (typeof closeModal === 'function') closeModal();
    if (typeof closeEditModal === 'function') closeEditModal();
    if (typeof closeOtpModal === 'function') closeOtpModal();
  }
});
