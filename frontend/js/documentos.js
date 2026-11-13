document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("fileInput");
    const uploadZone = document.getElementById("uploadZone");
    const selectFileButton = document.getElementById("selectFileButton");
    const topUploadButton = document.getElementById("topUploadButton");
    const tableBody = document.getElementById("documentsTableBody");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const typeFilter = document.getElementById("typeFilter");
    const uploadFeedback = document.getElementById("uploadFeedback");
    const totalDocuments = document.getElementById("totalDocuments");
    const pendingDocuments = document.getElementById("pendingDocuments");
    const approvedDocuments = document.getElementById("approvedDocuments");
    const errorDocuments = document.getElementById("errorDocuments");
    const emptyState = document.getElementById("emptyState");
    const tableCounter = document.getElementById("tableCounter");
    const previewModalElement = document.getElementById("previewModal");
    const previewModal = new bootstrap.Modal(previewModalElement);
    const pdfPreview = document.getElementById("pdfPreview");
    const imagePreview = document.getElementById("imagePreview");
    const previewFileName = document.getElementById("previewFileName");
    const toastElement = document.getElementById("appToast");
    const toastMessage = document.getElementById("toastMessage");
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");

    let documents = [];
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];

    function notify(message) {
        toastMessage.textContent = message;
        toast.show();
    }

    function showFeedback(message, type) {
        uploadFeedback.textContent = message;
        uploadFeedback.className = `upload-feedback show ${type}`;
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

    function getFileType(filename) {
        const extension = filename.split(".").pop().toUpperCase();
        return extension === "JPEG" ? "JPG" : extension;
    }

    function getFileIcon(type) {
        if (type === "PDF") return "bi-file-earmark-pdf";
        if (["JPG", "JPEG", "PNG"].includes(type)) {
            return "bi-file-earmark-image";
        }
        return "bi-file-earmark";
    }

    function getStatusHTML(status) {
        const label = sedaStatusLabel(status);
        if (status === "approved") {
            return `<span class="file-status processed">
                <i class="bi bi-check-circle-fill"></i>${label}
            </span>`;
        }
        if (status === "review") {
            return `<span class="file-status pending">
                <i class="bi bi-clock-fill"></i>${label}
            </span>`;
        }
        return `<span class="file-status error">
            <i class="bi bi-exclamation-circle-fill"></i>${label}
        </span>`;
    }

    function updateMetrics() {
        totalDocuments.textContent = documents.length;
        pendingDocuments.textContent = documents.filter(
            doc => doc.status === "review"
        ).length;
        approvedDocuments.textContent = documents.filter(
            doc => doc.status === "approved"
        ).length;
        errorDocuments.textContent = documents.filter(
            doc => ["rejected", "error"].includes(doc.status)
        ).length;
        document.getElementById("menuDocumentCount").textContent =
            documents.length;
    }

    function renderDocuments() {
        const search = searchInput.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value;
        const selectedType = typeFilter.value;
        const filteredDocuments = documents.filter(function (doc) {
            const matchesName = doc.filename.toLowerCase().includes(search);
            const matchesStatus = selectedStatus === "todos" ||
                sedaStatusLabel(doc.status) === selectedStatus;
            const matchesType = selectedType === "todos" ||
                doc.type === selectedType;
            return matchesName && matchesStatus && matchesType;
        });

        tableBody.replaceChildren();
        filteredDocuments.forEach(function (doc) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div class="file-cell">
                        <div class="file-icon ${doc.type.toLowerCase()}">
                            <i class="bi ${getFileIcon(doc.type)}"></i>
                        </div>
                        <div class="file-details">
                            <strong></strong>
                            <span>Documento financeiro</span>
                        </div>
                    </div>
                </td>
                <td>${doc.type}</td>
                <td>${formatDate(doc.uploaded_at)}</td>
                <td>${formatSize(doc.size)}</td>
                <td>${getStatusHTML(doc.status)}</td>
                <td>
                    <div class="file-actions">
                        <button class="file-action preview-action"
                            title="Visualizar" aria-label="Visualizar documento"
                            data-id="${doc.id}">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="file-action delete delete-action"
                            title="Excluir" aria-label="Excluir documento"
                            data-id="${doc.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>`;
            row.querySelector(".file-details strong").textContent =
                doc.filename;
            tableBody.appendChild(row);
        });

        emptyState.hidden = filteredDocuments.length !== 0;
        tableCounter.textContent =
            `Exibindo ${filteredDocuments.length} de ${documents.length} documentos`;
        updateMetrics();
    }

    async function loadDocuments() {
        documents = await sedaRequest("/documents");
        documents.forEach(function (doc) {
            doc.type = getFileType(doc.filename);
        });
        renderDocuments();
    }

    searchInput.addEventListener("input", renderDocuments);
    statusFilter.addEventListener("change", renderDocuments);
    typeFilter.addEventListener("change", renderDocuments);

    function openFileSelector() {
        fileInput.click();
    }

    selectFileButton.addEventListener("click", openFileSelector);
    topUploadButton.addEventListener("click", openFileSelector);

    async function handleFiles(files) {
        let uploaded = 0;
        const errors = [];
        const ocrWarnings = [];

        for (const file of Array.from(files)) {
            const extension = `.${file.name.split(".").pop().toLowerCase()}`;
            if (
                !allowedExtensions.includes(extension) ||
                (file.type && !allowedTypes.includes(file.type))
            ) {
                errors.push(`${file.name}: formato não permitido`);
                continue;
            }
            if (file.size === 0) {
                errors.push(`${file.name}: arquivo vazio`);
                continue;
            }
            if (file.size > maxSize) {
                errors.push(`${file.name}: ultrapassa 10 MB`);
                continue;
            }

            const formData = new FormData();
            formData.append("file", file);
            try {
                const result = await sedaRequest("/documents", {
                    method: "POST",
                    body: formData
                });
                result.type = getFileType(result.filename);
                documents.unshift(result);
                uploaded += 1;
                if (result.ocr_error) {
                    ocrWarnings.push(result.filename);
                }
            } catch (error) {
                errors.push(`${file.name}: ${error.message}`);
            }
        }

        renderDocuments();
        if (uploaded > 0) {
            const message = `${uploaded} documento(s) enviado(s).` +
                (ocrWarnings.length
                    ? ` OCR indisponível em ${ocrWarnings.length} arquivo(s); revise os campos manualmente.`
                    : "");
            showFeedback(message, "success");
            notify(message);
        }
        if (errors.length > 0) {
            const message = errors.join("; ");
            showFeedback(
                uploaded ? `Enviados: ${uploaded}. Falhas: ${message}` : message,
                "error"
            );
            notify(message);
        }
        if (uploaded === 0 && errors.length === 0) {
            showFeedback("Selecione pelo menos um arquivo.", "error");
        }
        fileInput.value = "";
    }

    fileInput.addEventListener("change", function () {
        if (fileInput.files.length > 0) handleFiles(fileInput.files);
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
        uploadZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            uploadZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        uploadZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            uploadZone.classList.remove("drag-over");
        });
    });

    uploadZone.addEventListener("drop", function (event) {
        if (event.dataTransfer.files.length > 0) {
            handleFiles(event.dataTransfer.files);
        }
    });

    function previewDocument(id) {
        const doc = documents.find(item => String(item.id) === String(id));
        if (!doc) {
            notify("Documento não encontrado na lista.");
            return;
        }

        previewFileName.textContent = doc.filename;
        pdfPreview.hidden = true;
        imagePreview.hidden = true;
        const url = sedaFileUrl(doc.id);
        if (doc.type === "PDF") {
            pdfPreview.src = url;
            pdfPreview.hidden = false;
        } else {
            imagePreview.src = url;
            imagePreview.hidden = false;
        }
        previewModal.show();
    }

    previewModalElement.addEventListener("hidden.bs.modal", function () {
        pdfPreview.removeAttribute("src");
        imagePreview.removeAttribute("src");
        imagePreview.hidden = true;
        pdfPreview.hidden = true;
    });

    async function deleteDocument(id) {
        const doc = documents.find(item => String(item.id) === String(id));
        if (!doc) return;
        if (!confirm(`Deseja realmente excluir o documento "${doc.filename}"?`)) {
            return;
        }

        try {
            await sedaRequest(`/documents/${encodeURIComponent(doc.id)}`, {
                method: "DELETE"
            });
            documents = documents.filter(
                item => String(item.id) !== String(doc.id)
            );
            renderDocuments();
            notify("Documento excluído com sucesso.");
        } catch (error) {
            notify(`Não foi possível excluir o documento: ${error.message}`);
        }
    }

    tableBody.addEventListener("click", function (event) {
        const previewButton = event.target.closest(".preview-action");
        const deleteButton = event.target.closest(".delete-action");
        if (previewButton) previewDocument(previewButton.dataset.id);
        if (deleteButton) deleteDocument(deleteButton.dataset.id);
    });

    document.getElementById("exportButton")
        .addEventListener("click", function () {
            if (documents.length === 0) {
                notify("Não existem documentos para exportar.");
                return;
            }

            const header = [
                "Nome", "Formato", "Data de envio", "Tamanho", "Status"
            ];
            const rows = documents.map(function (doc) {
                return [
                    doc.filename,
                    doc.type,
                    formatDate(doc.uploaded_at),
                    formatSize(doc.size),
                    sedaStatusLabel(doc.status)
                ];
            });
            const csvContent = [header, ...rows].map(function (row) {
                return row.map(function (value) {
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(";");
            }).join("\r\n");
            const url = URL.createObjectURL(new Blob(
                ["\uFEFF" + csvContent],
                { type: "text/csv;charset=utf-8;" }
            ));
            const link = document.createElement("a");
            link.href = url;
            link.download = "relatorio_documentos_seda.csv";
            link.click();
            URL.revokeObjectURL(url);
            notify("Relatório exportado com sucesso.");
        });

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

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    document.getElementById("notificationButton")
        .addEventListener("click", function () {
            notify("Você está na central de documentos do S.E.D.A.");
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

    loadDocuments().catch(function (error) {
        showFeedback(`Não foi possível carregar os documentos: ${error.message}`, "error");
        notify(`Falha ao carregar documentos: ${error.message}`);
    });
});
