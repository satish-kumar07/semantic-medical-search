// import React, {useState} from 'react'

// const API = 'http://127.0.0.1:8000'

// export default function App(){
//   const [prompt, setPrompt] = useState('')
//   const [gen, setGen] = useState('')
//   const [query, setQuery] = useState('')
//   const [searchRes, setSearchRes] = useState([])

//   async function handleGenerate(){
//     const r = await fetch(`${API}/generate`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt, max_tokens:128})})
//     const j = await r.json()
//     setGen(j.generated_text || JSON.stringify(j))
//   }

//   async function handleSearch(){
//     const r = await fetch(`${API}/search`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query, top_k:5})})
//     const j = await r.json()
//     setSearchRes(j.results || [])
//   }

//   return (
//     <div className="container">
//       <h1>MedAssists</h1>
//       <section>
//         <h2>Generate</h2>
//         <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Enter prompt" />
//         <button onClick={handleGenerate}>Generate</button>
//         <pre className="output">{gen}</pre>
//       </section>

//       <section>
//         <h2>Search</h2>
//         <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search query" />
//         <button onClick={handleSearch}>Search</button>
//         <ul>
//           {searchRes.map((r, i)=> (
//             <li key={i}><strong>{r.score?.toFixed?.(3) ?? ''}</strong> — {r.text}</li>
//           ))}
//         </ul>
//       </section>
//     </div>
//   )
// }


import React, { useState } from 'react'

const API = 'http://127.0.0.1:8000'

const styles = {
  app: { maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid #e0e0e0' },
  logo: { width: 32, height: 32, borderRadius: 8, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 500, margin: 0 },
  subtitle: { fontSize: 12, color: '#888', marginTop: 1 },
  tabs: { display: 'flex', gap: 4, background: '#f5f5f5', padding: 4, borderRadius: 8, marginBottom: '1.25rem' },
  tab: (active) => ({ flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 500, textAlign: 'center', borderRadius: 6, cursor: 'pointer', border: active ? '0.5px solid #ddd' : 'none', background: active ? '#fff' : 'transparent', color: active ? '#111' : '#888', transition: 'all 0.15s' }),
  card: { background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, padding: '1.25rem' },
  label: { fontSize: 12, color: '#888', marginBottom: 6, display: 'block', letterSpacing: '0.02em' },
  textarea: { width: '100%', minHeight: 110, resize: 'vertical', fontSize: 14, padding: '10px 12px', border: '0.5px solid #ccc', borderRadius: 8, background: '#f9f9f9', color: '#111', lineHeight: 1.6, fontFamily: 'sans-serif', boxSizing: 'border-box' },
  input: { width: '100%', padding: '9px 12px', fontSize: 14, border: '0.5px solid #ccc', borderRadius: 8, background: '#f9f9f9', color: '#111', fontFamily: 'sans-serif', boxSizing: 'border-box' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 },
  btnPrimary: (disabled) => ({ padding: '9px 18px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '0.5px solid #1D9E75', cursor: disabled ? 'not-allowed' : 'pointer', background: '#1D9E75', color: '#fff', opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap' }),
  btnSecondary: { padding: '9px 18px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '0.5px solid #ddd', cursor: 'pointer', background: '#fff', color: '#333', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  divider: { height: '0.5px', background: '#e8e8e8', margin: '1rem 0' },
  outputLabel: { fontSize: 11, color: '#aaa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  outputBox: { background: '#f9f9f9', border: '0.5px solid #e0e0e0', borderRadius: 8, padding: 12, minHeight: 60 },
  pre: { fontFamily: 'monospace', fontSize: 13, color: '#111', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, margin: 0 },
  emptyState: { textAlign: 'center', padding: '1.5rem 1rem', color: '#bbb', fontSize: 13 },
  resultItem: { background: '#f9f9f9', border: '0.5px solid #e0e0e0', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  scoreBadge: { background: '#E1F5EE', color: '#0F6E56', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 },
  resultText: { fontSize: 13, color: '#111', lineHeight: 1.55 },
  tokenRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  tokenLabel: { fontSize: 12, color: '#888' },
  tokenVal: { fontSize: 13, fontWeight: 500, minWidth: 32 },
  errorText: { fontSize: 13, color: '#c0392b', textAlign: 'center', padding: '1rem' },
}

export default function App() {
  const [activeTab, setActiveTab] = useState('generate')

  const [prompt, setPrompt] = useState('')
  const [maxTokens, setMaxTokens] = useState(128)
  const [genOutput, setGenOutput] = useState(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')

  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  async function handleGenerate() {
    if (!prompt.trim()) return
    setGenLoading(true)
    setGenError('')
    setGenOutput(null)
    try {
      const r = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: maxTokens }),
      })
      const j = await r.json()
      setGenOutput(j.generated_text || JSON.stringify(j, null, 2))
    } catch (e) {
      setGenError(e.message)
    }
    setGenLoading(false)
  }

  async function handleSearch() {
    if (!query.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchResults(null)
    try {
      const r = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: topK }),
      })
      const j = await r.json()
      setSearchResults(j.results || [])
    } catch (e) {
      setSearchError(e.message)
    }
    setSearchLoading(false)
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="8.5" y="3" width="3" height="14" rx="1.5" fill="white" />
            <rect x="3" y="8.5" width="14" height="3" rx="1.5" fill="white" />
          </svg>
        </div>
        <div>
          <p style={styles.title}>MedAssist</p>
          <p style={styles.subtitle}>Medical AI — generation &amp; search</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={styles.tab(activeTab === 'generate')} onClick={() => setActiveTab('generate')}>Generate</button>
        <button style={styles.tab(activeTab === 'search')} onClick={() => setActiveTab('search')}>Search</button>
      </div>

      {/* Generate Panel */}
      {activeTab === 'generate' && (
        <div style={styles.card}>
          <label style={styles.label}>Prompt</label>
          <textarea
            style={styles.textarea}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the clinical scenario or question…"
          />
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Max tokens</span>
            <input
              type="range" min="32" max="512" step="32"
              value={maxTokens}
              onChange={e => setMaxTokens(Number(e.target.value))}
              style={{ width: 120 }}
            />
            <span style={styles.tokenVal}>{maxTokens}</span>
          </div>
          <div style={styles.row}>
            <button
              style={styles.btnPrimary(genLoading || !prompt.trim())}
              disabled={genLoading || !prompt.trim()}
              onClick={handleGenerate}
            >
              {genLoading ? 'Running…' : 'Run generation'}
            </button>
            <button style={styles.btnSecondary} onClick={() => { setPrompt(''); setGenOutput(null); setGenError('') }}>
              Clear
            </button>
          </div>
          <div style={styles.divider} />
          <div style={styles.outputLabel}>Output</div>
          <div style={styles.outputBox}>
            {genLoading && <div style={styles.emptyState}>Generating…</div>}
            {genError && <div style={styles.errorText}>Error: {genError}</div>}
            {genOutput !== null && <pre style={styles.pre}>{genOutput}</pre>}
            {!genLoading && !genError && genOutput === null && (
              <div style={styles.emptyState}>Generated text will appear here</div>
            )}
          </div>
        </div>
      )}

      {/* Search Panel */}
      {activeTab === 'search' && (
        <div style={styles.card}>
          <label style={styles.label}>Query</label>
          <input
            style={styles.input}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. symptoms of acute pancreatitis"
          />
          <div style={styles.row}>
            <span style={styles.tokenLabel}>Top K</span>
            <input
              type="range" min="1" max="10" step="1"
              value={topK}
              onChange={e => setTopK(Number(e.target.value))}
              style={{ width: 90 }}
            />
            <span style={styles.tokenVal}>{topK}</span>
            <button
              style={{ ...styles.btnPrimary(searchLoading || !query.trim()), marginLeft: 'auto' }}
              disabled={searchLoading || !query.trim()}
              onClick={handleSearch}
            >
              {searchLoading ? 'Searching…' : 'Search'}
            </button>
            <button style={styles.btnSecondary} onClick={() => { setQuery(''); setSearchResults(null); setSearchError('') }}>
              Clear
            </button>
          </div>
          <div style={styles.divider} />
          <div style={styles.outputLabel}>Results</div>
          {searchLoading && <div style={styles.emptyState}>Searching…</div>}
          {searchError && <div style={styles.errorText}>Error: {searchError}</div>}
          {searchResults !== null && searchResults.length === 0 && (
            <div style={styles.emptyState}>No results found</div>
          )}
          {searchResults && searchResults.length > 0 && (
            <div>
              {searchResults.map((r, i) => (
                <div key={i} style={styles.resultItem}>
                  <span style={styles.scoreBadge}>
                    {typeof r.score === 'number' ? r.score.toFixed(3) : '—'}
                  </span>
                  <span style={styles.resultText}>{r.text}</span>
                </div>
              ))}
            </div>
          )}
          {!searchLoading && !searchError && searchResults === null && (
            <div style={styles.emptyState}>Search results will appear here</div>
          )}
        </div>
      )}
    </div>
  )
}