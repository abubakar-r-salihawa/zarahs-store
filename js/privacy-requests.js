(() => {
  const list = document.getElementById('privacyQueue');
  async function load() {
    try {
      const client = window.supabaseClient;
      if (!client) throw new Error('Account services are unavailable.');
      const { data, error } = await client.auth.getUser();
      if (error || data?.user?.app_metadata?.role !== 'admin') {
        list.textContent = 'Sign in with the owner account to view requests.';
        return;
      }
      const result = await client.from('account_deletion_requests').select('user_id,requested_at,status').order('requested_at');
      if (result.error) throw result.error;
      list.replaceChildren();
      if (!result.data.length) { list.textContent = 'There are no pending deletion requests.'; return; }
      for (const request of result.data) {
        const item = document.createElement('section'); item.className = 'privacy-request';
        const text = document.createElement('p');
        text.textContent = `Account ${request.user_id} · ${new Date(request.requested_at).toLocaleString()} · ${request.status}`;
        item.append(text);
        if (request.status === 'requested') {
          const button = document.createElement('button'); button.textContent = 'Mark as reviewing';
          button.addEventListener('click', async () => {
            button.disabled = true;
            const result = await client.from('account_deletion_requests').update({ status: 'reviewing' }).eq('user_id', request.user_id).select('user_id').single();
            if (result.error || !result.data) { button.disabled = false; alert('The update could not be confirmed. Please retry.'); return; }
            await load();
          });
          item.append(button);
        }
        list.append(item);
      }
    } catch { list.textContent = 'Requests could not be loaded. Check your connection and reload.'; }
  }
  load();
})();
