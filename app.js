/* =============================================
   STUDYFLOW — app.js
   ============================================= */

// =============================================
// CONSTANTS
// =============================================
const COLORS = [
  { name: 'Violet',    value: '#7c3aed' },
  { name: 'Indigo',   value: '#4f46e5' },
  { name: 'Blue',      value: '#2563eb' },
  { name: 'Cyan',      value: '#0891b2' },
  { name: 'Teal',      value: '#0d9488' },
  { name: 'Green',     value: '#059669' },
  { name: 'Lime',      value: '#65a30d' },
  { name: 'Orange',    value: '#ea580c' },
  { name: 'Red',       value: '#dc2626' },
  { name: 'Pink',      value: '#db2777' },
  { name: 'Rose',      value: '#e11d48' },
  { name: 'Purple',    value: '#9333ea' },
];

const ICONS = [
  { icon: 'fa-book',         label: 'Book' },
  { icon: 'fa-calculator',   label: 'Maths' },
  { icon: 'fa-flask',        label: 'Chemistry' },
  { icon: 'fa-atom',         label: 'Physics' },
  { icon: 'fa-dna',          label: 'Biology' },
  { icon: 'fa-globe',        label: 'Geography' },
  { icon: 'fa-landmark',     label: 'History' },
  { icon: 'fa-code',         label: 'Programming' },
  { icon: 'fa-pen-nib',      label: 'English' },
  { icon: 'fa-language',     label: 'Language' },
  { icon: 'fa-music',        label: 'Music' },
  { icon: 'fa-palette',      label: 'Art' },
  { icon: 'fa-chart-line',   label: 'Economics' },
  { icon: 'fa-balance-scale',label: 'Law' },
  { icon: 'fa-brain',        label: 'Psychology' },
  { icon: 'fa-microchip',    label: 'Technology' },
  { icon: 'fa-infinity',     label: 'Philosophy' },
  { icon: 'fa-earth-asia',   label: 'Social Studies' },
];

// =============================================
// STATE
// =============================================
let state = {
  subjects: [],
  currentSubjectId: null,
  timer: {
    running: false,
    seconds: 0,
    intervalId: null,
  },
  selectedColor: COLORS[0].value,
  selectedIcon:  ICONS[0].icon,
  editingSubjectId: null,
  editingTopicId:   null,
  currentFilter: 'all',
};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAll();
  updateDateDisplay();
  renderColorPicker();
  renderIconPicker();

  // Enter to save
  document.getElementById('subjectNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveSubject(); });
  document.getElementById('topicNameInput').addEventListener('keydown',   e => { if (e.key === 'Enter') saveTopic(); });

  // Save timer when leaving page
  window.addEventListener('beforeunload', () => {
    if (state.timer.running) {
      clearInterval(state.timer.intervalId);
      saveTimerToSubject();
    }
  });
});

function updateDateDisplay() {
  const now  = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', opts);
}

// =============================================
// PERSISTENCE
// =============================================
function loadState() {
  try {
    const raw = localStorage.getItem('studyflow_v2');
    if (raw) {
      const data = JSON.parse(raw);
      state.subjects = data.subjects || [];
    }
  } catch (_) {
    state.subjects = [];
  }
}

function saveState() {
  localStorage.setItem('studyflow_v2', JSON.stringify({ subjects: state.subjects }));
}

function generateId() {
  return '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// =============================================
// RENDER — ALL
// =============================================
function renderAll() {
  renderSubjectList();
  renderSubjectDetail();
  updateHeaderStats();
}

// =============================================
// RENDER — SIDEBAR
// =============================================
function renderSubjectList() {
  const list  = document.getElementById('subjectList');
  const count = document.getElementById('subjectCount');

  count.textContent = state.subjects.length;

  if (state.subjects.length === 0) {
    list.innerHTML = `
      <div class="empty-sidebar">
        <i class="fas fa-graduation-cap"></i>
        <p>No subjects yet.<br>Click <b>Add Subject</b> to begin!</p>
      </div>`;
    return;
  }

  list.innerHTML = state.subjects.map((subj, idx) => {
    const total  = subj.topics.length;
    const done   = subj.topics.filter(t => t.completed).length;
    const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
    const active = subj.id === state.currentSubjectId;

    return `
      <div class="subject-item ${active ? 'active' : ''}"
        style="--item-color: ${subj.color}"
        onclick="selectSubject('${subj.id}')">
        <div class="subject-item-left">
          <div class="sitem-icon" style="background:${subj.color}22; color:${subj.color}">
            <i class="fas ${subj.icon}"></i>
          </div>
          <div class="sitem-info">
            <div class="sitem-name">${esc(subj.name)}</div>
            <div class="sitem-meta">${total} topic${total !== 1 ? 's' : ''} &middot; ${pct}% done</div>
          </div>
        </div>
        <div class="subject-item-right">
          <div class="mini-prog-track">
            <div class="mini-prog-fill" style="width:${pct}%; background:${subj.color}"></div>
          </div>
          <div class="reorder-col">
            <button class="reorder-btn" onclick="moveSubject(event,'${subj.id}',-1)" ${idx === 0 ? 'disabled' : ''} title="Move up">
              <i class="fas fa-chevron-up"></i>
            </button>
            <button class="reorder-btn" onclick="moveSubject(event,'${subj.id}',1)" ${idx === state.subjects.length-1 ? 'disabled' : ''} title="Move down">
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// =============================================
// RENDER — SUBJECT DETAIL
// =============================================
function renderSubjectDetail() {
  const welcome = document.getElementById('welcomeScreen');
  const detail  = document.getElementById('subjectDetail');

  if (!state.currentSubjectId) {
    welcome.style.display = 'flex';
    detail.style.display  = 'none';
    return;
  }

  const subj = getSubject(state.currentSubjectId);
  if (!subj) {
    welcome.style.display = 'flex';
    detail.style.display  = 'none';
    return;
  }

  welcome.style.display = 'none';
  detail.style.display  = 'block';

  // ---- Header ----
  document.getElementById('subjectTitle').textContent = subj.name;
  document.getElementById('subjectDescription').textContent = subj.description || 'No description added';

  const badge = document.getElementById('subjectIconBadge');
  badge.style.background = subj.color;
  badge.style.boxShadow  = `0 4px 20px ${subj.color}55`;
  badge.innerHTML = `<i class="fas ${subj.icon}"></i>`;

  // ---- Stats ----
  const total   = subj.topics.length;
  const done    = subj.topics.filter(t => t.completed).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('topicCountStat').textContent   = total;
  document.getElementById('completedCountStat').textContent = done;
  document.getElementById('pendingCountStat').textContent = pending;

  const sessTime = (subj.studyTime || 0) + state.timer.seconds;
  document.getElementById('studyTimeStat').textContent = fmtTime(sessTime);

  // ---- Circular Progress ----
  const circumference = 2 * Math.PI * 42; // ~264
  const fillLen = (pct / 100) * circumference;
  const arc = document.getElementById('cpFill');
  arc.setAttribute('stroke-dasharray', `${fillLen} ${circumference}`);
  arc.style.stroke = subj.color;
  document.getElementById('cpPct').textContent = pct + '%';

  // ---- Progress Bar ----
  document.getElementById('pbarFill').style.width      = pct + '%';
  document.getElementById('pbarFill').style.background = `linear-gradient(90deg, ${subj.color}, ${lighten(subj.color)})`;
  document.getElementById('pbarLabel').textContent = `${done} / ${total} topics done`;

  // ---- Timer Display ----
  document.getElementById('timerDisplay').textContent = fmtTimer(state.timer.seconds);

  // ---- Topics ----
  renderTopics(subj);
}

function renderTopics(subj) {
  const list  = document.getElementById('topicsList');
  const empty = document.getElementById('emptyTopics');

  let topics = subj.topics;

  if (state.currentFilter === 'pending') topics = topics.filter(t => !t.completed);
  if (state.currentFilter === 'done')    topics = topics.filter(t => t.completed);

  if (topics.length === 0 && subj.topics.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  if (topics.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--txt3);padding:32px;font-size:13px;">No topics in this filter.</div>`;
    return;
  }

  list.innerHTML = topics.map((topic, idx) => {
    const allTopics = subj.topics;
    const realIdx   = allTopics.findIndex(t => t.id === topic.id);

    return `
      <div class="topic-item ${topic.completed ? 'completed' : ''}" id="topic-${topic.id}">
        <div class="topic-left">
          <label class="checkbox-wrapper">
            <input type="checkbox" ${topic.completed ? 'checked' : ''}
              onchange="toggleTopic('${subj.id}','${topic.id}',this.checked)">
            <span class="checkmark" style="--check-color:${subj.color}"></span>
          </label>
          <div class="topic-info">
            <div class="topic-name">${esc(topic.name)}</div>
            ${topic.notes ? `<div class="topic-notes"><i class="fas fa-note-sticky" style="color:var(--txt3);margin-right:4px;font-size:10px"></i>${esc(topic.notes)}</div>` : ''}
            <div class="topic-meta">
              <span class="priority-badge ${topic.priority}">${cap(topic.priority)} Priority</span>
              ${topic.completedAt ? `<span class="completed-at"><i class="fas fa-check"></i> Completed ${fmtDate(topic.completedAt)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="topic-actions">
          <button class="btn-icon sm" onclick="openEditTopicModal('${subj.id}','${topic.id}')" title="Edit topic">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-icon sm danger" onclick="confirmDeleteTopic('${subj.id}','${topic.id}')" title="Delete topic">
            <i class="fas fa-trash"></i>
          </button>
          <div class="topic-reorder">
            <button class="reorder-btn" onclick="moveTopic('${subj.id}','${topic.id}',-1)" ${realIdx === 0 ? 'disabled' : ''}>
              <i class="fas fa-chevron-up"></i>
            </button>
            <button class="reorder-btn" onclick="moveTopic('${subj.id}','${topic.id}',1)" ${realIdx === allTopics.length-1 ? 'disabled' : ''}>
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// =============================================
// SUBJECT CRUD
// =============================================
function selectSubject(id) {
  if (state.currentSubjectId === id) return;

  // Save + reset timer
  if (state.timer.running) {
    clearInterval(state.timer.intervalId);
    state.timer.running = false;
    saveTimerToSubject();
    resetTimerUI();
  } else if (state.timer.seconds > 0) {
    saveTimerToSubject();
  }
  state.timer.seconds = 0;
  resetTimerUI();

  state.currentSubjectId = id;
  state.currentFilter    = 'all';
  resetFilterTabs();
  renderAll();
}

function getSubject(id) {
  return state.subjects.find(s => s.id === id);
}

function openAddSubjectModal() {
  state.editingSubjectId = null;
  state.selectedColor = COLORS[0].value;
  state.selectedIcon  = ICONS[0].icon;
  document.getElementById('subjectModalTitle').textContent = 'Add New Subject';
  document.getElementById('subjectNameInput').value = '';
  document.getElementById('subjectDescInput').value = '';
  renderColorPicker();
  renderIconPicker();
  openModal('subjectModal');
  setTimeout(() => document.getElementById('subjectNameInput').focus(), 150);
}

function editCurrentSubject() {
  const subj = getSubject(state.currentSubjectId);
  if (!subj) return;
  state.editingSubjectId = subj.id;
  state.selectedColor    = subj.color;
  state.selectedIcon     = subj.icon;
  document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
  document.getElementById('subjectNameInput').value = subj.name;
  document.getElementById('subjectDescInput').value = subj.description || '';
  renderColorPicker();
  renderIconPicker();
  openModal('subjectModal');
  setTimeout(() => document.getElementById('subjectNameInput').focus(), 150);
}

function saveSubject() {
  const name = document.getElementById('subjectNameInput').value.trim();
  if (!name) {
    showToast('Please enter a subject name!', 'error');
    document.getElementById('subjectNameInput').focus();
    return;
  }
  const desc = document.getElementById('subjectDescInput').value.trim();

  if (state.editingSubjectId) {
    const subj = getSubject(state.editingSubjectId);
    subj.name        = name;
    subj.description = desc;
    subj.color       = state.selectedColor;
    subj.icon        = state.selectedIcon;
    showToast('Subject updated ✓', 'success');
  } else {
    const newSubj = {
      id:          generateId(),
      name,
      description: desc,
      color:       state.selectedColor,
      icon:        state.selectedIcon,
      topics:      [],
      studyTime:   0,
      createdAt:   Date.now(),
    };
    state.subjects.push(newSubj);
    state.currentSubjectId = newSubj.id;
    showToast('Subject added! 🎉', 'success');
  }

  saveState();
  renderAll();
  closeModal('subjectModal');
}

function deleteCurrentSubject() {
  const subj = getSubject(state.currentSubjectId);
  if (!subj) return;
  document.getElementById('confirmMessage').textContent =
    `Delete "${subj.name}"? This will permanently remove all ${subj.topics.length} topics and study time.`;
  document.getElementById('confirmBtn').onclick = () => {
    if (state.timer.running) { clearInterval(state.timer.intervalId); state.timer.running = false; }
    state.subjects        = state.subjects.filter(s => s.id !== state.currentSubjectId);
    state.currentSubjectId = state.subjects.length > 0 ? state.subjects[0].id : null;
    state.timer.seconds   = 0;
    resetTimerUI();
    saveState();
    renderAll();
    closeModal('confirmModal');
    showToast('Subject deleted', 'info');
  };
  openModal('confirmModal');
}

function moveSubject(event, id, dir) {
  event.stopPropagation();
  const idx = state.subjects.findIndex(s => s.id === id);
  const nxt = idx + dir;
  if (nxt < 0 || nxt >= state.subjects.length) return;
  [state.subjects[idx], state.subjects[nxt]] = [state.subjects[nxt], state.subjects[idx]];
  saveState();
  renderSubjectList();
}

// =============================================
// TOPIC CRUD
// =============================================
function openAddTopicModal() {
  state.editingTopicId = null;
  document.getElementById('topicModalTitle').textContent = 'Add Topic';
  document.getElementById('topicNameInput').value  = '';
  document.getElementById('topicNotesInput').value = '';
  document.querySelector('input[name="topicPriority"][value="medium"]').checked = true;
  openModal('topicModal');
  setTimeout(() => document.getElementById('topicNameInput').focus(), 150);
}

function openEditTopicModal(subjId, topicId) {
  const subj  = getSubject(subjId);
  const topic = subj.topics.find(t => t.id === topicId);
  if (!topic) return;
  state.editingTopicId = topicId;
  document.getElementById('topicModalTitle').textContent = 'Edit Topic';
  document.getElementById('topicNameInput').value  = topic.name;
  document.getElementById('topicNotesInput').value = topic.notes || '';
  document.querySelector(`input[name="topicPriority"][value="${topic.priority}"]`).checked = true;
  openModal('topicModal');
  setTimeout(() => document.getElementById('topicNameInput').focus(), 150);
}

function saveTopic() {
  const name = document.getElementById('topicNameInput').value.trim();
  if (!name) {
    showToast('Please enter a topic name!', 'error');
    document.getElementById('topicNameInput').focus();
    return;
  }
  const notes    = document.getElementById('topicNotesInput').value.trim();
  const priority = document.querySelector('input[name="topicPriority"]:checked').value;
  const subj     = getSubject(state.currentSubjectId);

  if (state.editingTopicId) {
    const topic  = subj.topics.find(t => t.id === state.editingTopicId);
    topic.name     = name;
    topic.notes    = notes;
    topic.priority = priority;
    showToast('Topic updated ✓', 'success');
  } else {
    subj.topics.push({
      id:          generateId(),
      name,
      notes,
      priority,
      completed:   false,
      createdAt:   Date.now(),
      completedAt: null,
    });
    showToast('Topic added ✓', 'success');
  }

  saveState();
  renderAll();
  closeModal('topicModal');
}

function toggleTopic(subjId, topicId, completed) {
  const subj  = getSubject(subjId);
  const topic = subj.topics.find(t => t.id === topicId);
  topic.completed   = completed;
  topic.completedAt = completed ? Date.now() : null;
  saveState();

  // Animate
  const el = document.getElementById(`topic-${topicId}`);
  if (el) {
    el.classList.toggle('completed', completed);
    if (completed) {
      el.classList.add('just-completed');
      setTimeout(() => el.classList.remove('just-completed'), 600);
    }
  }

  // Re-render stats without re-rendering the whole list (smoother)
  updateStats(subj);
  renderSubjectList();
  updateHeaderStats();

  if (completed) showToast('Topic completed! 🎉', 'success');
}

function updateStats(subj) {
  const total   = subj.topics.length;
  const done    = subj.topics.filter(t => t.completed).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('topicCountStat').textContent    = total;
  document.getElementById('completedCountStat').textContent = done;
  document.getElementById('pendingCountStat').textContent  = pending;
  document.getElementById('pbarLabel').textContent = `${done} / ${total} topics done`;

  const pbarFill = document.getElementById('pbarFill');
  pbarFill.style.width      = pct + '%';
  pbarFill.style.background = `linear-gradient(90deg, ${subj.color}, ${lighten(subj.color)})`;

  const circumference = 264;
  const fillLen = (pct / 100) * circumference;
  document.getElementById('cpFill').setAttribute('stroke-dasharray', `${fillLen} ${circumference}`);
  document.getElementById('cpPct').textContent = pct + '%';
}

function checkAllTopics() {
  const subj = getSubject(state.currentSubjectId);
  if (!subj) return;
  subj.topics.forEach(t => { t.completed = true; t.completedAt = Date.now(); });
  saveState();
  renderAll();
  showToast('All topics marked as done! 🎉', 'success');
}

function uncheckAllTopics() {
  const subj = getSubject(state.currentSubjectId);
  if (!subj) return;
  subj.topics.forEach(t => { t.completed = false; t.completedAt = null; });
  saveState();
  renderAll();
  showToast('All topics reset', 'info');
}

function confirmDeleteTopic(subjId, topicId) {
  const subj  = getSubject(subjId);
  const topic = subj.topics.find(t => t.id === topicId);
  document.getElementById('confirmMessage').textContent = `Delete topic "${topic.name}"? This cannot be undone.`;
  document.getElementById('confirmBtn').onclick = () => {
    subj.topics = subj.topics.filter(t => t.id !== topicId);
    saveState();
    renderAll();
    closeModal('confirmModal');
    showToast('Topic deleted', 'info');
  };
  openModal('confirmModal');
}

function moveTopic(subjId, topicId, dir) {
  const subj = getSubject(subjId);
  const idx  = subj.topics.findIndex(t => t.id === topicId);
  const nxt  = idx + dir;
  if (nxt < 0 || nxt >= subj.topics.length) return;
  [subj.topics[idx], subj.topics[nxt]] = [subj.topics[nxt], subj.topics[idx]];
  saveState();
  renderTopics(subj);
}

// =============================================
// FILTER
// =============================================
function setFilter(filter, btn) {
  state.currentFilter = filter;
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const subj = getSubject(state.currentSubjectId);
  if (subj) renderTopics(subj);
}

function resetFilterTabs() {
  state.currentFilter = 'all';
  document.querySelectorAll('.ftab').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });
}

// =============================================
// TIMER
// =============================================
function toggleTimer() {
  if (state.timer.running) pauseTimer();
  else startTimer();
}

function startTimer() {
  if (!state.currentSubjectId) return;
  state.timer.running    = true;
  state.timer.intervalId = setInterval(() => {
    state.timer.seconds++;
    document.getElementById('timerDisplay').textContent = fmtTimer(state.timer.seconds);

    // Live update study time stat
    const subj = getSubject(state.currentSubjectId);
    if (subj) {
      const total = (subj.studyTime || 0) + state.timer.seconds;
      document.getElementById('studyTimeStat').textContent = fmtTime(total);
    }
  }, 1000);

  const btn = document.getElementById('timerStartBtn');
  btn.className = 'btn-timer pause';
  btn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';

  const status = document.getElementById('sessionStatus');
  status.innerHTML = '<span class="dot running"></span> Running…';
}

function pauseTimer() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false;

  const btn = document.getElementById('timerStartBtn');
  btn.className = 'btn-timer start';
  btn.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';

  const status = document.getElementById('sessionStatus');
  status.innerHTML = '<span class="dot paused"></span> Paused';

  showToast(`Session paused — ${fmtTimer(state.timer.seconds)} recorded`, 'info');
}

function resetTimer() {
  if (state.timer.running) { clearInterval(state.timer.intervalId); state.timer.running = false; }

  // Optionally save existing seconds before resetting
  if (state.timer.seconds > 0) saveTimerToSubject();

  state.timer.seconds = 0;
  resetTimerUI();
  showToast('Timer reset', 'info');
}

function resetTimerUI() {
  const btn = document.getElementById('timerStartBtn');
  if (btn) {
    btn.className = 'btn-timer start';
    btn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
  }
  const disp = document.getElementById('timerDisplay');
  if (disp) disp.textContent = '00:00:00';
  const status = document.getElementById('sessionStatus');
  if (status) status.innerHTML = '<span class="dot idle"></span> Not started';
}

function saveTimerToSubject() {
  if (!state.currentSubjectId || state.timer.seconds === 0) return;
  const subj = getSubject(state.currentSubjectId);
  if (!subj) return;
  subj.studyTime = (subj.studyTime || 0) + state.timer.seconds;
  state.timer.seconds = 0;
  saveState();
}

// =============================================
// HEADER STATS
// =============================================
function updateHeaderStats() {
  let totalSecs  = 0;
  let totalTopics = 0;
  let doneTopics  = 0;

  state.subjects.forEach(s => {
    totalSecs   += (s.studyTime || 0);
    totalTopics += s.topics.length;
    doneTopics  += s.topics.filter(t => t.completed).length;
  });
  if (state.timer.running) totalSecs += state.timer.seconds;

  document.getElementById('totalTimeDisplay').textContent = fmtTime(totalSecs);
  const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;
  document.getElementById('totalCompletionDisplay').textContent = pct + '%';
}

// =============================================
// PICKERS
// =============================================
function renderColorPicker() {
  const picker = document.getElementById('colorPicker');
  picker.innerHTML = COLORS.map(c => `
    <button class="color-swatch ${state.selectedColor === c.value ? 'selected' : ''}"
      style="background:${c.value}"
      onclick="selectColor('${c.value}')"
      title="${c.name}">
      ${state.selectedColor === c.value ? '<i class="fas fa-check" style="font-size:11px"></i>' : ''}
    </button>`).join('');
}

function selectColor(val) {
  state.selectedColor = val;
  renderColorPicker();
  renderIconPicker(); // refresh icon swatch highlight colour
}

function renderIconPicker() {
  const picker = document.getElementById('iconPicker');
  picker.innerHTML = ICONS.map(ic => `
    <button class="icon-swatch ${state.selectedIcon === ic.icon ? 'selected' : ''}"
      onclick="selectIcon('${ic.icon}')"
      title="${ic.label}"
      style="${state.selectedIcon === ic.icon ? `background:${state.selectedColor}; color:#fff; border-color:${state.selectedColor}` : ''}">
      <i class="fas ${ic.icon}"></i>
    </button>`).join('');
}

function selectIcon(icon) {
  state.selectedIcon = icon;
  renderIconPicker();
}

// =============================================
// MODALS
// =============================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function closeModalOnOverlay(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

// =============================================
// TOAST
// =============================================
let toastTimeout = null;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (toastTimeout) clearTimeout(toastTimeout);
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  toastTimeout   = setTimeout(() => el.classList.remove('show'), 2800);
}

// =============================================
// UTILITIES
// =============================================
function fmtTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lighten(hex) {
  // Simple lighten for gradient
  try {
    let r = parseInt(hex.slice(1,3),16);
    let g = parseInt(hex.slice(3,5),16);
    let b = parseInt(hex.slice(5,7),16);
    r = Math.min(255, r + 50);
    g = Math.min(255, g + 50);
    b = Math.min(255, b + 50);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  } catch(_) { return hex; }
}
