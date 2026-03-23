const tbody  = document.querySelector('#tbl tbody');
const socket = io();

const rowMap = new Map();        // key -> <tr>

/* ---------- создать / обновить строку ---------- */
function ensureRow(u){
  const key = u.id || (u.firstName + u.lastName);
  let tr = rowMap.get(key);
  if(!tr){
    tr = document.createElement('tr');
    tr.dataset.key = key;
    rowMap.set(key, tr);
    tbody.appendChild(tr);
  }
  tr.innerHTML =
    `<td></td>
     <td>${u.emoji ? u.emoji+' ' : ''}${u.firstName} ${u.lastName}</td>
     <td class="pts">${u.points}</td>`;

  u.matches && u.matches.length
    ? tr.classList.add('highlight')
    : tr.classList.remove('highlight');

  return tr;
}

/* ---------- рендер ---------- */
function render(list){
  list.forEach(u => ensureRow(u));

  /* исходные top‑координаты */
  const firstTop = new Map();
  [...tbody.children].forEach(tr=>{
    tr.style.opacity='0.99';
    firstTop.set(tr.dataset.key, tr.getBoundingClientRect().top);
  });

  /* переставляем строки */
  list.map(u=>u.id || (u.firstName+u.lastName))
      .forEach(k => tbody.appendChild(rowMap.get(k)));

  /* FLIP‑анимация */
  [...tbody.children].forEach((tr,i)=>{
    const key   = tr.dataset.key;
    const diffY = firstTop.get(key) - tr.getBoundingClientRect().top;

    /* нумерация */
    tr.firstChild.textContent = i+1;

    /* вспышка и движение */
    if(diffY){
      tr.classList.add('row-flash');
      clearTimeout(tr._flashTimer);
      tr._flashTimer = setTimeout(()=>tr.classList.remove('row-flash'), 6000);

      tr.style.transition='none';
      tr.style.transform=`translateY(${diffY}px)`;
      requestAnimationFrame(()=>{tr.style.transition='transform .6s';tr.style.transform='';});
    }

    /* очки */
    const pts = tr.querySelector('.pts');
    const newPts = list[i].points;
    if(+pts.textContent !== newPts){
      pts.textContent = newPts;
      pts.classList.add('points-up');
      clearTimeout(pts._t); pts._t = setTimeout(()=>pts.classList.remove('points-up'),6000);
    }

    setTimeout(()=>tr.style.opacity='1',650);
  });
}

/* старт + сокет */
fetch('/api/leaderboard').then(r=>r.json()).then(render);
socket.on('leaderboardUpdate', render);
