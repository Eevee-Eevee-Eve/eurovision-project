const state = {
  authenticated: false,
  roomSlug: '',
  stage: localStorage.getItem('admin_stage_key') || 'semi1',
  rooms: [],
  scoringProfiles: [],
  snapshot: null,
  acts: [],
  users: [],
  rowsMem: {},
  socket: null,
};

const els = {
  key: document.getElementById('key'),
  login: document.getElementById('login'),
  logout: document.getElementById('logout'),
  panel: document.getElementById('panel'),
  authCard: document.getElementById('authCard'),
  info: document.getElementById('info'),
  sessionState: document.getElementById('sessionState'),
  room: document.getElementById('room'),
  stage: document.getElementById('stage'),
  scoring: document.getElementById('scoring'),
  scoringDescription: document.getElementById('scoringDescription'),
  windowStatus: document.getElementById('windowStatus'),
  roomStatus: document.getElementById('roomStatus'),
  activePlayers: document.getElementById('activePlayers'),
  removedPlayers: document.getElementById('removedPlayers'),
  submittedPlayers: document.getElementById('submittedPlayers'),
  lockedPlayers: document.getElementById('lockedPlayers'),
  revealedResults: document.getElementById('revealedResults'),
  expectedActs: document.getElementById('expectedActs'),
  userList: document.getElementById('userList'),
  tbody: document.querySelector('#tbl tbody'),
  openStage: document.getElementById('openStage'),
  closeStage: document.getElementById('closeStage'),
  reloadStage: document.getElementById('reloadStage'),
  publishResults: document.getElementById('publishResults'),
  loadPublished: document.getElementById('loadPublished'),
  resetStageBtn: document.getElementById('resetStageBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  removeBtn: document.getElementById('removeBtn'),
  restoreBtn: document.getElementById('restoreBtn'),
  resetRoom: document.getElementById('resetRoom'),
};

els.stage.value = state.stage;

function draftKey() {
  return `admin_results_${state.roomSlug}_${state.stage}`;
}

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey()) || '{}');
  } catch (error) {
    console.warn(error);
    return {};
  }
}

function writeDraft() {
  localStorage.setItem(draftKey(), JSON.stringify(state.rowsMem));
}

function setInfo(text, isError = false) {
  els.info.textContent = text || '';
  els.info.classList.toggle('error', isError);
}

async function request(path, init = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function setAuthenticated(authenticated) {
  state.authenticated = authenticated;
  els.panel.hidden = !authenticated;
  els.sessionState.textContent = authenticated ? 'Admin session active' : 'Admin session required';
  els.sessionState.className = authenticated ? 'status-pill open' : 'status-pill muted';
}

function renderRooms(rooms) {
  state.rooms = rooms;
  const previous = state.roomSlug || localStorage.getItem('admin_room_slug') || rooms[0]?.slug || '';
  els.room.innerHTML = rooms
    .map((room) => `<option value="${room.slug}">${room.name}</option>`)
    .join('');
  state.roomSlug = rooms.some((room) => room.slug === previous) ? previous : rooms[0]?.slug || '';
  els.room.value = state.roomSlug;
  localStorage.setItem('admin_room_slug', state.roomSlug);
}

function renderScoringOptions(options, currentKey) {
  state.scoringProfiles = options;
  els.scoring.innerHTML = options
    .map((profile) => `<option value="${profile.key}">${profile.label}</option>`)
    .join('');
  els.scoring.value = currentKey;
  const selected = options.find((profile) => profile.key === currentKey);
  els.scoringDescription.textContent = selected ? selected.description : '';
}

function renderUsers(users) {
  state.users = users;
  els.userList.innerHTML = '<option value="">Выбери участника</option>';

  users.forEach((user) => {
    const option = document.createElement('option');
    const submitted = user.submittedStages.length ? ` | ${user.submittedStages.join(', ')}` : '';
    option.value = user.id;
    option.textContent = `${user.name} ${user.removed ? '[удалён]' : ''}${submitted}`;
    els.userList.appendChild(option);
  });
}

function updateStats(snapshot) {
  state.snapshot = snapshot;
  const stageInfo = snapshot.stageOverview[state.stage];
  const currentRoom = state.rooms.find((room) => room.slug === state.roomSlug);
  const isOpen = snapshot.predictionWindows[state.stage];

  els.roomStatus.textContent = currentRoom ? currentRoom.name : state.roomSlug;
  els.windowStatus.textContent = isOpen ? `Окно ${state.stage} открыто` : `Окно ${state.stage} закрыто`;
  els.windowStatus.className = isOpen ? 'status-pill open' : 'status-pill closed';

  els.activePlayers.textContent = String(snapshot.participants.activeCount);
  els.removedPlayers.textContent = String(snapshot.participants.removedCount);
  els.submittedPlayers.textContent = String(stageInfo.submittedCount);
  els.lockedPlayers.textContent = String(stageInfo.lockedCount);
  els.revealedResults.textContent = String(stageInfo.revealedCount);
  els.expectedActs.textContent = String(stageInfo.expectedEntries);

  renderScoringOptions(snapshot.scoringProfiles, snapshot.scoringProfile);
}

function sortTable() {
  [...els.tbody.rows]
    .sort((a, b) => {
      const totalDiff = (+b.dataset.total || 0) - (+a.dataset.total || 0);
      if (totalDiff) return totalDiff;
      const juryDiff = (+b.dataset.jury || 0) - (+a.dataset.jury || 0);
      if (juryDiff) return juryDiff;
      const teleDiff = (+b.dataset.tele || 0) - (+a.dataset.tele || 0);
      if (teleDiff) return teleDiff;
      return a.dataset.country.localeCompare(b.dataset.country, 'ru');
    })
    .forEach((row, index) => {
      row.querySelector('.rank').textContent = String(index + 1);
      els.tbody.appendChild(row);
    });
}

function hasRowData(memory) {
  return memory.jury !== '' || memory.tele !== '' || memory.total !== '';
}

function updateRowState(row, code) {
  const memory = state.rowsMem[code] || { jury: '', tele: '', total: '' };
  row.dataset.total = String(memory.total || 0);
  row.dataset.jury = String(memory.jury || 0);
  row.dataset.tele = String(memory.tele || 0);
}

function bindRowEvents(row, act) {
  const juryInput = row.querySelector('.jury');
  const teleInput = row.querySelector('.tele');
  const totalInput = row.querySelector('.total');

  function sync(origin) {
    const jury = juryInput.value.trim();
    const tele = teleInput.value.trim();
    const total = totalInput.value.trim();
    let nextTotal = total;

    if (origin !== 'total') {
      nextTotal = String((Number(jury) || 0) + (Number(tele) || 0));
      totalInput.value = nextTotal === '0' && !jury && !tele ? '' : nextTotal;
    }

    state.rowsMem[act.code] = {
      jury,
      tele,
      total: totalInput.value.trim(),
    };
    updateRowState(row, act.code);
    writeDraft();
    sortTable();
  }

  [juryInput, teleInput].forEach((input) => {
    input.addEventListener('input', () => sync('points'));
    input.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      sync('points');
      await publishResults();
    });
  });

  totalInput.addEventListener('input', () => sync('total'));
  totalInput.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    sync('total');
    await publishResults();
  });
}

function renderRows(acts, publishedResults) {
  const publishedMap = publishedResults.reduce((acc, act) => {
    acc[act.code] = {
      jury: act.juryPoints == null ? '' : String(act.juryPoints),
      tele: act.telePoints == null ? '' : String(act.telePoints),
      total: act.totalPoints == null ? '' : String(act.totalPoints),
    };
    return acc;
  }, {});

  const draft = readDraft();
  state.rowsMem = Object.keys(draft).length ? draft : publishedMap;
  els.tbody.innerHTML = '';

  acts.forEach((act) => {
    const memory = state.rowsMem[act.code] || { jury: '', tele: '', total: '' };
    const row = document.createElement('tr');
    row.dataset.code = act.code;
    row.dataset.country = act.country || act.artist;
    row.innerHTML = `
      <td class="rank">0</td>
      <td>
        <div class="result-cell">
          <div class="result-country">${act.country}</div>
          <div class="result-meta">${act.artist} | ${act.song}</div>
        </div>
      </td>
      <td><input class="jury" type="number" min="0" step="1" value="${memory.jury}"></td>
      <td><input class="tele" type="number" min="0" step="1" value="${memory.tele}"></td>
      <td><input class="total" type="number" min="0" step="1" value="${memory.total}"></td>
    `;

    updateRowState(row, act.code);
    bindRowEvents(row, act);
    els.tbody.appendChild(row);
  });

  sortTable();
}

function buildResultsPayload() {
  const rows = [...els.tbody.rows]
    .map((row) => {
      const code = row.dataset.code;
      const memory = state.rowsMem[code] || { jury: '', tele: '', total: '' };
      return {
        code,
        jury: memory.jury === '' ? 0 : Number(memory.jury),
        tele: memory.tele === '' ? 0 : Number(memory.tele),
        total: memory.total === '' ? 0 : Number(memory.total),
        hasData: hasRowData(memory),
      };
    })
    .filter((row) => row.hasData);

  return {
    ranking: rows.map((row) => row.code),
    breakdown: rows,
  };
}

async function loadPanelData({ clearDraft = false } = {}) {
  if (!state.authenticated || !state.roomSlug) return;
  if (clearDraft) {
    localStorage.removeItem(draftKey());
  }

  const [snapshot, actsPayload, resultsPayload, users] = await Promise.all([
    request(`/api/admin/room-state?room=${encodeURIComponent(state.roomSlug)}`),
    request(`/api/acts?room=${encodeURIComponent(state.roomSlug)}&stage=${encodeURIComponent(state.stage)}`),
    request(`/api/results?room=${encodeURIComponent(state.roomSlug)}&stage=${encodeURIComponent(state.stage)}`),
    request(`/api/users?room=${encodeURIComponent(state.roomSlug)}`),
  ]);

  state.acts = actsPayload.acts;
  updateStats(snapshot);
  renderUsers(users);
  renderRows(actsPayload.acts, resultsPayload.results || []);
}

async function publishResults() {
  if (!state.roomSlug) return;
  const payload = buildResultsPayload();

  await request('/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomSlug: state.roomSlug,
      stage: state.stage,
      ranking: payload.ranking,
      breakdown: payload.breakdown,
    }),
  });

  setInfo(`Ranking для ${state.stage} опубликован.`);
}

async function setStageWindow(open) {
  const payload = await request('/api/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomSlug: state.roomSlug,
      stage: state.stage,
      open,
    }),
  });

  if (state.snapshot) {
    state.snapshot.predictionWindows = payload.predictionWindows;
    updateStats(state.snapshot);
  }
  setInfo(open ? `Этап ${state.stage} открыт.` : `Этап ${state.stage} закрыт.`);
}

async function updateScoringProfile() {
  const scoringProfile = els.scoring.value;
  const payload = await request('/api/admin/scoring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomSlug: state.roomSlug,
      scoringProfile,
    }),
  });

  if (state.snapshot) {
    state.snapshot.scoringProfile = payload.scoringProfile;
    updateStats(state.snapshot);
  }
  setInfo(`Scoring profile переключён на ${scoringProfile}.`);
}

async function resetUser(stageScope) {
  const accountId = els.userList.value;
  if (!accountId) {
    setInfo('Сначала выбери участника.', true);
    return;
  }

  await request(`/api/users/${encodeURIComponent(accountId)}/reset?room=${encodeURIComponent(state.roomSlug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stageScope ? { stage: stageScope } : {}),
  });

  await loadPanelData();
  setInfo(stageScope ? `Ответы участника сброшены для ${stageScope}.` : 'Ответы участника сброшены для всех этапов.');
}

async function removeUser() {
  const accountId = els.userList.value;
  if (!accountId) {
    setInfo('Сначала выбери участника.', true);
    return;
  }

  await request(`/api/users/${encodeURIComponent(accountId)}?room=${encodeURIComponent(state.roomSlug)}`, {
    method: 'DELETE',
  });

  await loadPanelData();
  setInfo('Участник убран из комнаты.');
}

async function restoreUser() {
  const accountId = els.userList.value;
  if (!accountId) {
    setInfo('Сначала выбери участника.', true);
    return;
  }

  await request(`/api/users/${encodeURIComponent(accountId)}/restore?room=${encodeURIComponent(state.roomSlug)}`, {
    method: 'POST',
  });

  await loadPanelData();
  setInfo('Доступ участника восстановлен.');
}

async function resetRoom() {
  await request('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomSlug: state.roomSlug }),
  });

  localStorage.removeItem(draftKey());
  await loadPanelData({ clearDraft: true });
  setInfo('Комната полностью сброшена.');
}

function connectSocket() {
  if (state.socket) {
    state.socket.close();
  }
  if (!state.roomSlug) {
    return;
  }

  state.socket = io({
    auth: { roomSlug: state.roomSlug },
    transports: ['websocket', 'polling'],
  });

  state.socket.on('toggle', (payload) => {
    if (payload.roomSlug !== state.roomSlug) return;
    if (payload.predictionWindows && state.snapshot) {
      state.snapshot.predictionWindows = payload.predictionWindows;
      updateStats(state.snapshot);
    }
  });

  state.socket.on('resultsUpdate', (payload) => {
    if (payload.roomSlug !== state.roomSlug || payload.stage !== state.stage) return;
    void loadPanelData().catch((error) => {
      console.error(error);
      setInfo(error.message || 'Не удалось обновить stage data.', true);
    });
  });

  state.socket.on('leaderboardUpdate', () => {
    void loadPanelData().catch((error) => {
      console.error(error);
      setInfo(error.message || 'Не удалось обновить room data.', true);
    });
  });
}

async function bootstrapFromSession() {
  try {
    const session = await request('/api/admin/session');
    if (!session.authenticated) {
      setAuthenticated(false);
      renderRooms(session.rooms || []);
      renderScoringOptions(session.scoringProfiles || [], session.scoringProfiles?.[0]?.key || '');
      return;
    }

    setAuthenticated(true);
    renderRooms(session.rooms || []);
    renderScoringOptions(session.scoringProfiles || [], session.scoringProfiles?.[0]?.key || '');
    connectSocket();
    await loadPanelData();
  } catch (error) {
    console.error(error);
    setAuthenticated(false);
    setInfo(error.message || 'Не удалось проверить admin session.', true);
  }
}

els.login.addEventListener('click', async () => {
  try {
    const payload = await request('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: els.key.value.trim() }),
    });
    setAuthenticated(true);
    renderRooms(payload.rooms || []);
    renderScoringOptions(payload.scoringProfiles || [], payload.scoringProfiles?.[0]?.key || '');
    connectSocket();
    await loadPanelData();
    setInfo('Admin session открыта.');
    els.key.value = '';
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось войти в админку.', true);
  }
});

els.logout.addEventListener('click', async () => {
  await request('/api/admin/logout', { method: 'POST' });
  setAuthenticated(false);
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
  setInfo('Admin session закрыта.');
});

els.room.addEventListener('change', async (event) => {
  state.roomSlug = event.target.value;
  localStorage.setItem('admin_room_slug', state.roomSlug);
  connectSocket();
  await loadPanelData();
});

els.stage.addEventListener('change', async (event) => {
  state.stage = event.target.value;
  localStorage.setItem('admin_stage_key', state.stage);
  await loadPanelData();
});

els.scoring.addEventListener('change', async () => {
  try {
    await updateScoringProfile();
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось обновить scoring profile.', true);
  }
});

els.openStage.addEventListener('click', async () => {
  try {
    await setStageWindow(true);
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось открыть этап.', true);
  }
});

els.closeStage.addEventListener('click', async () => {
  try {
    await setStageWindow(false);
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось закрыть этап.', true);
  }
});

els.reloadStage.addEventListener('click', async () => {
  try {
    await loadPanelData();
    setInfo('Данные комнаты обновлены.');
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось обновить данные комнаты.', true);
  }
});

els.publishResults.addEventListener('click', async () => {
  try {
    await publishResults();
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось опубликовать ranking.', true);
  }
});

els.loadPublished.addEventListener('click', async () => {
  try {
    await loadPanelData({ clearDraft: true });
    setInfo('Опубликованные результаты загружены.');
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось загрузить опубликованные результаты.', true);
  }
});

els.resetStageBtn.addEventListener('click', async () => {
  try {
    await resetUser(state.stage);
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось сбросить этап для участника.', true);
  }
});

els.resetAllBtn.addEventListener('click', async () => {
  try {
    await resetUser(null);
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось сбросить все этапы для участника.', true);
  }
});

els.removeBtn.addEventListener('click', async () => {
  try {
    await removeUser();
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось убрать участника из комнаты.', true);
  }
});

els.restoreBtn.addEventListener('click', async () => {
  try {
    await restoreUser();
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось вернуть доступ участнику.', true);
  }
});

els.resetRoom.addEventListener('click', async () => {
  if (!confirm('Полностью сбросить данные комнаты?')) return;
  if (!confirm('Это очистит ответы, результаты и статусы этапов. Продолжить?')) return;

  try {
    await resetRoom();
  } catch (error) {
    console.error(error);
    setInfo(error.message || 'Не удалось выполнить полный сброс комнаты.', true);
  }
});

bootstrapFromSession();
