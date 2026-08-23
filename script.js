// قائمة الأعمال — نسخة محسّنة: لا نستخدم innerHTML أو onclick، ونمنع مهام مكررة
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// تأكد من أن معرفات المهام أرقام بعد التحميل، واحفظ تاريخ الإنشاء إن لم يكن موجوداً
tasks = tasks.map(t => ({ ...t, id: Number(t.id), createdAt: t.createdAt || new Date(Number(t.id)).toISOString() }));

// عناصر DOM مخزنة للسرعة
let taskListEl, inputEl, addBtnEl;

// عند فتح الصفحة
document.addEventListener("DOMContentLoaded", function () {
    taskListEl = document.getElementById("taskList");
    inputEl = document.getElementById("taskInput");
    addBtnEl = document.getElementById("addTaskBtn");

    // ربط الأحداث
    addBtnEl.addEventListener("click", addTask);

    // Enter لإضافة المهمة
    inputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") addTask();
    });

    // تفويض حدث لأزرار الإنجاز والحذف داخل قائمة المهام
    taskListEl.addEventListener("click", function (e) {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.classList.contains("complete-btn")) {
            toggleTask(id);
        } else if (btn.classList.contains("delete-btn")) {
            deleteTask(id);
        }
    });

    displayTasks();
    updateStatistics();
});

// إضافة عمل جديد
function addTask() {
    const taskName = inputEl.value.trim();

    if (taskName === "") {
        alert("اكتب اسم العمل أولاً");
        return;
    }

    // منع التكرار (حساس لحالة الأحرف)
    if (tasks.some(t => t.name.toLowerCase() === taskName.toLowerCase())) {
        alert("المهمة موجودة بالفعل");
        return;
    }

    const nowIso = new Date().toISOString();

    const task = {
        id: Date.now(),
        name: taskName,
        completed: false,
        createdAt: nowIso
    };

    tasks.push(task);
    saveTasks();

    inputEl.value = "";

    displayTasks();
    updateStatistics();
}

// عرض الأعمال (بإنشاء العناصر برمجياً لتجنّب innerHTML)
function displayTasks() {
    taskListEl.innerHTML = "";

    if (tasks.length === 0) {
        const p = document.createElement("p");
        p.textContent = "لا توجد أعمال مضافة حتى الآن.";
        taskListEl.appendChild(p);
        return;
    }

    tasks.forEach(function (task) {
        const taskDiv = document.createElement("div");
        taskDiv.className = "task";
        if (task.completed) taskDiv.classList.add("completed");

        const nameDiv = document.createElement("div");
        nameDiv.className = "task-name";
        // عرض التاريخ أمام اسم المهمة (التنسيق العربي)
        nameDiv.textContent = task.createdAt ? ` ${formatDate(task.createdAt)} — ${task.name}` : task.name; // تعيين كنص لحماية من XSS

        const buttonsWrap = document.createElement("div");
        buttonsWrap.style.display = "flex";
        buttonsWrap.style.gap = "8px";

        const completeBtn = document.createElement("button");
        completeBtn.className = "complete-btn";
        completeBtn.dataset.id = task.id;
        completeBtn.textContent = task.completed ? "إلغاء الإنجاز" : "إنجاز";
        completeBtn.setAttribute('aria-label', task.completed ? 'إلغاء إنجاز المهمة' : 'وضع المهمة كمنجزة');

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.dataset.id = task.id;
        deleteBtn.textContent = "حذف";
        deleteBtn.setAttribute('aria-label', 'حذف المهمة');

        buttonsWrap.appendChild(completeBtn);
        buttonsWrap.appendChild(deleteBtn);

        taskDiv.appendChild(nameDiv);
        taskDiv.appendChild(buttonsWrap);

        taskListEl.appendChild(taskDiv);
    });
}

// تغيير حالة العمل
function toggleTask(id) {
    tasks = tasks.map(function (task) {
        if (task.id === id) {
            task.completed = !task.completed;
        }
        return task;
    });

    saveTasks();
    displayTasks();
    updateStatistics();
}

// حذف العمل
function deleteTask(id) {
    if (!confirm("هل تريد حذف هذا العمل؟")) return;

    tasks = tasks.filter(function (task) {
        return task.id !== id;
    });

    saveTasks();
    displayTasks();
    updateStatistics();
}

// تحديث الإحصائيات
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(function (task) { return task.completed; }).length;
    const pending = total - completed;

    let percentage = 0;
    if (total > 0) percentage = Math.round((completed / total) * 100);

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("progressBar").style.width = percentage + "%";
    document.getElementById("progressText").textContent = percentage + "%";
}

// حفظ البيانات
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// مساعدة: تنسيق التاريخ للعرض (عربي)
function formatDate(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
        return iso;
    }
}
