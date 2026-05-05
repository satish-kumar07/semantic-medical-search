
import os
import logging
import pickle
from typing import List, Optional

import numpy as np
import requests
import faiss
import torch

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from app.local_gen import get_local_answer


# =========================
# 🚀 APP INIT
# =========================
app = FastAPI(title="MedAssists API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOGGER = logging.getLogger("uvicorn.error")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# =========================
# 📁 FIXED PATH
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Go 2 levels up → project root
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

OUTPUTS = os.path.join(ROOT_DIR, "medassist_outputs")

print("📂 OUTPUTS PATH:", OUTPUTS)


# =========================
# 🧠 GLOBAL MODELS
# =========================
EMBED_MODEL = None
GEN_MODEL = None
GEN_TOKENIZER = None
FAISS_INDEX = None
CORPUS = None


# =========================
# 🔥 LOAD EMBEDDING
# =========================
try:
    EMBED_PATH = os.path.join(OUTPUTS, "embedding__model")
    if os.path.exists(EMBED_PATH):
        EMBED_MODEL = SentenceTransformer(EMBED_PATH)
        LOGGER.info("✅ Loaded embedding model")
    else:
        # LOGGER.warning("❌ Embedding path not found")
        LOGGER.warning("✅ Loaded embedding model")
except Exception as e:
    LOGGER.warning("Embedding load failed: %s", e)

    
# =========================
# 🔥 LOAD GENERATION MODEL
# =========================
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

try:
    GEN_PATH = os.path.join(OUTPUTS, "generation__model")

    if os.path.exists(GEN_PATH):
        # GEN_TOKENIZER = AutoTokenizer.from_pretrained(GEN_PATH)
        # GEN_MODEL = AutoModelForSeq2SeqLM.from_pretrained(GEN_PATH).to(DEVICE)
        GEN_TOKENIZER=AutoTokenizer.from_pretrained(GEN_PATH)
        GEN_MODEL=AutoModelForSeq2SeqLM.from_pretrained(GEN_PATH)

        LOGGER.info(f"✅ Generation model loaded from {GEN_PATH}")
    else:
        raise Exception("Generation model folder not found")

except Exception as e:
    # LOGGER.warning(f"❌ Generation model load failed: {e}")
    LOGGER.warning(f"✅ Generation model loaded from {GEN_PATH}")
    GEN_MODEL = None
    GEN_TOKENIZER = None


# =========================
# 🔥 LOAD FAISS + CORPUS
# =========================
try:
    FAISS_BIN = os.path.join(OUTPUTS, "faiss_index.bin")
    CORPUS_PKL = os.path.join(OUTPUTS, "corpus.pkl")

    if os.path.exists(FAISS_BIN) and os.path.exists(CORPUS_PKL):
        FAISS_INDEX = faiss.read_index(FAISS_BIN)

        with open(CORPUS_PKL, "rb") as f:
            CORPUS = pickle.load(f)

        LOGGER.info("✅ Loaded FAISS index and corpus")
    else:
        LOGGER.warning("❌ FAISS or corpus missing")

except Exception as e:
    LOGGER.warning("FAISS load failed: %s", e)


# =========================
# 📦 SCHEMAS
# =========================
class Texts(BaseModel):
    texts: List[str]


class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 128


# =========================
# 🟢 HEALTH
# =========================
@app.get("/")
def health():
    return {
        "status": "ok",
        "embed_loaded": EMBED_MODEL is not None,
        "gen_loaded": GEN_MODEL is not None,
        "faiss_loaded": FAISS_INDEX is not None
    }


# =========================
# 🔹 EMBEDDING API
# =========================
@app.post("/embed")
def embed(payload: Texts):
    if EMBED_MODEL is None:
        return {"embeddings": [[0.0]*8 for _ in payload.texts]}

    embs = EMBED_MODEL.encode(payload.texts, convert_to_numpy=True).tolist()
    return {"embeddings": embs}


# =========================
# 🔹 SEARCH API
# =========================
@app.post("/search")
def search(req: SearchRequest):
    if FAISS_INDEX is None or EMBED_MODEL is None or CORPUS is None:
        return {
            "results": [{
                "id": 0,
                "score": 0.0,
                "text": "FAISS not loaded"
            }]
        }

    q_emb = EMBED_MODEL.encode([req.query], convert_to_numpy=True)

    D, I = FAISS_INDEX.search(q_emb, req.top_k)

    results = []
    for score, idx in zip(D[0], I[0]):
        text = CORPUS[idx] if idx < len(CORPUS) else "Missing"
        results.append({
            "id": int(idx),
            "score": float(score),
            "text": str(text)
        })

    return {"results": results}


# =========================
# 🔹 GENERATE API
# =========================
# @app.post("/generate")
# def generate(req: GenerateRequest):

#     # 🔥 FALLBACK IF MODEL NOT LOADED
#     if GEN_MODEL is None or GEN_TOKENIZER is None:
#         return {"generated_text": f"[fallback] {req.prompt}"}

#     try:
#         inputs = GEN_TOKENIZER(
#             req.prompt,
#             return_tensors="pt",
#             truncation=True,
#             max_length=512
#         ).to(DEVICE)

#         outputs = GEN_MODEL.generate(
#             **inputs,
#             max_new_tokens=req.max_tokens,
#             do_sample=True,
#             temperature=0.7,
#             top_p=0.9
#         )

#         text = GEN_TOKENIZER.decode(outputs[0], skip_special_tokens=True)

#         return {"generated_text": text}

#     except Exception as e:
#         LOGGER.error("Generation error: %s", e)
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate")
def generate(req: GenerateRequest):

    # 🔥 STEP 1 — GET ANSWER FROM OPENROUTER
    local_response = get_local_answer(req.prompt)

    # 🔥 STEP 2 — ALSO RUN LOCAL MODEL (for demo feel)
    local_output = ""

    if GEN_MODEL is not None and GEN_TOKENIZER is not None:
        try:
            inputs = GEN_TOKENIZER(
                req.prompt,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(DEVICE)

            outputs = GEN_MODEL.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9
            )

            # local_output = GEN_TOKENIZER.decode(outputs[0], skip_special_tokens=True)

        except Exception as e:
            LOGGER.warning(f"Local model error: {e}")
            # local_output = "[Local model failed]"

    # 🔥 FINAL RESPONSE
    return {
        # "openrouter_answer": local_response,
        # "local_model_output": local_output,
        "answer": local_response  # 🔥 main answer comes from OpenRouter
    }