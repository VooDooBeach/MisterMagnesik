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
        { id: "90x55", label: "Wizytówka standardowa — pozioma (90 × 55 mm)", widthMm: 90, heightMm: 55 },
        { id: "55x90", label: "Wizytówka standardowa — pionowa (55 × 90 mm)", widthMm: 55, heightMm: 90 },
        { id: "95x65", label: "Wizytówka powiększona — pozioma (95 × 65 mm)", widthMm: 95, heightMm: 65 },
        { id: "65x95", label: "Wizytówka powiększona — pionowa (65 × 95 mm)", widthMm: 65, heightMm: 95 },
        { id: "145x100", label: "Fotomagnes — poziomy (145 × 100 mm)", widthMm: 145, heightMm: 100 },
        { id: "100x145", label: "Fotomagnes — pionowy (100 × 145 mm)", widthMm: 100, heightMm: 145 },
        { id: "a5", label: "Format A5 (148 × 210 mm)", widthMm: 148, heightMm: 210 },
        { id: "a4", label: "Format A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
        { id: "custom", label: "Własny wymiar", widthMm: 100, heightMm: 100, custom: true }
      ]
    },
    square: {
      label: "Kwadrat",
      sizes: [
        { id: "70x70", label: "Kwadrat mały (70 × 70 mm)", widthMm: 70, heightMm: 70 },
        { id: "100x100", label: "Kwadrat standardowy (100 × 100 mm)", widthMm: 100, heightMm: 100 },
        { id: "custom", label: "Własny wymiar", widthMm: 100, heightMm: 100, custom: true }
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
