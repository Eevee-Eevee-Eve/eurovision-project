/* ---------- auth ---------- */
const uid = localStorage.getItem('uid');
if (!uid) location = '/';

/* ---------- DOM ---------- */
const stageSel = document.getElementById('stageSel');
let stage = localStorage.getItem('stage') || 'semi1';
stageSel.value = stage;

const lst = document.getElementById('lst');
const btnSave = document.getElementById('save');
const btnConfirm = document.getElementById('confirm');
const btnLogout = document.getElementById('logout');

let sortable;
let countryMap = {};
let predictionsClosed = false;
let stageLocked = false;

/* ---------- toast ---------- */
function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 3000);
}

/* ---------- helpers ---------- */
function makeItem(code) {
  const country = countryMap[code] || { code, name: code };
  const li = document.createElement('li');
  li.dataset.code = code;
  li.innerHTML = `<span class="num"></span><img class="flag" src="https://flagcdn.com/24x18/${code.toLowerCase()}.png"> ${country.name}`;
  return li;
}

function renumber() {
  [...lst.children].forEach((li, index) => {
    li.querySelector('.num').textContent = `${index + 1}.`;
  });
}

function updateInteractionState() {
  const disabled = predictionsClosed || stageLocked;
  lst.classList.toggle('locked', disabled);
  btnSave.disabled = disabled;
  btnConfirm.disabled = disabled;
  if (sortable) {
    sortable.option('disabled', disabled);
  }
}

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function getServerPrediction() {
  const response = await fetch(`/api/predictions/${uid}?stage=${stage}`);
  if (!response.ok) {
    return { ranking: [], locked: false };
  }
  return response.json();
}

/* ---------- load list ---------- */
async function load() {
  const countries = await fetch(`/countries_${stage}.json`).then((r) => r.json()).catch(() => []);
  countryMap = {};
  countries.forEach((country) => { countryMap[country.code] = country; });

  const localDraft = safeParse(localStorage.getItem(`draft_${stage}`) || '[]', []);
  const serverPrediction = await getServerPrediction().catch(() => ({ ranking: [], locked: false }));
  const defaultRanking = countries.map((country) => country.code);
  const ranking = serverPrediction.locked
    ? serverPrediction.ranking
    : (localDraft.length ? localDraft : (serverPrediction.ranking.length ? serverPrediction.ranking : defaultRanking));

  lst.innerHTML = '';
  ranking.forEach((code) => lst.appendChild(makeItem(code)));

  stageLocked = Boolean(serverPrediction.locked);
  initDrag();
  renumber();
  updateInteractionState();
}

function initDrag() {
  if (sortable) sortable.destroy();
  sortable = new Sortable(lst, {
    animation: 150,
    onSort: renumber,
  });
}

/* ---------- submit ---------- */
async function send(lock) {
  const ranking = [...lst.children].map((li) => li.dataset.code);
  const response = await fetch('/api/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: uid, stage, ranking, lock }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.ok) {
    localStorage.setItem(`draft_${stage}`, JSON.stringify(ranking));
    stageLocked = Boolean(payload.locked);
    updateInteractionState();
    toast(lock ? 'Confirmed!' : 'Saved');
    return;
  }

  if (response.status === 409) {
    stageLocked = true;
    updateInteractionState();
  }

  toast(payload.error || 'Could not submit prediction');
}

/* ---------- live lock ---------- */
const socket = io();
socket.on('toggle', (data) => {
  predictionsClosed = !data.open;
  updateInteractionState();
});

/* ---------- listeners ---------- */
btnSave.onclick = () => {
  const ranking = [...lst.children].map((li) => li.dataset.code);
  localStorage.setItem(`draft_${stage}`, JSON.stringify(ranking));
  toast('Draft saved on this device');
};

btnConfirm.onclick = () => {
  if (confirm('After confirmation, this stage will be locked. Continue?')) {
    send(true);
  }
};

btnLogout.onclick = () => {
  localStorage.removeItem('uid');
  location = '/';
};

stageSel.onchange = () => {
  stage = stageSel.value;
  localStorage.setItem('stage', stage);
  load();
};

/* ---------- GO ---------- */
load();
