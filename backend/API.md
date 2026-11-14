# API do S.E.D.A.

Base local: `http://localhost:8000`

O backend persiste os documentos em `backend/app.db` e os arquivos em
`backend/uploads/`, independentemente da pasta de onde o servidor é iniciado.
Os caminhos podem ser sobrescritos com `SEDA_DATABASE_PATH` e `SEDA_UPLOAD_DIR`.

## Executar localmente

Execute os comandos abaixo a partir da raiz do projeto. Configure o ambiente
uma vez:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Terminal 1:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Em outro terminal, na raiz do projeto, sirva a pasta `frontend`:

```powershell
python -m http.server 5500 --directory frontend
```

Abra
`http://localhost:5500/documentos.html`. O frontend usa `http://localhost:8000`
por padrão; defina `window.SEDA_API_BASE_URL` antes de carregar `js/api.js` para
usar outra URL.

O CORS local permite `localhost:5500` e `127.0.0.1:5500`. Para outra origem,
configure `SEDA_CORS_ORIGINS` com uma lista separada por vírgulas. Defina
`TESSERACT_CMD` se o executável Tesseract não estiver no `PATH`. O idioma `por`
também precisa estar instalado (no Windows, por exemplo:
`$env:TESSERACT_CMD = 'C:\Program Files\Tesseract-OCR\tesseract.exe'`).
PDFs com texto selecionável continuam sendo lidos sem Tesseract. Se o OCR não estiver disponível, o upload fica
salvo como pendente e os campos podem ser preenchidos na tela de conferência;
a API informa `ocr_error` em vez de inserir dados fictícios.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Verifica se a API está disponível. |
| `POST` | `/documents` | Envia e processa um PDF, JPG ou PNG. |
| `GET` | `/documents` | Lista os documentos e seus metadados. |
| `GET` | `/documents/{id}` | Retorna metadados e campos extraídos/editados. |
| `PUT` | `/documents/{id}` | Salva os campos e o estado de revisão. |
| `DELETE` | `/documents/{id}` | Remove o registro e o arquivo enviado. |
| `GET` | `/files/{id}` | Exibe o arquivo original. |
| `GET` | `/documents/{id}/export` | Baixa os campos do documento em Excel. |
| `GET` | `/dashboard/summary` | Retorna métricas, série mensal e documentos recentes. |

### Upload

Envie `multipart/form-data` com o campo `file`. O tamanho máximo é 10 MB.
O endpoint retorna `201` e um documento com `id`, `filename`, `status`,
`uploaded_at`, `size` (bytes), `content_type`, `fields` e, se necessário,
`ocr_error`.

### Campos extraídos

`fields` é uma lista de objetos `{ "key", "label", "value" }`. As chaves
integradas à tela de conferência são `cliente`, `documento`, `periodo`,
`valor_total`, `instituicao` e `observacoes`. `texto_bruto` contém o texto
reconhecido para consulta e não é substituído ao salvar a revisão.
Para incluir os campos resumidos na listagem sem o texto OCR completo, use
`GET /documents?include_fields=true`.

O OCR preenche apenas valores encontrados no arquivo. Campos não identificados
ficam vazios para conferência manual; não são usados valores fictícios.

### Estados

| API | Tela |
|---|---|
| `review` | Pendente |
| `approved` | Processado / Aprovado |
| `rejected` | Rejeitado |
| `error` | Erro |

Para aprovar, envie `PUT /documents/{id}` com `fields` e `status: "approved"`.
Para rejeitar, envie os mesmos campos com `status: "rejected"`. O status pode
ser omitido para manter compatibilidade com clientes antigos; nesse caso, o
documento é aprovado.

Exemplo:

```json
{
  "status": "approved",
  "fields": [
    { "key": "cliente", "label": "Nome do cliente", "value": "Cliente" },
    { "key": "documento", "label": "CPF / CNPJ", "value": "000.000.000-00" },
    { "key": "periodo", "label": "Período de referência", "value": "01/11/2026" },
    { "key": "valor_total", "label": "Valor Total", "value": "1250.00" },
    { "key": "instituicao", "label": "Instituição financeira", "value": "Banco" },
    { "key": "observacoes", "label": "Observações", "value": "" }
  ]
}
```

## Limites atuais do projeto

- O OCR é uma extração inicial baseada em texto e padrões comuns; os campos
  precisam ser conferidos por uma pessoa.
- A tela de login ainda não possui usuários, política de credenciais, sessões
  ou endpoint de autenticação definidos. O acesso às rotas da API não é
  autenticado e não deve ser exposto publicamente antes de implementar esses
  requisitos.
