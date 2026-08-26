/* script.js - logic for tasks app: localStorage, export/import, DnD, search/filter/sort, notifications */
(() => {
  const STORAGE_KEY = 'tasks_v1';
  // DOM
  const taskForm = document.getElementById('taskForm');
  const titleEl = document.getElementById('taskTitle');
  const descEl = document.getElementById('taskDesc');
  const dueEl = document.getElementById('taskDue');
  const timeEl = document.getElementById('taskTime');
  const priorityEl = document.getElementById('taskPriority');
  const tagsEl = document.getElementById('taskTags');
  const addBtn = document.getElementById('addTaskBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const taskList = document.getElementById('taskList');
  const emptyHint = document.getElementById('emptyHint');
  const totalTasks = document.getElementById('totalTasks');
  const completedTasks = document.getElementById('completedTasks');
  const pendingTasks = document.getElementById('pendingTasks');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const sortSelect = document.getElementById('sortSelect');
  const markAllBtn = document.getElementById('markAllBtn');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');

  let tasks = [];
  let editingId = null;
  let dragSrcId = null;

  // utilities
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const parseDateTime = (d, t) => {
    if (!d) return null;
    return t ? new Date(d + 'T' + t) : new Date(d);
  };

  // storage
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
  function load() {
    try {
      tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      tasks = [];
    }
  }

  // render
  function render() {
    // apply search/filter/sort
    const q = (searchInput.value || '').trim().toLowerCase();
    const filter = filterSelect.value;
    const sort = sortSelect.value;

    let list = tasks.slice();

    if (q) {
      list = list.filter(t => (t.title + ' ' + (t.description||'') + ' ' + (t.tags||'')).toLowerCase().includes(q));
    }
    if (filter === 'pending') list = list.filter(t => !t.completed);
    if (filter === 'completed') list = list.filter(t => t.completed);
    if (filter === 'overdue') list = list.filter(t => t.due && !t.completed && new Date(t.due) < new Date());

    // sort
    list.sort((a,b) => {
      if (sort === 'date_desc') return (b.createdAt||0) - (a.createdAt||0);
      if (sort === 'date_asc') return (a.createdAt||0) - (b.createdAt||0);
      if (sort === 'name_asc') return a.title.localeCompare(b.title);
      if (sort === 'name_desc') return b.title.localeCompare(a.title);
      if (sort === 'priority_desc') {
        const rank = {high:3,medium:2,low:1};
        return (rank[b.priority]||0) - (rank[a.priority]||0);
      }
      return 0;
    });

    taskList.innerHTML = '';
    if (list.length === 0) {
      emptyHint.style.display = 'block';
    } else {
      emptyHint.style.display = 'none';
    }

    for (const t of list) {
      const item = document.createElement('div');
      item.className = 'task-item' + (t.completed ? ' completed' : '') + ` priority-${t.priority||'medium'}`;
      item.setAttribute('draggable', 'true');
      item.dataset.id = t.id;

      // drag handle
      const drag = document.createElement('span');
      drag.className = 'drag-handle';
      drag.innerText = '⋮';
      drag.title = 'اسحب لإعادة الترتيب';
      item.appendChild(drag);

      // checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!t.completed;
      cb.setAttribute('aria-label', 'تحديد منجزة');
      cb.addEventListener('change', () => {
        t.completed = cb.checked;
        t.updatedAt = Date.now();
        save();
        render();
      });
      item.appendChild(cb);

      // main
      const main = document.createElement('div');
      main.className = 'task-main';

      const title = document.createElement('div');
      title.className = 'task-title';
      title.innerText = t.title;
      main.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'task-meta';
      const due = t.due ? new Date(t.due) : null;
      if (due) {
        const dueSpan = document.createElement('span');
        dueSpan.innerText = 'موعد: ' + due.toLocaleString();
        meta.appendChild(dueSpan);
      }
      if (t.tags) {
        const tags = t.tags.split(',').map(s => s.trim()).filter(Boolean);
        for (const tg of tags) {
          const el = document.createElement('span');
          el.className = 'tag';
          el.innerText = tg;
          meta.appendChild(el);
        }
      }
      if (t.description) {
        const desc = document.createElement('div');
        desc.className = 'muted';
        desc.innerText = t.description;
        main.appendChild(desc);
      }
      main.appendChild(meta);
      item.appendChild(main);

      // actions
      const actions = document.createElement('div');
      actions.className = 'controls';

      const editBtn = document.createElement('button');
      editBtn.className = 'small-action secondary';
      editBtn.innerText = 'تعديل';
      editBtn.addEventListener('click', () => startEdit(t.id));
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'small-action danger';
      delBtn.innerText = 'حذف';
      delBtn.addEventListener('click', () => {
        if (confirm('هل تريد حذف هذه المهمة؟')) {
          tasks = tasks.filter(x => x.id !== t.id);
          save();
          render();
        }
      });
      actions.appendChild(delBtn);

      item.appendChild(actions);

      // drag events
      item.addEventListener('dragstart', (e) => {
        dragSrcId = t.id;
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragSrcId || dragSrcId === t.id) return;
        const srcIndex = tasks.findIndex(x => x.id === dragSrcId);
        const dstIndex = tasks.findIndex(x => x.id === t.id);
        if (srcIndex < 0 || dstIndex < 0) return;
        const [moved] = tasks.splice(srcIndex, 1);
        tasks.splice(dstIndex, 0, moved);
        save();
        render();
      });

      taskList.appendChild(item);
    }

    // stats
    const total = tasks.length;
    const done = tasks.filter(t=>t.completed).length;
    const pending = total - done;
    totalTasks.innerText = total;
    completedTasks.innerText = done;
    pendingTasks.innerText = pending;
    const pct = total === 0 ? 0 : Math.round((done/total)*100);
    progressBar.style.width = pct + '%';
    progressText.innerText = pct + '%';
    progressBar.parentElement.setAttribute('aria-valuenow', pct);
  }

  // create / edit
  function startEdit(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    editingId = id;
    titleEl.value = t.title;
    descEl.value = t.description || '';
    dueEl.value = t.due ? new Date(t.due).toISOString().slice(0,10) : '';
    timeEl.value = t.due ? new Date(t.due).toTimeString().slice(0,5) : '';
    priorityEl.value = t.priority || 'medium';
    tagsEl.value = t.tags || '';
    addBtn.innerText = 'حفظ التعديل';
    cancelEditBtn.hidden = false;
  }

  function resetForm() {
    editingId = null;
    taskForm.reset();
    addBtn.innerText = 'إضافة المهمة';
    cancelEditBtn.hidden = true;
  }

  // form submit
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = titleEl.value.trim();
    if (!title) return alert('الرجاء إدخال عنوان المهمة.');
    const description = descEl.value.trim();
    const due = parseDateTime(dueEl.value, timeEl.value);
    const priority = priorityEl.value;
    const tags = tagsEl.value;

    if (editingId) {
      const t = tasks.find(x => x.id === editingId);
      if (!t) return;
      t.title = title;
      t.description = description;
      t.due = due ? due.toISOString() : null;
      t.priority = priority;
      t.tags = tags;
      t.updatedAt = Date.now();
    } else {
      const newTask = {
        id: uid(),
        title,
        description,
        due: due ? due.toISOString() : null,
        priority,
        tags,
        completed: false,
        createdAt: Date.now()
      };
      tasks.unshift(newTask);
    }
    save();
    resetForm();
    render();
    scheduleNotifications();
  });

  cancelEditBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
  });

  // bulk actions
  markAllBtn.addEventListener('click', () => {
    if (!confirm('وضع كل المهام كمنجزة؟')) return;
    tasks.forEach(t => t.completed = true);
    save();
    render();
  });

  clearCompletedBtn.addEventListener('click', () => {
    if (!confirm('حذف جميع المهام المنجزة؟')) return;
    tasks = tasks.filter(t => !t.completed);
    save();
    render();
  });

  // export / import
  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify({ exportedAt: new Date().toISOString(), tasks }, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!confirm('استيراد الملف سيضيف أو يدمج المهام؛ هل تريد المتابعة؟')) return;
    try {
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      const imported = Array.isArray(parsed.tasks) ? parsed.tasks : (Array.isArray(parsed) ? parsed : []);
      // merge by id - avoid duplicates
      const existingIds = new Set(tasks.map(t=>t.id));
      for (const it of imported) {
        if (!it.id || existingIds.has(it.id)) {
          // assign new id
          it.id = uid();
        }
        tasks.push(it);
      }
      save();
      render();
      alert('تم الاستيراد.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الاستيراد.');
    } finally {
      importFile.value = '';
    }
  });

  // search / filter / sort events
  searchInput.addEventListener('input', () => render());
  filterSelect.addEventListener('change', () => render());
  sortSelect.addEventListener('change', () => render());

  // notifications
  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // schedule simple reminders for tasks with due dates (only while page open)
  function scheduleNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    // clear existing timeouts by reloading (we won't store them); simple approach: check all tasks and notify if due within 1 minute
    const now = Date.now();
    tasks.forEach(t => {
      if (t.due && !t.completed) {
        const dueTs = new Date(t.due).getTime();
        const ms = dueTs - now;
        if (ms <= 0 && ms > -60*60*1000) {
          // overdue recently
          new Notification('مهمة متأخرة', { body: t.title });
        } else if (ms > 0 && ms < 60*60*1000) {
          // schedule near-future within hour
          setTimeout(() => {
            new Notification('تذكير مهمة', { body: t.title });
          }, Math.max(0, ms));
        }
      }
    });
  }

  // initial load
  load();
  render();
  requestNotificationPermission();
  scheduleNotifications();

  // keyboard shortcut: n -> focus new task title
  window.addEventListener('keydown', (e) => {
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      titleEl.focus();
    }
  });

  // expose for debugging
  window.__tasksApp = {
    addSample: () => {
      tasks.push({ id: uid(), title: 'مهمة تجريبية', description: 'وصف', due: null, priority: 'high', tags: 'اختبار', completed: false, createdAt: Date.now() });
      save(); render();
    },
    get tasks() { return tasks; }
  };

})();
