// The frontend can override this before loading this file when the API is remote.
const SEDA_API_BASE_URL = (
    window.SEDA_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function sedaRequest(path, options) {
    const response = await fetch(SEDA_API_BASE_URL + path, options);
    const contentType = response.headers.get("content-type") || "";
    let payload = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else if (!response.ok) {
        payload = await response.text();
    }

    if (!response.ok) {
        const detail = payload && payload.detail
            ? payload.detail
            : typeof payload === "string" && payload
                ? payload
                : `Falha na comunicação com a API (${response.status}).`;
        throw new Error(detail);
    }

    return payload;
}

function sedaFileUrl(docId) {
    return `${SEDA_API_BASE_URL}/files/${encodeURIComponent(docId)}`;
}

function sedaStatusLabel(status) {
    const labels = {
        review: "Pendente",
        approved: "Processado",
        rejected: "Rejeitado",
        error: "Erro"
    };
    return labels[status] || status;
}
