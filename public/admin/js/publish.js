document.getElementById('publish-direct-button').addEventListener('click', async () => {
  const { id, meta } = window.currentDraft;
  const markdown = document.getElementById('preview-content').textContent;
  const res = await fetch('/api/publish-post', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, meta, markdown })
  });
  const result = await res.json();
  if (result.success) {
    alert(`Published! File: ${result.filePath}`);
  } else {
    alert(`Publish failed: ${result.error}`);
  }
});

document.getElementById('create-pr-button').addEventListener('click', async () => {
  const { id } = window.currentDraft;
  const res = await fetch('/api/create-github-pr', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  const result = await res.json();
  if (result.success) {
    window.open(result.pr_url, '_blank');
  } else {
    alert(`PR creation failed: ${result.error || result.details}`);
  }
});