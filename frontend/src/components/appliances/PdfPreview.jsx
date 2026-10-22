import { useEffect, useRef, useState } from 'react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export default function PdfPreview({ url }) {
  const canvas = useRef(null);
  const [document, setDocument] = useState(null), [page, setPage] = useState(1), [error, setError] = useState('');
  const [rendering, setRendering] = useState(true), [text, setText] = useState('');
  useEffect(() => {
    let active = true, task;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdfjs.getDocument({ url, isEvalSupported:false });
        const pdf = await task.promise;
        if (active) { setDocument(pdf); setPage(1); }
      } catch { if (active) { setError('This PDF cannot be previewed. Download it to open in your PDF reader.'); setRendering(false); } }
    })();
    return () => { active = false; task?.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!document) return;
    let active = true, render;
    setRendering(true); setError('');
    (async () => {
      try {
        const pdfPage = await document.getPage(page);
        if (!active || !canvas.current) return;
        const natural = pdfPage.getViewport({ scale:1 });
        const viewport = pdfPage.getViewport({ scale:Math.min(1.7,1600/natural.width,2200/natural.height) });
        const target = canvas.current; target.width = Math.floor(viewport.width); target.height = Math.floor(viewport.height);
        render = pdfPage.render({ canvasContext:target.getContext('2d'), viewport });
        await render.promise;
        const content = await pdfPage.getTextContent();
        if (active) { setText(content.items.map(item => item.str || '').join(' ')); setRendering(false); }
      } catch { if (active) { setError('This page cannot be previewed. Download the document to view it.'); setRendering(false); } }
    })();
    return () => { active = false; render?.cancel(); };
  }, [document, page]);
  return <div className="min-h-[240px] overflow-y-auto bg-slate-100">
    {document && <div className="sticky top-0 z-10 flex items-center justify-center gap-4 border-b border-slate-200 bg-white p-3 text-xs font-semibold"><button aria-label="Previous PDF page" disabled={page === 1 || rendering} onClick={() => setPage(p => p-1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {document.numPages}</span><button aria-label="Next PDF page" disabled={page === document.numPages || rendering} onClick={() => setPage(p => p+1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button></div>}
    {rendering && <p role="status" className="p-5 text-sm text-slate-500">Rendering PDF…</p>}
    {error && <p role="alert" className="p-5 text-sm text-amber-800">{error}</p>}
    <div className="max-h-[60dvh] overflow-auto p-3"><canvas ref={canvas} role="img" aria-label={`PDF page ${page}`} data-rendered={!rendering && !error} className={`mx-auto h-auto max-w-full bg-white shadow-sm ${rendering || error ? 'hidden' : ''}`} /><p className="sr-only">{text}</p></div>
  </div>;
}
