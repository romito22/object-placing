(() => {
  let theme = 'light';
  try { theme = localStorage.getItem('court-theme') === 'dark' ? 'dark' : 'light'; } catch {}
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#091d36' : '#ffffff';
    const button = document.getElementById('theme-toggle');
    if (button) {
      document.getElementById('theme-label').textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
      button.querySelector('svg').innerHTML = theme === 'dark' ? '<circle cx="16" cy="16" r="6"/><path d="M16 2v3M16 27v3M2 16h3M27 16h3M6 6l2 2M24 24l2 2M6 26l2-2M24 8l2-2"/>' : '<path d="M26 19A11 11 0 0 1 13 5a11 11 0 1 0 13 14Z"/>';
      button.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      apply();
      try { localStorage.setItem('court-theme', theme); } catch {}
    });
  });
})();
