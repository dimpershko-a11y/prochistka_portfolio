import('./app.js').catch((error) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) {
    status.textContent = `Не удалось запустить редактор: ${error.message}`;
    status.className = 'ed-status is-error';
  }
});
