(function () {
  "use strict";
  const cfg = window.MAGNET_EDITOR_CONFIG;
  const integration = window.MAGNET_ORDER_INTEGRATION || { mode: "demo" };
  const $ = (id) => document.getElementById(id);
  const mmToPx = (mm, dpi = cfg.dpi) => Math.round((mm / 25.4) * dpi);
  let projectId = `MM-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  let shapeKey = "rectangle";
  let sizeId = "90x55";
  let currentSize = cfg.products[shapeKey].sizes[0];
  let photoObject = null;
  let frameObject = null;
  let guideObjects = [];
  let history = [];
  let historyIndex = -1;
  let restoring = false;
  let autosaveTimer;

  if (!window.fabric) {
    document.body.innerHTML = "<p style='padding:40px;font-family:Arial'>Nie udało się uruchomić edytora. Sprawdź połączenie z internetem i odśwież stronę.</p>";
    return;
  }

  const canvas = new fabric.Canvas("design-canvas", {
    preserveObjectStacking: true,
    backgroundColor: "#ffffff",
    selection: true
  });
  fabric.Object.prototype.set({ cornerColor: "#ffffff", cornerStrokeColor: "#111111", borderColor: "#111111", transparentCorners: false, cornerSize: 12 });

  function populateConfig() {
    $("shape-select").innerHTML = Object.entries(cfg.products).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join("");
    $("font-family").innerHTML = cfg.fonts.map((font) => `<option>${font}</option>`).join("");
    $("frame-select").innerHTML = cfg.frames.map((frame) => `<option value="${frame.id}">${frame.label}</option>`).join("");
    $("decorations").innerHTML = cfg.decorations.map((icon) => `<button class="decoration-btn" type="button" data-decoration="${icon}" aria-label="Dodaj ozdobę ${icon}">${icon}</button>`).join("");
    $("max-file-label").textContent = `${cfg.maxUploadMb} MB`;
    updateSizeOptions();
  }

  function updateSizeOptions() {
    const sizes = cfg.products[shapeKey].sizes;
    $("size-select").innerHTML = sizes.map((size) => `<option value="${size.id}">${size.label}</option>`).join("");
    if (!sizes.some((size) => size.id === sizeId)) sizeId = sizes[0].id;
    $("size-select").value = sizeId;
    currentSize = sizes.find((size) => size.id === sizeId) || sizes[0];
    $("production-note").hidden = true;
  }

  function displayDimensions() {
    const available = Math.min(820, Math.max(300, $("canvas-wrap").parentElement.clientWidth - 48));
    const ratio = (currentSize.widthMm + cfg.bleedMm * 2) / (currentSize.heightMm + cfg.bleedMm * 2);
    let width = available;
    let height = width / ratio;
    const maxHeight = window.innerWidth < 680 ? 470 : Math.min(650, window.innerHeight * 0.68);
    if (height > maxHeight) { height = maxHeight; width = height * ratio; }
    return { width: Math.round(width), height: Math.round(height) };
  }

  function resizeCanvas(preserve = true) {
    const oldW = canvas.getWidth() || 1;
    const oldH = canvas.getHeight() || 1;
    const next = displayDimensions();
    const sx = next.width / oldW;
    const sy = next.height / oldH;
    canvas.setDimensions(next);
    if (preserve) {
      canvas.getObjects().filter((obj) => !obj.isGuide).forEach((obj) => {
        obj.set({ left: obj.left * sx, top: obj.top * sy, scaleX: obj.scaleX * sx, scaleY: obj.scaleY * sy });
        obj.setCoords();
      });
    }
    applyCanvasClip();
    rebuildGuides();
    canvas.requestRenderAll();
    updateStatus();
  }

  function applyCanvasClip() {
    canvas.clipPath = null;
  }

  function guideStyle(color, dash) {
    return { fill: "transparent", stroke: color, strokeWidth: 1.5, strokeDashArray: dash, selectable: false, evented: false, excludeFromExport: true, isGuide: true, objectCaching: false };
  }

  function zoneObject(inset, style) {
    const w = canvas.getWidth() - inset * 2;
    const h = canvas.getHeight() - inset * 2;
    return new fabric.Rect({ ...style, left: inset, top: inset, width: w, height: h, originX: "left", originY: "top" });
  }

  function rebuildGuides() {
    guideObjects.forEach((obj) => canvas.remove(obj));
    guideObjects = [];
    const totalW = currentSize.widthMm + cfg.bleedMm * 2;
    const pxPerMm = canvas.getWidth() / totalW;
    const cutInset = cfg.bleedMm * pxPerMm;
    const safeInset = (cfg.bleedMm + cfg.safeMarginMm) * pxPerMm;
    const bleed = zoneObject(2, guideStyle("#cc3232", [5, 5])); bleed.guideType = "bleed";
    const cut = zoneObject(cutInset, guideStyle("#111111", [9, 5])); cut.guideType = "cut";
    const safe = zoneObject(safeInset, guideStyle("#167647", [4, 4])); safe.guideType = "safe";
    guideObjects = [bleed, cut, safe];
    guideObjects.forEach((obj) => canvas.add(obj));
    applyGuideVisibility();
    guideObjects.forEach((obj) => obj.bringToFront());
  }

  function applyGuideVisibility() {
    guideObjects.forEach((obj) => {
      const map = { cut: "toggle-cut", bleed: "toggle-bleed", safe: "toggle-safe" };
      obj.visible = $(map[obj.guideType]).checked;
    });
    canvas.requestRenderAll();
  }

  function activePhoto() {
    const active = canvas.getActiveObject();
    return active && active.dataRole === "photo" ? active : photoObject;
  }

  function fitPhoto() {
    const photo = activePhoto();
    if (!photo) return;
    const scale = Math.max(canvas.getWidth() / photo.width, canvas.getHeight() / photo.height);
    photo.set({ scaleX: scale, scaleY: scale, left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: "center", originY: "center", angle: 0 });
    photo.setCoords(); canvas.setActiveObject(photo); canvas.requestRenderAll(); commitHistory(); checkImageQuality();
  }

  function centerObject(obj = canvas.getActiveObject()) {
    if (!obj || obj.isGuide) return;
    obj.set({ left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: "center", originY: "center" });
    obj.setCoords(); canvas.requestRenderAll(); commitHistory();
  }

  async function prepareUpload(file) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return showImageWarning("Wybierz plik JPG, PNG lub WebP.", false);
    if (file.size > cfg.maxUploadMb * 1024 * 1024) return showImageWarning(`Plik jest za duży. Maksymalny rozmiar to ${cfg.maxUploadMb} MB.`, false);
    const dataUrl = await fileToOptimizedDataUrl(file);
    fabric.Image.fromURL(dataUrl, (img) => {
      if (photoObject) canvas.remove(photoObject);
      photoObject = img;
      img.set({ dataRole: "photo", sourceWidth: img.width, sourceHeight: img.height, centeredRotation: true });
      canvas.add(img); img.sendToBack(); fitPhoto();
      frameObject && frameObject.bringToFront(); guideObjects.forEach((guide) => guide.bringToFront());
      commitHistory(); checkImageQuality();
    }, { crossOrigin: "anonymous" });
  }

  function fileToOptimizedDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, cfg.maxWorkingImageEdge / Math.max(img.naturalWidth, img.naturalHeight));
          const temp = document.createElement("canvas");
          temp.width = Math.round(img.naturalWidth * scale); temp.height = Math.round(img.naturalHeight * scale);
          temp.getContext("2d", { alpha: false }).drawImage(img, 0, 0, temp.width, temp.height);
          resolve(temp.toDataURL("image/jpeg", .92));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function photoFilterValues() {
    return {
      brightness: +$("brightness").value / 100,
      contrast: +$("contrast").value / 100,
      saturation: +$("saturation").value / 100,
      exposure: +$("exposure").value / 200,
      temperature: +$("temperature").value / 100,
      preset: $("filter-select").value
    };
  }

  function applyPhotoFilters(commit = false) {
    const photo = activePhoto(); if (!photo) return;
    const value = photoFilterValues();
    const filters = [];
    if (value.brightness || value.exposure) filters.push(new fabric.Image.filters.Brightness({ brightness: Math.max(-1, Math.min(1, value.brightness + value.exposure)) }));
    if (value.contrast) filters.push(new fabric.Image.filters.Contrast({ contrast: value.contrast }));
    if (value.saturation) filters.push(new fabric.Image.filters.Saturation({ saturation: value.saturation }));
    if (value.temperature > 0) filters.push(new fabric.Image.filters.BlendColor({ color: "#ff9a45", mode: "tint", alpha: value.temperature * .25 }));
    if (value.temperature < 0) filters.push(new fabric.Image.filters.BlendColor({ color: "#5d91ff", mode: "tint", alpha: -value.temperature * .22 }));
    if (value.preset === "grayscale") filters.push(new fabric.Image.filters.Grayscale());
    if (value.preset === "sepia") filters.push(new fabric.Image.filters.Sepia());
    if (value.preset === "warm") filters.push(new fabric.Image.filters.BlendColor({ color: "#ff8a3d", mode: "tint", alpha: .18 }));
    if (value.preset === "cool") filters.push(new fabric.Image.filters.BlendColor({ color: "#508cff", mode: "tint", alpha: .16 }));
    photo.filters = filters; photo.applyFilters(); canvas.requestRenderAll(); if (commit) commitHistory();
  }

  function resetPhotoControls() {
    ["brightness", "contrast", "saturation", "exposure", "temperature"].forEach((id) => { $(id).value = 0; $(id).closest("label").querySelector("output").value = "0"; });
    $("filter-select").value = "original"; applyPhotoFilters(true);
  }

  function addText() {
    const value = $("text-value").value.trim() || "Twój tekst";
    const text = new fabric.IText(value, { left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: "center", originY: "center", fill: $("text-color").value, fontFamily: $("font-family").value, fontSize: +$("font-size").value, textAlign: $("text-align").value, angle: +$("text-angle").value, dataRole: "text" });
    canvas.add(text); canvas.setActiveObject(text); guideObjects.forEach((guide) => guide.bringToFront()); canvas.requestRenderAll(); commitHistory();
  }

  function updateText() {
    const text = canvas.getActiveObject();
    if (!text || text.dataRole !== "text") return setStatus("Zaznacz tekst, który chcesz zmienić.");
    text.set({ text: $("text-value").value || text.text, fill: $("text-color").value, fontFamily: $("font-family").value, fontSize: +$("font-size").value, textAlign: $("text-align").value, angle: +$("text-angle").value });
    text.setCoords(); canvas.requestRenderAll(); commitHistory();
  }

  function toggleTextStyle(prop, normal, active) {
    const text = canvas.getActiveObject(); if (!text || text.dataRole !== "text") return;
    text.set(prop, text[prop] === active ? normal : active); canvas.requestRenderAll(); commitHistory();
  }

  function applyFrame() {
    if (frameObject) canvas.remove(frameObject);
    const type = $("frame-select").value; if (type === "none") { frameObject = null; commitHistory(); return; }
    const width = +$("frame-width").value;
    const inset = width + 5;
    const opts = { fill: "transparent", stroke: $("frame-color").value, strokeWidth: width, selectable: false, evented: false, dataRole: "frame", strokeDashArray: type === "dashed" ? [12, 8] : null };
    frameObject = new fabric.Rect({ ...opts, left: inset, top: inset, width: canvas.width - inset * 2, height: canvas.height - inset * 2 });
    canvas.add(frameObject);
    if (type === "double") {
      frameObject.set({ strokeWidth: Math.max(2, width / 2), shadow: new fabric.Shadow({ color: $("frame-color").value, blur: 0, offsetX: width * 1.6, offsetY: width * 1.6 }) });
    }
    guideObjects.forEach((guide) => guide.bringToFront()); canvas.requestRenderAll(); commitHistory();
  }

  function addDecoration(icon) {
    const deco = new fabric.Text(icon, { left: canvas.width / 2, top: canvas.height / 2, originX: "center", originY: "center", fontSize: 64, fill: $("frame-color").value, dataRole: "decoration" });
    canvas.add(deco); canvas.setActiveObject(deco); guideObjects.forEach((guide) => guide.bringToFront()); canvas.requestRenderAll(); commitHistory();
  }

  function deleteActive() {
    const active = canvas.getActiveObjects().filter((obj) => !obj.isGuide && obj !== frameObject);
    active.forEach((obj) => { if (obj === photoObject) photoObject = null; canvas.remove(obj); });
    canvas.discardActiveObject(); canvas.requestRenderAll(); if (active.length) commitHistory(); checkImageQuality();
  }

  function serializableState() {
    return { projectId, shapeKey, sizeId, canvas: canvas.toJSON(["dataRole", "sourceWidth", "sourceHeight"]) };
  }

  function commitHistory() {
    if (restoring) return;
    clearTimeout(autosaveTimer);
    const state = JSON.stringify(serializableState());
    if (history[historyIndex] !== state) { history = history.slice(0, historyIndex + 1); history.push(state); if (history.length > 30) history.shift(); historyIndex = history.length - 1; }
    autosaveTimer = setTimeout(() => {
      try { localStorage.setItem(cfg.autosaveKey, state); $("status-save").textContent = "Projekt zapisany lokalnie"; }
      catch { $("status-save").textContent = "Brak miejsca na autozapis"; }
    }, 250);
    updateHistoryButtons(); updateStatus();
  }

  function restoreState(state) {
    if (!state) return;
    restoring = true;
    const parsed = typeof state === "string" ? JSON.parse(state) : state;
    projectId = parsed.projectId || projectId;
    shapeKey = cfg.products[parsed.shapeKey] ? parsed.shapeKey : "rectangle";
    sizeId = parsed.sizeId || cfg.products[shapeKey].sizes[0].id;
    $("shape-select").value = shapeKey; updateSizeOptions(); $("size-select").value = sizeId;
    const dims = displayDimensions(); canvas.setDimensions(dims); applyCanvasClip();
    canvas.loadFromJSON(parsed.canvas, () => {
      photoObject = canvas.getObjects().find((obj) => obj.dataRole === "photo") || null;
      frameObject = canvas.getObjects().find((obj) => obj.dataRole === "frame") || null;
      rebuildGuides(); canvas.requestRenderAll(); restoring = false; updateStatus(); checkImageQuality();
    });
  }

  function undo() { if (historyIndex <= 0) return; historyIndex--; restoreState(history[historyIndex]); updateHistoryButtons(); }
  function redo() { if (historyIndex >= history.length - 1) return; historyIndex++; restoreState(history[historyIndex]); updateHistoryButtons(); }
  function updateHistoryButtons() { $("undo-btn").disabled = historyIndex <= 0; $("redo-btn").disabled = historyIndex >= history.length - 1; }

  function qualityData() {
    const reqW = mmToPx(currentSize.widthMm + cfg.bleedMm * 2);
    const reqH = mmToPx(currentSize.heightMm + cfg.bleedMm * 2);
    if (!photoObject) return { level: "none", label: "Brak zdjęcia", required: `${reqW} × ${reqH} px` };
    const sourceW = photoObject.sourceWidth || photoObject.width;
    const sourceH = photoObject.sourceHeight || photoObject.height;
    const ratio = Math.min(sourceW / reqW, sourceH / reqH);
    if (ratio >= 1) return { level: "good", label: "Jakość dobra — 300 DPI", required: `${reqW} × ${reqH} px` };
    if (ratio >= .65) return { level: "warn", label: "Jakość średnia — możliwa utrata ostrości", required: `${reqW} × ${reqH} px` };
    return { level: "bad", label: "Za mała rozdzielczość zdjęcia", required: `${reqW} × ${reqH} px` };
  }

  function checkImageQuality() {
    const quality = qualityData();
    $("status-quality").textContent = quality.label;
    $("quality-pill").className = `status-pill ${quality.level === "good" ? "good" : quality.level === "none" ? "" : "warn"}`;
    showImageWarning(quality.level === "none" ? `Zalecany rozmiar zdjęcia: co najmniej ${quality.required}.` : `${quality.label}. Zalecane minimum: ${quality.required}.`, quality.level === "good");
    $("export-warning").textContent = quality.level === "good" ? "Projekt spełnia zalecenie 300 DPI." : `${quality.label}. Możesz wyeksportować plik, ale sprawdź go przed drukiem.`;
    $("export-warning").className = quality.level === "good" ? "warning success" : "warning";
    updateOrderSummary();
  }

  function showImageWarning(message, good) { $("image-warning").textContent = message; $("image-warning").className = good ? "warning success" : "warning"; }

  function updateStatus() {
    const product = cfg.products[shapeKey];
    $("status-product").textContent = `${product.label} ${currentSize.label}`;
    $("project-id-label").textContent = `Projekt: ${projectId}`;
    const pxW = mmToPx(currentSize.widthMm + cfg.bleedMm * 2); const pxH = mmToPx(currentSize.heightMm + cfg.bleedMm * 2);
    $("export-size").textContent = `Plik do druku ze spadem: ${pxW} × ${pxH} px, ${cfg.dpi} DPI`;
    updateOrderSummary();
  }

  function updateOrderSummary() {
    const quality = qualityData();
    $("order-summary").innerHTML = `<p><strong>Projekt:</strong> ${projectId}<br><strong>Produkt:</strong> ${cfg.products[shapeKey].label}<br><strong>Rozmiar:</strong> ${currentSize.label}<br><strong>Jakość:</strong> ${quality.label}</p>`;
  }

  function setStatus(message) { $("order-status").textContent = message; }

  function withCleanCanvas(callback) {
    canvas.discardActiveObject();
    const visibility = guideObjects.map((obj) => obj.visible);
    guideObjects.forEach((obj) => { obj.visible = false; });
    canvas.requestRenderAll();
    try { return callback(); } finally { guideObjects.forEach((obj, index) => { obj.visible = visibility[index]; }); canvas.requestRenderAll(); }
  }

  function renderDataUrl(kind = "print") {
    return withCleanCanvas(() => {
      if (kind === "print") {
        const targetW = mmToPx(currentSize.widthMm + cfg.bleedMm * 2);
        return canvas.toDataURL({ format: "png", multiplier: targetW / canvas.getWidth(), enableRetinaScaling: false });
      }
      return canvas.toDataURL({ format: "jpeg", quality: .82, multiplier: Math.min(1.6, 1200 / canvas.getWidth()), enableRetinaScaling: false });
    });
  }

  function downloadDataUrl(dataUrl, filename) { const link = document.createElement("a"); link.href = dataUrl; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); }
  function downloadBlob(content, filename, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }

  async function dataUrlToFile(dataUrl, filename) {
    const blob = await fetch(dataUrl).then((response) => response.blob());
    return new File([blob], filename, { type: blob.type || "image/png" });
  }

  async function uploadOrderFile(file) {
    if (!(file instanceof File) || !file.size) return null;
    const upload = new FormData();
    upload.append("UPLOADCARE_PUB_KEY", integration.uploadcarePublicKey);
    upload.append("UPLOADCARE_STORE", "1");
    upload.append("file", file, file.name);
    const response = await fetch("https://upload.uploadcare.com/base/", { method: "POST", body: upload });
    if (!response.ok) throw new Error(`Uploadcare HTTP ${response.status}`);
    const result = await response.json();
    if (!result.file) throw new Error("Uploadcare nie zwrócił identyfikatora pliku.");
    return { name: file.name, url: `${integration.uploadcareCdnBase}/${result.file}/` };
  }

  function exportProject(kind) {
    const quality = qualityData();
    if (kind === "print" && quality.level === "bad" && !confirm("Zdjęcie ma niską rozdzielczość i może być nieostre w druku. Pobrać mimo to?")) return null;
    const ext = kind === "print" ? "png" : "jpg";
    const data = renderDataUrl(kind);
    downloadDataUrl(data, `${projectId}-${kind}.${ext}`);
    return data;
  }

  async function submitOrder(event) {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const form = new FormData(event.currentTarget);
    const quality = qualityData();
    const customer = Object.fromEntries([...form.entries()].filter(([, value]) => !(value instanceof File)));
    const order = { projectId, createdAt: new Date().toISOString(), customer, product: { shape: cfg.products[shapeKey].label, size: currentSize, bleedMm: cfg.bleedMm, dpi: cfg.dpi }, quality };
    setStatus("Przygotowujemy projekt…");
    const png = renderDataUrl("print");
    const projectFile = await dataUrlToFile(png, `${projectId}-druk.png`);
    const extraFile = form.get("attachment");
    const extraSize = extraFile instanceof File ? extraFile.size : 0;
    if (projectFile.size + extraSize > 10 * 1024 * 1024) {
      setStatus("Łączny rozmiar plików przekracza 10 MB. Projekt został pobrany — dodaj mniejszy załącznik lub prześlij pliki osobno.");
      downloadDataUrl(png, `${projectId}-druk.png`);
      if (submitButton) submitButton.disabled = false;
      return;
    }
    if (integration.mode === "formspark" && integration.formsparkUrl && integration.uploadcarePublicKey) {
      try {
        setStatus("Wysyłamy projekt i dane zamówienia…");
        const projectUpload = await uploadOrderFile(projectFile);
        const extraUpload = extraFile instanceof File && extraFile.size ? await uploadOrderFile(extraFile) : null;
        const payload = {
          "Źródło": "Edytor magnesów",
          "Identyfikator projektu": projectId,
          "Data projektu": order.createdAt,
          "Imię i nazwisko": customer.name || "",
          "E-mail": customer.email || "",
          _replyto: customer.email || "",
          "Telefon": customer.phone || "",
          "Liczba sztuk": customer.quantity || "",
          "Uwagi": customer.notes || "",
          "Produkt": `${cfg.products[shapeKey].label} ${currentSize.label}`,
          "Jakość projektu": quality.label,
          "Projekt z edytora — otwórz lub pobierz": projectUpload.url,
          "Nazwa pliku projektu": projectUpload.name,
          _email: {
            subject: `Nowy projekt z edytora — ${projectId}`,
            from: customer.name || "Klient Mister Magnesik"
          }
        };
        if (extraUpload) {
          payload["Dodatkowy załącznik — otwórz lub pobierz"] = extraUpload.url;
          payload["Nazwa dodatkowego załącznika"] = extraUpload.name;
        }
        const response = await fetch(integration.formsparkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Formspark HTTP ${response.status}`);
        setStatus("Projekt i dane zamówienia zostały wysłane. Dziękujemy!");
        event.currentTarget.reset();
        if (submitButton) submitButton.disabled = false;
      } catch (error) {
        console.error("Nie udało się wysłać projektu:", error);
        setStatus("Nie udało się wysłać projektu. Dane pozostały w formularzu — spróbuj ponownie lub napisz na kontakt@mistermagnesik.pl.");
        if (submitButton) submitButton.disabled = false;
      }
    } else if (integration.mode === "endpoint" && integration.endpointUrl) {
      try {
        const response = await fetch(integration.endpointUrl, { method: "POST", headers: { "Content-Type": "application/json", ...(integration.headers || {}) }, body: JSON.stringify({ ...order, projectPngDataUrl: png }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus("Projekt i zamówienie zostały wysłane.");
      } catch (error) { setStatus("Nie udało się wysłać zamówienia. Pobierz pliki i skontaktuj się z nami."); downloadDataUrl(png, `${projectId}-druk.png`); downloadBlob(JSON.stringify(order, null, 2), `${projectId}-zamowienie.json`, "application/json"); }
    } else {
      downloadDataUrl(png, `${projectId}-druk.png`);
      downloadBlob(JSON.stringify(order, null, 2), `${projectId}-zamowienie.json`, "application/json");
      setStatus("Pobrano projekt PNG i dane zamówienia JSON. Wyślij je do Mister Magnesik.");
    }
  }

  function resetProject() {
    if (!confirm("Usunąć cały projekt i rozpocząć od nowa?")) return;
    canvas.getObjects().forEach((obj) => canvas.remove(obj)); photoObject = null; frameObject = null; localStorage.removeItem(cfg.autosaveKey); rebuildGuides(); commitHistory(); resetPhotoControls(); checkImageQuality();
  }

  function bindEvents() {
    $("shape-select").addEventListener("change", (e) => { shapeKey = e.target.value; sizeId = cfg.products[shapeKey].sizes[0].id; updateSizeOptions(); resizeCanvas(true); commitHistory(); checkImageQuality(); });
    $("size-select").addEventListener("change", (e) => { sizeId = e.target.value; updateSizeOptions(); resizeCanvas(true); commitHistory(); checkImageQuality(); });
    $("image-input").addEventListener("change", (e) => prepareUpload(e.target.files[0]));
    [$("upload-zone"), $("canvas-wrap")].forEach((zone) => {
      ["dragenter", "dragover"].forEach((name) => zone.addEventListener(name, (e) => { e.preventDefault(); zone.classList.add("dragging"); }));
      ["dragleave", "drop"].forEach((name) => zone.addEventListener(name, (e) => { e.preventDefault(); zone.classList.remove("dragging"); }));
      zone.addEventListener("drop", (e) => prepareUpload(e.dataTransfer.files[0]));
    });
    $("fit-image-btn").onclick = fitPhoto; $("center-image-btn").onclick = () => centerObject(activePhoto());
    $("remove-image-btn").onclick = () => { if (photoObject) { canvas.remove(photoObject); photoObject = null; canvas.requestRenderAll(); commitHistory(); checkImageQuality(); } };
    $("reset-photo-btn").onclick = resetPhotoControls;
    ["brightness", "contrast", "saturation", "exposure", "temperature"].forEach((id) => { $(id).addEventListener("input", (e) => { e.target.closest("label").querySelector("output").value = e.target.value; applyPhotoFilters(false); }); $(id).addEventListener("change", () => commitHistory()); });
    $("filter-select").addEventListener("change", () => applyPhotoFilters(true));
    $("add-text-btn").onclick = addText; $("update-text-btn").onclick = updateText; $("bold-btn").onclick = () => toggleTextStyle("fontWeight", "normal", "bold"); $("italic-btn").onclick = () => toggleTextStyle("fontStyle", "normal", "italic");
    $("apply-frame-btn").onclick = applyFrame; $("decorations").addEventListener("click", (e) => { const button = e.target.closest("[data-decoration]"); if (button) addDecoration(button.dataset.decoration); });
    ["toggle-cut", "toggle-bleed", "toggle-safe"].forEach((id) => $(id).addEventListener("change", applyGuideVisibility));
    $("undo-btn").onclick = undo; $("redo-btn").onclick = redo; $("delete-btn").onclick = deleteActive; $("center-btn").onclick = () => centerObject(); $("reset-btn").onclick = resetProject;
    $("preview-btn").onclick = () => exportProject("preview"); $("print-export-btn").onclick = () => exportProject("print"); $("preview-export-btn").onclick = () => exportProject("preview");
    $("order-form").addEventListener("submit", submitOrder);
    canvas.on("object:modified", commitHistory);
    canvas.on("selection:created", syncSelectionControls); canvas.on("selection:updated", syncSelectionControls);
    document.addEventListener("keydown", (e) => { if ((e.key === "Delete" || e.key === "Backspace") && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { e.preventDefault(); deleteActive(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); } });
    let resizeTimer; window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => resizeCanvas(true), 180); });
  }

  function syncSelectionControls() {
    const active = canvas.getActiveObject();
    if (active?.dataRole === "text") { $("text-value").value = active.text; $("font-family").value = active.fontFamily; $("font-size").value = Math.round(active.fontSize); $("text-color").value = /^#[0-9a-f]{6}$/i.test(active.fill) ? active.fill : "#ffffff"; $("text-align").value = active.textAlign; $("text-angle").value = Math.round(active.angle); }
  }

  function initialize() {
    populateConfig(); bindEvents(); $("project-id-label").textContent = `Projekt: ${projectId}`;
    const saved = localStorage.getItem(cfg.autosaveKey);
    if (saved) {
      try { history = [saved]; historyIndex = 0; restoreState(saved); }
      catch { localStorage.removeItem(cfg.autosaveKey); resizeCanvas(false); rebuildGuides(); commitHistory(); }
    } else { resizeCanvas(false); rebuildGuides(); commitHistory(); }
    checkImageQuality(); updateHistoryButtons();
  }

  initialize();
})();
