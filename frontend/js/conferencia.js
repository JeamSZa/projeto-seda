
document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // S.E.D.A. - CONFERÊNCIA INTELIGENTE
    // =========================================

    const $ = (id) => document.getElementById(id);

    const documentSelect = $("documentSelect");
    const originalFile = $("originalFile");
    const pdfPreview = $("pdfPreview");
    const imagePreview = $("imagePreview");
    const documentPlaceholder = $("documentPlaceholder");
    const previewTransform = $("previewTransform");

    const conferenceForm = $("conferenceForm");
    const documentStatus = $("documentStatus");

    const approveButton = $("approveButton");
    const rejectButton = $("rejectButton");

    const rejectModal = new bootstrap.Modal($("rejectModal"));
    const resultModal = new bootstrap.Modal($("resultModal"));

    const toast = new bootstrap.Toast($("appToast"), {
        delay: 3000
    });


    // =========================================
    // DOCUMENTOS DEMONSTRATIVOS
    // =========================================

    const defaultDocuments = {

        1: {
            name: "Extrato_Financeiro_2026.pdf",
            client: "João da Silva",
            number: "123.456.789-00",
            period: "01/10/2026 a 31/10/2026",
            value: "12580.50",
            bank: "Banco do Brasil",
            observations: "",
            status: "Pendente",
            reason: "",
            fileUrl: null,
            fileType: null,
            fileSize: null
        },

        2: {
            name: "Comprovante_Cliente.pdf",
            client: "Maria Oliveira",
            number: "987.654.321-00",
            period: "01/11/2026 a 10/11/2026",
            value: "7350.00",
            bank: "Itaú",
            observations: "",
            status: "Pendente",
            reason: "",
            fileUrl: null,
            fileType: null,
            fileSize: null
        },

        3: {
            name: "Contrato_Financeiro.pdf",
            client: "Carlos Souza",
            number: "456.789.123-00",
            period: "01/10/2026 a 31/10/2026",
            value: "18900.00",
            bank: "Bradesco",
            observations: "",
            status: "Pendente",
            reason: "",
            fileUrl: null,
            fileType: null,
            fileSize: null
        }

    };


    // =========================================
    // CARREGAR DADOS SALVOS
    // =========================================

    let documents = JSON.parse(
        localStorage.getItem("seda_conference_documents") || "null"
    ) || defaultDocuments;

    let currentDocumentId = "1";

    let currentZoom = 1;

    let temporaryUrls = [];


    function saveDocuments() {

        const dataToSave = {};

        Object.keys(documents).forEach(function (id) {

            const doc = documents[id];

            dataToSave[id] = {
                name: doc.name,
                client: doc.client,
                number: doc.number,
                period: doc.period,
                value: doc.value,
                bank: doc.bank,
                observations: doc.observations,
                status: doc.status,
                reason: doc.reason
            };

        });

        localStorage.setItem(
            "seda_conference_documents",
            JSON.stringify(dataToSave)
        );

    }


    // =========================================
    // NOTIFICAÇÕES
    // =========================================

    function notify(message) {

        $("toastMessage").textContent = message;

        toast.show();

    }


    // =========================================
    // DATA ATUAL
    // =========================================

    $("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });


    // =========================================
    // MENU RESPONSIVO
    // =========================================

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


    // =========================================
    // NOTIFICAÇÕES DO SISTEMA
    // =========================================

    $("notificationButton").addEventListener("click", function () {

        notify("Você está na central de conferência do S.E.D.A.");

    });


    // =========================================
    // CONTAGEM DE DOCUMENTOS
    // =========================================

    function updateCounts() {

        const pending = Object.values(documents).filter(function (doc) {

            return doc.status === "Pendente";

        }).length;

        const approved = Object.values(documents).filter(function (doc) {

            return doc.status === "Aprovado";

        }).length;

        const rejected = Object.values(documents).filter(function (doc) {

            return doc.status === "Rejeitado";

        }).length;

        $("pendingCount").textContent =
            pending + (pending === 1
                ? " documento pendente"
                : " documentos pendentes");

        $("sidebarPending").textContent = pending;

        $("fieldCount").textContent = "6 campos";

        console.log("Resumo da conferência:", {
            pendentes: pending,
            aprovados: approved,
            rejeitados: rejected
        });

        saveDocuments();

    }


    // =========================================
    // ATUALIZAR STATUS
    // =========================================

    function updateStatus(status) {

        const statusLabels = {

            Pendente: "Aguardando revisão",

            Aprovado: "Documento aprovado",

            Rejeitado: "Documento rejeitado"

        };

        const statusColors = {

            Pendente: "#a4770d",

            Aprovado: "#21875c",

            Rejeitado: "#dc5555"

        };

        const statusBackgrounds = {

            Pendente: "#fff5d9",

            Aprovado: "#e8f6ee",

            Rejeitado: "#fff0f0"

        };

        documentStatus.innerHTML =
            `<span class="status-dot"></span>${statusLabels[status]}`;

        documentStatus.style.color = statusColors[status];

        documentStatus.style.background =
            statusBackgrounds[status];

        documentStatus.querySelector(".status-dot").style.background =
            statusColors[status];

    }


    // =========================================
    // SALVAR DADOS DO FORMULÁRIO
    // =========================================

    function saveFormData() {

        const doc = documents[currentDocumentId];

        doc.client = $("clientName").value.trim();

        doc.number = $("documentNumber").value.trim();

        doc.period = $("referencePeriod").value.trim();

        doc.value = $("documentValue").value;

        doc.bank = $("bankName").value.trim();

        doc.observations = $("observations").value.trim();

        saveDocuments();

    }


    // =========================================
    // ATUALIZAR INFORMAÇÕES DO ARQUIVO
    // =========================================

    function updateFileInformation(doc) {

        $("originalFileName").textContent = doc.name;

        let metadata = "Arquivo demonstrativo";

        if (doc.fileType) {

            const format = doc.fileType === "application/pdf"
                ? "PDF"
                : doc.fileType === "image/png"
                    ? "PNG"
                    : "JPG";

            const size = doc.fileSize
                ? (doc.fileSize / 1024).toFixed(1) + " KB"
                : "";

            metadata = format + (size ? " • " + size : "");

        }

        $("fileMetadata").textContent = metadata;

        if (doc.fileUrl) {

            $("downloadFile").href = doc.fileUrl;

            $("downloadFile").download = doc.name;

            $("downloadFile").hidden = false;

        } else {

            $("downloadFile").hidden = true;

        }

    }


    // =========================================
    // ATUALIZAR PRÉ-VISUALIZAÇÃO DEMONSTRATIVA
    // =========================================

    function updateSamplePreview(doc) {

        const fields = $("sampleDocument").querySelectorAll(".sample-info p");

        fields[0].innerHTML = "";

        const clientLabel = document.createElement("strong");
        clientLabel.textContent = "Cliente: ";

        fields[0].appendChild(clientLabel);
        fields[0].append(doc.client);

        fields[1].innerHTML = "";

        const cpfLabel = document.createElement("strong");
        cpfLabel.textContent = "CPF: ";

        fields[1].appendChild(cpfLabel);
        fields[1].append(doc.number);

        fields[2].innerHTML = "";

        const periodLabel = document.createElement("strong");
        periodLabel.textContent = "Período: ";

        fields[2].appendChild(periodLabel);
        fields[2].append(doc.period);

        const sampleBank = $("sampleDocument").querySelector(".sample-bank strong");

        sampleBank.textContent = doc.bank.toUpperCase();

        $("sampleDocument").querySelector(".sample-total strong").textContent =
            Number(doc.value || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

    }


    // =========================================
    // LIMPAR VISUALIZAÇÃO
    // =========================================

    function clearPreview() {

        pdfPreview.hidden = true;

        imagePreview.hidden = true;

        pdfPreview.removeAttribute("src");

        imagePreview.removeAttribute("src");

        documentPlaceholder.hidden = false;

        $("sampleDocument").hidden = false;

        resetZoom();

    }


    // =========================================
    // MOSTRAR DOCUMENTO
    // =========================================

    function displayFile(url, type) {

        documentPlaceholder.hidden = true;

        if (type === "application/pdf") {

            pdfPreview.src = url;

            pdfPreview.hidden = false;

        } else {

            imagePreview.src = url;

            imagePreview.hidden = false;

        }

        resetZoom();

    }


    // =========================================
    // CONTROLE DE ZOOM
    // =========================================

    function applyZoom() {

        currentZoom = Math.max(0.5, Math.min(2, currentZoom));

        previewTransform.style.transform =
            `scale(${currentZoom})`;

        $("zoomValue").textContent =
            Math.round(currentZoom * 100) + "%";

    }


    function resetZoom() {

        currentZoom = 1;

        applyZoom();

    }


    $("zoomIn").addEventListener("click", function () {

        currentZoom += 0.1;

        applyZoom();

    });


    $("zoomOut").addEventListener("click", function () {

        currentZoom -= 0.1;

        applyZoom();

    });


    $("zoomReset").addEventListener("click", resetZoom);


    // =========================================
    // CARREGAR DOCUMENTO SELECIONADO
    // =========================================

    function loadDocument(id) {

        const doc = documents[id];

        if (!doc) return;

        currentDocumentId = id;

        $("clientName").value = doc.client;

        $("documentNumber").value = doc.number;

        $("referencePeriod").value = doc.period;

        $("documentValue").value = doc.value;

        $("bankName").value = doc.bank;

        $("observations").value = doc.observations || "";

        updateFileInformation(doc);

        updateSamplePreview(doc);

        clearPreview();

        if (doc.fileUrl && doc.fileType) {

            displayFile(doc.fileUrl, doc.fileType);

        }

        updateStatus(doc.status);

        const locked = doc.status !== "Pendente";

        conferenceForm.querySelectorAll("input, textarea").forEach(function (field) {

            field.disabled = locked;

        });

        approveButton.disabled = locked;

        rejectButton.disabled = locked;

        approveButton.innerHTML = locked
            ? '<i class="bi bi-lock"></i> Documento finalizado'
            : '<i class="bi bi-check-circle"></i> Aprovar documento';

    }


    // =========================================
    // TROCAR DOCUMENTO
    // =========================================

    documentSelect.addEventListener("change", function () {

        loadDocument(this.value);

        originalFile.value = "";

    });


    // =========================================
    // UPLOAD DE DOCUMENTOS
    // =========================================

    originalFile.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) return;

        const doc = documents[currentDocumentId];

        if (doc.status !== "Pendente") {

            notify("Este documento já foi finalizado.");

            this.value = "";

            return;

        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (!allowedTypes.includes(file.type)) {

            notify("Formato inválido. Utilize PDF, JPG ou PNG.");

            this.value = "";

            return;

        }

        if (file.size === 0 || file.size > 10 * 1024 * 1024) {

            notify("O arquivo deve ter até 10 MB e não pode estar vazio.");

            this.value = "";

            return;

        }

        const fileUrl = URL.createObjectURL(file);

        temporaryUrls.push(fileUrl);

        doc.fileUrl = fileUrl;

        doc.fileType = file.type;

        doc.fileSize = file.size;

        doc.name = file.name;

        updateFileInformation(doc);

        displayFile(fileUrl, file.type);

        notify("Documento carregado com sucesso!");

    });


    // =========================================
    // APROVAR DOCUMENTO
    // =========================================

    conferenceForm.addEventListener("submit", function (event) {

        event.preventDefault();

        if (!conferenceForm.checkValidity()) {

            conferenceForm.reportValidity();

            return;

        }

        const doc = documents[currentDocumentId];

        if (doc.status !== "Pendente") return;

        saveFormData();

        doc.status = "Aprovado";

        updateStatus("Aprovado");

        loadDocument(currentDocumentId);

        updateCounts();

        $("resultIcon").innerHTML =
            '<i class="bi bi-check-circle-fill"></i>';

        $("resultIcon").className = "result-icon";

        $("resultTitle").textContent = "Documento aprovado!";

        $("resultMessage").textContent =
            "A conferência foi concluída e os dados foram salvos nesta demonstração.";

        resultModal.show();

        console.log("Documento aprovado:", doc);

    });


    // =========================================
    // ABRIR MODAL DE REJEIÇÃO
    // =========================================

    rejectButton.addEventListener("click", function () {

        const doc = documents[currentDocumentId];

        if (doc.status !== "Pendente") return;

        $("rejectionReason").value = "";

        $("rejectionError").hidden = true;

        rejectModal.show();

    });


    // =========================================
    // CONFIRMAR REJEIÇÃO
    // =========================================

    $("confirmReject").addEventListener("click", function () {

        const reason = $("rejectionReason").value.trim();

        if (!reason) {

            $("rejectionError").hidden = false;

            return;

        }

        const doc = documents[currentDocumentId];

        if (doc.status !== "Pendente") return;

        doc.status = "Rejeitado";

        doc.reason = reason;

        doc.observations = $("observations").value.trim();

        saveFormData();

        doc.status = "Rejeitado";

        saveDocuments();

        rejectModal.hide();

        loadDocument(currentDocumentId);

        updateCounts();

        $("resultIcon").innerHTML =
            '<i class="bi bi-x-circle-fill"></i>';

        $("resultIcon").className = "result-icon rejected";

        $("resultTitle").textContent = "Documento rejeitado";

        $("resultMessage").textContent =
            "Justificativa registrada: " + reason;

        resultModal.show();

        console.log("Documento rejeitado:", doc);

    });


    // =========================================
    // INICIALIZAÇÃO
    // =========================================

    documentSelect.value = "1";

    loadDocument("1");

    updateCounts();

    console.log("S.E.D.A. - Conferência inteligente iniciada!");

});
