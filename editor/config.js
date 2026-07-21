window.MAGNET_EDITOR_CONFIG = {
  dpi: 300,
  bleedMm: 2,
  safeMarginMm: 4,
  maxUploadMb: 12,
  maxWorkingImageEdge: 2800,
  autosaveKey: "misterMagnesikEditorV1",
  products: {
    rectangle: {
      label: "Prostokąt",
      sizes: [
        { id: "90x55", label: "90 × 55 mm", widthMm: 90, heightMm: 55 },
        { id: "a4-8", label: "95 × 65 mm — 8 szt. z A4", widthMm: 95, heightMm: 65 },
        { id: "100x145", label: "100 × 145 mm", widthMm: 100, heightMm: 145 },
        { id: "a5", label: "A5 — 148 × 210 mm", widthMm: 148, heightMm: 210 },
        { id: "a4", label: "A4 — 210 × 297 mm", widthMm: 210, heightMm: 297 }
      ]
    },
    square: {
      label: "Kwadrat",
      sizes: [
        { id: "70x70", label: "70 × 70 mm", widthMm: 70, heightMm: 70 },
        { id: "100x100", label: "100 × 100 mm", widthMm: 100, heightMm: 100 }
      ]
    }
  },
  fonts: ["Montserrat", "Arial", "Georgia", "Verdana", "Trebuchet MS", "Courier New"],
  frames: [
    { id: "none", label: "Bez ramki" },
    { id: "solid", label: "Linia ciągła" },
    { id: "double", label: "Podwójna" },
    { id: "dashed", label: "Przerywana" }
  ],
  decorations: ["★", "♥", "✦", "●", "◆", "❖"]
};
