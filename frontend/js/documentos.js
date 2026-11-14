document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const fileInput = $("fileInput");
    const uploadZone = $("uploadZone");
    const tableBody = $("documentsTableBody");
    const searchInput = $("searchInput");
    const statusFilter = $("statusFilter");
    const typeFilter = $("typeFilter");
    const uploadFeedback = $("uploadFeedback");
    const emptyState = $("emptyState");
    const previewModalElement = $("previewModal");
    const previewModal = new bootstrap.Modal(previewModalElement);
    const pdfPreview = $("pdfPreview");
    const imagePreview = $("imagePreview");
    const toast = new bootstrap.Toast($("appToast"), { delay: 4000 });
    let documents = [];

    $("currentDate").textContent = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    function notify(message) {
        $("toastMessage").textContent = message;
        toast.show();
    }

    function showFeedback(message, type) {
        uploadFeedback.textContent = message;
        uploadFeedback.className = `upload-feedback show ${type}`;
    }

    function getExtension(filename) {
        return filename.split(".").pop().toUpperCase();
    }

    function getFileIcon(type) {
        return type === "PDF"
            ? "bi-file-earmark-pdf"
            : "bi-file-earmark-image";
    }

    function getStatusClass(status) {
        return ({
            approved: "processed",
            review: "pending",
            rejected: "error",
            error: "error"
        })[status] || "pending";
    }

    function updateMetrics() {
        const counts = documents.reduce((result, doc) => {
            result.total += 1;
            result[doc.status] = (result[doc.status] || 0) + 1;
            return result;
        }, { total: 0 });

        $("totalDocuments").textContent = counts.total;
        $("pendingDocuments").textContent = counts.review || 0;
        $("approvedDocuments").textContent = counts.approved || 0;
        $("errorDocuments").textContent = (counts.error || 0) + (counts.rejected || 0);
        $("menuDocumentCount").textContent = counts.total;
    }

    function createAction(icon, title, action, id, destructive = false) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `file-action ${destructive ? "delete" : ""}`;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.dataset.action = action;
        button.dataset.id = id;
        const glyph = document.createElement("i");
        glyph.className = `bi ${icon}`;
        button.appendChild(glyph);
        return button;
    }

    function renderDocuments() {
        const search = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        const selectedStatus = statusFilter.value;
        const selectedType = typeFilter.value;
        const filtered = documents.filter(doc => (
            doc.filename.toLocaleLowerCase("pt-BR").includes(search) &&
            (selectedStatus === "todos" || doc.status === selectedStatus) &&
            (selectedType === "todos" || getExtension(doc.filename) === selectedType)
        ));

        tableBody.replaceChildren();
        filtered.forEach(doc => {
            const row = document.createElement("tr");
            const fileCell = document.createElement("td");
            const fileContainer = document.createElement("div");
            fileContainer.className = "file-cell";

            const icon = document.createElement("div");
            icon.className = `file-icon ${getExtension(doc.filename).toLowerCase()}`;
            const glyph = document.createElement("i");
            glyph.className = `bi ${getFileIcon(getExtension(doc.filename))}`;
            icon.appendChild(glyph);

            const details = document.createElement("div");
            details.className = "file-details";
            const name = document.createElement("strong");
            name.textContent = doc.filename;
            const description = document.createElement("span");
            description.textContent = doc.ocr_error
                ? "OCR indisponível — revisão manual"
                : "Documento financeiro";
            details.append(name, description);
            fileContainer.append(icon, details);
            fileCell.appendChild(fileContainer);
            row.appendChild(fileCell);

            for (const value of [
                getExtension(doc.filename),
                sedaFormatDate(doc.uploaded_at, true),
                sedaFormatBytes(doc.size)
            ]) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }

            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            status.className = `file-status ${getStatusClass(doc.status)}`;
            status.textContent = sedaStatusLabel(doc.status);
            statusCell.appendChild(status);
            row.appendChild(statusCell);

            const actionsCell = document.createElement("td");
            actionsCell.className = "text-end";
            const actions = document.createElement("div");
            actions.className = "file-actions";
            actions.append(
                createAction("bi-eye", "Visualizar documento", "preview", doc.id),
                createAction("bi-pencil", "Conferir documento", "review", doc.id),
                createAction("bi-file-earmark-spreadsheet", "Exportar Excel", "export", doc.id),
                createAction("bi-trash", "Excluir documento", "delete", doc.id, true)
            );
            actionsCell.appendChild(actions);
            row.appendChild(actionsCell);
            tableBody.appendChild(row);
        });

        emptyState.hidden = filtered.length !== 0;
        $("tableCounter").textContent =
            `Exibindo ${filtered.length} de ${documents.length} documentos`;
        updateMetrics();
    }

    async function loadDocuments() {
        try {
            documents = await sedaGetDocuments();
            renderDocuments();
        } catch (error) {
            showFeedback(error.message, "error");
            $("tableCounter").textContent = "Não foi possível carregar os documentos.";
        }
    }

    async function handleFiles(files) {
        const accepted = [];
        const rejected = [];
        for (const file of Array.from(files)) {
            if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
                rejected.push(`${file.name}: formato não permitido.`);
            } else if (!file.size || file.size > 10 * 1024 * 1024) {
                rejected.push(`${file.name}: o arquivo precisa ter até 10 MB.`);
            } else {
                accepted.push(file);
            }
        }

        let uploaded = 0;
        for (const file of accepted) {
            try {
                await sedaUploadDocument(file);
                uploaded += 1;
            } catch (error) {
                rejected.push(`${file.name}: ${error.message}`);
            }
        }

        fileInput.value = "";
        await loadDocuments();
        if (uploaded && !rejected.length) {
            showFeedback(
                `${uploaded} arquivo(s) enviado(s) e processado(s) pela API.`,
                "success"
            );
            notify("Upload concluído.");
        } else if (uploaded) {
            showFeedback(
                `${uploaded} arquivo(s) enviado(s). ${rejected.join(" ")}`,
                "error"
            );
        } else {
            showFeedback(
                rejected.join(" ") || "Selecione ao menos um arquivo válido.",
                "error"
            );
        }
    }

    function openPreview(doc) {
        $("previewFileName").textContent = doc.filename;
        pdfPreview.hidden = true;
        imagePreview.hidden = true;
        if (doc.content_type === "application/pdf") {
            pdfPreview.src = sedaFileUrl(doc.id);
            pdfPreview.hidden = false;
        } else {
            imagePreview.src = sedaFileUrl(doc.id);
            imagePreview.hidden = false;
        }
        previewModal.show();
    }

    async function deleteDocument(doc) {
        if (!confirm(`Deseja realmente excluir "${doc.filename}" e o arquivo original?`)) {
            return;
        }
        try {
            await sedaRequest(`/documents/${encodeURIComponent(doc.id)}`, {
                method: "DELETE"
            });
            notify("Documento e arquivos associados excluídos.");
            await loadDocuments();
        } catch (error) {
            notify(error.message);
        }
    }

    tableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const doc = documents.find(item => item.id === button.dataset.id);
        if (!doc) return;

        switch (button.dataset.action) {
            case "preview":
                openPreview(doc);
                break;
            case "review":
                window.location.href = `./conferencia.html?id=${encodeURIComponent(doc.id)}`;
                break;
            case "export":
                sedaDownload(sedaExportUrl(doc.id), `Dados_${doc.filename.replace(/\.[^.]+$/, "")}.xlsx`);
                break;
            case "delete":
                deleteDocument(doc);
                break;
        }
    });

    $("selectFileButton").addEventListener("click", () => fileInput.click());
    $("topUploadButton").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) handleFiles(fileInput.files);
    });
    searchInput.addEventListener("input", renderDocuments);
    statusFilter.addEventListener("change", renderDocuments);
    typeFilter.addEventListener("change", renderDocuments);
    $("notificationButton").addEventListener("click", () => {
        notify("Os documentos exibidos estão sincronizados com a API.");
    });

    ["dragenter", "dragover"].forEach(name => uploadZone.addEventListener(name, event => {
        event.preventDefault();
        uploadZone.classList.add("drag-over");
    }));
    ["dragleave", "drop"].forEach(name => uploadZone.addEventListener(name, event => {
        event.preventDefault();
        uploadZone.classList.remove("drag-over");
    }));
    uploadZone.addEventListener("drop", event => {
        if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
    });

    previewModalElement.addEventListener("hidden.bs.modal", () => {
        pdfPreview.removeAttribute("src");
        imagePreview.removeAttribute("src");
        pdfPreview.hidden = true;
        imagePreview.hidden = true;
    });

    $("exportButton").addEventListener("click", () => {
        if (!documents.length) {
            notify("Não existem documentos para exportar.");
            return;
        }
        const rows = [
            ["Documento", "Formato", "Data de envio", "Tamanho (bytes)", "Status"],
            ...documents.map(doc => [
                doc.filename,
                getExtension(doc.filename),
                sedaFormatDate(doc.uploaded_at, true),
                doc.size,
                sedaStatusLabel(doc.status)
            ])
        ];
        sedaDownload(
            URL.createObjectURL(new Blob([sedaCsv(rows)], { type: "text/csv;charset=utf-8" })),
            "relatorio_documentos_seda.csv"
        );
    });

    $("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    document.addEventListener("click", event => {
        const sidebar = $("sidebar");
        if (
            window.innerWidth <= 900 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !$("menuToggle").contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }
    });

    loadDocuments();
});
