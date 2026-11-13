# S.E.D.A.

**Sistema de Extração e Dados Automatizados** é uma aplicação web para receber
documentos financeiros, extrair informações iniciais, permitir a conferência
manual dos dados e acompanhar o estado de processamento dos documentos.

O projeto reúne uma interface web estática e uma API local. O backend aceita
PDF, JPG e PNG, armazena os arquivos e seus metadados, e disponibiliza os dados
para consulta e exportação em Excel.

> **Importante:** a extração automática é apenas um auxílio. Os campos devem ser
> conferidos por uma pessoa antes de serem considerados corretos.

## Funcionalidades

- **Documentos:** envio, listagem, consulta e exclusão de documentos.
- **Extração inicial:** leitura do texto de PDFs e OCR de documentos digitalizados
  ou imagens, quando o Tesseract está disponível.
- **Conferência:** edição dos campos extraídos e aprovação ou rejeição do
  documento.
- **Dashboard:** resumo dos documentos por estado, atividade mensal e documentos
  recentes.
- **Exportação:** download dos campos de um documento em uma planilha Excel.
- **Persistência local:** metadados em SQLite e arquivos em `backend/uploads/`.

Os campos reconhecidos incluem nome do cliente, CPF/CNPJ, período, valor total,
instituição financeira e observações. O texto extraído também pode ser
consultado. Valores não encontrados ficam vazios para preenchimento manual.

## Tecnologias

- **Frontend:** HTML, CSS e JavaScript; Bootstrap e Bootstrap Icons são
  carregados por CDN.
- **Backend:** Python, FastAPI e Uvicorn.
- **Dados:** SQLite.
- **Documentos e extração:** PyMuPDF, Pillow e pytesseract/Tesseract.
- **Exportação:** pandas e openpyxl.

## Requisitos

- Python instalado.
- Acesso à internet para carregar Bootstrap, ícones e fontes externas usados
  pela interface.
- **Opcional:** Tesseract OCR com o idioma português (`por`) para fazer OCR de
  imagens e PDFs digitalizados. PDFs que já contêm texto selecionável podem ser
  lidos sem o Tesseract.

## Como executar localmente

Execute os comandos a partir da raiz do projeto.

### 1. Criar o ambiente e instalar dependências

No PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

### 2. Iniciar a API

Em um terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

A API ficará disponível em `http://localhost:8000`. A documentação interativa
do FastAPI fica em `http://localhost:8000/docs`.

### 3. Servir a interface

Em outro terminal, também na raiz do projeto:

```powershell
python -m http.server 5500 --directory frontend
```

Abra `http://localhost:5500/documentos.html` para enviar e consultar documentos.
As telas também podem ser acessadas diretamente:

- `http://localhost:5500/dashboard.html` — dashboard
- `http://localhost:5500/documentos.html` — documentos
- `http://localhost:5500/conferencia.html` — conferência
- `http://localhost:5500/index.html` — tela de acesso demonstrativa

Para encerrar cada serviço, pressione `Ctrl+C` no terminal correspondente.

## Configuração do OCR

Instale o Tesseract OCR e o pacote de idioma português (`por`). Se o executável
não estiver no `PATH`, defina `TESSERACT_CMD` no terminal que iniciará a API:

```powershell
$env:TESSERACT_CMD = 'C:\Program Files\Tesseract-OCR\tesseract.exe'
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Se o Tesseract ou o idioma não estiver disponível, os uploads continuam sendo
salvos como pendentes. Os campos poderão ser preenchidos manualmente na
conferência; a API sinalizará a falha de OCR.

## Fluxo básico

1. Envie um PDF, JPG ou PNG na tela de documentos.
2. A API valida o formato e o tamanho, salva o arquivo e tenta extrair texto.
3. O documento aparece como **Pendente** (`review`); revise os campos extraídos.
4. Edite as informações necessárias e aprove ou rejeite o documento.
5. Consulte os indicadores no dashboard ou exporte os campos para Excel.

O limite de upload é **10 MB por arquivo**. A exclusão de um documento também
remove o arquivo original e a exportação associada.

## Estrutura do projeto

```text
.
├── backend/
│   ├── main.py             # API, persistência, validação e extração
│   ├── API.md              # Referência dos endpoints e execução local
│   ├── requirements.txt    # Dependências Python
│   ├── app.db              # Banco SQLite local (gerado em execução)
│   └── uploads/            # Arquivos enviados e planilhas geradas
└── frontend/
    ├── index.html          # Tela de acesso demonstrativa
    ├── dashboard.html      # Indicadores e documentos recentes
    ├── documentos.html     # Upload e listagem de documentos
    ├── conferencia.html    # Conferência e edição dos dados
    ├── css/                # Estilos das telas
    └── js/                 # Integração com a API e lógica da interface
```

O banco e os uploads são locais e estão excluídos do Git pelo `.gitignore`.
Mantenha cópias de segurança fora do repositório se precisar preservar esses
dados.

## API e configurações

A referência dos endpoints está em [`backend/API.md`](backend/API.md). A API
usa `http://localhost:8000` por padrão. O frontend permite substituir essa URL
definindo `window.SEDA_API_BASE_URL` antes de carregar `frontend/js/api.js`.

Variáveis de ambiente opcionais:

| Variável | Finalidade |
|---|---|
| `TESSERACT_CMD` | Caminho do executável Tesseract, se não estiver no `PATH`. |
| `SEDA_DATABASE_PATH` | Caminho alternativo para o banco SQLite. |
| `SEDA_UPLOAD_DIR` | Pasta alternativa para os arquivos e exportações. |
| `SEDA_CORS_ORIGINS` | Origens permitidas pelo CORS, separadas por vírgula. |

No PowerShell, por exemplo:

```powershell
$env:SEDA_CORS_ORIGINS = 'http://localhost:5500,http://127.0.0.1:5500'
```

## Limitações e segurança

- A leitura automática usa padrões comuns e pode não reconhecer corretamente
  todos os documentos. Sempre confira os dados.
- A tela de acesso ainda não autentica usuários; não há contas, sessões ou
  recuperação de senha implementadas.
- As rotas da API não exigem autenticação. **Não exponha o serviço publicamente**
  nem use dados sensíveis em uma implantação real sem implementar controles de
  acesso e as medidas de segurança necessárias.
