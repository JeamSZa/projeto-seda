
// =========================================
// S.E.D.A. - JAVASCRIPT DO DASHBOARD
// =========================================

document.addEventListener("DOMContentLoaded", function () {


    // =====================================
    // DATA ATUAL
    // =====================================

    const currentDate = document.getElementById("currentDate");

    const hoje = new Date();

    currentDate.textContent = hoje.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });


    // =====================================
    // MENU RESPONSIVO
    // =====================================

    const sidebar = document.getElementById("sidebar");

    const menuToggle = document.getElementById("menuToggle");

    menuToggle.addEventListener("click", function () {

        sidebar.classList.toggle("open");

    });


    // Fecha o menu ao clicar fora dele

    document.addEventListener("click", function (event) {

        if (
            window.innerWidth <= 900 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {

            sidebar.classList.remove("open");

        }

    });


    // =====================================
    // NOTIFICAÇÕES
    // =====================================

    const toastElement = document.getElementById("appToast");

    const toastMessage = document.getElementById("toastMessage");

    const notificationButton = document.getElementById("notificationButton");

    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });


    function mostrarNotificacao(mensagem) {

        toastMessage.textContent = mensagem;

        toast.show();

    }


    notificationButton.addEventListener("click", function () {

        mostrarNotificacao(
            "Você está visualizando as notificações do S.E.D.A."
        );

    });


    // =====================================
    // PERÍODO DO DASHBOARD
    // =====================================

    const periodButton = document.getElementById("periodButton");

    periodButton.addEventListener("click", function () {

        mostrarNotificacao(
            "O filtro geral de período será integrado ao Back-end."
        );

    });


    // =====================================
    // NAVEGAÇÃO LATERAL
    // =====================================

    const menuLinks = document.querySelectorAll(".sidebar-nav .nav-item");

    menuLinks.forEach(function (link) {

        link.addEventListener("click", function (event) {

            if (link.getAttribute("href") === "#") {

                event.preventDefault();

                const nome = link.querySelector("span").textContent.trim();

                mostrarNotificacao(
                    "O módulo " + nome + " será desenvolvido na próxima etapa."
                );

            }

            if (window.innerWidth <= 900) {

                sidebar.classList.remove("open");

            }

        });

    });


    // =====================================
    // GRÁFICO DE PROCESSAMENTO
    // =====================================

    const processingCanvas = document.getElementById("processingChart");

    let processingChart = null;

    if (processingCanvas && window.Chart) {

        processingChart = new Chart(processingCanvas, {

            type: "bar",

            data: {

                labels: [
                    "Nov",
                    "Dez",
                    "Jan",
                    "Fev",
                    "Mar",
                    "Abr"
                ],

                datasets: [{

                    label: "Documentos processados",

                    data: [48, 62, 58, 83, 96, 128],

                    backgroundColor: [
                        "#D8BA3F",
                        "#D8BA3F",
                        "#D8BA3F",
                        "#D8BA3F",
                        "#D8BA3F",
                        "#082F43"
                    ],

                    borderRadius: 5,

                    borderSkipped: false,

                    maxBarThickness: 28

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        backgroundColor: "#082F43",

                        titleFont: {
                            size: 11
                        },

                        bodyFont: {
                            size: 10
                        },

                        padding: 10

                    }

                },

                scales: {

                    x: {

                        grid: {
                            display: false
                        },

                        border: {
                            display: false
                        },

                        ticks: {
                            color: "#8797A1",
                            font: {
                                size: 10
                            }
                        }

                    },

                    y: {

                        beginAtZero: true,

                        border: {
                            display: false
                        },

                        grid: {
                            color: "#EDF1F3"
                        },

                        ticks: {
                            color: "#98A5AC",
                            font: {
                                size: 9
                            },

                            stepSize: 40

                        }

                    }

                }

            }

        });

    }


    // =====================================
    // FILTRO DO GRÁFICO
    // =====================================

    const chartPeriod = document.getElementById("chartPeriod");

    const chartTotal = document.getElementById("chartTotal");


    chartPeriod.addEventListener("change", function () {

        if (!processingChart) return;

        if (chartPeriod.value === "4") {

            processingChart.data.labels = [
                "Jan",
                "Fev",
                "Mar",
                "Abr"
            ];

            processingChart.data.datasets[0].data = [
                58,
                83,
                96,
                128
            ];

            chartTotal.textContent = "365";

        } else {

            processingChart.data.labels = [
                "Nov",
                "Dez",
                "Jan",
                "Fev",
                "Mar",
                "Abr"
            ];

            processingChart.data.datasets[0].data = [
                48,
                62,
                58,
                83,
                96,
                128
            ];

            chartTotal.textContent = "475";

        }

        processingChart.update();

    });


    // =====================================
    // GRÁFICO DE STATUS
    // =====================================

    const statusCanvas = document.getElementById("statusChart");

    if (statusCanvas && window.Chart) {

        new Chart(statusCanvas, {

            type: "doughnut",

            data: {

                labels: [
                    "Aprovados",
                    "Pendentes",
                    "Rejeitados"
                ],

                datasets: [{

                    data: [72, 14, 14],

                    backgroundColor: [
                        "#23865A",
                        "#D8BA3F",
                        "#082F43"
                    ],

                    borderWidth: 3,

                    borderColor: "#FFFFFF",

                    hoverOffset: 6

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "75%",

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor: "#082F43"
                    }

                }

            }

        });

    }


    // =====================================
    // AÇÕES DOS DOCUMENTOS
    // =====================================

    const documentActions = document.querySelectorAll(".action-button");

    documentActions.forEach(function (button) {

        button.addEventListener("click", function () {

            const linha = button.closest("tr");

            const nome = linha.querySelector(".document-name strong").textContent;

            mostrarNotificacao(
                "Documento selecionado: " + nome
            );

        });

    });


    // =====================================
    // BOTÃO VER TODOS
    // =====================================

    const viewAll = document.querySelector(".view-all");

    viewAll.addEventListener("click", function (event) {

        event.preventDefault();

        mostrarNotificacao(
            "A listagem completa será apresentada no módulo Documentos."
        );

    });


    console.log("S.E.D.A. Dashboard carregado com sucesso!");

});
