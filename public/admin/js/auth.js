(async () => {
  try {
    const res = await fetch('/api/auth/check');
    if (!res.ok) {
      window.location.href = '/admin/login.html';
      return;
    }
    document.getElementById('app').style.display = 'block';
    document.getElementById('logout-button').addEventListener('click', async () => {
      await fetch('/api/auth/logout');
      window.location.href = '/admin/login.html';
    });
  } catch (err) {
    window.location.href = '/admin/login.html';
  }
})();