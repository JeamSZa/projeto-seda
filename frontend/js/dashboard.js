document.addEventListener("DOMContentLoaded", function () {
    const currentDate = document.getElementById("currentDate");
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const toast = new bootstrap.Toast(document.getElementById("appToast"), {
        delay: 3000
    });
    const toastMessage = document.getElementById("toastMessage");
    const chartPeriod = document.getElementById("chartPeriod");
    const chartTotal = document.getElementById("chartTotal");
    const periodButton = document.getElementById("periodButton");
    const documentTable = document.getElementById("documentTable");
    let monthlyData = [];
    let processingChart = null;
    let statusChart = null;

    function notify(message) {
        toastMessage.textContent = message;
        toast.show();
    }

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Data desconhecida";
        return date.toLocaleDateString("pt-BR") + " às " +
            date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });
    }

    function formatSize(size) {
        return `${(Number(size || 0) / (1024 * 1024))
            .toFixed(2).replace(".", ",")} MB`;
    }

    function fileType(filename) {
        const extension = filename.split(".").pop().toUpperCase();
        return extension === "JPEG" ? "JPG" : extension;
    }

    function renderRecentDocuments(documents) {
        documentTable.replaceChildren();
        documents.forEach(function (doc) {
            const type = fileType(doc.filename);
            const isPdf = type === "PDF";
            const statusClass = doc.status === "approved"
                ? "approved-badge"
                : doc.status === "review"
                    ? "pending-badge"
                    : "rejected-badge";
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div class="document-name">
                        <div class="document-icon ${isPdf ? "pdf-icon" : "image-icon"}">
                            <i class="bi ${isPdf ? "bi-file-earmark-pdf" : "bi-file-earmark-image"}"></i>
                        </div>
                        <div><strong></strong><span>${formatSize(doc.size)}</span></div>
                    </div>
                </td>
                <td>${type}</td>
                <td>${formatDate(doc.uploaded_at)}</td>
                <td><span class="status-badge ${statusClass}">
                    <span></span>${sedaStatusLabel(doc.status)}
                </span></td>
                <td>
                    <a class="action-button" title="Conferir documento"
                        aria-label="Conferir documento"
                        href="./conferencia.html?document=${encodeURIComponent(doc.id)}">
                        <i class="bi bi-eye"></i>
                    </a>
                </td>`;
            row.querySelector("strong").textContent = doc.filename;
            documentTable.appendChild(row);
        });
        const footer = document.querySelector(".table-bottom span");
        footer.textContent =
            `Exibindo ${documents.length} documento(s) recente(s)`;
    }

    function updateProcessingChart() {
        if (!processingChart) return;
        const count = Number(chartPeriod.value);
        const selected = monthlyData.slice(-count);
        const labels = selected.map(item => {
            const [year, month] = item.month.split("-");
            return new Date(Number(year), Number(month) - 1, 1)
                .toLocaleDateString("pt-BR", { month: "short" });
        });
        const values = selected.map(item => item.count);
        processingChart.data.labels = labels;
        processingChart.data.datasets[0].data = values;
        processingChart.data.datasets[0].backgroundColor = values.map(
            (_, index) => index === values.length - 1 ? "#082F43" : "#D8BA3F"
        );
        chartTotal.textContent = values.reduce((sum, value) => sum + value, 0);
        processingChart.update();
    }

    function updateStatusChart(counts) {
        const total = counts.total || 0;
        const approved = counts.approved || 0;
        const pending = counts.review || 0;
        const rejected = (counts.rejected || 0) + (counts.error || 0);
        document.getElementById("statusTotal").textContent = total;
        document.getElementById("approvedPercent").textContent =
            `${total ? Math.round(approved / total * 100) : 0}%`;
        document.getElementById("pendingPercent").textContent =
            `${total ? Math.round(pending / total * 100) : 0}%`;
        document.getElementById("rejectedPercent").textContent =
            `${total ? Math.round(rejected / total * 100) : 0}%`;
        if (statusChart) {
            statusChart.data.datasets[0].data = [approved, pending, rejected];
            statusChart.update();
        }
    }

    function initializeCharts() {
        if (!window.Chart) return;
        processingChart = new Chart(
            document.getElementById("processingChart"),
            {
                type: "bar",
                data: {
                    labels: [],
                    datasets: [{
                        label: "Documentos enviados",
                        data: [],
                        backgroundColor: [],
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 28
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "#082F43",
                            titleFont: { size: 11 },
                            bodyFont: { size: 10 },
                            padding: 10
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { color: "#8797A1", font: { size: 10 } }
                        },
                        y: {
                            beginAtZero: true,
                            border: { display: false },
                            grid: { color: "#EDF1F3" },
                            ticks: { color: "#98A5AC", font: { size: 9 } }
                        }
                    }
                }
            }
        );
        statusChart = new Chart(
            document.getElementById("statusChart"),
            {
                type: "doughnut",
                data: {
                    labels: ["Aprovados", "Pendentes", "Rejeitados"],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ["#23865A", "#D8BA3F", "#082F43"],
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
                        legend: { display: false },
                        tooltip: { backgroundColor: "#082F43" }
                    }
                }
            }
        );
    }

    async function loadDashboard() {
        try {
            const summary = await sedaRequest("/dashboard/summary");
            const counts = summary.counts;
            document.getElementById("menuDocumentCount").textContent =
                counts.total;
            document.getElementById("menuPendingCount").textContent =
                counts.review;
            document.getElementById("totalDocumentsMetric").textContent =
                counts.total;
            document.getElementById("pendingDocumentsMetric").textContent =
                counts.review;
            document.getElementById("approvedDocumentsMetric").textContent =
                counts.approved;
            document.getElementById("rejectedDocumentsMetric").textContent =
                counts.rejected + counts.error;
            monthlyData = summary.monthly;
            updateProcessingChart();
            updateStatusChart(counts);
            renderRecentDocuments(summary.recent_documents);
        } catch (error) {
            notify(`Não foi possível carregar o dashboard: ${error.message}`);
        }
    }

    currentDate.textContent = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    documentTable.replaceChildren();
    initializeCharts();
    loadDashboard();

    menuToggle.addEventListener("click", function () {
        sidebar.classList.toggle("open");
    });

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

    document.getElementById("notificationButton")
        .addEventListener("click", function () {
            notify("Dados do dashboard carregados do servidor.");
        });

    chartPeriod.addEventListener("change", updateProcessingChart);
    periodButton.addEventListener("click", function () {
        chartPeriod.value = chartPeriod.value === "6" ? "4" : "6";
        periodButton.innerHTML = `
            <i class="bi bi-calendar-range"></i>
            Últimos ${chartPeriod.value} meses
            <i class="bi bi-chevron-down"></i>`;
        updateProcessingChart();
    });

    document.querySelectorAll(".sidebar-nav .nav-item")
        .forEach(function (link) {
            link.addEventListener("click", function (event) {
                if (link.getAttribute("href") === "#") {
                    event.preventDefault();
                    const name = link.querySelector("span").textContent.trim();
                    notify(`O módulo ${name} será desenvolvido nas próximas etapas.`);
                }
                if (window.innerWidth <= 900) {
                    sidebar.classList.remove("open");
                }
            });
        });
});
