// قائمة الأعمال
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];


// عند فتح الصفحة
document.addEventListener("DOMContentLoaded", function () {
    displayTasks();
    updateStatistics();
});


// إضافة عمل جديد
function addTask() {

    const input = document.getElementById("taskInput");

    const taskName = input.value.trim();

    if (taskName === "") {
        alert("اكتب اسم العمل أولاً");
        return;
    }

    const task = {
        id: Date.now(),
        name: taskName,
        completed: false
    };

    tasks.push(task);

    saveTasks();

    input.value = "";

    displayTasks();

    updateStatistics();
}


// عرض الأعمال
function displayTasks() {

    const taskList = document.getElementById("taskList");

    taskList.innerHTML = "";

    if (tasks.length === 0) {

        taskList.innerHTML =
            "<p>لا توجد أعمال مضافة حتى الآن.</p>";

        return;
    }

    tasks.forEach(function (task) {

        const taskDiv = document.createElement("div");

        taskDiv.className = "task";

        if (task.completed) {
            taskDiv.classList.add("completed");
        }

        taskDiv.innerHTML = `

            <div class="task-name">
                ${task.name}
            </div>

            <button
                class="complete-btn"
                onclick="toggleTask(${task.id})"
            >
                ${task.completed ? "إلغاء الإنجاز" : "إنجاز"}
            </button>

            <button
                class="delete-btn"
                onclick="deleteTask(${task.id})"
            >
                حذف
            </button>

        `;

        taskList.appendChild(taskDiv);
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

    if (!confirm("هل تريد حذف هذا العمل؟")) {
        return;
    }

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

    const completed = tasks.filter(function (task) {
        return task.completed;
    }).length;

    const pending = total - completed;

    let percentage = 0;

    if (total > 0) {
        percentage = Math.round((completed / total) * 100);
    }

    document.getElementById("totalTasks").textContent = total;

    document.getElementById("completedTasks").textContent = completed;

    document.getElementById("pendingTasks").textContent = pending;

    document.getElementById("progressBar").style.width =
        percentage + "%";

    document.getElementById("progressText").textContent =
        percentage + "%";
}


// حفظ البيانات
function saveTasks() {

    localStorage.setItem(
        "tasks",
        JSON.stringify(tasks)
    );
}
