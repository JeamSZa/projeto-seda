document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const totalCount = $("totalCount");
    const approvedCount = $("approvedCount");
    const rejectedCount = $("rejectedCount");
    const pendingCount = $("pendingCount");
    const errorCount = $("errorCount");
    const periodFilter = $("periodFilter");
    const clientFilter = $("clientFilter");
    const statusFilter = $("statusFilter");
    const tableBody = $("reportTableBody");
    const emptyState = $("emptyState");
    const resultCount = $("resultCount");
    const resultDescription = $("resultDescription");
    let documents = [];
    let filteredDocuments = [];
    let documentsChart = null;
    let approvalChart = null;

    $("currentDate").textContent = new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    function getFields(doc) {
        return sedaFieldMap(doc.fields);
    }

    function fieldValue(doc, key) {
        return getFields(doc)[key]?.value || "";
    }

    function getDate(doc) {
        const date = new Date(doc.uploaded_at);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function filterByPeriod(list) {
        if (periodFilter.value === "all") return [...list];
        const days = Number(periodFilter.value);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date();
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
        return list.filter(doc => {
            const date = getDate(doc);
            return date && date >= start && date <= end;
        });
    }

    function countStatuses(list) {
        return list.reduce((counts, doc) => {
            counts.total += 1;
            counts[doc.status] = (counts[doc.status] || 0) + 1;
            return counts;
        }, { total: 0, approved: 0, rejected: 0, review: 0, error: 0 });
    }

    function updateIndicators(counts) {
        totalCount.textContent = counts.total;
        approvedCount.textContent = counts.approved;
        rejectedCount.textContent = counts.rejected;
        pendingCount.textContent = counts.review;
        errorCount.textContent = counts.error;
    }

    function updateCharts(counts) {
        if (!window.Chart) {
            sedaShowPageMessage("Os dados foram carregados, mas os gráficos não estão disponíveis porque o Chart.js não foi carregado.");
            return;
        }
        const statusValues = [
            counts.approved,
            counts.review,
            counts.rejected,
            counts.error
        ];
        if (documentsChart) documentsChart.destroy();
        documentsChart = new Chart($("documentsChart"), {
            type: "bar",
            data: {
                labels: ["Aprovados", "Pendentes", "Rejeitados", "Erros"],
                datasets: [{
                    data: statusValues,
                    backgroundColor: ["#1db47a", "#f3c52f", "#fa806e", "#8c4141"],
                    borderRadius: 5,
                    maxBarThickness: 65
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });

        if (approvalChart) approvalChart.destroy();
        const completed = counts.approved + counts.rejected + counts.error;
        const approvalRate = completed
            ? Math.round((counts.approved / completed) * 100)
            : 0;
        $("approvalRate").textContent = `${approvalRate}%`;
        $("approvedLegend").textContent = `${counts.approved}`;
        $("rejectedLegend").textContent = `${counts.rejected}`;
        $("pendingLegend").textContent = `${counts.review}`;
        $("errorLegend").textContent = `${counts.error}`;
        approvalChart = new Chart($("approvalChart"), {
            type: "doughnut",
            data: {
                labels: ["Aprovados", "Rejeitados", "Pendentes", "Erros"],
                datasets: [{
                    data: counts.total
                        ? statusValues
                        : [1],
                    backgroundColor: counts.total
                        ? ["#1db47a", "#fa806e", "#f3c52f", "#8c4141"]
                        : ["#e9eef1"],
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "72%",
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: counts.total > 0 }
                }
            }
        });
    }

    function populateClients() {
        const selected = clientFilter.value;
        const clients = [...new Set(
            documents.map(doc => fieldValue(doc, "cliente").trim()).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, "pt-BR"));
        clientFilter.replaceChildren(new Option("Todos os clientes", "all"));
        clients.forEach(client => {
            const option = new Option(client, client);
            clientFilter.appendChild(option);
        });
        if (clients.includes(selected)) clientFilter.value = selected;
    }

    function applyFilters() {
        let result = filterByPeriod(documents);
        if (clientFilter.value !== "all") {
            result = result.filter(doc => fieldValue(doc, "cliente") === clientFilter.value);
        }
        if (statusFilter.value !== "all") {
            result = result.filter(doc => doc.status === statusFilter.value);
        }
        filteredDocuments = result;
        renderTable();
        resultCount.textContent =
            `${result.length} ${result.length === 1 ? "registro" : "registros"}`;
        resultDescription.textContent =
            `Consulta realizada em ${new Date().toLocaleDateString("pt-BR")}.`;
    }

    function renderTable() {
        tableBody.replaceChildren();
        emptyState.hidden = filteredDocuments.length > 0;
        filteredDocuments.forEach(doc => {
            const row = document.createElement("tr");
            const values = [
                doc.filename,
                fieldValue(doc, "cliente") || "Não informado",
                sedaFormatCurrency(fieldValue(doc, "valor_total")),
                sedaStatusLabel(doc.status),
                sedaFormatDate(doc.uploaded_at, true)
            ];
            values.forEach((value, index) => {
                const cell = document.createElement("td");
                if (index === 0) cell.className = "document-name";
                if (index === 3) {
                    const badge = document.createElement("span");
                    const statusClass = ({
                        approved: "status-aprovado",
                        rejected: "status-rejeitado",
                        review: "status-pendente",
                        error: "status-rejeitado"
                    })[doc.status] || "status-pendente";
                    badge.className = `status-badge ${statusClass}`;
                    badge.textContent = value;
                    cell.appendChild(badge);
                } else {
                    cell.textContent = value;
                }
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    }

    function updateDashboard() {
        const periodDocuments = filterByPeriod(documents);
        updateIndicators(countStatuses(periodDocuments));
        updateCharts(countStatuses(periodDocuments));
        applyFilters();
    }

    function exportReport() {
        if (!filteredDocuments.length) {
            sedaShowPageMessage("Não existem documentos para exportar com os filtros selecionados.");
            return;
        }
        const rows = [
            [
                "Documento", "Cliente", "CPF/CNPJ", "Período",
                "Instituição financeira", "Valor", "Status",
                "Data de envio", "Observações", "Justificativa"
            ],
            ...filteredDocuments.map(doc => [
                doc.filename,
                fieldValue(doc, "cliente"),
                fieldValue(doc, "documento"),
                fieldValue(doc, "periodo"),
                fieldValue(doc, "instituicao"),
                fieldValue(doc, "valor_total"),
                sedaStatusLabel(doc.status),
                sedaFormatDate(doc.uploaded_at, true),
                fieldValue(doc, "observacoes"),
                fieldValue(doc, "justificativa_rejeicao")
            ])
        ];
        sedaDownload(
            URL.createObjectURL(new Blob([sedaCsv(rows)], { type: "text/csv;charset=utf-8" })),
            "relatorio_seda.csv"
        );
    }

    async function loadDocuments() {
        try {
            documents = await sedaGetDocuments(true);
            sedaClearPageError();
            populateClients();
            updateDashboard();
        } catch (error) {
            documents = [];
            filteredDocuments = [];
            updateDashboard();
            sedaShowPageError(error.message);
        }
    }

    document.querySelectorAll(".period-btn").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".period-btn").forEach(item => {
                item.classList.toggle("active", item === button);
            });
            periodFilter.value = button.dataset.period;
            updateDashboard();
        });
    });
    $("generateButton").addEventListener("click", updateDashboard);
    periodFilter.addEventListener("change", () => {
        document.querySelectorAll(".period-btn").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.period === periodFilter.value
            );
        });
        updateDashboard();
    });
    clientFilter.addEventListener("change", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
    $("exportButton").addEventListener("click", exportReport);
    $("notificationButton").addEventListener("click", () => {
        sedaShowPageMessage("Relatórios atualizados com os dados armazenados na API.");
    });

    const sidebar = $("sidebar");
    const overlay = $("sidebarOverlay");
    $("menuToggle").addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
    });
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    });

    loadDocuments();
});
