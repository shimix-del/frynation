/**
 * Thermal Receipt Printing Utility
 * Prints receipts and Z-reports directly to 58mm and 80mm thermal ESC/POS printers
 * via an isolated hidden iframe to prevent blank page ejection in Chrome/Edge browsers.
 */

export const printReceiptElement = (
  elementId: string = 'thermal-receipt',
  paperWidth: '58mm' | '80mm' = '80mm'
): void => {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  // Get or create hidden print iframe
  let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Specific widths for 58mm vs 80mm thermal paper
  const rollWidth = paperWidth === '58mm' ? '58mm' : '80mm';
  const contentWidth = paperWidth === '58mm' ? '48mm' : '72mm';

  const receiptHtml = sourceEl.innerHTML;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Print Receipt</title>
        <style>
          @page {
            size: ${rollWidth} auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: ${rollWidth} !important;
            font-family: "JetBrains Mono", Consolas, "Courier New", monospace !important;
            font-size: 11px;
            line-height: 1.25;
            -webkit-font-smoothing: antialiased;
          }
          .thermal-wrapper {
            width: 100%;
            max-width: ${contentWidth};
            margin: 0 auto;
            padding: 2.5mm 1mm;
            background: #ffffff !important;
            color: #000000 !important;
          }
          img {
            max-width: 65px;
            max-height: 65px;
            border-radius: 50%;
            display: block;
            margin: 0 auto 5px auto;
            object-fit: cover;
          }
          /* Flex & layout helpers */
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-center { justify-content: center !important; }
          
          /* Text alignment */
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-left { text-align: left !important; }
          
          /* Typography */
          .font-bold { font-weight: 700 !important; }
          .font-black, .font-extrabold { font-weight: 900 !important; }
          .font-semibold { font-weight: 600 !important; }
          .uppercase { text-transform: uppercase !important; }
          .tracking-wider { letter-spacing: 0.05em !important; }
          .tracking-wide { letter-spacing: 0.025em !important; }
          .tracking-widest { letter-spacing: 0.1em !important; }
          .leading-tight { line-height: 1.15 !important; }
          
          .text-xs { font-size: 11px !important; }
          .text-sm { font-size: 12.5px !important; }
          .text-base { font-size: 14px !important; }
          .text-\\[10px\\] { font-size: 10px !important; }
          .text-\\[11px\\] { font-size: 11px !important; }
          
          /* Colors: enforce pure black thermal printer contrast */
          .text-black, .text-zinc-900, .text-zinc-800, .text-zinc-700, .text-zinc-600, .text-zinc-500, .text-zinc-400 {
            color: #000000 !important;
          }
          .bg-black {
            background-color: #000000 !important;
            color: #ffffff !important;
          }
          .text-white {
            color: #ffffff !important;
          }
          
          /* Widths */
          .w-full { width: 100% !important; }
          .w-1\\/2 { width: 50% !important; }
          .w-1\\/4 { width: 25% !important; }
          .pr-1 { padding-right: 4px !important; }
          
          /* Borders & Dividers */
          .border-b { border-bottom: 1px dashed #000000 !important; }
          .border-t { border-top: 1px dashed #000000 !important; }
          .border-dashed { border-style: dashed !important; border-color: #000000 !important; }
          .border-2 { border: 2px solid #000000 !important; }
          .rounded-full { border-radius: 9999px !important; }
          .rounded-sm { border-radius: 2px !important; }
          .shadow-lg { box-shadow: none !important; }
          
          /* Spacings */
          .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .py-2\\.5 { padding-top: 5px !important; padding-bottom: 5px !important; }
          .py-0\\.5 { padding-top: 1px !important; padding-bottom: 1px !important; }
          .pb-2 { padding-bottom: 4px !important; }
          .pb-3 { padding-bottom: 6px !important; }
          .pt-0\\.5 { padding-top: 1px !important; }
          .pt-1 { padding-top: 2px !important; }
          .pt-2 { padding-top: 4px !important; }
          .pt-3 { padding-top: 6px !important; }
          .mt-1 { margin-top: 2px !important; }
          .mb-1 { margin-bottom: 3px !important; }
          .space-y-0\\.5 > * + * { margin-top: 2px !important; }
          .space-y-1 > * + * { margin-top: 3px !important; }
          .space-y-1\\.5 > * + * { margin-top: 4px !important; }
          .space-y-2 > * + * { margin-top: 5px !important; }
          .mx-auto { margin-left: auto !important; margin-right: auto !important; }
        </style>
      </head>
      <body>
        <div class="thermal-wrapper">
          ${receiptHtml}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const triggerPrint = () => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print', e);
      window.print();
    }
  };

  // Wait for images inside iframe to complete loading before invoking print
  const images = iframeDoc.getElementsByTagName('img');
  if (images.length > 0) {
    let loaded = 0;
    const total = images.length;
    let printed = false;

    const onImageDone = () => {
      loaded++;
      if (loaded >= total && !printed) {
        printed = true;
        setTimeout(triggerPrint, 100);
      }
    };

    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        onImageDone();
      } else {
        images[i].onload = onImageDone;
        images[i].onerror = onImageDone;
      }
    }

    // Fallback safety timeout if image load event doesn't fire
    setTimeout(() => {
      if (!printed) {
        printed = true;
        triggerPrint();
      }
    }, 400);
  } else {
    setTimeout(triggerPrint, 100);
  }
};
