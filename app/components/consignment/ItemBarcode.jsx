/* eslint-disable react/prop-types */

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";

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

export default function ItemBarcode({
  value,
  description = "Consignment item",
  priceLabel = "",
}) {
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  let barcode;

  try {
    barcode = buildBarcode(value);
  } catch {
    barcode = null;
  }

  useEffect(() => {
    if (!showPrintLabel) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setShowPrintLabel(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showPrintLabel]);

  if (!barcode) return null;

  return (
    <>
      <section className="consignment-item-barcode-card">
        <BarcodeGraphic barcode={barcode} />

        <button
          type="button"
          className="consignment-btn secondary consignment-item-barcode-button"
          onClick={() => setShowPrintLabel(true)}
        >
          <Printer size={17} aria-hidden="true" />
          Print barcode
        </button>
      </section>

      {showPrintLabel && (
        <div
          className="consignment-barcode-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPrintLabel(false);
            }
          }}
        >
          <section
            className="consignment-barcode-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consignment-barcode-dialog-title"
          >
            <div className="consignment-barcode-dialog-head">
              <h2 id="consignment-barcode-dialog-title">Print barcode label</h2>

              <button
                type="button"
                className="consignment-barcode-dialog-close"
                onClick={() => setShowPrintLabel(false)}
                aria-label="Close barcode label"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className="consignment-barcode-print-label">
              <div className="consignment-barcode-print-label-head">
                <strong>{description}</strong>
                {priceLabel && <span>{priceLabel}</span>}
              </div>

              <BarcodeGraphic barcode={barcode} className="printable" />
            </div>

            <div className="consignment-barcode-dialog-actions">
              <button
                type="button"
                className="consignment-btn secondary"
                onClick={() => setShowPrintLabel(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="consignment-btn"
                onClick={() => window.print()}
              >
                <Printer size={17} aria-hidden="true" />
                Print label
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
