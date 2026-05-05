# MedAssists Backend

Run the FastAPI backend (requires Python 3.9+ and packages in `requirements.txt`):

Create a virtualenv and install:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

Endpoints:
- `GET /` health
- `POST /embed` {"texts": ["...", ...]} -> embeddings
- `POST /search` {"query":"...","top_k":5} -> search results
- `POST /generate` {"prompt":"...","max_tokens":128} -> generated text

Notes: If local models under `medassist_outputs/` are present, the server will attempt to use them. Otherwise endpoints return simple mock responses to keep the service safe and runnable.
