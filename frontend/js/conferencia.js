document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const select = $("documentSelect");
    const form = $("conferenceForm");
    const pdfPreview = $("pdfPreview");
    const imagePreview = $("imagePreview");
    const placeholder = $("documentPlaceholder");
    const previewTransform = $("previewTransform");
    const toast = new bootstrap.Toast($("appToast"), { delay: 3500 });
    const rejectModal = new bootstrap.Modal($("rejectModal"));
    const resultModal = new bootstrap.Modal($("resultModal"));
    const fieldInputs = {
        cliente: $("clientName"),
        documento: $("documentNumber"),
        periodo: $("referencePeriod"),
        valor_total: $("documentValue"),
        instituicao: $("bankName"),
        observacoes: $("observations"),
        texto_bruto: $("rawText")
    };
    const fieldLabels = {
        cliente: "Nome do cliente",
        documento: "CPF / CNPJ",
        periodo: "Período de referência",
        valor_total: "Valor Total",
        instituicao: "Instituição financeira",
        observacoes: "Observações da conferência",
        texto_bruto: "Texto extraído"
    };
    let documents = [];
    let currentDocument = null;
    let zoom = 1;
    let localPreviewUrl = null;
    let documentLoadId = 0;

    $("currentDate").textContent = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    function notify(message) {
        $("toastMessage").textContent = message;
        toast.show();
    }

    function updateStatus(status) {
        const labels = {
            review: "Aguardando revisão",
            approved: "Documento aprovado",
            rejected: "Documento rejeitado",
            error: "Erro no processamento"
        };
        const colors = {
            review: ["#a4770d", "#fff5d9"],
            approved: ["#21875c", "#e8f6ee"],
            rejected: ["#dc5555", "#fff0f0"],
            error: ["#dc5555", "#fff0f0"]
        };
        const [color, background] = colors[status] || colors.review;
        const statusElement = $("documentStatus");
        const dot = document.createElement("span");
        dot.className = "status-dot";
        dot.style.backgroundColor = color;
        statusElement.replaceChildren(dot, document.createTextNode(labels[status] || labels.review));
        statusElement.style.color = color;
        statusElement.style.backgroundColor = background;
    }

    function setFormEnabled(enabled) {
        Object.values(fieldInputs).forEach(input => {
            if (input) input.disabled = !enabled || input.id === "rawText";
        });
        $("approveButton").disabled = !enabled;
        $("rejectButton").disabled = !enabled;
    }

    function clearPreview() {
        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
            localPreviewUrl = null;
        }
        pdfPreview.removeAttribute("src");
        imagePreview.removeAttribute("src");
        pdfPreview.hidden = true;
        imagePreview.hidden = true;
        placeholder.hidden = false;
        $("downloadFile").hidden = true;
        zoom = 1;
        previewTransform.style.transform = "";
        $("zoomValue").textContent = "100%";
    }

    function updatePreview(doc) {
        clearPreview();
        $("originalFileName").textContent = doc
            ? doc.filename
            : "Nenhum documento selecionado";
        $("fileMetadata").textContent = doc
            ? `${String(doc.content_type || "arquivo").replace("image/", "").replace("application/", "").toUpperCase()} • ${sedaFormatBytes(doc.size)}`
            : "Selecione um documento para visualizar";

        if (!doc) return;

        const url = sedaFileUrl(doc.id);
        const isPdf = doc.content_type === "application/pdf" ||
            /\.pdf$/i.test(doc.filename);
        placeholder.hidden = true;
        if (isPdf) {
            pdfPreview.src = url;
            pdfPreview.hidden = false;
        } else {
            imagePreview.src = url;
            imagePreview.hidden = false;
        }
        const download = $("downloadFile");
        download.href = url;
        download.download = doc.filename;
        download.hidden = false;
    }

    function showDocument(doc) {
        currentDocument = doc;
        $("ocrFeedback").hidden = !doc || !doc.ocr_error;
        $("ocrFeedback").textContent = doc && doc.ocr_error ? doc.ocr_error : "";
        updateStatus(doc ? doc.status : "review");
        updatePreview(doc);

        const fields = {};
        (doc && Array.isArray(doc.fields) ? doc.fields : []).forEach(field => {
            fields[field.key] = field.value || "";
        });
        Object.keys(fieldInputs).forEach(key => {
            fieldInputs[key].value = fields[key] || "";
        });

        const valuesCount = Object.keys(fieldInputs)
            .filter(key => key !== "texto_bruto" && fields[key])
            .length;
        $("fieldCount").textContent = `${valuesCount} campos preenchidos`;
        setFormEnabled(Boolean(doc) && doc.status === "review");
    }

    function updateCounts() {
        const pending = documents.filter(doc => doc.status === "review").length;
        $("pendingCount").textContent = pending === 1
            ? "1 documento pendente"
            : `${pending} documentos pendentes`;
        $("sidebarPending").textContent = String(pending);
    }

    async function loadDocument(id) {
        const requestId = ++documentLoadId;
        if (!id) {
            showDocument(null);
            return;
        }
        setFormEnabled(false);
        try {
            const doc = await sedaRequest(`/documents/${encodeURIComponent(id)}`);
            if (requestId !== documentLoadId || select.value !== id) return;
            showDocument(doc);
            sedaClearPageError();
        } catch (error) {
            if (requestId !== documentLoadId || select.value !== id) return;
            sedaShowPageError(error.message);
            showDocument(null);
        }
    }

    async function loadDocuments(selectedId) {
        try {
            documents = await sedaGetDocuments();
            updateCounts();
            select.replaceChildren();

            if (documents.length === 0) {
                const option = document.createElement("option");
                option.value = "";
                option.textContent = "Nenhum documento disponível";
                select.append(option);
                showDocument(null);
                return;
            }

            documents.forEach(doc => {
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = `${doc.filename} — ${sedaStatusLabel(doc.status)}`;
                select.append(option);
            });

            const nextId = selectedId && documents.some(doc => doc.id === selectedId)
                ? selectedId
                : documents.find(doc => doc.status === "review")?.id || documents[0].id;
            select.value = nextId;
            await loadDocument(nextId);
            sedaClearPageError();
        } catch (error) {
            select.replaceChildren();
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Falha ao carregar documentos";
            select.append(option);
            showDocument(null);
            sedaShowPageError(error.message);
        }
    }

    function collectFields(rejectionReason) {
        const observations = fieldInputs.observacoes.value.trim();
        const fields = Object.keys(fieldInputs).map(key => ({
            key,
            label: fieldLabels[key],
            value: key === "observacoes" && rejectionReason
                ? [observations, `Motivo da rejeição: ${rejectionReason}`]
                    .filter(Boolean)
                    .join("\n")
                : fieldInputs[key].value.trim()
        }));
        return fields;
    }

    async function saveDocument(status, rejectionReason) {
        if (!currentDocument) return;
        const buttons = [$("approveButton"), $("rejectButton"), $("confirmReject")];
        buttons.forEach(button => { button.disabled = true; });
        try {
            await sedaUpdateDocument(
                currentDocument.id,
                collectFields(rejectionReason),
                status
            );
            const doc = documents.find(item => item.id === currentDocument.id);
            if (doc) doc.status = status;
            updateCounts();
            const option = select.options[select.selectedIndex];
            if (option) option.textContent =
                `${currentDocument.filename} — ${sedaStatusLabel(status)}`;
            updateStatus(status);
            currentDocument.status = status;
            setFormEnabled(false);
            $("resultIcon").classList.toggle("rejected", status === "rejected");
            $("resultTitle").textContent = status === "approved"
                ? "Documento aprovado!"
                : "Documento rejeitado";
            $("resultMessage").textContent = status === "approved"
                ? "Os dados revisados foram salvos."
                : "A rejeição e o motivo informado foram salvos.";
            resultModal.show();
            sedaClearPageError();
        } catch (error) {
            sedaShowPageError(error.message);
            setFormEnabled(true);
        } finally {
            buttons.forEach(button => {
                button.disabled = !currentDocument || currentDocument.status !== "review";
            });
        }
    }

    $("menuToggle").addEventListener("click", () => {
        $("sidebar").classList.toggle("open");
    });

    document.addEventListener("click", event => {
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

    $("notificationButton").addEventListener("click", () => {
        notify("Você está na central de conferência do S.E.D.A.");
    });

    select.addEventListener("change", () => loadDocument(select.value));

    $("zoomIn").addEventListener("click", () => {
        zoom = Math.min(zoom + 0.1, 2);
        previewTransform.style.transform = `scale(${zoom})`;
        $("zoomValue").textContent = `${Math.round(zoom * 100)}%`;
    });
    $("zoomOut").addEventListener("click", () => {
        zoom = Math.max(zoom - 0.1, 0.5);
        previewTransform.style.transform = `scale(${zoom})`;
        $("zoomValue").textContent = `${Math.round(zoom * 100)}%`;
    });
    $("zoomReset").addEventListener("click", () => {
        zoom = 1;
        previewTransform.style.transform = "";
        $("zoomValue").textContent = "100%";
    });

    $("originalFile").addEventListener("change", event => {
        const input = event.currentTarget;
        const file = input.files && input.files[0];
        if (!file) return;
        const supportedExtension = /\.(pdf|jpe?g|png)$/i.test(file.name);
        const supportedType = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ].includes(file.type);
        if (!supportedExtension || (file.type && !supportedType)) {
            notify("Formato inválido. Utilize PDF, JPG ou PNG.");
            input.value = "";
            return;
        }
        if (file.size === 0 || file.size > 10 * 1024 * 1024) {
            notify("O arquivo deve ter até 10 MB e não pode estar vazio.");
            input.value = "";
            return;
        }
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = URL.createObjectURL(file);
        placeholder.hidden = true;
        $("originalFileName").textContent = file.name;
        $("fileMetadata").textContent = `${file.type || "Arquivo"} • ${sedaFormatBytes(file.size)}`;
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
            imagePreview.hidden = true;
            imagePreview.removeAttribute("src");
            pdfPreview.src = localPreviewUrl;
            pdfPreview.hidden = false;
        } else if (file.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(file.name)) {
            pdfPreview.hidden = true;
            pdfPreview.removeAttribute("src");
            imagePreview.src = localPreviewUrl;
            imagePreview.hidden = false;
        }
        $("downloadFile").href = localPreviewUrl;
        $("downloadFile").download = file.name;
        $("downloadFile").hidden = false;
    });

    $("rejectButton").addEventListener("click", () => {
        $("rejectionReason").value = "";
        $("rejectionError").hidden = true;
        $("confirmReject").disabled = false;
        rejectModal.show();
    });

    $("confirmReject").addEventListener("click", () => {
        const reason = $("rejectionReason").value.trim();
        if (!reason) {
            $("rejectionError").hidden = false;
            return;
        }
        $("confirmReject").disabled = true;
        $("rejectModal").addEventListener(
            "hidden.bs.modal",
            () => saveDocument("rejected", reason),
            { once: true }
        );
        rejectModal.hide();
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        saveDocument("approved");
    });

    loadDocuments();
});
