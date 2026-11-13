
// =============================================
// S.E.D.A. - JAVASCRIPT DE DOCUMENTOS
// =============================================

document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // ELEMENTOS
    // =========================================

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

    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });


    // =========================================
    // NOTIFICAÇÕES
    // =========================================

    function notify(message) {

        toastMessage.textContent = message;

        toast.show();

    }


    // =========================================
    // DATA
    // =========================================

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });


    // =========================================
    // MENU RESPONSIVO
    // =========================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");

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


    // =========================================
    // NOTIFICAÇÕES DO CABEÇALHO
    // =========================================

    document.getElementById("notificationButton")
        .addEventListener("click", function () {

            notify("Você está na central de documentos do S.E.D.A.");

        });


    // =========================================
    // BANCO DE DADOS DEMONSTRATIVO
    // =========================================

    let documents = [

        {
            id: 1,
            name: "Extrato_Financeiro_2026.pdf",
            type: "PDF",
            date: new Date(2026, 10, 10, 14, 30),
            size: 2.4,
            status: "Processado",
            file: null,
            url: null
        },

        {
            id: 2,
            name: "Comprovante_2026.jpg",
            type: "JPG",
            date: new Date(2026, 10, 10, 13, 15),
            size: 1.2,
            status: "Pendente",
            file: null,
            url: null
        },

        {
            id: 3,
            name: "Contrato_2784.pdf",
            type: "PDF",
            date: new Date(2026, 10, 9, 10, 45),
            size: 3.8,
            status: "Processado",
            file: null,
            url: null
        },

        {
            id: 4,
            name: "Balanco_Financeiro.pdf",
            type: "PDF",
            date: new Date(2026, 10, 8, 9, 20),
            size: 4.1,
            status: "Erro",
            file: null,
            url: null
        },

        {
            id: 5,
            name: "Documento_Cliente.png",
            type: "PNG",
            date: new Date(2026, 10, 7, 15, 40),
            size: 0.8,
            status: "Pendente",
            file: null,
            url: null
        }

    ];

    let nextId = 6;


    // =========================================
    // FORMATAR DATA E TAMANHO
    // =========================================

    function formatDate(date) {

        return date.toLocaleDateString("pt-BR") +
            " às " +
            date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });

    }


    function formatSize(size) {

        return size.toFixed(2).replace(".", ",") + " MB";

    }


    // =========================================
    // ÍCONE DO DOCUMENTO
    // =========================================

    function getFileIcon(type) {

        if (type === "PDF") {
            return "bi-file-earmark-pdf";
        }

        if (type === "JPG" || type === "PNG") {
            return "bi-file-earmark-image";
        }

        return "bi-file-earmark";

    }


    // =========================================
    // STATUS DO DOCUMENTO
    // =========================================

    function getStatusHTML(status) {

        if (status === "Processado") {

            return `
                <span class="file-status processed">
                    <i class="bi bi-check-circle-fill"></i>
                    Processado
                </span>
            `;

        }

        if (status === "Pendente") {

            return `
                <span class="file-status pending">
                    <i class="bi bi-clock-fill"></i>
                    Pendente
                </span>
            `;

        }

        return `
            <span class="file-status error">
                <i class="bi bi-exclamation-circle-fill"></i>
                Erro
            </span>
        `;

    }


    // =========================================
    // ATUALIZAR INDICADORES
    // =========================================

    function updateMetrics() {

        const total = documents.length;

        const pending = documents.filter(
            doc => doc.status === "Pendente"
        ).length;

        const processed = documents.filter(
            doc => doc.status === "Processado"
        ).length;

        const errors = documents.filter(
            doc => doc.status === "Erro"
        ).length;

        totalDocuments.textContent = total;

        pendingDocuments.textContent = pending;

        approvedDocuments.textContent = processed;

        errorDocuments.textContent = errors;

        document.getElementById("menuDocumentCount").textContent = total;

    }


    // =========================================
    // RENDERIZAR TABELA
    // =========================================

    function renderDocuments() {

        const search = searchInput.value.toLowerCase().trim();

        const selectedStatus = statusFilter.value;

        const selectedType = typeFilter.value;

        const filteredDocuments = documents.filter(function (doc) {

            const matchesName = doc.name.toLowerCase().includes(search);

            const matchesStatus =
                selectedStatus === "todos" ||
                doc.status === selectedStatus;

            const matchesType =
                selectedType === "todos" ||
                doc.type === selectedType;

            return matchesName && matchesStatus && matchesType;

        });

        tableBody.innerHTML = "";

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

                <td>${formatDate(doc.date)}</td>

                <td>${formatSize(doc.size)}</td>

                <td>${getStatusHTML(doc.status)}</td>

                <td>
                    <div class="file-actions">

                        <button
                            class="file-action preview-action"
                            title="Visualizar"
                            aria-label="Visualizar documento"
                            data-id="${doc.id}">
                            <i class="bi bi-eye"></i>
                        </button>

                        <button
                            class="file-action delete delete-action"
                            title="Excluir"
                            aria-label="Excluir documento"
                            data-id="${doc.id}">
                            <i class="bi bi-trash"></i>
                        </button>

                    </div>
                </td>

            `;

            // Insere o nome como texto, sem interpretar HTML.
            row.querySelector(".file-details strong").textContent = doc.name;

            tableBody.appendChild(row);

        });


        emptyState.hidden = filteredDocuments.length !== 0;

        tableCounter.textContent =
            `Exibindo ${filteredDocuments.length} de ${documents.length} documentos`;

        updateMetrics();

    }


    // =========================================
    // PESQUISA E FILTROS
    // =========================================

    searchInput.addEventListener("input", renderDocuments);

    statusFilter.addEventListener("change", renderDocuments);

    typeFilter.addEventListener("change", renderDocuments);


    // =========================================
    // ABRIR SELETOR DE ARQUIVOS
    // =========================================

    function openFileSelector() {

        fileInput.click();

    }

    selectFileButton.addEventListener("click", openFileSelector);

    topUploadButton.addEventListener("click", openFileSelector);


    // =========================================
    // VALIDAR ARQUIVOS
    // =========================================

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];

    const maxSize = 10 * 1024 * 1024;


    function showFeedback(message, type) {

        uploadFeedback.textContent = message;

        uploadFeedback.className =
            "upload-feedback show " + type;

    }


    // =========================================
    // PROCESSAR SELEÇÃO DE ARQUIVOS
    // =========================================

    function handleFiles(files) {

        let added = 0;

        let rejected = 0;

        Array.from(files).forEach(function (file) {

            if (!allowedTypes.includes(file.type)) {

                rejected++;

                return;

            }

            if (file.size > maxSize) {

                rejected++;

                return;

            }

            if (file.size === 0) {

                rejected++;

                return;

            }

            const extension = file.name.split(".").pop().toUpperCase();

            const fileUrl = URL.createObjectURL(file);

            const newDocument = {

                id: nextId++,

                name: file.name,

                type: extension,

                date: new Date(),

                size: file.size / (1024 * 1024),

                status: "Pendente",

                file: file,

                url: fileUrl

            };

            documents.unshift(newDocument);

            added++;

        });


        renderDocuments();

        if (added > 0 && rejected === 0) {

            showFeedback(
                `${added} arquivo(s) adicionado(s) com sucesso!`,
                "success"
            );

            notify("Arquivos adicionados à lista de documentos.");

        } else if (added > 0) {

            showFeedback(
                `${added} arquivo(s) adicionado(s). ${rejected} arquivo(s) recusado(s).`,
                "success"
            );

        } else {

            showFeedback(
                "Nenhum arquivo válido foi adicionado. Confira os formatos e o limite de 10 MB.",
                "error"
            );

        }

        fileInput.value = "";

    }


    fileInput.addEventListener("change", function () {

        if (fileInput.files.length > 0) {

            handleFiles(fileInput.files);

        }

    });


    // =========================================
    // ARRASTAR E SOLTAR
    // =========================================

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

        const files = event.dataTransfer.files;

        if (files.length > 0) {

            handleFiles(files);

        }

    });


    // =========================================
    // VISUALIZAR DOCUMENTOS
    // =========================================

    function previewDocument(id) {

        const doc = documents.find(item => item.id === id);

        if (!doc) return;

        if (!doc.url) {

            notify("Este documento é demonstrativo e não possui arquivo original.");

            return;

        }

        previewFileName.textContent = doc.name;

        pdfPreview.hidden = true;

        imagePreview.hidden = true;

        if (doc.type === "PDF") {

            pdfPreview.src = doc.url;

            pdfPreview.hidden = false;

        } else {

            imagePreview.src = doc.url;

            imagePreview.hidden = false;

        }

        previewModal.show();

    }


    // Limpar visualização ao fechar

    previewModalElement.addEventListener("hidden.bs.modal", function () {

        pdfPreview.removeAttribute("src");

        imagePreview.removeAttribute("src");

        imagePreview.hidden = true;

        pdfPreview.hidden = true;

    });


    // =========================================
    // EXCLUIR DOCUMENTOS
    // =========================================

    function deleteDocument(id) {

        const doc = documents.find(item => item.id === id);

        if (!doc) return;

        const confirmation = confirm(
            `Deseja realmente excluir o documento "${doc.name}"?`
        );

        if (!confirmation) return;

        if (doc.url) {

            URL.revokeObjectURL(doc.url);

        }

        documents = documents.filter(item => item.id !== id);

        renderDocuments();

        notify("Documento excluído com sucesso.");

    }


    // =========================================
    // CLIQUES NAS AÇÕES DA TABELA
    // =========================================

    tableBody.addEventListener("click", function (event) {

        const previewButton = event.target.closest(".preview-action");

        const deleteButton = event.target.closest(".delete-action");

        if (previewButton) {

            previewDocument(Number(previewButton.dataset.id));

        }

        if (deleteButton) {

            deleteDocument(Number(deleteButton.dataset.id));

        }

    });


    // =========================================
    // EXPORTAR LISTA PARA EXCEL / CSV
    // =========================================

    document.getElementById("exportButton")
        .addEventListener("click", function () {

            if (documents.length === 0) {

                notify("Não existem documentos para exportar.");

                return;

            }

            const header = [
                "Nome",
                "Formato",
                "Data de envio",
                "Tamanho",
                "Status"
            ];

            const rows = documents.map(function (doc) {

                return [
                    doc.name,
                    doc.type,
                    formatDate(doc.date),
                    formatSize(doc.size),
                    doc.status
                ];

            });

            const csvContent = [
                header,
                ...rows
            ].map(function (row) {

                return row.map(function (value) {

                    return `"${String(value).replace(/"/g, '""')}"`;

                }).join(";");

            }).join("\r\n");

            const blob = new Blob(
                ["\uFEFF" + csvContent],
                { type: "text/csv;charset=utf-8;" }
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;

            link.download = "relatorio_documentos_seda.csv";

            link.click();

            URL.revokeObjectURL(url);

            notify("Relatório exportado com sucesso.");

        });


    // =========================================
    // NAVEGAÇÃO
    // =========================================

    document.querySelectorAll(".sidebar-nav .nav-item")
        .forEach(function (link) {

            link.addEventListener("click", function (event) {

                if (link.getAttribute("href") === "#") {

                    event.preventDefault();

                    const name = link.querySelector("span").textContent.trim();

                    notify(
                        `O módulo ${name} será desenvolvido nas próximas etapas.`
                    );

                }

                if (window.innerWidth <= 900) {

                    sidebar.classList.remove("open");

                }

            });

        });


    // =========================================
    // INICIALIZAÇÃO
    // =========================================

    renderDocuments();

    console.log("S.E.D.A. - Módulo Documentos iniciado!");

});
