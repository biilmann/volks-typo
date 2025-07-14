document.getElementById('search-button').addEventListener('click', async () => {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  const res = await fetch(`/api/notion?s=${encodeURIComponent(query)}`);
  const items = await res.json();
  const list = document.getElementById('search-results');
  list.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.name;
    li.dataset.id = item.id;
    list.appendChild(li);
  });
});

document.getElementById('search-results').addEventListener('click', async (e) => {
  if (e.target.tagName !== 'LI') return;
  const id = e.target.dataset.id;
  const res = await fetch(`/api/notion/${id}`);
  const data = await res.json();
  const doc = JSON.stringify(data);
  await fetch('/api/process-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, doc, type: 'notion' })
  });
  document.getElementById('processing-status').style.display = 'block';
  window.startPolling && window.startPolling(id);
});