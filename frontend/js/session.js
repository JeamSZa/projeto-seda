document.addEventListener("DOMContentLoaded", function () {
    const logoutButtons = document.querySelectorAll("#logoutButton");

    logoutButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            localStorage.removeItem("seda_logged_in");
            window.location.href = "./index.html";
        });
    });

    if (localStorage.getItem("seda_logged_in") !== "true") {
        const isLoginPage = window.location.pathname.toLowerCase().endsWith("/index.html") ||
            window.location.pathname.toLowerCase().endsWith("index.html");

        if (!isLoginPage) {
            window.location.href = "./index.html";
        }
    }
});
