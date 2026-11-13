
// =====================================
// S.E.D.A. - JAVASCRIPT DO LOGIN
// =====================================

document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");

    const email = document.getElementById("email");

    const password = document.getElementById("password");

    const message = document.getElementById("loginMessage");

    const togglePassword = document.getElementById("togglePassword");


    // =================================
    // MOSTRAR E OCULTAR SENHA
    // =================================

    togglePassword.addEventListener("click", function () {

        if (password.type === "password") {

            password.type = "text";

            togglePassword.innerHTML = '<i class="bi bi-eye-slash"></i>';

        } else {

            password.type = "password";

            togglePassword.innerHTML = '<i class="bi bi-eye"></i>';

        }

    });


    // =================================
    // VALIDAR FORMULÁRIO
    // =================================

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const emailValue = email.value.trim();

        const passwordValue = password.value.trim();

        message.style.color = "#B17B24";

        if (emailValue === "" || passwordValue === "") {

            message.textContent = "Preencha todos os campos.";

            return;

        }

        if (!email.checkValidity()) {

            message.textContent = "Digite um e-mail válido.";

            return;

        }

        message.style.color = "#23865C";

        message.textContent =
            "Interface validada! A autenticação será integrada ao Back-end.";

    });


    // =================================
    // ESQUECEU A SENHA
    // =================================

    document.getElementById("forgotPassword")
        .addEventListener("click", function (event) {

            event.preventDefault();

            message.style.color = "#B17B24";

            message.textContent =
                "A recuperação de senha será disponibilizada futuramente.";

        });


    // =================================
    // ACESSO DE VISITANTE
    // =================================

    document.getElementById("guestButton")
        .addEventListener("click", function () {

            message.style.color = "#B17B24";

            message.textContent =
                "O acesso de visitante será configurado futuramente.";

        });

});
