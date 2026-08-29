/* eslint-disable react/prop-types */

import { useRef, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";

const CODE_128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];

function code128Values(value) {
  const text = String(value || "").trim();

  if (!text) return [];

  const characterValues = Array.from(text).map((character) => {
    const code = character.charCodeAt(0);

    if (code < 32 || code > 126) {
      throw new Error("Barcode values must use standard printable characters.");
    }

    return code - 32;
  });

  const startCode = 104;
  const checksum =
    (startCode +
      characterValues.reduce(
        (total, characterValue, index) => total + characterValue * (index + 1),
        0,
      )) %
    103;

  return [startCode, ...characterValues, checksum, 106];
}

function buildBarcode(value) {
  const values = code128Values(value);

  if (values.length === 0) return null;

  const quietZone = 10;
  let cursor = quietZone;
  const bars = [];

  values.forEach((codeValue, codeIndex) => {
    const pattern = CODE_128_PATTERNS[codeValue];

    Array.from(pattern).forEach((widthCharacter, patternIndex) => {
      const width = Number(widthCharacter);

      if (patternIndex % 2 === 0) {
        bars.push(
          <rect
            key={`${codeIndex}-${patternIndex}`}
            x={cursor}
            y="0"
            width={width}
            height="54"
            fill="#000"
          />,
        );
      }

      cursor += width;
    });
  });

  return {
    bars,
    readableValue: String(value).trim(),
    totalWidth: cursor + quietZone,
  };
}

function BarcodeGraphic({ barcode, className = "" }) {
  return (
    <div
      className={`consignment-item-barcode-graphic ${className}`.trim()}
      role="img"
      aria-label={`Barcode for item ${barcode.readableValue}`}
    >
      <svg
        viewBox={`0 0 ${barcode.totalWidth} 76`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect width={barcode.totalWidth} height="76" fill="#fff" />
        {barcode.bars}
        <text
          x={barcode.totalWidth / 2}
          y="70"
          textAnchor="middle"
          fill="#000"
          fontFamily="Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
          letterSpacing="1"
        >
          {barcode.readableValue}
        </text>
      </svg>
    </div>
  );
}

function svgToPngBlob(svg, width = 900, height = 300) {
  return new Promise((resolve, reject) => {
    const copy = svg.cloneNode(true);
    copy.setAttribute("width", String(width));
    copy.setAttribute("height", String(height));

    const source = new XMLSerializer().serializeToString(copy);
    const svgBlob = new Blob([source], {
      type: "image/svg+xml;charset=utf-8",
    });
    const imageUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(imageUrl);
          if (blob) resolve(blob);
          else reject(new Error("Unable to create barcode image."));
        },
        "image/png",
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Unable to create barcode image."));
    };

    image.src = imageUrl;
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function ItemBarcode({
  value,
  description = "Consignment item",
  priceLabel = "",
}) {
  const barcodeRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [printStatus, setPrintStatus] = useState("idle");
  let barcode;

  try {
    barcode = buildBarcode(value);
  } catch {
    barcode = null;
  }

  function getBarcodeSvg() {
    return barcodeRef.current?.querySelector("svg") || null;
  }

  async function copyBarcode() {
    const svg = getBarcodeSvg();

    if (!svg || !navigator.clipboard || typeof ClipboardItem === "undefined") {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
      return;
    }

    try {
      const pngBlob = await svgToPngBlob(svg);

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);

      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  }

  async function shareLabelOnPhone(svg) {
    if (!navigator.share || typeof File === "undefined") return false;

    try {
      const barcodeBlob = await svgToPngBlob(svg, 1200, 400);
      const file = new File(
        [barcodeBlob],
        `consignment-item-${barcode.readableValue}.png`,
        { type: "image/png" },
      );

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        return false;
      }

      await navigator.share({
        files: [file],
        title: `${description} - ${priceLabel || barcode.readableValue}`,
      });

      return true;
    } catch (error) {
      if (error?.name === "AbortError") return true;
      return false;
    }
  }

  function printInStandaloneWindow(svg) {
    const printWindow = window.open("", "_blank");

    if (!printWindow) return false;

    const svgMarkup = new XMLSerializer().serializeToString(svg);

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Print barcode ${escapeHtml(barcode.readableValue)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, sans-serif; }
      body { padding: 16px; }
      .label { width: 100%; max-width: 640px; margin: 0 auto; border: 1px solid #ddd; padding: 14px; background: #fff; }
      .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 10px; font-size: 18px; font-weight: 700; }
      .price { white-space: nowrap; }
      svg { display: block; width: 100%; height: 120px; }
      .manual-print { display: block; width: 100%; max-width: 640px; margin: 14px auto 0; min-height: 48px; border: 0; border-radius: 6px; background: #1677d2; color: #fff; font-size: 16px; font-weight: 700; }
      .hint { max-width: 640px; margin: 10px auto 0; text-align: center; font-size: 13px; color: #555; }
      @media print {
        @page { margin: 0.25in; }
        body { padding: 0; }
        .label { max-width: none; border: 0; padding: 0; }
        .manual-print, .hint { display: none !important; }
      }
    </style>
  </head>
  <body>
    <section class="label">
      <div class="head">
        <span>${escapeHtml(description)}</span>
        ${priceLabel ? `<span class="price">${escapeHtml(priceLabel)}</span>` : ""}
      </div>
      ${svgMarkup}
    </section>
    <button class="manual-print" type="button" onclick="window.print()">Print label</button>
    <p class="hint">On a phone, use the print option from your browser or share sheet if the print dialog does not open automatically.</p>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          try { window.print(); } catch (error) {}
        }, 250);
      });
    <\/script>
  </body>
</html>`);
    printWindow.document.close();
    return true;
  }

  async function printLabel() {
    const svg = getBarcodeSvg();

    if (!svg) {
      setPrintStatus("error");
      window.setTimeout(() => setPrintStatus("idle"), 1800);
      return;
    }

    setPrintStatus("working");

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 900);

    if (isMobile) {
      const shared = await shareLabelOnPhone(svg);
      if (shared) {
        setPrintStatus("idle");
        return;
      }
    }

    const opened = printInStandaloneWindow(svg);

    setPrintStatus(opened ? "idle" : "error");
    if (!opened) window.setTimeout(() => setPrintStatus("idle"), 1800);
  }

  if (!barcode) return null;

  return (
    <section className="consignment-item-barcode-card" ref={barcodeRef}>
      <BarcodeGraphic barcode={barcode} />

      <div
        className="consignment-item-barcode-actions"
        style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="consignment-btn secondary consignment-item-barcode-button"
          onClick={copyBarcode}
        >
          {copyStatus === "copied" ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <Copy size={17} aria-hidden="true" />
          )}
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "error"
              ? "Copy unavailable"
              : "Copy barcode"}
        </button>

        <button
          type="button"
          className="consignment-btn consignment-item-barcode-button"
          onClick={printLabel}
          disabled={printStatus === "working"}
        >
          <Printer size={17} aria-hidden="true" />
          {printStatus === "working"
            ? "Opening print..."
            : printStatus === "error"
              ? "Print unavailable"
              : "Print label"}
        </button>
      </div>
    </section>
  );
}
