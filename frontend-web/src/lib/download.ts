export const downloadTextFile = (filename: string, content: string, mime = 'text/plain'): void => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

export const openPrintableReport = (
  title: string,
  rows: [string, string][],
  footer: string
): boolean => {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return false;
  const tableRows = rows
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('');
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title><style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181B;margin:40px;}
    .tag{color:#C86D51;font-size:12px;text-transform:uppercase;letter-spacing:.6px;font-weight:600}
    h1{font-size:24px;margin:6px 0 4px;color:#253D2C}
    p{color:#52525B;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
    th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #E4E2DD}
    th{width:55%;color:#52525B;font-weight:500}
    td{font-weight:600;font-variant-numeric:tabular-nums}
    footer{margin-top:32px;color:#8E8E93;font-size:12px}
  </style></head><body>
    <div class="tag">Ville d'EtherBay · BlockLucky</div>
    <h1>${escapeHtml(title)}</h1>
    <p>Rapport généré le ${escapeHtml(new Date().toLocaleString('fr-FR'))}. Montants en ethers fictifs (pilote pédagogique).</p>
    <table>${tableRows}</table>
    <footer>${escapeHtml(footer)}</footer>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
  return true;
};
