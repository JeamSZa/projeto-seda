document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const searchInput = $("searchInput");
    const statusFilter = $("statusFilter");
    const tableBody = $("historyTableBody");
    const emptyState = $("emptyState");
    const detailsModal = new bootstrap.Modal($("detailsModal"));
    let documents = [];
    let filteredDocuments = [];

    $("currentDate").textContent = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    function getFields(doc) {
        return sedaFieldMap(doc.fields);
    }

    function fieldValue(doc, key) {
        return getFields(doc)[key]?.value || "";
    }

    function getStatusClass(status) {
        return ({
            approved: "status-approved",
            rejected: "status-rejected",
            error: "status-rejected",
            review: "status-pending"
        })[status] || "status-pending";
    }

    function updateStats() {
        $("totalCount").textContent = documents.length;
        $("approvedCount").textContent =
            documents.filter(doc => doc.status === "approved").length;
        $("rejectedCount").textContent =
            documents.filter(doc => doc.status === "rejected").length;
        $("pendingCount").textContent =
            documents.filter(doc => doc.status === "review").length;
    }

    function renderTable() {
        const search = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        const status = statusFilter.value;
        filteredDocuments = documents.filter(doc => {
            const client = fieldValue(doc, "cliente").toLocaleLowerCase("pt-BR");
            return (
                (doc.filename.toLocaleLowerCase("pt-BR").includes(search) ||
                    client.includes(search)) &&
                (status === "todos" || doc.status === status)
            );
        });

        tableBody.replaceChildren();
        filteredDocuments.forEach(doc => {
            const row = document.createElement("tr");
            const file = document.createElement("td");
            const name = document.createElement("strong");
            name.textContent = doc.filename;
            const id = document.createElement("small");
            id.textContent = `Registro ${doc.id}`;
            file.append(name, document.createElement("br"), id);
            row.appendChild(file);

            for (const value of [
                fieldValue(doc, "cliente") || "Não informado",
                sedaFormatCurrency(fieldValue(doc, "valor_total"))
            ]) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");
            badge.className = `status-badge ${getStatusClass(doc.status)}`;
            badge.textContent = sedaStatusLabel(doc.status);
            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            const dateCell = document.createElement("td");
            dateCell.textContent = sedaFormatDate(doc.uploaded_at, true);
            row.appendChild(dateCell);

            const actionCell = document.createElement("td");
            const detailButton = document.createElement("button");
            detailButton.type = "button";
            detailButton.className = "details-button";
            detailButton.dataset.id = doc.id;
            detailButton.textContent = "Detalhes";
            actionCell.appendChild(detailButton);
            row.appendChild(actionCell);
            tableBody.appendChild(row);
        });

        emptyState.hidden = filteredDocuments.length > 0;
        $("recordsCount").textContent =
            `${filteredDocuments.length} ${filteredDocuments.length === 1 ? "registro" : "registros"}`;
        $("footerCount").textContent =
            `Exibindo ${filteredDocuments.length} de ${documents.length} documentos`;
        updateStats();
    }

    function showDetails(doc) {
        $("detailName").textContent = doc.filename || "Não informado";
        $("detailClient").textContent = fieldValue(doc, "cliente") || "Não informado";
        $("detailNumber").textContent = fieldValue(doc, "documento") || "Não informado";
        $("detailPeriod").textContent = fieldValue(doc, "periodo") || "Não informado";
        $("detailBank").textContent = fieldValue(doc, "instituicao") || "Não informado";
        $("detailValue").textContent = sedaFormatCurrency(fieldValue(doc, "valor_total"));
        $("detailStatus").textContent = sedaStatusLabel(doc.status);

        const reason = fieldValue(doc, "justificativa_rejeicao");
        $("rejectionDetails").hidden = !reason;
        $("detailReason").textContent = reason;
        const observations = fieldValue(doc, "observacoes");
        $("observationDetails").hidden = !observations;
        $("detailObservations").textContent = observations;
        detailsModal.show();
    }

    async function loadDocuments() {
        try {
            documents = await sedaGetDocuments(true);
            sedaClearPageError();
            renderTable();
        } catch (error) {
            documents = [];
            renderTable();
            sedaShowPageError(error.message);
        }
    }

    tableBody.addEventListener("click", event => {
        const button = event.target.closest(".details-button");
        if (!button) return;
        const doc = documents.find(item => item.id === button.dataset.id);
        if (doc) showDetails(doc);
    });
    searchInput.addEventListener("input", renderTable);
    statusFilter.addEventListener("change", renderTable);
    $("clearFilters").addEventListener("click", () => {
        searchInput.value = "";
        statusFilter.value = "todos";
        renderTable();
    });

    $("exportButton").addEventListener("click", () => {
        if (!filteredDocuments.length) {
            sedaShowPageError("Não existem documentos para exportar com os filtros selecionados.");
            return;
        }
        const rows = [
            [
                "ID", "Documento", "Cliente", "CPF/CNPJ", "Período",
                "Instituição financeira", "Valor", "Status",
                "Justificativa", "Observações", "Data de envio"
            ],
            ...filteredDocuments.map(doc => [
                doc.id,
                doc.filename,
                fieldValue(doc, "cliente"),
                fieldValue(doc, "documento"),
                fieldValue(doc, "periodo"),
                fieldValue(doc, "instituicao"),
                fieldValue(doc, "valor_total"),
                sedaStatusLabel(doc.status),
                fieldValue(doc, "justificativa_rejeicao"),
                fieldValue(doc, "observacoes"),
                sedaFormatDate(doc.uploaded_at, true)
            ])
        ];
        sedaDownload(
            URL.createObjectURL(new Blob([sedaCsv(rows)], { type: "text/csv;charset=utf-8" })),
            "historico_seda.csv"
        );
    });

    $("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    document.addEventListener("click", event => {
        const sidebar = $("sidebar");
        if (
            window.innerWidth <= 700 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !$("menuToggle").contains(event.target)
        ) sidebar.classList.remove("open");
    });

    $("notificationButton").addEventListener("click", () => {
        sedaShowPageMessage("O histórico exibe os documentos armazenados no servidor.");
    });

    loadDocuments();
});
