
document.addEventListener("DOMContentLoaded", () => {

    const STORAGE_KEY = "seda_conference_documents";

    const totalCount = document.getElementById("totalCount");
    const approvedCount = document.getElementById("approvedCount");
    const rejectedCount = document.getElementById("rejectedCount");
    const pendingCount = document.getElementById("pendingCount");

    const periodFilter = document.getElementById("periodFilter");
    const clientFilter = document.getElementById("clientFilter");
    const statusFilter = document.getElementById("statusFilter");

    const reportTableBody = document.getElementById("reportTableBody");
    const emptyState = document.getElementById("emptyState");
    const resultCount = document.getElementById("resultCount");
    const resultDescription = document.getElementById("resultDescription");

    let documents = [];
    let filteredDocuments = [];
    let documentsChart = null;
    let approvalChart = null;

    // DATA ATUAL
    const currentDate = document.getElementById("currentDate");

    currentDate.textContent = new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    // CARREGA OS DOCUMENTOS DA CONFERÊNCIA
    function loadDocuments() {
        try {
            const savedDocuments = localStorage.getItem(STORAGE_KEY);
            documents = savedDocuments ? JSON.parse(savedDocuments) : [];

            if (!Array.isArray(documents)) {
                documents = [];
            }
        } catch (error) {
            console.error("Erro ao carregar documentos:", error);
            documents = [];
        }
    }

    // NORMALIZA O STATUS
    function normalizeStatus(status) {
        const value = String(status || "").trim().toLowerCase();

        if (value.includes("aprov")) return "aprovado";
        if (value.includes("rejeit") || value.includes("recus")) return "rejeitado";

        return "pendente";
    }

    function getStatusLabel(status) {
        const normalized = normalizeStatus(status);

        if (normalized === "aprovado") return "Aprovado";
        if (normalized === "rejeitado") return "Rejeitado";

        return "Pendente";
    }

    // CONVERTE DATAS SALVAS
    function getDocumentDate(document) {
        const dateValue =
            document.date ||
            document.createdAt ||
            document.processedAt ||
            document.processingDate;

        if (!dateValue) return null;

        const parsedDate = new Date(dateValue);

        if (Number.isNaN(parsedDate.getTime())) return null;

        return parsedDate;
    }

    function formatDate(document) {
        const date = getDocumentDate(document);

        if (!date) return "Não registrada";

        return date.toLocaleDateString("pt-BR");
    }

    // FORMATA VALORES
    function formatCurrency(value) {
        if (value === null || value === undefined || value === "") {
            return "Não informado";
        }

        if (typeof value === "number") {
            return value.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });
        }

        const cleaned = String(value).trim();

        if (!cleaned) return "Não informado";

        // Se já estiver formatado, preserva o valor.
        if (cleaned.includes("R$")) return cleaned;

        const numberValue = Number(
            cleaned.replace(/\./g, "").replace(",", ".")
        );

        if (Number.isNaN(numberValue)) return cleaned;

        return numberValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    // FILTRO POR PERÍODO
    function filterByPeriod(list, period) {
        if (period === "all") return [...list];

        const days = Number(period);

        if (!days) return [...list];

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const startDate = new Date();
        startDate.setDate(today.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        return list.filter(document => {
            const date = getDocumentDate(document);

            // Documentos antigos sem data continuam aparecendo.
            if (!date) return true;

            return date >= startDate && date <= today;
        });
    }

    // CONTADORES
    function getCounts(list) {
        return {
            total: list.length,
            approved: list.filter(doc => normalizeStatus(doc.status) === "aprovado").length,
            rejected: list.filter(doc => normalizeStatus(doc.status) === "rejeitado").length,
            pending: list.filter(doc => normalizeStatus(doc.status) === "pendente").length
        };
    }

    function updateIndicators(list) {
        const counts = getCounts(list);

        totalCount.textContent = counts.total;
        approvedCount.textContent = counts.approved;
        rejectedCount.textContent = counts.rejected;
        pendingCount.textContent = counts.pending;

        return counts;
    }

    // GRÁFICO DE BARRAS
    function updateDocumentsChart(counts) {
        const canvas = document.getElementById("documentsChart");

        if (documentsChart) {
            documentsChart.destroy();
        }

        documentsChart = new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["Total", "Aprovados", "Rejeitados", "Pendentes"],
                datasets: [{
                    data: [
                        counts.total,
                        counts.approved,
                        counts.rejected,
                        counts.pending
                    ],
                    backgroundColor: [
                        "#2875ae",
                        "#1db47a",
                        "#fa806e",
                        "#f3c52f"
                    ],
                    borderRadius: 5,
                    maxBarThickness: 65
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        },
                        grid: {
                            color: "#edf1f4"
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO DE APROVAÇÃO
    function updateApprovalChart(counts) {
        const canvas = document.getElementById("approvalChart");

        if (approvalChart) {
            approvalChart.destroy();
        }

        const total = counts.total;
        const approvalRate = total
            ? Math.round((counts.approved / total) * 100)
            : 0;

        const rejectedRate = total
            ? Math.round((counts.rejected / total) * 100)
            : 0;

        const pendingRate = total
            ? Math.round((counts.pending / total) * 100)
            : 0;

        document.getElementById("approvalRate").textContent = approvalRate + "%";

        document.getElementById("approvedLegend").textContent =
            `${counts.approved} (${approvalRate}%)`;

        document.getElementById("rejectedLegend").textContent =
            `${counts.rejected} (${rejectedRate}%)`;

        document.getElementById("pendingLegend").textContent =
            `${counts.pending} (${pendingRate}%)`;

        approvalChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: ["Aprovados", "Rejeitados", "Pendentes"],
                datasets: [{
                    data: total
                        ? [counts.approved, counts.rejected, counts.pending]
                        : [1],
                    backgroundColor: total
                        ? ["#1db47a", "#fa806e", "#f3c52f"]
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
                    tooltip: {
                        enabled: total > 0
                    }
                }
            }
        });
    }

    // ATUALIZA OS GRÁFICOS E INDICADORES
    function updateDashboard() {
        const periodDocuments = filterByPeriod(documents, periodFilter.value);
        const counts = updateIndicators(periodDocuments);

        updateDocumentsChart(counts);
        updateApprovalChart(counts);

        applyDetailedFilters();
    }

    // PREENCHE A LISTA DE CLIENTES
    function populateClients() {
        const clients = [...new Set(
            documents
                .map(doc => String(doc.client || "").trim())
                .filter(client => client)
        )];

        clientFilter.innerHTML = '<option value="all">Todos os clientes</option>';

        clients.sort((a, b) => a.localeCompare(b, "pt-BR"));

        clients.forEach(client => {
            const option = document.createElement("option");
            option.value = client;
            option.textContent = client;
            clientFilter.appendChild(option);
        });
    }

    // APLICA OS FILTROS DA TABELA
    function applyDetailedFilters() {
        let result = filterByPeriod(documents, periodFilter.value);

        if (clientFilter.value !== "all") {
            result = result.filter(doc => doc.client === clientFilter.value);
        }

        if (statusFilter.value !== "all") {
            result = result.filter(doc =>
                normalizeStatus(doc.status) === statusFilter.value
            );
        }

        filteredDocuments = result;

        renderTable(filteredDocuments);

        resultCount.textContent =
            `${filteredDocuments.length} ${filteredDocuments.length === 1 ? "registro" : "registros"}`;

        resultDescription.textContent =
            `Consulta realizada em ${new Date().toLocaleDateString("pt-BR")}.`;
    }

    // MOSTRA OS DOCUMENTOS NA TABELA
    function renderTable(list) {
        reportTableBody.innerHTML = "";

        if (list.length === 0) {
            emptyState.hidden = false;
            return;
        }

        emptyState.hidden = true;

        list.forEach(document => {
            const status = normalizeStatus(document.status);
            const row = document.createElement("tr");

            const values = [
                document.name || "Documento sem nome",
                document.client || "Não informado",
                formatCurrency(document.value),
                getStatusLabel(status),
                formatDate(document)
            ];

            values.forEach((value, index) => {
                const cell = document.createElement("td");

                if (index === 0) {
                    cell.className = "document-name";
                }

                if (index === 3) {
                    const badge = document.createElement("span");
                    badge.className = `status-badge status-${status}`;
                    badge.textContent = value;
                    cell.appendChild(badge);
                } else {
                    cell.textContent = value;
                }

                row.appendChild(cell);
            });

            reportTableBody.appendChild(row);
        });
    }

    // EXPORTAÇÃO CSV PARA EXCEL
    function exportReport() {
        if (filteredDocuments.length === 0) {
            alert("Não existem documentos para exportar com os filtros selecionados.");
            return;
        }

        const headers = [
            "Documento",
            "Cliente",
            "Número",
            "Período",
            "Banco",
            "Valor",
            "Status",
            "Data",
            "Observações"
        ];

        const rows = filteredDocuments.map(document => [
            document.name || "",
            document.client || "",
            document.number || "",
            document.period || "",
            document.bank || "",
            document.value || "",
            getStatusLabel(document.status),
            formatDate(document),
            document.observations || ""
        ]);

        function escapeCSV(value) {
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
        }

        const csvContent = [
            headers.map(escapeCSV).join(";"),
            ...rows.map(row => row.map(escapeCSV).join(";"))
        ].join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "relatorio_seda.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // BOTÕES DE PERÍODO DO GRÁFICO
    document.querySelectorAll(".period-btn").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".period-btn").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            periodFilter.value = button.dataset.period;

            updateDashboard();
        });
    });

    // FILTROS
    document.getElementById("generateButton").addEventListener("click", () => {
        updateDashboard();
    });

    periodFilter.addEventListener("change", () => {
        document.querySelectorAll(".period-btn").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.period === periodFilter.value
            );
        });

        updateDashboard();
    });

    clientFilter.addEventListener("change", applyDetailedFilters);
    statusFilter.addEventListener("change", applyDetailedFilters);

    // EXPORTAR
    document.getElementById("exportButton").addEventListener("click", exportReport);

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

    // INICIALIZAÇÃO
    loadDocuments();
    populateClients();
    updateDashboard();

});
