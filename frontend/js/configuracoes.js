
document.addEventListener("DOMContentLoaded", () => {

    // CHAVES DE ARMAZENAMENTO
    const PROFILE_KEY = "seda_user_profile";
    const COMPANY_KEY = "seda_company_settings";
    const PREFERENCES_KEY = "seda_user_preferences";

    // ELEMENTOS
    const profileForm = document.getElementById("profileForm");
    const companyForm = document.getElementById("companyForm");

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const userRole = document.getElementById("userRole");
    const userPhone = document.getElementById("userPhone");

    const companyName = document.getElementById("companyName");
    const companyDocument = document.getElementById("companyDocument");
    const companyEmail = document.getElementById("companyEmail");

    const notificationsToggle = document.getElementById("notificationsToggle");
    const processingToggle = document.getElementById("processingToggle");
    const confirmationToggle = document.getElementById("confirmationToggle");

    // DATA
    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    // LER DADOS SALVOS
    function readStorage(key, fallback) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch (error) {
            console.error("Erro ao ler configurações:", error);
            return fallback;
        }
    }

    // SALVAR DADOS
    function saveStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            showToast("Não foi possível salvar os dados.", true);
            return false;
        }
    }

    // AVISO DE SUCESSO
    let toastTimer;

    function showToast(message, isError = false) {
        const toast = document.getElementById("toastMessage");
        const toastText = document.getElementById("toastText");
        const toastIcon = toast.querySelector("i");

        toastText.textContent = message;

        toast.style.background = isError ? "#b83d3d" : "#0b7654";
        toastIcon.className = isError
            ? "bi bi-exclamation-circle-fill"
            : "bi bi-check-circle-fill";

        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    // INICIA PERFIL
    function loadProfile() {
        const profile = readStorage(PROFILE_KEY, {
            name: "João Silva",
            email: "",
            role: "Administrador",
            phone: ""
        });

        userName.value = profile.name || "";
        userEmail.value = profile.email || "";
        userRole.value = profile.role || "";
        userPhone.value = profile.phone || "";

        updateProfilePreview(profile.name || "João Silva");
    }

    // ATUALIZA NOME E INICIAIS
    function updateProfilePreview(name) {
        const cleanName = name.trim() || "Usuário";
        const parts = cleanName.split(/\s+/);

        const initials = parts.length > 1
            ? parts[0][0] + parts[parts.length - 1][0]
            : parts[0].substring(0, 2);

        const formattedInitials = initials.toUpperCase();

        document.getElementById("profilePreviewName").textContent = cleanName;
        document.getElementById("profileInitials").textContent = formattedInitials;
        document.getElementById("sidebarUserName").textContent = cleanName;

        document.querySelector(".avatar").textContent = formattedInitials;
        document.querySelector(".top-avatar").textContent = formattedInitials;

        const firstName = parts[0];

        document.getElementById("topbarGreeting").textContent =
            `Olá, ${firstName}!`;
    }

    // SALVAR PERFIL
    profileForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!profileForm.reportValidity()) return;

        const profile = {
            name: userName.value.trim(),
            email: userEmail.value.trim(),
            role: userRole.value.trim(),
            phone: userPhone.value.trim()
        };

        if (saveStorage(PROFILE_KEY, profile)) {
            updateProfilePreview(profile.name);
            showToast("Perfil atualizado com sucesso!");
        }
    });

    // INICIA EMPRESA
    function loadCompany() {
        const company = readStorage(COMPANY_KEY, {
            name: "OTPRO CAPITAL",
            document: "",
            email: ""
        });

        companyName.value = company.name || "";
        companyDocument.value = company.document || "";
        companyEmail.value = company.email || "";
    }

    // SALVAR EMPRESA
    companyForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const company = {
            name: companyName.value.trim(),
            document: companyDocument.value.trim(),
            email: companyEmail.value.trim()
        };

        if (saveStorage(COMPANY_KEY, company)) {
            showToast("Informações da empresa salvas!");
        }
    });

    // INICIA PREFERÊNCIAS
    function loadPreferences() {
        const preferences = readStorage(PREFERENCES_KEY, {
            notifications: true,
            processingNotifications: true,
            confirmationBeforeReject: true
        });

        notificationsToggle.checked = preferences.notifications;
        processingToggle.checked = preferences.processingNotifications;
        confirmationToggle.checked = preferences.confirmationBeforeReject;
    }

    // SALVAR PREFERÊNCIAS
    document.getElementById("savePreferences").addEventListener("click", () => {

        const preferences = {
            notifications: notificationsToggle.checked,
            processingNotifications: processingToggle.checked,
            confirmationBeforeReject: confirmationToggle.checked
        };

        if (saveStorage(PREFERENCES_KEY, preferences)) {
            showToast("Preferências salvas com sucesso!");
        }
    });

    // MENU DE CONFIGURAÇÕES
    const settingsLinks = document.querySelectorAll(".settings-link");

    settingsLinks.forEach(link => {
        link.addEventListener("click", () => {
            settingsLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // MENU MOBILE
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    document.getElementById("menuToggle").addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    });

    // CARREGAMENTO INICIAL
    loadProfile();
    loadCompany();
    loadPreferences();

});
