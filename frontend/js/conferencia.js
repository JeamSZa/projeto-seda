document.addEventListener("DOMContentLoaded", function () {
    const documentSelect = document.getElementById("documentSelect");
    const originalFile = document.getElementById("originalFile");
    const pdfPreview = document.getElementById("pdfPreview");
    const imagePreview = document.getElementById("imagePreview");
    const documentPlaceholder = document.getElementById("documentPlaceholder");
    const originalFileName = document.getElementById("originalFileName");
    const documentStatus = document.getElementById("documentStatus");
    const queueCount = document.getElementById("queueCount");
    const conferenceForm = document.getElementById("conferenceForm");
    const approveButton = document.getElementById("approveButton");
    const rejectButton = document.getElementById("rejectButton");
    const resultModal = new bootstrap.Modal(
        document.getElementById("resultModal")
    );
    const resultIcon = document.getElementById("resultIcon");
    const resultTitle = document.getElementById("resultTitle");
    const resultMessage = document.getElementById("resultMessage");
    const toast = new bootstrap.Toast(document.getElementById("appToast"), {
        delay: 3000
    });
    const toastMessage = document.getElementById("toastMessage");
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const maxFileSize = 10 * 1024 * 1024;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    let documents = [];
    let currentDocument = null;
    let isSaving = false;

    function notify(message) {
        toastMessage.textContent = message;
        toast.show();
    }

    function fieldValue(fields, keys) {
        const field = fields.find(item => keys.includes(item.key));
        return field ? field.value : "";
    }

    function normalizeNumber(value) {
        if (!value) return "";
        const normalized = String(value).trim();
        if (normalized.includes(",")) {
            return normalized.replace(/\./g, "").replace(",", ".");
        }
        return normalized;
    }

    function updateQueue() {
        const pending = documents.filter(doc => doc.status === "review").length;
        queueCount.textContent = `${pending} ${
            pending === 1 ? "documento pendente" : "documentos pendentes"
        }`;
    }

    function updateStatus(status) {
        const statuses = {
            review: {
                label: "Aguardando revisão",
                color: "#9b7410",
                background: "#fff6d9"
            },
            approved: {
                label: "Documento aprovado",
                color: "#20875c",
                background: "#e8f6ee"
            },
            rejected: {
                label: "Documento rejeitado",
                color: "#dc5656",
                background: "#fff0f0"
            },
            error: {
                label: "Erro no processamento",
                color: "#dc5656",
                background: "#fff0f0"
            }
        };
        const currentStatus = statuses[status] || statuses.review;
        documentStatus.textContent = currentStatus.label;
        documentStatus.style.color = currentStatus.color;
        documentStatus.style.background = currentStatus.background;
        documentStatus.classList.remove("approved", "rejected");
        if (status === "approved") documentStatus.classList.add("approved");
        if (status === "rejected" || status === "error") {
            documentStatus.classList.add("rejected");
        }
        const dot = documentStatus.querySelector(".status-dot");
        if (dot) dot.style.background = currentStatus.color;
        updateQueue();
    }

    function clearPreview() {
        pdfPreview.hidden = true;
        imagePreview.hidden = true;
        pdfPreview.removeAttribute("src");
        imagePreview.removeAttribute("src");
        documentPlaceholder.hidden = true;
    }

    function displayFile(url, contentType) {
        clearPreview();
        if (contentType === "application/pdf") {
            pdfPreview.src = url;
            pdfPreview.hidden = false;
        } else {
            imagePreview.src = url;
            imagePreview.hidden = false;
        }
    }

    function setFormLocked(locked) {
        conferenceForm.querySelectorAll("input, textarea").forEach(field => {
            field.disabled = locked;
        });
        approveButton.disabled = locked;
        rejectButton.disabled = locked;
        approveButton.style.opacity = locked ? "0.5" : "1";
        rejectButton.style.opacity = locked ? "0.5" : "1";
    }

    function populateSelector() {
        documentSelect.replaceChildren();
        if (documents.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Nenhum documento enviado";
            documentSelect.appendChild(option);
            documentSelect.disabled = true;
            return;
        }
        documentSelect.disabled = false;
        documents.forEach(doc => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = `${doc.filename} — ${sedaStatusLabel(doc.status)}`;
            documentSelect.appendChild(option);
        });
    }

    async function loadDocument(id) {
        if (!id) {
            currentDocument = null;
            originalFileName.textContent = "Nenhum documento selecionado";
            clearPreview();
            documentPlaceholder.hidden = false;
            updateStatus("review");
            setFormLocked(true);
            return;
        }

        try {
            const doc = await sedaRequest(
                `/documents/${encodeURIComponent(id)}`
            );
            currentDocument = doc;
            const fields = doc.fields || [];
            document.getElementById("clientName").value =
                fieldValue(fields, ["cliente", "client"]);
            document.getElementById("documentNumber").value =
                fieldValue(fields, ["documento", "cpf_cnpj", "numero"]);
            document.getElementById("referencePeriod").value =
                fieldValue(fields, ["periodo", "data"]);
            document.getElementById("documentValue").value =
                normalizeNumber(fieldValue(fields, ["valor_total", "value"]));
            document.getElementById("bankName").value =
                fieldValue(fields, ["instituicao", "banco", "bank"]);
            document.getElementById("observations").value =
                fieldValue(fields, ["observacoes", "observations"]);
            originalFileName.textContent = doc.filename;
            updateStatus(doc.status);
            displayFile(sedaFileUrl(doc.id), doc.content_type);
            setFormLocked(doc.status !== "review");

            if (doc.ocr_error) notify(doc.ocr_error);
        } catch (error) {
            notify(`Não foi possível carregar o documento: ${error.message}`);
        }
    }

    async function refreshDocuments(selectId) {
        documents = await sedaRequest("/documents");
        documents.sort((first, second) =>
            new Date(second.uploaded_at) - new Date(first.uploaded_at)
        );
        document.getElementById("menuPendingCount").textContent =
            documents.filter(doc => doc.status === "review").length;
        populateSelector();
        if (documents.length === 0) {
            await loadDocument("");
            return;
        }

        const preferred = selectId && documents.some(
            doc => String(doc.id) === String(selectId)
        )
            ? String(selectId)
            : String(
                documents.find(doc => doc.status === "review")?.id ||
                documents[0].id
            );
        documentSelect.value = preferred;
        await loadDocument(preferred);
    }

    function formFields() {
        const fields = [
            {
                key: "cliente",
                label: "Nome do cliente",
                value: document.getElementById("clientName").value.trim()
            },
            {
                key: "documento",
                label: "CPF / CNPJ",
                value: document.getElementById("documentNumber").value.trim()
            },
            {
                key: "periodo",
                label: "Período de referência",
                value: document.getElementById("referencePeriod").value.trim()
            },
            {
                key: "valor_total",
                label: "Valor Total",
                value: document.getElementById("documentValue").value
            },
            {
                key: "instituicao",
                label: "Instituição financeira",
                value: document.getElementById("bankName").value.trim()
            },
            {
                key: "observacoes",
                label: "Observações",
                value: document.getElementById("observations").value.trim()
            }
        ];
        const rawText = (currentDocument.fields || []).find(
            field => field.key === "texto_bruto"
        );
        if (rawText) fields.push(rawText);
        return fields;
    }

    async function saveDocument(status) {
        if (!currentDocument || isSaving) return;
        isSaving = true;
        approveButton.disabled = true;
        rejectButton.disabled = true;
        try {
            await sedaRequest(
                `/documents/${encodeURIComponent(currentDocument.id)}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields: formFields(),
                        status: status
                    })
                }
            );
            await refreshDocuments(currentDocument.id);
            showResult(status);
        } catch (error) {
            notify(`Não foi possível salvar o documento: ${error.message}`);
        } finally {
            isSaving = false;
            if (currentDocument) {
                setFormLocked(currentDocument.status !== "review");
            }
        }
    }

    function showResult(status) {
        if (status === "approved") {
            resultIcon.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
            resultIcon.className = "result-icon";
            resultTitle.textContent = "Documento aprovado!";
            resultMessage.textContent =
                "As informações foram salvas e aprovadas.";
        } else {
            resultIcon.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
            resultIcon.className = "result-icon rejected";
            resultTitle.textContent = "Documento rejeitado";
            resultMessage.textContent =
                "A rejeição e as observações foram salvas.";
        }
        resultModal.show();
    }

    documentSelect.addEventListener("change", function () {
        loadDocument(this.value);
        originalFile.value = "";
    });

    originalFile.addEventListener("change", async function () {
        const file = originalFile.files[0];
        if (!file) return;
        if (!allowedTypes.includes(file.type)) {
            notify("Formato não permitido. Utilize PDF, JPG ou PNG.");
            originalFile.value = "";
            return;
        }
        if (file.size === 0 || file.size > maxFileSize) {
            notify(file.size === 0
                ? "O arquivo está vazio."
                : "O arquivo ultrapassa o limite de 10 MB.");
            originalFile.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        originalFile.disabled = true;
        try {
            const result = await sedaRequest("/documents", {
                method: "POST",
                body: formData
            });
            await refreshDocuments(result.id);
            notify(result.ocr_error || "Documento enviado e pronto para conferência.");
        } catch (error) {
            notify(`Não foi possível enviar o documento: ${error.message}`);
        } finally {
            originalFile.disabled = false;
            originalFile.value = "";
        }
    });

    conferenceForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!conferenceForm.checkValidity()) {
            conferenceForm.reportValidity();
            return;
        }
        if (currentDocument && currentDocument.status === "review") {
            await saveDocument("approved");
        }
    });

    rejectButton.addEventListener("click", async function () {
        if (!currentDocument || currentDocument.status !== "review") return;
        if (!confirm("Deseja realmente rejeitar este documento?")) return;
        await saveDocument("rejected");
    });

    menuToggle.addEventListener("click", function () {
        sidebar.classList.toggle("open");
    });

    document.getElementById("notificationButton")
        .addEventListener("click", function () {
            notify("Você está na central de conferência.");
        });

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    document.querySelectorAll(".sidebar-nav .nav-item")
        .forEach(function (link) {
            link.addEventListener("click", function () {
                if (window.innerWidth <= 900) {
                    sidebar.classList.remove("open");
                }
            });
        });

    const requestedDocumentId =
        new URLSearchParams(window.location.search).get("document");
    refreshDocuments(requestedDocumentId).catch(function (error) {
        setFormLocked(true);
        notify(`Falha ao carregar documentos: ${error.message}`);
    });
});
