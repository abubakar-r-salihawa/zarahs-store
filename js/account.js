(() => {
  const status = document.getElementById('accountStatus');
  const form = document.getElementById('deletionForm');
  const errorBox = document.getElementById('deletionError');
  document.getElementById('accountLogin').addEventListener('click', () => sessionStorage.setItem('returnAfterAuth', 'account.html'));
  function showRequest(request) {
    form.hidden = true;
    status.textContent = `Your deletion request was received on ${new Date(request.requested_at).toLocaleDateString()}. Status: ${request.status}. Your account has not yet been deleted.`;
  }
  async function load() {
    try {
      if (!window.supabaseClient) throw new Error('Account services are unavailable. Please try again.');
      const { data, error } = await window.supabaseClient.auth.getUser();
      if (!data?.user) {
        status.textContent = 'Sign in to submit a verified request. If you cannot sign in, use the support contact on our privacy page.';
        document.getElementById('accountLogin').hidden = false;
        return;
      }
      if (error) throw error;
      const result = await window.supabaseClient.from('account_deletion_requests').select('requested_at,status').eq('user_id', data.user.id).maybeSingle();
      if (result.error) throw result.error;
      if (result.data) showRequest(result.data);
      else { status.textContent = `Signed in as ${data.user.email || 'your account'}.`; form.hidden = false; }
    } catch { errorBox.textContent = 'We could not load your account. Check your connection and reload this page.'; status.textContent = ''; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.getElementById('requestDeletion');
    if (button.disabled || !document.getElementById('deleteConfirm').checked) return;
    button.disabled = true;
    errorBox.textContent = '';
    try {
      const { data, error } = await window.supabaseClient.rpc('request_account_deletion');
      if (error || !data?.requested_at) throw error || new Error('No confirmation received');
      showRequest(data);
    } catch { errorBox.textContent = 'Your request could not be confirmed. Please retry; retrying will not create duplicate requests.'; }
    finally { button.disabled = false; }
  });
  load();
})();
