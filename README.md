- **Overview**: This document describes the analysis and retrieval-generation pipeline implemented in the notebook [medassists.ipynb](medassists.ipynb). The notebook builds a retrieval-augmented medical assistant from the PubMedQA unlabeled dataset, encodes passages with a SentenceTransformer, indexes with FAISS, and uses a seq2seq model (FLAN-T5) to generate human-friendly answers.

**Purpose**: Provide a runnable, end-to-end demo showing how to:
- Build a corpus from the `pubmed_qa` dataset
- Clean and inspect text distributions
- Create dense embeddings using `sentence-transformers`
- Index embeddings with FAISS for nearest-neighbor retrieval
- Cluster and visualize embeddings (K-Means, PCA, hierarchical clustering)
- Compose retrieved context and generate final answers with a seq2seq model
- Save model artifacts and index for reuse

**Prerequisites**:
- Python 3.9+ recommended
- GPU recommended for the generation model (FLAN-T5-large), but CPU works for smaller experiments

**Quick install (recommended in a virtual environment)**:
```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r backend/requirements.txt
```

Alternatively, run the first cell in the notebook which installs dependencies (via `pip install -q datasets sentence-transformers faiss-cpu transformers`).

**Files & Outputs the Notebook Produces**
- `faiss_index.bin` — FAISS index written with `faiss.write_index`
- `corpus.pkl` — Pickled list of passages used for retrieval
- `embedding_model/` — saved sentence-transformers model (optional)
- `generation_model/` — saved FLAN-T5 model/tokenizer (optional)
- These artifacts are saved by the notebook in the working directory (see the save cell).

**Notebook Structure & Cell-by-Cell Description** (see [medassists.ipynb](medassists.ipynb))
- 1. Environment setup (cell lines ~10–12): installs needed pip packages if running in a notebook environment.
- 2. Imports (lines ~22–33): numpy, pandas, regex, faiss, pickle, torch, matplotlib, plus `datasets`, `SentenceTransformer`, and `transformers` APIs.
- 3. Dataset loading (lines ~43–52): loads `pubmed_qa` with config `pqa_unlabeled`, and constructs a `corpus` by concatenating `context` passages.
- 4. Text cleaning (lines ~62–68): lowercases and collapses whitespace via `clean_text`.
- 5. Exploratory analysis (lines ~78–91): computes text length distribution and prints samples to understand corpus size and variability.
- 6. Embedding encoding (lines ~101–110): uses `SentenceTransformer('all-MiniLM-L6-v2')` to encode a `corpus_subset` (first ~50k) into float32 numpy arrays.
- 7. FAISS index build (lines ~120–126): constructs an `IndexFlatL2` index and adds vectors; prints `index.ntotal`.
- 8. Clustering (K-Means) and silhouette (lines ~136–150): runs KMeans (default 5 clusters) and computes silhouette score on a sample.
- 9. PCA visualization (lines ~160–201): reduces embeddings to 2D and plots clusters with centroids.
- 10. Hierarchical clustering & dendrogram (lines ~211–243): samples ~1000 vectors for hierarchical linkage and plots a dendrogram.
- 11. Search function (lines ~253–267): `search(query, k=3)` encodes a query, searches FAISS, and returns top-k passages and L2 distances as scores.
- 12. Generation model setup (lines ~277–284): loads `google/flan-t5-large` tokenizer and model, and moves the model to `cuda` if available.
- 13. Answer generation (lines ~294–318): `generate_answer(query, text)` builds a prompt instructing the model to explain answers in simple language and decodes generation.
- 14. Retrieval + generation orchestration (lines ~328–363): `generate_final_answer(query)` retrieves top-k passages, computes a similarity proxy from L2 distance, and either uses retrieved context to generate a grounded response or falls back to a general prompt when the match is weak. Returns a `source` tag and `answer`.
- 15. Example run (lines ~373–393): runs `generate_final_answer` on a sample query and prints the answer and evidence passages.
- 16. Batch queries (lines ~403–413): iterate through example queries and print answers.
- 17. Save outputs (lines ~423–435): writes FAISS index, pickles the corpus subset, and saves embedding + generation models to disk.
- 18. Packaging (commented out lines ~445–467): sample code to zip artifacts for distribution.

**How to run the notebook (recommended steps)**
1. Open the notebook [medassists.ipynb](medassists.ipynb) in Jupyter or VS Code.
2. Create/activate a Python virtual environment and install dependencies (see above).
3. If you have limited RAM, reduce `corpus_subset` size (e.g., `[:10000]`) before building embeddings.
4. Run cells sequentially. Long-running steps:
   - Encoding embeddings (can be multi-GB and slow on CPU)
   - Loading FLAN-T5-large (requires ~3–4+ GB for model weights; GPU recommended)
5. After building the index and models, run `generate_final_answer` with your queries.

**Resource & performance notes**
- `all-MiniLM-L6-v2` embeddings are small (384-dim) and efficient; use larger `sentence-transformers` models for improved quality at cost of speed.
- FAISS `IndexFlatL2` stores vectors in RAM; for large corpora use IVF/OPQ or on-disk indexes.
- `google/flan-t5-large` is a large seq2seq model; prefer GPU for reasonable latency. Consider using a smaller generation model for CPU experiments.

**Recommendations & Improvements**
- Persist embeddings to disk after encoding so you can rebuild indexes faster.
- Replace `IndexFlatL2` with an approximate index (e.g., `IndexIVFFlat`) for large-scale datasets.
- Use a scoring calibration step instead of raw L2 inversion for similarity.
- Consider adding caching for `embedding_model.encode` and `search` to speed repeated queries.
- Add unit tests for `search`, `generate_answer`, and `generate_final_answer`.
- Avoid committing model artifacts to the repo; add them to `.gitignore` and use the `medassist_outputs/` directory (already in the workspace) for saved models.

**Security & Ethical Notes**
- The generated answers are from an AI model and should not be used as medical advice. The notebook includes a disclaimer, but ensure you have proper review/QA before any real-world use.


**Troubleshooting**
- Out of memory while encoding/generating: reduce `corpus_subset`, use smaller models, or switch to a GPU with more memory.
- FAISS import errors on Windows: ensure `faiss-cpu` is installed via pip; if issues persist, use the prebuilt wheels matching your Python version or run in WSL/Linux.
- Tokenization/generation errors with long prompts: use truncation (`max_length`) and ensure inputs are moved to the correct `device`.

**Quick commands**
- Install deps (from repo root):
```bash
python -m pip install -r backend/requirements.txt
```
- Run the notebook with Jupyter (from repo root):
```bash
jupyter notebook medassists.ipynb
```

**Acknowledgements & Data Sources**
- Dataset: `pubmed_qa` (via Hugging Face `datasets`).
- Embedding model: `sentence-transformers/all-MiniLM-L6-v2`.
- Generation model: `google/flan-t5-large` (Hugging Face Transformers).

**Disclaimer**
This README summarizes an exploratory notebook and is provided for development and research purposes only. Any medical information produced by the pipeline requires verification by qualified medical professionals.
