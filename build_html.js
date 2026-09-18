import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bodyContent = fs.readFileSync(path.join(__dirname, 'brd_body.html'), 'utf8');

const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Requirements Document (BRD) - Community Loan Management System</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: A4;
      margin: 18mm 15mm 18mm 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.55;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    h1 {
      color: #0f172a;
      font-size: 24pt;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-top: 0;
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 2px solid #2563eb;
    }

    h2 {
      color: #1e3a8a;
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-top: 24px;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      page-break-after: avoid;
    }

    h3 {
      color: #1e293b;
      font-size: 11.5pt;
      font-weight: 600;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    h4 {
      color: #334155;
      font-size: 10.5pt;
      font-weight: 600;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      color: #334155;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 22px;
      color: #334155;
    }

    li {
      margin-bottom: 4px;
    }

    hr {
      border: none;
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      margin: 12px 0;
      page-break-inside: avoid;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
    }

    blockquote {
      margin: 12px 0;
      padding: 10px 14px;
      border-left: 4px solid #2563eb;
      background: #eff6ff;
      color: #1e3a8a;
      font-style: normal;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
    }

    blockquote p {
      margin: 0;
      color: #1e40af;
    }

    strong {
      color: #0f172a;
      font-weight: 600;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      table, pre, blockquote {
        page-break-inside: avoid;
      }

      h1, h2, h3, h4 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'brd_styled.html'), htmlDoc, 'utf8');
console.log('brd_styled.html generated successfully.');
