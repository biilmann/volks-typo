window.startPolling = function(id) {
  const progressBar = document.getElementById('progress-bar');
  const statusMessage = document.getElementById('status-message');
  const interval = setInterval(async () => {
    const res = await fetch(`/api/status/${id}`);
    const status = await res.json();
    progressBar.value = status.progress || 0;
    statusMessage.textContent = status.message || status.status;
    if (status.status === 'done' || status.status === 'error') {
      clearInterval(interval);
      if (status.status === 'done') {
        document.getElementById('preview').style.display = 'block';
        fetch(`/api/draft/${id}`).then(r => r.json()).then(draft => {
          document.getElementById('preview-content').textContent = draft.markdown;
          window.currentDraft = { id, meta: draft.meta };
        });
      }
    }
  }, 2000);
};