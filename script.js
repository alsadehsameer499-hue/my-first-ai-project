// تحسين قائمة الأعمال: بحث، فلترة، فرز، تصدير/استيراد، تحرير، تراجع حذف
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
tasks = tasks.map(t => ({ ...t, id: Number(t.id), createdAt: t.createdAt || new Date(Number(t.id)).toISOString() }));

// DOM
let taskListEl, inputEl, addBtnEl;
let searchInputEl, filterSelectEl, sortSelectEl, markAllBtnEl, clearCompletedBtnEl, exportBtnEl, importFileEl;

let lastDeleted = null;
let undoTimeoutId = null;
const UNDO_TIMEOUT = 5000; // ms

document.addEventListener("DOMContentLoaded", function () {
    taskListEl = document.getElementById("taskList");
    inputEl = document.getElementById("taskInput");
    addBtnEl = document.getElementById("addTaskBtn");

    // أدوات جديدة
    searchInputEl = document.getElementById("searchInput");
    filterSelectEl = document.getElementById("filterSelect");
    sortSelectEl = document.getElementById("sortSelect");
    markAllBtnEl = document.getElementById("markAllBtn");
    clearCompletedBtnEl = document.getElementById("clearCompletedBtn");
    exportBtnEl = document.getElementById("exportBtn");
    importFileEl = document.getElementById("importFile");

    // ربط الأحداث الأساسية
    addBtnEl.addEventListener("click", addTask);
    inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") addTask(); });

    // ربط أدوات البحث/فلترة/فرز
    if (searchInputEl) {
        let debounceTimer;
        searchInputEl.addEventListener("input", function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                applyFiltersAndDisplay();
            }, 250);
        });
    }
    if (filterSelectEl) filterSelectEl.addEventListener("change", applyFiltersAndDisplay);
    if (sortSelectEl) sortSelectEl.addEventListener("change", applyFiltersAndDisplay);

    // أزرار العمليات الجماعية
    if (markAllBtnEl) markAllBtnEl.addEventListener("click", markAllCompleted);
    if (clearCompletedBtnEl) clearCompletedBtnEl.addEventListener("click", clearCompleted);

    // تصدير/استيراد
    if (exportBtnEl) exportBtnEl.addEventListener("click", exportTasks);
    if (importFileEl) importFileEl.addEventListener("change", importTasksFromFile);

    // تفويض حدث لأزرار داخل قائمة المهام
    taskListEl.addEventListener("click", function (e) {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.classList.contains("complete-btn")) {
            toggleTask(id);
        } else if (btn.classList.contains("delete-btn")) {
            deleteTask(id);
        } else if (btn.classList.contains("edit-btn")) {
            editTask(id);
        }
    });

    applyFiltersAndDisplay();
    updateStatistics();
});

// إضافة مهمة
function addTask() {
    const taskName = inputEl.value.trim();
    if (taskName === "") { alert("اكتب اسم العمل أولاً"); return; }

    if (tasks.some(t => t.name.toLowerCase() === taskName.toLowerCase())) {
        alert("المهمة موجودة بالفعل");
        return;
    }

    const nowIso = new Date().toISOString();
    const task = { id: Date.now(), name: taskName, completed: false, createdAt: nowIso };

    tasks.push(task);
    saveTasks();

    inputEl.value = "";
    applyFiltersAndDisplay();
    updateStatistics();
}

// تطبيق الفلترة والفرز ثم العرض
function applyFiltersAndDisplay() {
    let visible = tasks.slice();

    // بحث
    const q = (searchInputEl && searchInputEl.value || "").trim().toLowerCase();
    if (q) visible = visible.filter(t => t.name.toLowerCase().includes(q));

    // فلترة
    const filter = (filterSelectEl && filterSelectEl.value) || "all";
    if (filter === "pending") visible = visible.filter(t => !t.completed);
    if (filter === "completed") visible = visible.filter(t => t.completed);

    // فرز
    const sort = (sortSelectEl && sortSelectEl.value) || "date_desc";
    if (sort === "date_desc") visible.sort((a, b) => b.id - a.id);
    else if (sort === "date_asc") visible.sort((a, b) => a.id - b.id);
    else if (sort === "name_asc") visible.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (sort === "name_desc") visible.sort((a, b) => b.name.localeCompare(a.name, 'ar'));

    displayTasks(visible);
}

// عرض الأعمال (يمكن استقبال قائمة مرشحة)
function displayTasks(list = tasks) {
    taskListEl.innerHTML = "";

    if (list.length === 0) {
        const p = document.createElement("p");
        p.textContent = "لا توجد أعمال مضافة حتى الآن.";
        taskListEl.appendChild(p);
        return;
    }

    list.forEach(function (task) {
        const taskDiv = document.createElement("div");
        taskDiv.className = "task";
        if (task.completed) taskDiv.classList.add("completed");

        const nameDiv = document.createElement("div");
        nameDiv.className = "task-name";
        nameDiv.textContent = task.createdAt ? ` ${formatDate(task.createdAt)} — ${task.name}` : task.name;

        const buttonsWrap = document.createElement("div");
        buttonsWrap.style.display = "flex";
        buttonsWrap.style.gap = "8px";

        const completeBtn = document.createElement("button");
        completeBtn.className = "complete-btn";
        completeBtn.dataset.id = task.id;
        completeBtn.textContent = task.completed ? "إلغاء الإنجاز" : "إنجاز";
        completeBtn.setAttribute('aria-label', task.completed ? 'إلغاء إنجاز المهمة' : 'وضع المهمة كمنجزة');

        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.dataset.id = task.id;
        editBtn.textContent = "تعديل";
        editBtn.setAttribute('aria-label', 'تعديل المهمة');

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.dataset.id = task.id;
        deleteBtn.textContent = "حذف";
        deleteBtn.setAttribute('aria-label', 'حذف المهمة');

        buttonsWrap.appendChild(completeBtn);
        buttonsWrap.appendChild(editBtn);
        buttonsWrap.appendChild(deleteBtn);

        taskDiv.appendChild(nameDiv);
        taskDiv.appendChild(buttonsWrap);

        taskListEl.appendChild(taskDiv);
    });
}

// تبديل حالة المهمة
function toggleTask(id) {
    tasks = tasks.map(function (task) {
        if (task.id === id) task.completed = !task.completed;
        return task;
    });
    saveTasks();
    applyFiltersAndDisplay();
    updateStatistics();
}

// حذف المهمة مع دعم التراجع
function deleteTask(id) {
    const toDelete = tasks.find(t => t.id === id);
    if (!toDelete) return;
    if (!confirm("هل تريد حذف هذا العمل؟")) return;

    lastDeleted = toDelete;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    applyFiltersAndDisplay();
    updateStatistics();
    showUndoSnackbar("تم حذف المهمة", undoDelete);
}

// تراجع حذف
function undoDelete() {
    if (!lastDeleted) return;
    tasks.push(lastDeleted);
    // حافظ على ترتيب زمني: نعيد الفرز حسب id تنازلي
    tasks.sort((a, b) => b.id - a.id);
    saveTasks();
    applyFiltersAndDisplay();
    updateStatistics();
    lastDeleted = null;
    if (undoTimeoutId) { clearTimeout(undoTimeoutId); undoTimeoutId = null; }
}

// تحرير مهمة
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newName = prompt("عدل اسم المهمة:", task.name);
    if (newName === null) return; // إلغاء
    const trimmed = newName.trim();
    if (trimmed === "") { alert("لا يمكن ترك الاسم فارغاً"); return; }
    if (tasks.some(t => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase())) {
        alert("مهمة بنفس الاسم موجودة بالفعل");
        return;
    }
    task.name = trimmed;
    saveTasks();
    applyFiltersAndDisplay();
    updateStatistics();
}

// وضع كل المهام كمنجزة
function markAllCompleted() {
    if (!confirm("هل تريد وضع كل المهام كمنجزة؟")) return;
    tasks = tasks.map(t => ({ ...t, completed: true }));
    saveTasks();
    applyFiltersAndDisplay();
    updateStatistics();
}

// مسح المنجزة
function clearCompleted() {
    if (!confirm("هل تريد حذف كل المهام المنجزة؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    applyFiltersAndDisplay();
    updateStatistics();
}

// التصدير كـ JSON للتحميل
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `tasks-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// الاستيراد من ملف JSON (يُدمج مع تجنب التكرار)
function importTasksFromFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
        try {
            const imported = JSON.parse(reader.result);
            if (!Array.isArray(imported)) throw new Error("ملف غير صالح");
            let added = 0;
            imported.forEach(item => {
                if (!item.name) return;
                const normalized = item.name.trim();
                if (tasks.some(t => t.name.toLowerCase() === normalized.toLowerCase())) return;
                const newTask = {
                    id: item.id ? Number(item.id) : Date.now() + Math.floor(Math.random() * 1000),
                    name: normalized,
                    completed: !!item.completed,
                    createdAt: item.createdAt || new Date().toISOString()
                };
                tasks.push(newTask);
                added++;
            });
            if (added > 0) {
                saveTasks();
                applyFiltersAndDisplay();
                updateStatistics();
                alert(`تم إضافة ${added} مهمة من الملف.`);
            } else {
                alert("لم يتم إضافة مهام جديدة (قد تكون موجودة بالفعل).");
            }
        } catch (err) {
            alert("خطأ في قراءة الملف. تأكد أنه JSON صالح وصيغة مصفوفة من المهام.");
        } finally {
            importFileEl.value = ""; // إعادة تعيين الحقل
        }
    };
    reader.readAsText(file);
}

// حفظ في localStorage
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// إحصائيات
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("progressBar").style.width = percentage + "%";
    document.getElementById("progressText").textContent = percentage + "%";
}

// تنسيق التاريخ
function formatDate(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
        return iso;
    }
}

// Snackbar لعرض تراجع الحذف
function showUndoSnackbar(message, onUndo) {
    // إزالة snackbar سابق إن وجد
    const existing = document.getElementById("undo-snackbar");
    if (existing) existing.remove();

    const sn = document.createElement("div");
    sn.id = "undo-snackbar";
    sn.style.position = "fixed";
    sn.style.bottom = "20px";
    sn.style.left = "50%";
    sn.style.transform = "translateX(-50%)";
    sn.style.background = "#333";
    sn.style.color = "white";
    sn.style.padding = "12px 16px";
    sn.style.borderRadius = "8px";
    sn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    sn.style.display = "flex";
    sn.style.gap = "12px";
    sn.style.alignItems = "center";
    sn.style.zIndex = 9999;

    const txt = document.createElement("span");
    txt.textContent = message;

    const undoBtn = document.createElement("button");
    undoBtn.textContent = "تراجع";
    undoBtn.style.background = "#c9a227";
    undoBtn.style.color = "#000";
    undoBtn.style.border = "none";
    undoBtn.style.padding = "6px 10px";
    undoBtn.style.borderRadius = "6px";
    undoBtn.style.cursor = "pointer";

    undoBtn.addEventListener("click", function () {
        if (onUndo) onUndo();
        sn.remove();
    });

    sn.appendChild(txt);
    sn.appendChild(undoBtn);
    document.body.appendChild(sn);

    if (undoTimeoutId) clearTimeout(undoTimeoutId);
    undoTimeoutId = setTimeout(function () {
        sn.remove();
        lastDeleted = null;
        undoTimeoutId = null;
    }, UNDO_TIMEOUT);
}
