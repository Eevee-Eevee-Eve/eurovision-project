/* ---------- авто‑логин ---------- */
const uidStorage = localStorage.getItem('uid');
if (uidStorage) window.location = 'predict.html';

/* ---------- регистрация ---------- */
document.getElementById('go').onclick = async () => {
  const first = document.getElementById('first').value.trim();
  const last  = document.getElementById('last').value.trim();
  const emoji = document.getElementById('emoji').value;
  const msg   = document.getElementById('msg');

  if (!first || !last) {
    msg.textContent = 'Заполните оба поля';
    return;
  }
  try {
    const res = await fetch('/api/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ firstName:first, lastName:last, emoji })
    });
    if (!res.ok) { msg.textContent = 'Ошибка регистрации'; return; }

    const { id } = await res.json();
    localStorage.setItem('uid', id);
    /* по умолчанию покажем финал (можно изменить далее) */
    localStorage.setItem('stage', 'semi1');
    window.location = 'predict.html';
  } catch {
    msg.textContent = 'Сервер недоступен';
  }
};
