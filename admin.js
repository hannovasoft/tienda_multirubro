let adminSettings = {};
let adminProducts = [];
let adminOrders = [];
let adminSearchQuery = "";
let selectedWizardIndustry = INDUSTRY_PRESETS[0];
let productModalInstance = null;
let wizardModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  productModalInstance = new bootstrap.Modal(document.getElementById("productModal"));
  wizardModalInstance = new bootstrap.Modal(document.getElementById("industryWizardModal"));

  if (sessionStorage.getItem("admin_logged_in") === "true") {
    showDashboard();
  }

  document.getElementById("btnLogin").addEventListener("click", handleLogin);

  // En la versión para clientes no se muestra la clave de prueba
  if (!DEMO_MODE) document.getElementById("loginHint").classList.add("d-none");
  document.getElementById("btnLogout").addEventListener("click", () => {
    sessionStorage.removeItem("admin_logged_in");
    location.reload();
  });

  // Buscador de inventario
  document.getElementById("adminSearchInput").addEventListener("input", (e) => {
    adminSearchQuery = e.target.value.toLowerCase();
    renderAdminProductsCards();
  });

  // Buscador en vivo dentro del Asistente de Rubros
  document.getElementById("wizardSearchInput").addEventListener("input", (e) => {
    renderWizardMacros(e.target.value.toLowerCase());
  });

  // Botones de Omitir o Aplicar Asistente de Rubros
  document.getElementById("btnSkipWizard").addEventListener("click", async () => {
    adminSettings.wizardCompleted = true;
    await DataService.saveSettings(adminSettings);
    wizardModalInstance.hide();
  });

  document.getElementById("btnApplyWizard").addEventListener("click", applyWizardSelection);
  document.getElementById("btnApplyBulkPrice").addEventListener("click", handleBulkPriceUpdate);
  document.getElementById("settingsForm").addEventListener("submit", handleSaveSettings);
  document.getElementById("productForm").addEventListener("submit", handleSaveProduct);

  // Editor de talles y colores del producto y vistas previas de estilo
  ["varPreset", "varColors", "varCustomSizes"].forEach(id => {
    document.getElementById(id).addEventListener("input", renderVariantGrid);
  });
  document.getElementById("confFontStyle").addEventListener("change", renderFontPreview);
  document.getElementById("confCartIcon").addEventListener("change", renderCartIconPreview);

  document.getElementById("prodImageFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = document.getElementById("imgPreview");
        preview.src = ev.target.result;
        preview.classList.remove("d-none");
      };
      reader.readAsDataURL(file);
    }
  });
});

/* ==========================================================================
   1. SISTEMA DE AYUDA INTERACTIVA (?) PARA EL USUARIO
   ========================================================================== */
function showHelp(title, text) {
  Swal.fire({
    icon: "question",
    title: title,
    text: text,
    confirmButtonText: "Entendido",
    confirmButtonColor: "#2563eb"
  });
}

function handleLogin() {
  const pass = document.getElementById("adminPasswordInput").value;
  if (pass === "admin123") {
    sessionStorage.setItem("admin_logged_in", "true");
    showDashboard();
  } else {
    Swal.fire("Error", DEMO_MODE ? "Contraseña incorrecta. Probá con: admin123" : "Contraseña incorrecta.", "error");
  }
}

async function showDashboard() {
  document.getElementById("loginScreen").classList.add("d-none");
  document.getElementById("adminDashboard").classList.remove("d-none");

  adminSettings = (await DataService.getSettings()) || {};
  adminProducts = (await DataService.getProducts()) || [];
  adminOrders = (await DataService.getOrders()) || [];

  fillSettingsForm();
  renderAdminProductsCards();
  renderAdminOrders();
  updateDashboardMetrics();

  // Si es la primera vez que entra, le abrimos automáticamente el Asistente de Rubros
  if (!adminSettings.wizardCompleted) {
    openIndustryWizard();
  }
}

/* ==========================================================================
   2. ASISTENTE DE 14 MACRO-RUBROS CON BUSCADOR Y SUB-OPCIONES TILDABLES
   ========================================================================== */
function openIndustryWizard() {
  document.getElementById("wizardSearchInput").value = "";
  const currentPreset = INDUSTRY_PRESETS.find(p => p.id === adminSettings.selectedIndustryId) || INDUSTRY_PRESETS[0];
  selectedWizardIndustry = currentPreset;
  renderWizardMacros("");
  renderWizardSubcategories(selectedWizardIndustry);
  wizardModalInstance.show();
}

function renderWizardMacros(filterText = "") {
  const grid = document.getElementById("wizardMacrosGrid");
  grid.innerHTML = "";

  const filtered = INDUSTRY_PRESETS.filter(preset => {
    const inName = preset.name.toLowerCase().includes(filterText);
    const inSubs = preset.subcategories.some(s =>
      s.name.toLowerCase().includes(filterText) ||
      s.cats.some(c => c.toLowerCase().includes(filterText))
    );
    return inName || inSubs;
  });

  filtered.forEach(preset => {
    const isSelected = preset.id === selectedWizardIndustry.id;
    const col = document.createElement("div");
    col.className = "col";
    col.innerHTML = `
      <div class="preset-macro-card ${isSelected ? 'selected' : ''}" onclick="selectWizardMacro('${preset.id}')">
        <div class="fs-4 mb-1">${preset.icon}</div>
        <div class="fw-bold small">${preset.name}</div>
      </div>
    `;
    grid.appendChild(col);
  });
}

function selectWizardMacro(presetId) {
  const found = INDUSTRY_PRESETS.find(p => p.id === presetId);
  if (!found) return;
  selectedWizardIndustry = found;
  renderWizardMacros(document.getElementById("wizardSearchInput").value.toLowerCase());
  renderWizardSubcategories(found);
}

function renderWizardSubcategories(preset) {
  const container = document.getElementById("wizardSubcatsCheckboxes");
  container.innerHTML = "";
  document.getElementById("wizardColorPicker").value = preset.color;

  preset.subcategories.forEach((sub, idx) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6";
    col.innerHTML = `
      <div class="form-check bg-white p-2 ps-4 rounded-3 border">
        <input class="form-check-input wizard-sub-check" type="checkbox" id="subCheck_${idx}" value="${idx}" checked onchange="recalculateWizardCategories()">
        <label class="form-check-label small fw-semibold d-block" for="subCheck_${idx}">
          ${sub.name}
          <span class="d-block text-muted fw-normal" style="font-size:0.7rem;">${sub.cats.join(", ")}</span>
        </label>
      </div>
    `;
    container.appendChild(col);
  });

  recalculateWizardCategories();
}

function recalculateWizardCategories() {
  const checkedIndexes = Array.from(document.querySelectorAll(".wizard-sub-check:checked")).map(cb => Number(cb.value));
  let combined = ["Todos"];

  checkedIndexes.forEach(idx => {
    const sub = selectedWizardIndustry.subcategories[idx];
    if (sub) {
      sub.cats.forEach(c => {
        if (!combined.includes(c)) combined.push(c);
      });
    }
  });

  document.getElementById("wizardCustomCategories").value = combined.join(", ");
}

async function applyWizardSelection() {
  const rawCats = document.getElementById("wizardCustomCategories").value;
  const categoriesArray = rawCats.split(",").map(c => c.trim()).filter(c => c !== "");
  if (!categoriesArray.includes("Todos")) categoriesArray.unshift("Todos");

  adminSettings = {
    ...adminSettings,
    wizardCompleted: true,
    selectedIndustryId: selectedWizardIndustry.id,
    variantPlaceholder: selectedWizardIndustry.variantHint,
    slogan: selectedWizardIndustry.slogan,
    primaryColor: document.getElementById("wizardColorPicker").value,
    bannerUrl: selectedWizardIndustry.banner,
    categories: categoriesArray
  };

  await DataService.saveSettings(adminSettings);
  fillSettingsForm();
  updateDashboardMetrics();
  wizardModalInstance.hide();

  Swal.fire({
    icon: "success",
    title: `¡Rubro ${selectedWizardIndustry.name} aplicado!`,
    text: "Se configuraron las categorías, colores, portada y sugerencias de variantes. Podés modificar lo que quieras cuando gustes.",
    confirmButtonColor: "#2563eb"
  });
}

/* ==========================================================================
   3. NAVEGACIÓN, INVENTARIO Y PEDIDOS
   ========================================================================== */
function switchAdminTab(tabId, btnElement) {
  document.getElementById("tabProducts").classList.add("d-none");
  document.getElementById("tabOrders").classList.add("d-none");
  document.getElementById("tabSettings").classList.add("d-none");

  document.getElementById(tabId).classList.remove("d-none");
  document.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.remove("active"));
  btnElement.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateDashboardMetrics() {
  document.getElementById("statTotalProducts").innerText = adminProducts.length;
  document.getElementById("statOutStock").innerText = adminProducts.filter(p => getTotalStock(p) <= 0).length;
  document.getElementById("statPendingOrders").innerText = adminOrders.filter(o => o.status === "Pendiente").length;

  const bulkSelect = document.getElementById("bulkCategorySelect");
  bulkSelect.innerHTML = "";
  
  (adminSettings.categories || []).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.innerText = cat === "Todos" ? "Todas las categorías" : cat;
    bulkSelect.appendChild(opt);
  });

  renderMonthlyStats();
}

function renderAdminProductsCards() {
  const container = document.getElementById("adminProductsList");
  container.innerHTML = "";

  const filtered = adminProducts.filter(p =>
    (p.title && p.title.toLowerCase().includes(adminSearchQuery)) ||
    (p.category && p.category.toLowerCase().includes(adminSearchQuery))
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-4 small">No hay productos que coincidan.</div>`;
    return;
  }

  filtered.forEach(p => {
    const isActive = p.active !== false;
    const variantsCount = Array.isArray(p.variants) ? p.variants.length : 0;
    const hasVariantStock = getVariantStockList(p).length > 0;
    const totalStock = getTotalStock(p);

    const card = document.createElement("div");
    card.className = `admin-product-card shadow-sm ${!isActive ? "paused-item" : ""}`;
    card.innerHTML = `
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="d-flex align-items-center gap-2">
          <img src="${escapeHtml(optimizeImageUrl(p.image, 150))}" class="admin-thumb" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async">
          <div>
            <span class="badge bg-light text-secondary border" style="font-size:0.68rem;">${escapeHtml(p.category) || "Sin categoría"}</span>
            ${variantsCount > 0 ? `<span class="badge bg-primary-subtle text-primary" style="font-size:0.68rem;">${variantsCount} opciones</span>` : ""}
            <h6 class="fw-bold mb-0 mt-1" style="font-size:0.92rem;">${escapeHtml(p.title) || "Sin título"}</h6>
          </div>
        </div>
        <div class="form-check form-switch" title="Mostrar / Pausar">
          <input class="form-check-input" type="checkbox" role="switch" ${isActive ? "checked" : ""} 
            onchange="toggleProductActive(${p.id}, this.checked)">
        </div>
      </div>

      <div class="row g-2 align-items-center pt-2 border-top">
        <div class="col-5">
          <label class="text-muted d-block" style="font-size:0.68rem;">PRECIO ($)</label>
          <input type="number" class="form-control form-control-sm fw-bold" value="${p.price || 0}" 
            onchange="quickUpdate(${p.id}, 'price', this.value)">
        </div>
        <div class="col-4">
          <label class="text-muted d-block" style="font-size:0.68rem;">STOCK</label>
          <input type="number" class="form-control form-control-sm ${totalStock <= 0 ? 'border-danger text-danger fw-bold' : ''}"
            value="${totalStock}" ${hasVariantStock ? 'readonly title="Se edita con el lápiz: stock por talle y color"' : `onchange="quickUpdate(${p.id}, 'stock', this.value)"`}>
        </div>
        <div class="col-3 d-flex justify-content-end gap-1 mt-3">
          <button class="btn btn-sm btn-outline-primary" onclick="openProductModal(${p.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="removeProduct(${p.id})"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function quickUpdate(productId, field, newValue) {
  const prod = adminProducts.find(p => p.id === productId);
  if (!prod) return;
  prod[field] = Number(newValue);
  await DataService.saveProduct(prod);
  renderAdminProductsCards();
  updateDashboardMetrics();

  Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "success",
    title: "Guardado",
    showConfirmButton: false,
    timer: 900
  });
}

async function toggleProductActive(productId, isChecked) {
  const prod = adminProducts.find(p => p.id === productId);
  if (!prod) return;
  prod.active = isChecked;
  await DataService.saveProduct(prod);
  renderAdminProductsCards();
}

async function handleBulkPriceUpdate() {
  const category = document.getElementById("bulkCategorySelect").value;
  const percent = Number(document.getElementById("bulkPercentInput").value);

  if (!percent || percent === 0) {
    Swal.fire("Atención", "Ingresá un porcentaje válido.", "warning");
    return;
  }

  const multiplier = 1 + (percent / 100);
  adminProducts.forEach(p => {
    if (category === "Todos" || p.category === category) {
      p.price = Math.round(Number(p.price) * multiplier);
      if (p.comparePrice > 0) {
        p.comparePrice = Math.round(Number(p.comparePrice) * multiplier);
      }
    }
  });

  await DataService.saveAllProducts(adminProducts);
  renderAdminProductsCards();
  document.getElementById("bulkPercentInput").value = "";
  Swal.fire("Precios actualizados", `Se aplicó un ${percent}% a ${category}.`, "success");
}

/* Estados de los pedidos: Pendiente -> En preparación -> Despachado -> Entregado (o Cancelado) */
const ORDER_STATUS_BADGES = {
  "Pendiente": "bg-warning text-dark",
  "En preparación": "bg-info text-dark",
  "Despachado": "bg-primary",
  "Entregado": "bg-success",
  "Cancelado": "bg-secondary"
};

const ORDER_NEXT_STATUS = {
  "Pendiente": "En preparación",
  "En preparación": "Despachado",
  "Despachado": "Entregado"
};

// Los pedidos con retiro en el local no se "despachan": quedan "listos para retirar"
function isPickupOrder(order) {
  return !String(order.delivery || "").startsWith("Envío");
}

function getOrderStatusLabel(order) {
  return (order.status === "Despachado" && isPickupOrder(order)) ? "Listo para retirar" : order.status;
}

function getNextActionLabel(order) {
  const next = ORDER_NEXT_STATUS[order.status];
  if (next === "En preparación") return "Pasar a En preparación";
  if (next === "Despachado") return isPickupOrder(order) ? "Listo para retirar" : "Marcar Despachado";
  if (next === "Entregado") return "Marcar Entregado";
  return "";
}

// Mensaje que se abre en WhatsApp para avisarle al cliente, según el estado de su pedido
function buildOrderWhatsappMessage(order) {
  const store = adminSettings.storeName || "la tienda";
  const code = String(order.id).slice(-4);
  const byStatus = {
    "Pendiente": "Recibimos tu pedido y lo estamos revisando para coordinar los detalles.",
    "En preparación": "Tu pedido ya está en preparación.",
    "Despachado": isPickupOrder(order) ? "Tu pedido ya está listo para retirar." : "Tu pedido ya fue despachado.",
    "Entregado": "¡Gracias por tu compra! Cualquier consulta, escribinos.",
    "Cancelado": "Tu pedido fue cancelado. Si querés, escribinos y lo coordinamos de nuevo."
  };
  return `Hola ${order.customer}! Te escribimos de ${store} por tu pedido #${code}. ${byStatus[order.status] || ""}`.trim();
}

function renderAdminOrders() {
  const container = document.getElementById("adminOrdersList");
  container.innerHTML = "";

  if (adminOrders.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-5 small">No hay pedidos registrados todavía.</div>`;
    return;
  }

  const currency = escapeHtml(adminSettings.currency || "$");

  adminOrders.forEach(order => {
    const nextLabel = getNextActionLabel(order);
    const canCancel = ["Pendiente", "En preparación", "Despachado"].includes(order.status);
    const phone = String(order.phone || "").replace(/\D/g, "");
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(buildOrderWhatsappMessage(order))}`
      : "";

    const itemsHtml = (order.items || []).map(i =>
      `<div>• ${i.quantity}x <strong>${escapeHtml(i.title)}</strong> ${i.variant ? `(${escapeHtml(i.variant)})` : ""}</div>`
    ).join("");

    const div = document.createElement("div");
    div.className = "bg-white border rounded-4 p-3 shadow-sm";
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
        <div>
          <span class="fw-bold small">#${String(order.id).slice(-4)} - ${escapeHtml(order.customer)}</span>
          <div class="text-muted" style="font-size:0.72rem;">${escapeHtml(order.date)}</div>
        </div>
        <span class="badge ${ORDER_STATUS_BADGES[order.status] || 'bg-secondary'}">${escapeHtml(getOrderStatusLabel(order))}</span>
      </div>
      <div class="small mb-2">${itemsHtml}</div>
      <div class="small text-muted mb-2">
        <div><i class="bi bi-truck me-1"></i>${escapeHtml(order.delivery)}</div>
        <div><i class="bi bi-wallet2 me-1"></i>${escapeHtml(order.payment)}</div>
        ${phone ? `<div><i class="bi bi-telephone me-1"></i>+${escapeHtml(phone)}</div>` : ""}
      </div>
      <div class="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
        <span class="fw-extrabold fs-6 text-primary">${currency}${Number(order.total || 0).toLocaleString("es-AR")}</span>
        <div class="d-flex gap-2 flex-wrap justify-content-end">
          ${whatsappUrl
            ? `<a class="btn btn-sm btn-outline-success fw-semibold" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener">
                <i class="bi bi-whatsapp me-1"></i> WhatsApp
              </a>`
            : `<span class="small text-muted align-self-center">Sin teléfono</span>`}
          ${nextLabel ? `
            <button class="btn btn-sm btn-success fw-semibold" onclick="advanceOrder(${order.id})">
              <i class="bi bi-arrow-right-circle me-1"></i> ${nextLabel}
            </button>` : ""}
          ${canCancel ? `
            <button class="btn btn-sm btn-outline-secondary" onclick="cancelOrder(${order.id})">Cancelar</button>` : ""}
          <button class="btn btn-sm btn-outline-danger" onclick="deleteOrderItem(${order.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Cambia el estado y refresca todo. El stock se mueve solo (se descuenta al pasar a "En preparación")
async function changeOrderStatus(orderId, newStatus) {
  const before = adminOrders.find(o => o.id === orderId);
  const result = await DataService.updateOrderStatus(orderId, newStatus);

  if (result === false) {
    Swal.fire("No se pudo actualizar", "No se pudo cambiar el estado del pedido. Abrí la consola del navegador (F12) para ver el detalle.", "error");
    return;
  }

  adminOrders = await DataService.getOrders();
  adminProducts = await DataService.getProducts();
  renderAdminOrders();
  renderAdminProductsCards();
  updateDashboardMetrics();

  let message = `Pedido: ${getOrderStatusLabel(result)}`;
  if (before && before.stockDiscounted !== result.stockDiscounted) {
    message += result.stockDiscounted ? ". Stock descontado." : ". Stock devuelto.";
  }

  Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: message, showConfirmButton: false, timer: 1800 });
}

async function advanceOrder(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  const next = order ? ORDER_NEXT_STATUS[order.status] : null;
  if (next) await changeOrderStatus(orderId, next);
}

async function cancelOrder(orderId) {
  const res = await Swal.fire({
    title: "¿Cancelar el pedido?",
    text: "Si ya tenía el stock descontado, se devuelve automáticamente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, cancelar",
    cancelButtonText: "Volver"
  });

  if (res.isConfirmed) await changeOrderStatus(orderId, "Cancelado");
}

// Se mantiene por compatibilidad con versiones anteriores del panel
async function markOrderDelivered(orderId) {
  await changeOrderStatus(orderId, "Entregado");
}

async function deleteOrderItem(orderId) {
  await DataService.deleteOrder(orderId);
  adminOrders = await DataService.getOrders();
  adminProducts = await DataService.getProducts();
  renderAdminOrders();
  renderAdminProductsCards();
  updateDashboardMetrics();
}

/* ==========================================================================
   3.5 RESUMEN DEL MES (ventas, pedidos y producto más vendido)
   ========================================================================== */
// Fecha del pedido: usa la fecha estándar si existe y, si no, la que está escrita como texto (dd/mm/aaaa)
function getOrderDate(order) {
  if (order.createdAt) {
    const parsed = new Date(order.createdAt);
    if (!isNaN(parsed)) return parsed;
  }
  const match = String(order.date || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
}

// Ventas = pedidos entregados del mes. Pedidos = todos los del mes menos los cancelados.
// Más vendido = el producto con más unidades en los pedidos del mes (sin cancelados).
function computeMonthlyStats(orders, now = new Date()) {
  const monthOrders = (orders || []).filter(order => {
    const date = getOrderDate(order);
    return date
      && date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && order.status !== "Cancelado";
  });

  const sales = monthOrders
    .filter(order => order.status === "Entregado")
    .reduce((acc, order) => acc + Number(order.total || 0), 0);

  const unitsByProduct = {};
  monthOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.productId !== undefined && item.productId !== null ? item.productId : item.title;
      if (!unitsByProduct[key]) unitsByProduct[key] = { title: item.title, units: 0 };
      unitsByProduct[key].units += Number(item.quantity || 0);
    });
  });

  const ranking = Object.values(unitsByProduct).sort((a, b) => b.units - a.units);
  return { sales, ordersCount: monthOrders.length, topProduct: ranking.length > 0 ? ranking[0] : null };
}

function renderMonthlyStats() {
  const stats = computeMonthlyStats(adminOrders);
  const currency = adminSettings.currency || "$";

  document.getElementById("statMonthSales").innerText = `${currency}${stats.sales.toLocaleString("es-AR")}`;
  document.getElementById("statMonthOrders").innerText = stats.ordersCount;
  document.getElementById("statTopProduct").innerText = stats.topProduct ? stats.topProduct.title : "Sin ventas";
  document.getElementById("statTopProductUnits").innerText = stats.topProduct
    ? `${stats.topProduct.units} ${stats.topProduct.units === 1 ? "unidad" : "unidades"}`
    : "Todavía no hay pedidos este mes";
}

/* ==========================================================================
   4. MODAL DE PRODUCTO Y GUARDADO GENERAL DE AJUSTES
   ========================================================================== */
function openProductModal(productId = null) {
  const selectCat = document.getElementById("prodCategory");
  selectCat.innerHTML = "";
  
  (adminSettings.categories || []).filter(c => c !== "Todos").forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.innerText = c;
    selectCat.appendChild(opt);
  });

  // Sugerencia dinámica de variantes según el rubro elegido
  document.getElementById("prodVariants").placeholder = adminSettings.variantPlaceholder || "Ej: Talle S, M, L";

  const preview = document.getElementById("imgPreview");
  document.getElementById("prodImageFile").value = "";

  if (productId) {
    const p = adminProducts.find(item => item.id === productId);
    document.getElementById("modalTitle").innerText = "Editar Producto";
    document.getElementById("prodId").value = p.id;
    document.getElementById("prodTitle").value = p.title || "";
    document.getElementById("prodCategory").value = p.category || "";
    document.getElementById("prodPrice").value = p.price || 0;
    document.getElementById("prodComparePrice").value = p.comparePrice || 0;
    document.getElementById("prodStock").value = p.stock || 0;
    document.getElementById("prodVariants").value = Array.isArray(p.variants) ? p.variants.join(", ") : "";
    document.getElementById("prodDesc").value = p.description || "";
    document.getElementById("prodImageUrl").value = p.image || "";
    if (p.image) {
      preview.src = p.image;
      preview.classList.remove("d-none");
    } else {
      preview.classList.add("d-none");
    }
  } else {
    document.getElementById("modalTitle").innerText = "Nuevo Producto";
    document.getElementById("productForm").reset();
    document.getElementById("prodId").value = "";
    document.getElementById("prodComparePrice").value = 0;
    document.getElementById("prodVariants").value = "";
    document.getElementById("prodImageUrl").value = "";
    preview.classList.add("d-none");
  }

  setupVariantEditor(productId ? adminProducts.find(item => item.id === productId) : null);

  productModalInstance.show();
}

/* ==========================================================================
   4.1 EDITOR DE TALLES Y COLORES CON STOCK PROPIO
   ========================================================================== */
const SIZE_PRESETS = {
  ropa: ["XS", "S", "M", "L", "XL", "XXL"],
  calzado: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]
};

// Stock escrito en cada casillero, por etiqueta: así no se pierde al rearmar la grilla
let variantGridState = {};

// "a, b, c" -> ["a", "b", "c"] sin vacíos ni repetidos
function splitList(text) {
  return Array.from(new Set(String(text || "").split(",").map(item => item.trim()).filter(item => item !== "")));
}

function getEditorSizes() {
  const preset = document.getElementById("varPreset").value;
  if (preset === "custom") return splitList(document.getElementById("varCustomSizes").value);
  return SIZE_PRESETS[preset] || [];
}

function getEditorColors() {
  return splitList(document.getElementById("varColors").value);
}

function buildVariantLabel(size, color) {
  return size && color ? `${size} / ${color}` : (size || color);
}

// Todas las combinaciones talle x color que arma el editor
function buildVariantEntries() {
  const sizes = getEditorSizes();
  const colors = getEditorColors();
  if (sizes.length === 0 && colors.length === 0) return [];

  const entries = [];
  (colors.length > 0 ? colors : [""]).forEach(color => {
    (sizes.length > 0 ? sizes : [""]).forEach(size => {
      entries.push({ label: buildVariantLabel(size, color), size: size, color: color });
    });
  });
  return entries;
}

// Lista final para guardar: cada combinación con su stock
function collectVariantStock() {
  return buildVariantEntries().map(entry => ({
    label: entry.label,
    size: entry.size,
    color: entry.color,
    stock: Math.max(0, Math.floor(Number(variantGridState[entry.label]) || 0))
  }));
}

function updateVariantTotal() {
  const total = collectVariantStock().reduce((acc, entry) => acc + entry.stock, 0);
  document.getElementById("varTotalStock").innerText = total;
  return total;
}

// Dibuja la grilla: una fila por color y una columna por talle
function renderVariantGrid() {
  const preset = document.getElementById("varPreset").value;
  document.getElementById("varCustomWrapper").classList.toggle("d-none", preset !== "custom");

  const sizes = getEditorSizes();
  const colors = getEditorColors();
  const grid = document.getElementById("variantGrid");
  grid.innerHTML = "";

  const hasEntries = sizes.length > 0 || colors.length > 0;
  // Sin talles ni colores, el producto usa el stock simple de siempre
  document.getElementById("stockCol").classList.toggle("d-none", hasEntries);
  document.getElementById("prodStock").required = !hasEntries;

  if (!hasEntries) {
    grid.innerHTML = `<div class="small text-muted">Sin talles ni colores: se usa el stock simple de arriba.</div>`;
    updateVariantTotal();
    return;
  }

  const table = document.createElement("table");
  table.className = "table table-sm table-bordered align-middle text-center mb-0";

  const headRow = document.createElement("tr");
  headRow.appendChild(document.createElement("th"));
  (sizes.length > 0 ? sizes : ["Stock"]).forEach(size => {
    const th = document.createElement("th");
    th.className = "small";
    th.textContent = size;
    headRow.appendChild(th);
  });
  const thead = document.createElement("thead");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  (colors.length > 0 ? colors : [""]).forEach(color => {
    const row = document.createElement("tr");
    const rowHead = document.createElement("th");
    rowHead.className = "small text-start";
    rowHead.textContent = color || "Todos";
    row.appendChild(rowHead);

    (sizes.length > 0 ? sizes : [""]).forEach(size => {
      const label = buildVariantLabel(size, color);
      const cell = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.className = "form-control form-control-sm text-center px-1";
      input.style.minWidth = "52px";
      input.value = Number(variantGridState[label]) || 0;
      input.addEventListener("input", () => {
        variantGridState[label] = Number(input.value) || 0;
        updateVariantTotal();
      });
      cell.appendChild(input);
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  grid.appendChild(table);

  updateVariantTotal();
}

// Prepara el editor al abrir el modal: activo solo si la tienda maneja talles y colores
function setupVariantEditor(product) {
  const enabled = isVariantStockEnabled(adminSettings);
  document.getElementById("variantMatrixBlock").classList.toggle("d-none", !enabled);
  document.getElementById("simpleVariantsBlock").classList.toggle("d-none", enabled);
  document.getElementById("varLegacyNote").classList.add("d-none");
  variantGridState = {};

  if (!enabled) {
    document.getElementById("stockCol").classList.remove("d-none");
    document.getElementById("prodStock").required = true;
    return;
  }

  const list = product ? getVariantStockList(product) : [];
  const presetSelect = document.getElementById("varPreset");
  const customInput = document.getElementById("varCustomSizes");
  const colorsInput = document.getElementById("varColors");
  customInput.value = "";
  colorsInput.value = "";

  if (list.length > 0) {
    // Producto que ya tiene stock por variante: se reconstruyen talles y colores
    const sizes = Array.from(new Set(list.map(v => v.size).filter(Boolean)));
    const colors = Array.from(new Set(list.map(v => v.color).filter(Boolean)));

    if (sizes.length === 0) {
      presetSelect.value = "none";
    } else if (JSON.stringify(sizes) === JSON.stringify(SIZE_PRESETS.ropa)) {
      presetSelect.value = "ropa";
    } else if (JSON.stringify(sizes) === JSON.stringify(SIZE_PRESETS.calzado)) {
      presetSelect.value = "calzado";
    } else {
      presetSelect.value = "custom";
      customInput.value = sizes.join(", ");
    }
    colorsInput.value = colors.join(", ");
    list.forEach(v => { variantGridState[v.label] = Number(v.stock) || 0; });
  } else if (product && Array.isArray(product.variants) && product.variants.length > 0) {
    // Producto viejo con opciones escritas a mano y un único stock general
    presetSelect.value = "custom";
    customInput.value = product.variants.join(", ");
    document.getElementById("varLegacyNote").classList.remove("d-none");
  } else if (product) {
    presetSelect.value = "none";
  } else {
    presetSelect.value = "ropa";
  }

  renderVariantGrid();
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const btn = document.getElementById("btnSaveProduct");
  btn.disabled = true;

  try {
    // Talles y colores con stock propio (si la tienda los maneja)
    const matrixActive = isVariantStockEnabled(adminSettings);
    const variantEntries = matrixActive ? collectVariantStock() : [];
    const usesVariantStock = variantEntries.length > 0;
    const stockFromVariants = variantEntries.reduce((acc, entry) => acc + entry.stock, 0);

    if (usesVariantStock && stockFromVariants === 0) {
      const confirmation = await Swal.fire({
        icon: "warning",
        title: "Stock en 0",
        text: "Ninguna variante tiene stock, así que el producto figurará como agotado. ¿Guardar igual?",
        showCancelButton: true,
        confirmButtonText: "Sí, guardar",
        cancelButtonText: "Volver"
      });
      if (!confirmation.isConfirmed) return;
    }

    const fileInput = document.getElementById("prodImageFile");
    let imageUrl = document.getElementById("prodImageUrl").value;

    if (fileInput.files.length > 0) {
      imageUrl = await DataService.uploadImage(fileInput.files[0]);
    } else if (!imageUrl) {
      imageUrl = "https://via.placeholder.com/600x500?text=Sin+Imagen";
    }

    const rawVariants = document.getElementById("prodVariants").value;
    const variantsArray = rawVariants.split(",").map(v => v.trim()).filter(v => v !== "");

    const idVal = document.getElementById("prodId").value;
    const productData = {
      id: idVal ? Number(idVal) : null,
      title: document.getElementById("prodTitle").value.trim(),
      category: document.getElementById("prodCategory").value,
      price: Number(document.getElementById("prodPrice").value),
      comparePrice: Number(document.getElementById("prodComparePrice").value || 0),
      stock: usesVariantStock ? stockFromVariants : Number(document.getElementById("prodStock").value),
      active: true,
      variants: usesVariantStock ? variantEntries.map(entry => entry.label) : (matrixActive ? [] : variantsArray),
      variantStock: usesVariantStock ? variantEntries : [],
      description: document.getElementById("prodDesc").value.trim(),
      image: imageUrl
    };

    await DataService.saveProduct(productData);
    adminProducts = (await DataService.getProducts()) || [];
    renderAdminProductsCards();
    updateDashboardMetrics();
    productModalInstance.hide();

    const missingColumns = DataService.lastSkippedColumns || [];
    if (missingColumns.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Guardado con avisos",
        text: `Estos datos no se guardaron porque faltan columnas en la tabla products de Supabase: ${missingColumns.join(", ")}. Ejecutá el SQL definitivo.`
      });
    } else {
      Swal.fire("Guardado", "Producto actualizado correctamente.", "success");
    }
  } catch (error) {
    console.error("Error capturado:", error);
    Swal.fire("Error al guardar", error.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function removeProduct(id) {
  const res = await Swal.fire({
    title: "¿Eliminar producto?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, borrar",
    cancelButtonText: "Cancelar"
  });

  if (res.isConfirmed) {
    await DataService.deleteProduct(id);
    adminProducts = (await DataService.getProducts()) || [];
    renderAdminProductsCards();
    updateDashboardMetrics();
  }
}

// Vista previa de la tipografía elegida (no cambia la fuente del panel)
function renderFontPreview() {
  const style = ensureFontLoaded(document.getElementById("confFontStyle").value);
  document.getElementById("fontPreviewTitle").style.fontFamily = `${style.title}, system-ui, sans-serif`;
  document.getElementById("fontPreviewText").style.fontFamily = `${style.text}, system-ui, sans-serif`;
}

function renderCartIconPreview() {
  const name = document.getElementById("confCartIcon").value;
  const preview = document.getElementById("cartIconPreview");
  preview.innerHTML = "";

  const icon = document.createElement(name ? "span" : "i");
  if (name) {
    icon.className = "material-symbols-outlined";
    icon.textContent = name;
  } else {
    icon.className = "bi bi-bag-plus";
  }
  preview.appendChild(icon);
}

// Las opciones de ícono cambian según el rubro guardado en la configuración
function refreshCartIconSelect() {
  const select = document.getElementById("confCartIcon");
  const options = getIconOptionsForIndustry(adminSettings.selectedIndustryId);
  ensureMaterialIcons(options.map(option => option.name));

  select.innerHTML = "";
  options.forEach(option => {
    const el = document.createElement("option");
    el.value = option.name;
    el.textContent = option.label;
    select.appendChild(el);
  });

  const saved = adminSettings.cartIcon || "";
  select.value = options.some(option => option.name === saved) ? saved : "";
  renderCartIconPreview();
}

// Convierte el texto del formulario ("Zona = precio", una por línea) en una lista de zonas
function parseShippingZones(rawText) {
  return rawText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "")
    .map(line => {
      const [name, price] = line.split("=").map(part => part.trim());
      return { name: name, price: Number(String(price || "").replace(/\D/g, "")) || 0 };
    })
    .filter(zone => zone.name !== "");
}

// Hace el camino inverso: lista de zonas -> texto para mostrar en el formulario
function formatShippingZones(zones) {
  return (zones || []).map(zone => `${zone.name} = ${zone.price}`).join("\n");
}

function fillSettingsForm() {
  document.getElementById("confName").value = adminSettings.storeName || "";
  document.getElementById("confSlogan").value = adminSettings.slogan || "";
  document.getElementById("confAnnouncement").value = adminSettings.announcement || "";
  document.getElementById("confWhatsapp").value = adminSettings.whatsapp || "";
  document.getElementById("confColor").value = adminSettings.primaryColor || "#000000";
  document.getElementById("confBannerUrl").value = adminSettings.bannerUrl || "";
  
  document.getElementById("confCategories").value = (adminSettings.categories || []).join(", ");

  document.getElementById("confMpEnabled").checked = adminSettings.mpEnabled !== false;
  document.getElementById("confMpAlias").value = adminSettings.mpAliasOrLink || "";
  document.getElementById("confCouponCode").value = adminSettings.couponCode || "";
  document.getElementById("confCouponPercent").value = adminSettings.couponPercent || 0;

  document.getElementById("confShippingCost").value = adminSettings.shippingCost || 0;
  document.getElementById("confFreeThreshold").value = adminSettings.freeShippingThreshold || 0;
  document.getElementById("confDiscountPercent").value = adminSettings.transferDiscountPercent || 0;

  document.getElementById("confStoreOpen").checked = adminSettings.storeStatusOpen !== false;
  document.getElementById("confAboutUs").value = adminSettings.aboutUsText || "";
  document.getElementById("confAddress").value = adminSettings.businessAddress || "";
  document.getElementById("confHours").value = adminSettings.businessHours || "";
  document.getElementById("confInstagram").value = adminSettings.instagramUrl || "";
  document.getElementById("confFacebook").value = adminSettings.facebookUrl || "";

  document.getElementById("confCurrency").value = adminSettings.currency || "$";
  document.getElementById("confLogoUrl").value = adminSettings.logoUrl || "";

  document.getElementById("confCoordinateMode").checked = adminSettings.coordinateMode === true;
  document.getElementById("confPayCash").checked = adminSettings.payCashEnabled !== false;
  document.getElementById("confPayTransfer").checked = adminSettings.payTransferEnabled !== false;
  document.getElementById("confTransferDetails").value = adminSettings.transferDetails || "";
  document.getElementById("confPickupEnabled").checked = adminSettings.pickupEnabled !== false;
  document.getElementById("confDeliveryEnabled").checked = adminSettings.deliveryEnabled !== false;
  document.getElementById("confShippingZones").value = formatShippingZones(adminSettings.shippingZones);

  document.getElementById("confCouponStart").value = adminSettings.couponStart || "";
  document.getElementById("confCouponEnd").value = adminSettings.couponEnd || "";
  document.getElementById("confCouponMin").value = adminSettings.couponMinPurchase || 0;
  document.getElementById("confDiscountStart").value = adminSettings.discountStart || "";
  document.getElementById("confDiscountEnd").value = adminSettings.discountEnd || "";

  document.getElementById("confBenefit1Title").value = adminSettings.benefit1Title || "";
  document.getElementById("confBenefit1Desc").value = adminSettings.benefit1Desc || "";
  document.getElementById("confBenefit2Title").value = adminSettings.benefit2Title || "";
  document.getElementById("confBenefit2Desc").value = adminSettings.benefit2Desc || "";
  document.getElementById("confBenefit3Title").value = adminSettings.benefit3Title || "";
  document.getElementById("confBenefit3Desc").value = adminSettings.benefit3Desc || "";

  document.getElementById("confSellerName").value = adminSettings.sellerLegalName || "";
  document.getElementById("confSellerTaxId").value = adminSettings.sellerTaxId || "";
  document.getElementById("confSellerEmail").value = adminSettings.sellerEmail || "";
  document.getElementById("confTermsText").value = adminSettings.termsText || "";

  document.getElementById("confFontStyle").value = FONT_STYLES[adminSettings.fontStyle] ? adminSettings.fontStyle : "moderno";
  renderFontPreview();
  refreshCartIconSelect();
  document.getElementById("confVariantsEnabled").checked = isVariantStockEnabled(adminSettings);
}

async function handleSaveSettings(e) {
  e.preventDefault();
  let bannerUrl = document.getElementById("confBannerUrl").value;
  const bannerFile = document.getElementById("confBannerFile");

  if (bannerFile.files.length > 0) {
    bannerUrl = await DataService.uploadImage(bannerFile.files[0]);
  }

  let logoUrl = document.getElementById("confLogoUrl").value;
  const logoFile = document.getElementById("confLogoFile");

  if (logoFile.files.length > 0) {
    logoUrl = await DataService.uploadImage(logoFile.files[0]);
  }

  const rawCategories = document.getElementById("confCategories").value;
  const categoriesArray = rawCategories.split(",").map(c => c.trim()).filter(c => c !== "");
  if (!categoriesArray.includes("Todos")) categoriesArray.unshift("Todos");

  const updated = {
    ...adminSettings,
    wizardCompleted: true,
    storeName: document.getElementById("confName").value.trim(),
    slogan: document.getElementById("confSlogan").value.trim(),
    announcement: document.getElementById("confAnnouncement").value.trim(),
    whatsapp: document.getElementById("confWhatsapp").value.trim(),
    primaryColor: document.getElementById("confColor").value,
    bannerUrl: bannerUrl,
    categories: categoriesArray,
    mpEnabled: document.getElementById("confMpEnabled").checked,
    mpAliasOrLink: document.getElementById("confMpAlias").value.trim(),
    couponCode: document.getElementById("confCouponCode").value.trim().toUpperCase(),
    couponPercent: Number(document.getElementById("confCouponPercent").value || 0),
    shippingCost: Number(document.getElementById("confShippingCost").value || 0),
    freeShippingThreshold: Number(document.getElementById("confFreeThreshold").value || 0),
    transferDiscountPercent: Number(document.getElementById("confDiscountPercent").value || 0),
    storeStatusOpen: document.getElementById("confStoreOpen").checked,
    aboutUsText: document.getElementById("confAboutUs").value.trim(),
    businessAddress: document.getElementById("confAddress").value.trim(),
    businessHours: document.getElementById("confHours").value.trim(),
    instagramUrl: document.getElementById("confInstagram").value.trim(),
    facebookUrl: document.getElementById("confFacebook").value.trim(),
    currency: document.getElementById("confCurrency").value.trim() || "$",
    logoUrl: logoUrl,
    coordinateMode: document.getElementById("confCoordinateMode").checked,
    payCashEnabled: document.getElementById("confPayCash").checked,
    payTransferEnabled: document.getElementById("confPayTransfer").checked,
    transferDetails: document.getElementById("confTransferDetails").value.trim(),
    pickupEnabled: document.getElementById("confPickupEnabled").checked,
    deliveryEnabled: document.getElementById("confDeliveryEnabled").checked,
    shippingZones: parseShippingZones(document.getElementById("confShippingZones").value),
    couponStart: document.getElementById("confCouponStart").value,
    couponEnd: document.getElementById("confCouponEnd").value,
    couponMinPurchase: Number(document.getElementById("confCouponMin").value || 0),
    discountStart: document.getElementById("confDiscountStart").value,
    discountEnd: document.getElementById("confDiscountEnd").value,
    benefit1Title: document.getElementById("confBenefit1Title").value.trim(),
    benefit1Desc: document.getElementById("confBenefit1Desc").value.trim(),
    benefit2Title: document.getElementById("confBenefit2Title").value.trim(),
    benefit2Desc: document.getElementById("confBenefit2Desc").value.trim(),
    benefit3Title: document.getElementById("confBenefit3Title").value.trim(),
    benefit3Desc: document.getElementById("confBenefit3Desc").value.trim(),
    sellerLegalName: document.getElementById("confSellerName").value.trim(),
    sellerTaxId: document.getElementById("confSellerTaxId").value.trim(),
    sellerEmail: document.getElementById("confSellerEmail").value.trim(),
    termsText: document.getElementById("confTermsText").value.trim(),
    fontStyle: document.getElementById("confFontStyle").value,
    cartIcon: document.getElementById("confCartIcon").value,
    variantsEnabled: document.getElementById("confVariantsEnabled").checked
  };

  const saved = await DataService.saveSettings(updated);
  if (saved === false) {
    Swal.fire("No se pudo guardar", "Hubo un problema al guardar en la base de datos. Abrí la consola del navegador (F12) para ver el detalle.", "error");
    return;
  }

  adminSettings = updated;
  updateDashboardMetrics();

  // Si faltan columnas en Supabase, lo avisamos en lugar de decir que todo se guardó
  const missingColumns = DataService.lastSkippedColumns || [];
  if (missingColumns.length > 0) {
    Swal.fire({
      icon: "warning",
      title: "Guardado con avisos",
      text: `Estas opciones no se guardaron porque faltan columnas en la tabla settings de Supabase: ${missingColumns.join(", ")}. Ejecutá el SQL de columnas nuevas y volvé a guardar.`
    });
    return;
  }

  Swal.fire("Ajustes guardados", "Toda la configuración ya se actualizó en la tienda.", "success");
}