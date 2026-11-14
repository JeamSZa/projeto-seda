import json
import logging
import mimetypes
import os
import re
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Generator, Literal

import pandas as pd
import pymupdf
import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent


def configured_path(variable: str, default: Path) -> Path:
    value = os.getenv(variable)
    path = Path(value) if value else default
    return path if path.is_absolute() else BASE_DIR / path


DATABASE_PATH = configured_path("SEDA_DATABASE_PATH", BASE_DIR / "app.db")
UPLOAD_DIR = configured_path("SEDA_UPLOAD_DIR", BASE_DIR / "uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024
OCR_ERROR_MESSAGE = (
    "Não foi possível executar o OCR. Verifique a instalação do Tesseract "
    "e o idioma português; os campos podem ser preenchidos manualmente."
)
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

if tesseract_cmd := os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seda")

app = FastAPI(title="S.E.D.A. API", version="1.0.0")
allowed_origins = os.getenv(
    "SEDA_CORS_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins.split(",")],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class DocumentField(BaseModel):
    key: str = Field(min_length=1)
    label: str = Field(min_length=1)
    value: str


class FieldsUpdate(BaseModel):
    fields: list[DocumentField]
    status: Literal["approved", "rejected", "review"] = "approved"


@contextmanager
def connect_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    with connect_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                status TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                fields_json TEXT NOT NULL,
                file_path TEXT,
                file_size INTEGER NOT NULL DEFAULT 0,
                content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
                ocr_error TEXT
            )
            """
        )
        columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(documents)")
        }
        migrations = {
            "file_size": "ALTER TABLE documents ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0",
            "content_type": (
                "ALTER TABLE documents ADD COLUMN content_type TEXT "
                "NOT NULL DEFAULT 'application/octet-stream'"
            ),
            "ocr_error": "ALTER TABLE documents ADD COLUMN ocr_error TEXT",
        }
        for column, statement in migrations.items():
            if column not in columns:
                conn.execute(statement)


init_db()


def extract_text_from_file(file_path: Path) -> tuple[str, bool]:
    ocr_failed = False
    if file_path.suffix.lower() == ".pdf":
        text_parts = []
        with pymupdf.open(file_path) as document:
            for page in document:
                page_text = page.get_text().strip()
                if page_text:
                    text_parts.append(page_text)
                else:
                    pixmap = page.get_pixmap(dpi=180, alpha=False)
                    image = Image.frombytes(
                        "RGB",
                        (pixmap.width, pixmap.height),
                        pixmap.samples,
                    )
                    try:
                        page_text = pytesseract.image_to_string(image, lang="por")
                    except (
                        pytesseract.TesseractNotFoundError,
                        pytesseract.TesseractError,
                    ):
                        ocr_failed = True
                        continue
                    if page_text.strip():
                        text_parts.append(page_text)
        return "\n".join(text_parts), ocr_failed

    with Image.open(file_path) as image:
        try:
            return pytesseract.image_to_string(image, lang="por"), False
        except (
            pytesseract.TesseractNotFoundError,
            pytesseract.TesseractError,
        ):
            return "", True


def validate_file(file_path: Path) -> None:
    if file_path.suffix.lower() == ".pdf":
        try:
            with pymupdf.open(file_path) as document:
                if document.page_count == 0:
                    raise HTTPException(status_code=400, detail="O PDF está vazio.")
        except pymupdf.FileDataError as exc:
            raise HTTPException(status_code=400, detail="O arquivo PDF é inválido.") from exc
        return

    try:
        with Image.open(file_path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise HTTPException(
            status_code=400,
            detail="O arquivo de imagem é inválido.",
        ) from exc


def extract_fields(text: str) -> list[dict[str, str]]:
    def labeled_value(pattern: str) -> str:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        return match.group(1).strip() if match else ""

    client = labeled_value(
        r"^\s*(?:cliente|titular|nome)\s*[:\-]\s*([^\r\n]+)"
    )
    document_number = labeled_value(
        r"^\s*(?:cpf\s*/?\s*cnpj|cpf|cnpj|documento)\s*[:\-]\s*"
        r"([0-9./\-\s]{11,20})"
    )
    dates = re.findall(r"\b\d{2}[/-]\d{2}[/-]\d{4}\b", text)
    period = ""
    if len(dates) >= 2:
        period = f"{dates[0]} a {dates[1]}"
    elif dates:
        period = dates[0]

    amount_match = re.search(
        r"(?:valor\s*(?:total|líquido|bruto)?\s*[:\-]?\s*|R\$\s*)"
        r"R?\$?\s*([\d.]+(?:,\d{2}|\.\d{2}))",
        text,
        re.IGNORECASE,
    )
    amount = ""
    if amount_match:
        amount = amount_match.group(1).replace(".", "").replace(",", ".")
        if "," not in amount_match.group(1) and "." in amount_match.group(1):
            amount = amount_match.group(1)

    bank_match = re.search(
        r"\b(Banco do Brasil|Ita[uú]|Bradesco|Santander|Caixa(?: Econômica Federal)?|"
        r"Nubank|Inter|Sicredi|Sicoob)\b",
        text,
        re.IGNORECASE,
    )
    bank = bank_match.group(1).strip() if bank_match else ""

    return [
        {"key": "cliente", "label": "Nome do cliente", "value": client},
        {"key": "documento", "label": "CPF / CNPJ", "value": document_number},
        {"key": "periodo", "label": "Período de referência", "value": period},
        {"key": "valor_total", "label": "Valor Total", "value": amount},
        {
            "key": "instituicao",
            "label": "Instituição financeira",
            "value": bank,
        },
        {"key": "observacoes", "label": "Observações", "value": ""},
        {
            "key": "texto_bruto",
            "label": "Texto extraído",
            "value": text[:10000],
        },
    ]


def serialize_document(
    row: sqlite3.Row,
    include_fields: bool = False,
    include_raw_text: bool = True,
) -> dict:
    file_path = stored_file_path(row["file_path"])
    size = row["file_size"]
    if not size and file_path is not None and file_path.is_file():
        size = file_path.stat().st_size
    content_type = row["content_type"]
    if content_type == "application/octet-stream":
        content_type = mimetypes.guess_type(row["filename"])[0] or content_type
    document = {
        "id": row["id"],
        "filename": row["filename"],
        "status": row["status"],
        "uploaded_at": row["uploaded_at"],
        "size": size,
        "content_type": content_type,
        "ocr_error": row["ocr_error"],
    }
    if include_fields:
        fields = read_document_fields(row)
        document["fields"] = fields if include_raw_text else [
            field for field in fields if field.get("key") != "texto_bruto"
        ]
    return document


def read_document_fields(row: sqlite3.Row) -> list[dict[str, str]]:
    fields = json.loads(row["fields_json"])
    raw_text = next(
        (str(field.get("value", "")) for field in fields if field.get("key") == "texto_bruto"),
        "",
    )
    for field in fields:
        if (
            field.get("key") == "cliente"
            and "(fake)" in str(field.get("value", "")).lower()
        ):
            field["value"] = ""
        if (
            field.get("key") == "valor_total"
            and field.get("value") == "0.00"
            and not re.search(
                r"(?:R\$\s*|valor(?:\s+total)?\s*[:\-]?\s*)\d",
                raw_text,
                re.IGNORECASE,
            )
        ):
            field["value"] = ""
    return fields


def stored_file_path(path_value: str | None) -> Path | None:
    if not path_value:
        return None
    path = Path(path_value)
    if not path.is_absolute():
        path = BASE_DIR / path
    return path


def get_document_row(doc_id: str) -> sqlite3.Row:
    with connect_db() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    return row


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/documents", status_code=201)
async def create_document(file: UploadFile = File(...)) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="O arquivo não tem nome.")

    filename = Path(file.filename).name
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Formato não permitido. Envie PDF, JPG ou PNG.",
        )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=415,
            detail="O tipo do arquivo não corresponde aos formatos aceitos.",
        )

    doc_id = uuid.uuid4().hex
    file_path = UPLOAD_DIR / f"{doc_id}_{filename}"
    file_size = 0
    try:
        with file_path.open("wb") as destination:
            while chunk := await file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="O arquivo ultrapassa o limite de 10 MB.",
                    )
                destination.write(chunk)
        if file_size == 0:
            raise HTTPException(status_code=400, detail="O arquivo está vazio.")
        validate_file(file_path)
    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise
    except OSError as exc:
        file_path.unlink(missing_ok=True)
        logger.exception("Falha ao armazenar o arquivo enviado.")
        raise HTTPException(
            status_code=500,
            detail="Não foi possível armazenar o arquivo enviado.",
        ) from exc
    finally:
        await file.close()

    ocr_error = None
    try:
        extracted_text, ocr_failed = await run_in_threadpool(
            extract_text_from_file,
            file_path,
        )
    except OSError as exc:
        file_path.unlink(missing_ok=True)
        logger.exception("Falha ao ler o documento %s", doc_id)
        raise HTTPException(
            status_code=500,
            detail="Não foi possível ler o arquivo enviado.",
        ) from exc
    if ocr_failed:
        logger.warning("OCR indisponível para o documento %s.", doc_id)
        ocr_error = OCR_ERROR_MESSAGE

    fields = extract_fields(extracted_text)
    uploaded_at = datetime.now().astimezone().isoformat()
    try:
        with connect_db() as conn:
            conn.execute(
                """
                INSERT INTO documents (
                    id, filename, status, uploaded_at, fields_json, file_path,
                    file_size, content_type, ocr_error
                ) VALUES (?, ?, 'review', ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc_id,
                    filename,
                    uploaded_at,
                    json.dumps(fields, ensure_ascii=False),
                    str(file_path),
                    file_size,
                    content_type,
                    ocr_error,
                ),
            )
    except sqlite3.Error as exc:
        file_path.unlink(missing_ok=True)
        logger.exception("Falha ao salvar documento %s no banco de dados", doc_id)
        raise HTTPException(
            status_code=500,
            detail="Não foi possível salvar o documento.",
        ) from exc

    return {
        "id": doc_id,
        "filename": filename,
        "status": "review",
        "uploaded_at": uploaded_at,
        "size": file_size,
        "content_type": content_type,
        "ocr_error": ocr_error,
        "fields": fields,
    }


@app.get("/documents")
def list_documents(include_fields: bool = False) -> list[dict]:
    with connect_db() as conn:
        rows = conn.execute(
            """
            SELECT id, filename, status, uploaded_at, fields_json, file_size,
                   content_type, ocr_error, file_path
            FROM documents
            ORDER BY uploaded_at DESC
            """
        ).fetchall()
    return [
        serialize_document(
            row,
            include_fields=include_fields,
            include_raw_text=False,
        )
        for row in rows
    ]


@app.get("/dashboard/summary")
def dashboard_summary() -> dict:
    with connect_db() as conn:
        rows = conn.execute(
            "SELECT status, uploaded_at FROM documents"
        ).fetchall()
        recent_rows = conn.execute(
            """
            SELECT id, filename, status, uploaded_at, file_size, content_type,
                   ocr_error, file_path
            FROM documents
            ORDER BY uploaded_at DESC
            LIMIT 5
            """
        ).fetchall()

    now = datetime.now().astimezone()
    month_counts = {}
    for offset in range(5, -1, -1):
        month_index = now.month - offset
        year = now.year + (month_index - 1) // 12
        month = (month_index - 1) % 12 + 1
        month_counts[f"{year:04d}-{month:02d}"] = 0

    status_counts = {
        "total": len(rows),
        "review": 0,
        "approved": 0,
        "rejected": 0,
        "error": 0,
    }
    for row in rows:
        status = row["status"]
        if status in status_counts:
            status_counts[status] += 1
        try:
            uploaded_at = datetime.fromisoformat(row["uploaded_at"])
        except ValueError:
            logger.warning("Data inválida no registro de documento: %s", row["uploaded_at"])
            continue
        month_key = uploaded_at.strftime("%Y-%m")
        if month_key in month_counts:
            month_counts[month_key] += 1

    return {
        "counts": status_counts,
        "monthly": [
            {"month": month, "count": count}
            for month, count in month_counts.items()
        ],
        "recent_documents": [serialize_document(row) for row in recent_rows],
    }


@app.get("/documents/{doc_id}")
def get_document(doc_id: str) -> dict:
    return serialize_document(get_document_row(doc_id), include_fields=True)


@app.put("/documents/{doc_id}")
def update_document(doc_id: str, update: FieldsUpdate) -> dict:
    current = get_document_row(doc_id)
    fields = [field.model_dump() for field in update.fields]
    existing_fields = read_document_fields(current)
    if not any(field["key"] == "texto_bruto" for field in fields):
        fields.extend(
            field for field in existing_fields if field.get("key") == "texto_bruto"
        )

    with connect_db() as conn:
        cursor = conn.execute(
            """
            UPDATE documents
            SET fields_json = ?, status = ?, ocr_error = NULL
            WHERE id = ?
            """,
            (
                json.dumps(fields, ensure_ascii=False),
                update.status,
                doc_id,
            ),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Documento não encontrado.")

    return {
        "message": "Documento atualizado com sucesso.",
        "id": doc_id,
        "status": update.status,
    }


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str) -> dict[str, str]:
    row = get_document_row(doc_id)
    file_path = stored_file_path(row["file_path"])
    if file_path is not None:
        try:
            file_path.resolve().relative_to(UPLOAD_DIR.resolve())
        except ValueError as exc:
            logger.error("Caminho de arquivo fora da pasta de uploads: %s", file_path)
            raise HTTPException(
                status_code=500,
                detail="O arquivo associado ao documento está inválido.",
            ) from exc

    with connect_db() as conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))

    files_to_remove = [UPLOAD_DIR / f"export_{doc_id}.xlsx"]
    if file_path is not None:
        files_to_remove.insert(0, file_path)
    for path in files_to_remove:
        try:
            path.unlink(missing_ok=True)
        except OSError as exc:
            logger.exception("Falha ao remover arquivo associado a %s", doc_id)
            raise HTTPException(
                status_code=500,
                detail=(
                    "O registro foi removido, mas não foi possível remover "
                    "um arquivo associado."
                ),
            ) from exc
    return {"message": "Documento excluído com sucesso.", "id": doc_id}


@app.get("/files/{doc_id}")
def get_file(doc_id: str) -> FileResponse:
    row = get_document_row(doc_id)
    file_path = stored_file_path(row["file_path"])
    if file_path is None or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    try:
        file_path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError as exc:
        logger.error("Caminho de arquivo fora da pasta de uploads: %s", file_path)
        raise HTTPException(
            status_code=500,
            detail="O arquivo associado ao documento está inválido.",
        ) from exc
    return FileResponse(
        file_path,
        media_type=serialize_document(row)["content_type"],
        filename=row["filename"],
        content_disposition_type="inline",
    )


@app.get("/documents/{doc_id}/export")
def export_document(doc_id: str) -> FileResponse:
    row = get_document_row(doc_id)
    fields = read_document_fields(row)
    data = {
        field["label"]: [field["value"]]
        for field in fields
        if field["key"] != "texto_bruto"
    }
    if not data:
        raise HTTPException(
            status_code=422,
            detail="O documento não possui campos para exportar.",
        )

    excel_path = UPLOAD_DIR / f"export_{doc_id}.xlsx"
    try:
        pd.DataFrame(data).to_excel(excel_path, index=False)
    except (OSError, ValueError) as exc:
        logger.exception("Falha ao gerar exportação do documento %s", doc_id)
        raise HTTPException(
            status_code=500,
            detail="Não foi possível gerar a planilha.",
        ) from exc
    return FileResponse(
        excel_path,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        filename=f"Dados_{Path(row['filename']).stem}.xlsx",
    )
