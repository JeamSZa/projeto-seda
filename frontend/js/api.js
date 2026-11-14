const SEDA_API_BASE_URL = (
    window.SEDA_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function sedaRequest(path, options = {}) {
    let response;
    try {
        response = await fetch(`${SEDA_API_BASE_URL}${path}`, options);
    } catch (error) {
        throw new Error(
            "Não foi possível conectar à API. Verifique se o backend está em execução."
        );
    }

    const contentType = response.headers.get("content-type") || "";
    let payload = null;
    if (response.status !== 204) {
        payload = contentType.includes("application/json")
            ? await response.json()
            : await response.text();
    }

    if (!response.ok) {
        const detail = payload && typeof payload === "object"
            ? payload.detail
            : payload;
        throw new Error(
            detail || `Falha na comunicação com a API (${response.status}).`
        );
    }

    return payload;
}

function sedaGetDocuments(includeFields = false) {
    const query = includeFields ? "?include_fields=true" : "";
    return sedaRequest(`/documents${query}`);
}

function sedaUploadDocument(file) {
    const body = new FormData();
    body.append("file", file);
    return sedaRequest("/documents", { method: "POST", body });
}

function sedaUpdateDocument(id, fields, status) {
    return sedaRequest(`/documents/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, status })
    });
}

function sedaFileUrl(id) {
    return `${SEDA_API_BASE_URL}/files/${encodeURIComponent(id)}`;
}

function sedaExportUrl(id) {
    return `${SEDA_API_BASE_URL}/documents/${encodeURIComponent(id)}/export`;
}

function sedaFieldMap(fields = []) {
    return Object.fromEntries(fields.map(field => [field.key, field]));
}

function sedaStatusLabel(status) {
    return ({
        review: "Pendente",
        approved: "Aprovado",
        rejected: "Rejeitado",
        error: "Erro"
    })[status] || status || "Pendente";
}

function sedaFormatDate(value, withTime = false) {
    if (!value) return "Não registrada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Não registrada";
    return date.toLocaleString("pt-BR", withTime
        ? { dateStyle: "short", timeStyle: "short" }
        : { dateStyle: "short" });
}

function sedaFormatBytes(value) {
    const size = Number(value) || 0;
    if (size < 1024 * 1024) {
        return `${(size / 1024).toLocaleString("pt-BR", {
            maximumFractionDigits: 1
        })} KB`;
    }
    return `${(size / (1024 * 1024)).toLocaleString("pt-BR", {
        maximumFractionDigits: 2
    })} MB`;
}

function sedaFormatCurrency(value) {
    if (value === "" || value === null || value === undefined) {
        return "Não informado";
    }
    const raw = String(value).trim();
    const normalized = typeof value === "number"
        ? value
        : Number(raw.includes(",")
            ? raw.replace(/\./g, "").replace(",", ".")
            : raw);
    if (!Number.isFinite(normalized)) return String(value);
    return normalized.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function sedaDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (url.startsWith("blob:")) {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

function sedaCsv(rows) {
    return "\uFEFF" + rows.map(row =>
        row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")
    ).join("\r\n");
}

function sedaShowPageError(message) {
    let banner = document.getElementById("apiErrorBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "apiErrorBanner";
        banner.className = "alert alert-danger";
        banner.setAttribute("role", "alert");
        const main = document.querySelector("main");
        if (main) main.prepend(banner);
    }
    banner.textContent = message;
    banner.hidden = false;
}

function sedaClearPageError() {
    const banner = document.getElementById("apiErrorBanner");
    if (banner) {
        banner.hidden = true;
        banner.textContent = "";
    }
}

function sedaShowPageMessage(message) {
    let banner = document.getElementById("apiMessageBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "apiMessageBanner";
        banner.className = "alert alert-info";
        banner.setAttribute("role", "status");
        const main = document.querySelector("main");
        if (main) main.prepend(banner);
    }
    banner.textContent = message;
    banner.hidden = false;
}
