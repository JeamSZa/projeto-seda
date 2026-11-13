
document.addEventListener("DOMContentLoaded", function () {

    const $ = id => document.getElementById(id);

    const searchInput = $("searchInput");
    const statusFilter = $("statusFilter");
    const tableBody = $("historyTableBody");
    const emptyState = $("emptyState");

    const detailsModal = new bootstrap.Modal($("detailsModal"));

    // Recuperar dados salvos na Conferência
    function getDocuments() {

        try {
            return JSON.parse(
                localStorage.getItem("seda_conference_documents") || "{}"
            );
        } catch (error) {
            console.error("Erro ao recuperar histórico:", error);
            return {};
        }

    }

    let documents = getDocuments();

    // Data atual
    $("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    // Segurança para exibir textos na tabela
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    // Formatação de valores
    function formatCurrency(value) {

        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    }

    // Status
    function getStatusClass(status) {

        if (status === "Aprovado") return "status-approved";

        if (status === "Rejeitado") return "status-rejected";

        return "status-pending";

    }

    // Indicadores
    function updateStats() {

        const list = Object.values(documents);

        $("totalCount").textContent = list.length;

        $("approvedCount").textContent =
            list.filter(doc => doc.status === "Aprovado").length;

        $("rejectedCount").textContent =
            list.filter(doc => doc.status === "Rejeitado").length;

        $("pendingCount").textContent =
            list.filter(doc => doc.status === "Pendente").length;

    }

    // Renderizar tabela
    function renderTable() {

        documents = getDocuments();

        const search = searchInput.value.toLowerCase().trim();

        const status = statusFilter.value;

        const filtered = Object.entries(documents).filter(([id, doc]) => {

            const matchesSearch =
                String(doc.name || "").toLowerCase().includes(search) ||
                String(doc.client || "").toLowerCase().includes(search);

            const matchesStatus =
                status === "todos" || doc.status === status;

            return matchesSearch && matchesStatus;

        });

        tableBody.innerHTML = "";

        emptyState.hidden = filtered.length > 0;

        filtered.forEach(([id, doc]) => {

            const statusLabel = doc.status || "Pendente";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <div class="document-cell">
                        <div class="document-icon">
                            <i class="bi bi-file-earmark-pdf"></i>
                        </div>
                        <div>
                            <strong>${escapeHTML(doc.name || "Documento sem nome")}</strong>
                            <small>Registro ${escapeHTML(id)}</small>
                        </div>
                    </div>
                </td>

                <td>${escapeHTML(doc.client || "Não informado")}</td>

                <td>${formatCurrency(doc.value)}</td>

                <td>
                    <span class="status-badge ${getStatusClass(statusLabel)}">
                        ${escapeHTML(statusLabel)}
                    </span>
                </td>

                <td>Não registrada</td>

                <td>
                    <button class="details-button" data-id="${escapeHTML(id)}">
                        <i class="bi bi-eye"></i> Detalhes
                    </button>
                </td>
            `;

            tableBody.appendChild(row);

        });

        $("recordsCount").textContent =
            filtered.length + (filtered.length === 1 ? " registro" : " registros");

        $("footerCount").textContent =
            `Exibindo ${filtered.length} de ${Object.keys(documents).length} documentos`;

        updateStats();

    }

    // Abrir detalhes
    tableBody.addEventListener("click", function (event) {

        const button = event.target.closest(".details-button");

        if (!button) return;

        const doc = documents[button.dataset.id];

        if (!doc) return;

        $("detailName").textContent = doc.name || "Não informado";
        $("detailClient").textContent = doc.client || "Não informado";
        $("detailNumber").textContent = doc.number || "Não informado";
        $("detailPeriod").textContent = doc.period || "Não informado";
        $("detailBank").textContent = doc.bank || "Não informado";
        $("detailValue").textContent = formatCurrency(doc.value);
        $("detailStatus").textContent = doc.status || "Pendente";

        $("rejectionDetails").hidden = !doc.reason;
        $("detailReason").textContent = doc.reason || "";

        $("observationDetails").hidden = !doc.observations;
        $("detailObservations").textContent = doc.observations || "";

        detailsModal.show();

    });

    // Pesquisa
    searchInput.addEventListener("input", renderTable);

    // Filtro
    statusFilter.addEventListener("change", renderTable);

    // Limpar filtros
    $("clearFilters").addEventListener("click", function () {

        searchInput.value = "";
        statusFilter.value = "todos";

        renderTable();

    });

    // Exportar CSV compatível com Excel
    $("exportButton").addEventListener("click", function () {

        const list = Object.entries(getDocuments());

        if (list.length === 0) {

            alert("Não existem documentos para exportar.");

            return;

        }

        const headers = [
            "ID",
            "Documento",
            "Cliente",
            "CPF/CNPJ",
            "Período",
            "Instituição financeira",
            "Valor",
            "Status",
            "Justificativa",
            "Observações"
        ];

        function csvValue(value) {
            return '"' + String(value ?? "").replace(/"/g, '""') + '"';
        }

        const rows = list.map(([id, doc]) => [

            id,
            doc.name,
            doc.client,
            doc.number,
            doc.period,
            doc.bank,
            Number(doc.value || 0).toFixed(2),
            doc.status,
            doc.reason,
            doc.observations

        ]);

        const csvContent = [
            headers,
            ...rows
        ].map(row => row.map(csvValue).join(";")).join("\r\n");

        // BOM para compatibilidade com caracteres acentuados no Excel
        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "historico_SEDA.csv";

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    });

    // Menu responsivo
    $("menuToggle").addEventListener("click", function () {

        $("sidebar").classList.toggle("open");

    });

    document.addEventListener("click", function (event) {

        const sidebar = $("sidebar");

        if (
            window.innerWidth <= 700 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !$("menuToggle").contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }

    });

    // Inicialização
    renderTable();

    console.log("S.E.D.A. - Histórico iniciado!");

});
