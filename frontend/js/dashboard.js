document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const toast = new bootstrap.Toast($("appToast"), { delay: 4000 });
    const chartPeriod = $("chartPeriod");
    const monthData = [];
    let processingChart = null;
    let statusChart = null;

    $("currentDate").textContent = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    function notify(message) {
        $("toastMessage").textContent = message;
        toast.show();
    }

    function updateProcessingChart() {
        if (!processingChart) return;
        const selected = monthData.slice(-Number(chartPeriod.value));
        processingChart.data.labels = selected.map(item => item.label);
        processingChart.data.datasets[0].data = selected.map(item => item.count);
        processingChart.data.datasets[0].backgroundColor = selected.map(
            (_, index) => index === selected.length - 1 ? "#082F43" : "#D8BA3F"
        );
        $("chartTotal").textContent = selected.reduce(
            (total, item) => total + item.count,
            0
        );
        processingChart.update();
    }

    function initializeCharts() {
        if (!window.Chart) {
            notify("Não foi possível carregar os gráficos. Verifique a conexão com a biblioteca Chart.js.");
            return;
        }
        processingChart = new Chart($("processingChart"), {
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
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, border: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        border: { display: false },
                        grid: { color: "#EDF1F3" }
                    }
                }
            }
        });
        statusChart = new Chart($("statusChart"), {
            type: "doughnut",
            data: {
                labels: ["Aprovados", "Pendentes", "Rejeitados", "Erros"],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ["#23865A", "#D8BA3F", "#082F43", "#D9534F"],
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
        });
    }

    function createRecentRow(doc) {
        const row = document.createElement("tr");
        const extension = doc.filename.split(".").pop().toUpperCase();
        const fileCell = document.createElement("td");
        const fileInfo = document.createElement("div");
        fileInfo.className = "document-name";
        const icon = document.createElement("div");
        icon.className = `document-icon ${extension === "PDF" ? "pdf-icon" : "image-icon"}`;
        const iconGlyph = document.createElement("i");
        iconGlyph.className = `bi ${extension === "PDF" ? "bi-file-earmark-pdf" : "bi-file-earmark-image"}`;
        icon.appendChild(iconGlyph);
        const text = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = doc.filename;
        const size = document.createElement("span");
        size.textContent = sedaFormatBytes(doc.size);
        text.append(name, size);
        fileInfo.append(icon, text);
        fileCell.appendChild(fileInfo);
        row.appendChild(fileCell);

        for (const value of [
            extension,
            sedaFormatDate(doc.uploaded_at, true)
        ]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        const statusClass = ({
            approved: "approved-badge",
            review: "pending-badge",
            rejected: "rejected-badge",
            error: "rejected-badge"
        })[doc.status] || "pending-badge";
        status.className = `status-badge ${statusClass}`;
        const dot = document.createElement("span");
        status.append(dot, document.createTextNode(sedaStatusLabel(doc.status)));
        statusCell.appendChild(status);
        row.appendChild(statusCell);

        const actions = document.createElement("td");
        const review = document.createElement("a");
        review.className = "action-button";
        review.title = "Conferir documento";
        review.href = `./conferencia.html?id=${encodeURIComponent(doc.id)}`;
        review.innerHTML = '<i class="bi bi-pencil-square"></i>';
        actions.appendChild(review);
        row.appendChild(actions);
        return row;
    }

    async function loadDashboard() {
        try {
            const summary = await sedaRequest("/dashboard/summary");
            sedaClearPageError();
            const counts = summary.counts;
            $("dashboardTotal").textContent = counts.total;
            $("dashboardPending").textContent = counts.review;
            $("dashboardApproved").textContent = counts.approved;
            $("dashboardRejected").textContent = counts.rejected + counts.error;
            $("statusTotal").textContent = counts.total;
            $("statusApproved").textContent = counts.approved;
            $("statusPending").textContent = counts.review;
            $("statusRejected").textContent = counts.rejected;
            $("statusErrors").textContent = counts.error;

            monthData.splice(0, monthData.length, ...summary.monthly.map(item => {
                const [year, month] = item.month.split("-").map(Number);
                const date = new Date(year, month - 1, 1);
                return {
                    label: date.toLocaleDateString("pt-BR", { month: "short" }),
                    count: item.count
                };
            }));

            $("documentTable").replaceChildren(
                ...summary.recent_documents.map(createRecentRow)
            );
            $("recentCount").textContent =
                `Exibindo ${summary.recent_documents.length} documentos recentes`;

            initializeCharts();
            if (statusChart) {
                statusChart.data.datasets[0].data = [
                    counts.approved,
                    counts.review,
                    counts.rejected,
                    counts.error
                ];
                statusChart.update();
            }
            updateProcessingChart();
        } catch (error) {
            $("documentTable").replaceChildren();
            $("recentCount").textContent = "Não foi possível carregar os documentos.";
            sedaShowPageError(error.message);
        }
    }

    chartPeriod.addEventListener("change", updateProcessingChart);
    $("periodButton").addEventListener("click", () => {
        chartPeriod.value = chartPeriod.value === "6" ? "4" : "6";
        chartPeriod.dispatchEvent(new Event("change"));
        $("periodButton").querySelector("span").textContent =
            `Últimos ${chartPeriod.value} meses`;
    });
    $("notificationButton").addEventListener("click", () => {
        notify("Dashboard atualizado com os dados do banco.");
    });
    $("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    document.addEventListener("click", event => {
        const sidebar = $("sidebar");
        if (
            window.innerWidth <= 900 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !$("menuToggle").contains(event.target)
        ) sidebar.classList.remove("open");
    });

    loadDashboard();
});
