document.getElementById("save-btn").addEventListener("click", function () {

    const title = document.getElementById("title").value;
    const responsible = document.getElementById("responsible").value;
    const date = document.getElementById("date").value;
    const status = document.getElementById("status").value;

    if (title === "" || responsible === "" || date === "") {
        alert("يرجى تعبئة جميع البيانات");
        return;
    }

    alert(
        "تم حفظ المتابعة بنجاح\n\n" +
        "موضوع المتابعة: " + title + "\n" +
        "المسؤول: " + responsible + "\n" +
        "التاريخ: " + date
    );

});
