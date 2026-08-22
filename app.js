const saveBtn = document.getElementById("save-btn");

saveBtn.addEventListener("click", function () {
    const title = document.getElementById("title").value;
    const responsible = document.getElementById("responsible").value;
    const date = document.getElementById("date").value;
    const status = document.getElementById("status").value;

    alert(
        "تم حفظ المتابعة\n\n" +
        "الموضوع: " + title + "\n" +
        "المسؤول: " + responsible + "\n" +
        "التاريخ: " + date + "\n" +
        "الحالة: " + status
    );
});
