let storeSettings = {};
let allProducts = [];
let cart = JSON.parse(localStorage.getItem("ecommerce_v4_cart")) || [];
let activeCategory = "Todos";
let searchText = "";
let sortCriteria = "recent";
let selectedVariant = "";
let appliedCouponPercent = 0;
let appliedCouponCode = "";
let quickViewModalInstance = null;

// Medios de pago que puede ofrecer una tienda (el vendedor elige cuáles desde el admin)
const PAYMENT_METHODS = {
  cash:       { label: "Efectivo",                 icon: "bi-cash-stack", sentence: "efectivo" },
  transfer:   { label: "Transferencia",            icon: "bi-bank",       sentence: "transferencia bancaria" },
  mp:         { label: "Mercado Pago",             icon: "bi-qr-code",    sentence: "Mercado Pago" },
  coordinate: { label: "A coordinar por WhatsApp", icon: "bi-whatsapp",   sentence: "a coordinar por WhatsApp" }
};

document.addEventListener("DOMContentLoaded", async () => {
  quickViewModalInstance = new bootstrap.Modal(document.getElementById("quickViewModal"));

  storeSettings = await DataService.getSettings();
  allProducts = await DataService.getProducts();

  applyVisualIdentity();
  applyStoreExtras();
  renderCategoryPills();
  renderCatalog();
  renderCheckoutOptions();
  updateCartUI();

  // Si alguien entró desde un link compartido de producto (#prod-401), lo abrimos directo
  if (window.location.hash.startsWith("#prod-")) {
    const sharedId = Number(window.location.hash.replace("#prod-", ""));
    if (sharedId) openQuickView(sharedId);
  }

  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchText = e.target.value.toLowerCase();
    renderCatalog();
  });

  document.getElementById("sortSelect").addEventListener("change", (e) => {
    sortCriteria = e.target.value;
    renderCatalog();
  });

  // Al abrir el buscador con la lupa, el cursor queda listo para escribir
  document.getElementById("searchBar").addEventListener("shown.bs.collapse", () => {
    document.getElementById("searchInput").focus();
  });

  document.getElementById("deliveryMethod").addEventListener("change", () => {
    syncDeliveryFields();
    updateCartUI();
  });

  document.getElementById("buyerPayment").addEventListener("change", updateCartUI);
  document.getElementById("buyerZone").addEventListener("change", updateCartUI);
  document.getElementById("btnApplyCoupon").addEventListener("click", validateCoupon);
  document.getElementById("btnPayMercadoPago").addEventListener("click", handleMercadoPagoCheckout);
  document.getElementById("btnCheckoutWhatsapp").addEventListener("click", () => sendOrderViaWhatsApp(false));
});

/* ==========================================================================
   1. IDENTIDAD VISUAL, ESTADO ABIERTO/CERRADO Y PRE-FOOTER
   ========================================================================== */
function applyVisualIdentity() {
  document.title = storeSettings.storeName;
  document.documentElement.style.setProperty("--primary-color", storeSettings.primaryColor);

  // Estado Abierto / Cerrado
  const statusBadge = document.getElementById("storeStatusBadge");
  if (storeSettings.storeStatusOpen !== false) {
    statusBadge.className = "badge rounded-pill bg-success";
    statusBadge.innerText = "● Abierto";
  } else {
    statusBadge.className = "badge rounded-pill bg-danger";
    statusBadge.innerText = "● Cerrado (Tomamos pedidos)";
  }

  document.getElementById("announcementText").innerText = storeSettings.announcement || "";

  const navLogo = document.getElementById("navLogo");
  if (storeSettings.logoUrl && storeSettings.logoUrl.trim() !== "") {
    navLogo.src = optimizeImageUrl(storeSettings.logoUrl, 120);
    navLogo.classList.remove("d-none");
  }

  document.getElementById("navBrandName").innerText = storeSettings.storeName;
  document.getElementById("headerTitle").innerText = storeSettings.storeName;
  document.getElementById("headerSlogan").innerText = storeSettings.slogan;
  document.getElementById("footerStoreName").innerText = storeSettings.storeName;

  const bannerUrl = optimizeImageUrl(
    storeSettings.bannerUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80",
    1400
  );
  document.getElementById("heroBanner").style.backgroundImage = `url("${bannerUrl.replace(/"/g, "%22")}")`;

  document.getElementById("ben1Title").innerText = storeSettings.benefit1Title;
  document.getElementById("ben1Desc").innerText = storeSettings.benefit1Desc;
  document.getElementById("ben2Title").innerText = storeSettings.benefit2Title;
  document.getElementById("ben2Desc").innerText = storeSettings.benefit2Desc;
  document.getElementById("ben3Title").innerText = storeSettings.benefit3Title;
  document.getElementById("ben3Desc").innerText = storeSettings.benefit3Desc;

  // Datos del Pre-Footer informativo
  document.getElementById("pfStoreName").innerText = storeSettings.storeName;
  document.getElementById("pfAboutText").innerText = storeSettings.aboutUsText || "";
  document.getElementById("pfAddress").innerText = storeSettings.businessAddress || "Consultar dirección por WhatsApp";
  document.getElementById("pfHours").innerText = storeSettings.businessHours || "Lunes a Sábados";
  document.getElementById("pfPhone").innerText = `+${storeSettings.whatsapp}`;

  document.getElementById("pfInstagram").href = storeSettings.instagramUrl || "#";
  document.getElementById("pfFacebook").href = storeSettings.facebookUrl || "#";
  const waUrl = `https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(`Hola ${storeSettings.storeName}! Quería hacer una consulta.`)}`;
  document.getElementById("pfWhatsappLink").href = waUrl;
  document.getElementById("floatingWhatsapp").href = waUrl;
}

/* ==========================================================================
   2. CATEGORÍAS Y GRILLA DE PRODUCTOS
   ========================================================================== */
function renderCategoryPills() {
  const container = document.getElementById("categoriesContainer");
  container.innerHTML = "";

  storeSettings.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `menu-category-btn ${cat === activeCategory ? "active" : ""}`;
    btn.innerText = cat;
    btn.onclick = () => {
      activeCategory = cat;
      renderCategoryPills();
      renderCatalog();
      closeMenuAndScroll("catalogoSection");
    };
    container.appendChild(btn);
  });
}

// Cierra el menú lateral y, cuando termina de cerrarse, baja suavemente a la sección indicada
function closeMenuAndScroll(sectionId) {
  const menuEl = document.getElementById("menuOffcanvas");
  menuEl.addEventListener("hidden.bs.offcanvas", () => {
    document.getElementById(sectionId).scrollIntoView({ behavior: "smooth" });
  }, { once: true });
  bootstrap.Offcanvas.getOrCreateInstance(menuEl).hide();
}

// Actualiza el título del catálogo ("Todos los productos" o el nombre de la categoría) y la cantidad
function updateCatalogHeading(count) {
  document.getElementById("catalogTitle").innerText =
    activeCategory === "Todos" ? "Todos los productos" : activeCategory;
  document.getElementById("catalogCount").innerText =
    `${count} ${count === 1 ? "producto" : "productos"}`;
}

function renderCatalog() {
  const grid = document.getElementById("catalogGrid");
  grid.innerHTML = "";

  let list = allProducts.filter(p => {
    const isVisible = p.active !== false;
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    const matchText = String(p.title || "").toLowerCase().includes(searchText) ||
                      String(p.description || "").toLowerCase().includes(searchText);
    return isVisible && matchCat && matchText;
  });

  if (sortCriteria === "price_asc") {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortCriteria === "price_desc") {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else {
    list.sort((a, b) => b.id - a.id);
  }

  updateCatalogHeading(list.length);

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">No se encontraron productos en esta sección.</div>`;
    return;
  }

  list.forEach(product => {
    const hasStock = getTotalStock(product) > 0;
    const hasVariants = (Array.isArray(product.variants) && product.variants.length > 0) || getVariantStockList(product).length > 0;
    const price = Number(product.price);
    const compare = Number(product.comparePrice || 0);
    const discountPercent = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

    const col = document.createElement("div");
    col.className = "col";
    col.innerHTML = `
      <div class="card card-product h-100">
        <div class="product-img-wrapper" onclick="openQuickView(${product.id})">
          <img src="${escapeHtml(optimizeImageUrl(product.image, 600))}" class="product-img" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async">
          ${discountPercent > 0 ? `<span class="badge-discount">-${discountPercent}%</span>` : ""}
          ${!hasStock ? `<span class="badge-stock-out">AGOTADO</span>` : ""}
        </div>
        <div class="card-body d-flex flex-column p-2 p-md-3">
          <small class="text-muted" style="font-size: 0.7rem;">${escapeHtml(product.category)}</small>
          <h6 class="card-title fw-bold mb-1 text-truncate" style="font-size: 0.9rem;" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h6>
          <div class="mt-auto pt-2 d-flex flex-column flex-sm-row justify-content-between align-items-sm-end gap-2">
            <div>
              ${compare > price ? `<div class="old-price">${escapeHtml(storeSettings.currency)}${compare.toLocaleString("es-AR")}</div>` : ""}
              <div class="fw-extrabold text-dark fs-6">${escapeHtml(storeSettings.currency)}${price.toLocaleString("es-AR")}</div>
            </div>
            <button class="btn btn-sm btn-theme-primary w-100 w-sm-auto px-2 py-1" 
              ${!hasStock ? "disabled" : ""} 
              onclick="${hasVariants ? `openQuickView(${product.id})` : `addToCart(${product.id}, '')`}">
              ${hasVariants ? '<i class="bi bi-list-check"></i>' : cartIconMarkup('bi-bag-plus')} ${hasVariants ? 'Opciones' : 'Sumar'}
            </button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });
}

/* ==========================================================================
   3. MODAL DE DETALLE, VARIANTES Y BOTÓN COMPARTIR PRODUCTO
   ========================================================================== */
// Muestra el stock de la opción elegida y habilita o no el botón de agregar
function renderQuickViewStock(p) {
  const available = getAvailableStock(p, selectedVariant);
  document.getElementById("qvStockBadge").innerHTML = available > 0
    ? `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Disponible (${escapeHtml(available)} u.)</span>`
    : `<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>Sin stock</span>`;
  document.getElementById("qvAddBtn").disabled = available <= 0;
}

function openQuickView(productId) {
  const p = allProducts.find(item => item.id === productId);
  if (!p) return;

  const price = Number(p.price);
  const compare = Number(p.comparePrice || 0);
  const stockList = getVariantStockList(p);
  const hasVariantStock = stockList.length > 0;
  const variants = hasVariantStock
    ? stockList.map(entry => entry.label)
    : (Array.isArray(p.variants) ? p.variants.filter(v => String(v).trim() !== "") : []);

  document.getElementById("qvImage").src = optimizeImageUrl(p.image, 800);
  document.getElementById("qvCategory").innerText = p.category;
  document.getElementById("qvTitle").innerText = p.title;
  document.getElementById("qvPrice").innerText = `${storeSettings.currency}${price.toLocaleString("es-AR")}`;
  document.getElementById("qvOldPrice").innerText = compare > price ? `${storeSettings.currency}${compare.toLocaleString("es-AR")}` : "";
  document.getElementById("qvDesc").innerText = p.description;

  const varSection = document.getElementById("qvVariantsSection");
  const varList = document.getElementById("qvVariantsList");
  varList.innerHTML = "";

  if (variants.length > 0) {
    // Se elige por defecto la primera opción que tenga stock
    selectedVariant = variants.find(v => getAvailableStock(p, v) > 0) || variants[0];
    varSection.classList.remove("d-none");
    variants.forEach(v => {
      const soldOut = hasVariantStock && getAvailableStock(p, v) <= 0;
      const chip = document.createElement("span");
      chip.className = `variant-chip ${v === selectedVariant ? "active" : ""} ${soldOut ? "sold-out" : ""}`;
      chip.innerText = v;
      if (!soldOut) {
        chip.onclick = () => {
          selectedVariant = v;
          Array.from(varList.children).forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          renderQuickViewStock(p);
        };
      }
      varList.appendChild(chip);
    });
  } else {
    selectedVariant = "";
    varSection.classList.add("d-none");
  }

  renderQuickViewStock(p);

  // Botón Compartir Enlace Directo
  document.getElementById("qvShareBtn").onclick = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#prod-${p.id}`;
    navigator.clipboard.writeText(shareUrl);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "Enlace del producto copiado",
      showConfirmButton: false,
      timer: 1500
    });
  };

  const btn = document.getElementById("qvAddBtn");
  btn.onclick = () => {
    addToCart(p.id, selectedVariant);
    quickViewModalInstance.hide();
  };

  quickViewModalInstance.show();
}

/* ==========================================================================
   3.1 OFERTAS CON FECHAS, MEDIOS DE PAGO, ENTREGA Y TEXTOS LEGALES
   Todo lo que se muestra acá lo configura el vendedor desde el panel Admin.
   ========================================================================== */
// Fecha de hoy como "AAAA-MM-DD" (hora local) para compararla con las fechas de las ofertas
function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Una oferta está vigente si hoy cae entre su fecha de inicio y de fin (una fecha vacía no limita)
function isOfferActive(start, end) {
  const today = todayISO();
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

// "2026-12-31" -> "31/12/2026"
function formatISODate(iso) {
  const [year, month, day] = String(iso || "").split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

// "a, b y c"
function joinWithAnd(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

// Modo "todo a coordinar por WhatsApp": la tienda no calcula descuentos, cupones ni envío
function isCoordinateMode() {
  return storeSettings.coordinateMode === true;
}

function getPaymentKeys() {
  if (isCoordinateMode()) return ["coordinate"];

  const keys = [];
  if (storeSettings.payCashEnabled !== false) keys.push("cash");
  if (storeSettings.payTransferEnabled !== false) keys.push("transfer");
  if (storeSettings.mpEnabled) keys.push("mp");
  return keys.length > 0 ? keys : ["coordinate"];
}

function getDeliveryOptions() {
  const options = [];
  if (storeSettings.pickupEnabled !== false) options.push({ value: "pickup", label: "Retiro en el local" });
  if (storeSettings.deliveryEnabled !== false) options.push({ value: "delivery", label: "Envío a domicilio" });
  return options.length > 0 ? options : [{ value: "pickup", label: "Retiro en el local" }];
}

function getShippingZones() {
  if (isCoordinateMode() || !Array.isArray(storeSettings.shippingZones)) return [];
  return storeSettings.shippingZones.filter(zone => zone && zone.name);
}

function getSelectedZone() {
  const zones = getShippingZones();
  if (zones.length === 0) return null;
  return zones[Number(document.getElementById("buyerZone").value)] || zones[0];
}

// Costo de envío antes de aplicar "envío gratis": el de la zona elegida o el costo único
function getShippingBaseCost() {
  const zone = getSelectedZone();
  return zone ? Number(zone.price || 0) : Number(storeSettings.shippingCost || 0);
}

function fillSelect(selectId, options) {
  const select = document.getElementById(selectId);
  select.innerHTML = "";
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
}

// Arma los desplegables del carrito según lo que el vendedor tiene activado
function renderCheckoutOptions() {
  fillSelect("deliveryMethod", getDeliveryOptions());
  fillSelect("buyerPayment", getPaymentKeys().map(key => ({ value: key, label: PAYMENT_METHODS[key].label })));

  const zoneSelect = document.getElementById("buyerZone");
  zoneSelect.innerHTML = "";
  getShippingZones().forEach((zone, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${zone.name} - ${storeSettings.currency}${Number(zone.price || 0).toLocaleString("es-AR")}`;
    zoneSelect.appendChild(option);
  });

  syncDeliveryFields();
}

// Muestra la dirección y la zona solo cuando el cliente elige envío a domicilio
function syncDeliveryFields() {
  const isDelivery = document.getElementById("deliveryMethod").value === "delivery";
  document.getElementById("buyerAddress").classList.toggle("d-none", !isDelivery);
  document.getElementById("zoneWrapper").classList.toggle("d-none", !(isDelivery && getShippingZones().length > 0));
}

// Textos de ayuda del carrito: condiciones de las ofertas, datos de transferencia y cupón disponible
function updateCheckoutHints() {
  const coordinate = isCoordinateMode();
  const method = document.getElementById("buyerPayment").value;
  const delivery = document.getElementById("deliveryMethod").value;

  const couponLive = !coordinate
    && (storeSettings.couponCode || "").trim() !== ""
    && Number(storeSettings.couponPercent || 0) > 0
    && isOfferActive(storeSettings.couponStart, storeSettings.couponEnd);
  document.getElementById("couponWrapper").classList.toggle("d-none", !couponLive);

  const discountPercent = Number(storeSettings.transferDiscountPercent || 0);
  const discountMethods = [];
  if (storeSettings.payCashEnabled !== false) discountMethods.push("efectivo");
  if (storeSettings.payTransferEnabled !== false) discountMethods.push("transferencia");
  const discountLive = !coordinate && discountPercent > 0 && discountMethods.length > 0
    && isOfferActive(storeSettings.discountStart, storeSettings.discountEnd);

  const payHint = document.getElementById("payHint");
  if (discountLive) {
    const until = storeSettings.discountEnd ? ` (hasta el ${formatISODate(storeSettings.discountEnd)})` : "";
    payHint.innerText = `${discountPercent}% de descuento pagando en ${discountMethods.join(" o ")}${until}.`;
  }
  payHint.classList.toggle("d-none", !discountLive);

  const freeThreshold = Number(storeSettings.freeShippingThreshold || 0);
  const shipHint = document.getElementById("shipHint");
  const shipHintLive = !coordinate && delivery === "delivery" && freeThreshold > 0;
  if (shipHintLive) {
    shipHint.innerText = `Envío gratis en compras desde ${storeSettings.currency}${freeThreshold.toLocaleString("es-AR")}.`;
  }
  shipHint.classList.toggle("d-none", !shipHintLive);

  const transferDetails = (storeSettings.transferDetails || "").trim();
  const transferInfo = document.getElementById("transferInfo");
  const transferLive = !coordinate && method === "transfer" && transferDetails !== "";
  if (transferLive) {
    transferInfo.innerText = `Datos para transferir:\n${transferDetails}`;
  }
  transferInfo.classList.toggle("d-none", !transferLive);

  document.getElementById("totalLabel").innerText = coordinate ? "Total estimado:" : "Total Final:";
}

// Cartel de demo, enlace al admin, WhatsApp, redes, año y datos legales del pie de página
function applyStoreExtras() {
  applyFontStyle(storeSettings.fontStyle);
  applyCartIcon();

  document.getElementById("demoBanner").classList.toggle("d-none", !DEMO_MODE);
  document.getElementById("adminLink").classList.toggle("d-none", !DEMO_MODE);

  const hasWhatsapp = String(storeSettings.whatsapp || "").trim() !== "";
  if (!hasWhatsapp) {
    document.getElementById("floatingWhatsapp").classList.add("d-none");
    document.getElementById("pfWhatsappLink").classList.add("d-none");
    document.getElementById("pfPhone").innerText = "Consultá por la tienda";
  }

  document.getElementById("pfInstagram").classList.toggle("d-none", !(storeSettings.instagramUrl || "").trim());
  document.getElementById("pfFacebook").classList.toggle("d-none", !(storeSettings.facebookUrl || "").trim());

  document.getElementById("footerYear").innerText = new Date().getFullYear();

  renderInfoSection();
  renderLegalInfo();
}

// "Información útil" del pie de página: refleja los medios de pago y entregas realmente activos
function renderInfoSection() {
  const paymentKeys = getPaymentKeys();
  const badges = paymentKeys.map(key => ({ icon: PAYMENT_METHODS[key].icon, label: PAYMENT_METHODS[key].label }));

  if (paymentKeys[0] === "coordinate") {
    document.getElementById("pfPaymentsText").innerText = "El pago y la entrega se coordinan con el vendedor por WhatsApp.";
  } else {
    document.getElementById("pfPaymentsText").innerText =
      `Medios de pago: ${joinWithAnd(paymentKeys.map(key => PAYMENT_METHODS[key].sentence))}.`;
    getDeliveryOptions().forEach(opt => {
      badges.push(opt.value === "pickup"
        ? { icon: "bi-shop", label: "Retiro en el local" }
        : { icon: "bi-truck", label: "Envíos" });
    });
  }

  const container = document.getElementById("pfBadges");
  container.innerHTML = "";
  badges.forEach(badge => {
    const span = document.createElement("span");
    span.className = "badge bg-light text-dark border";
    const icon = document.createElement("i");
    icon.className = `bi ${badge.icon} me-1`;
    span.appendChild(icon);
    span.appendChild(document.createTextNode(badge.label));
    container.appendChild(span);
  });
}

// Datos del vendedor (nombre, CUIT y contacto) al pie de la tienda
function renderLegalInfo() {
  const parts = [];
  const name = (storeSettings.sellerLegalName || "").trim();
  const taxId = (storeSettings.sellerTaxId || "").trim();
  const email = (storeSettings.sellerEmail || "").trim();

  if (name) parts.push(`Vendedor: ${name}`);
  if (taxId) parts.push(`CUIT: ${taxId}`);
  if (email) parts.push(`Contacto: ${email}`);

  const legalInfo = document.getElementById("legalInfo");
  legalInfo.innerText = parts.join(" · ");
  legalInfo.classList.toggle("d-none", parts.length === 0);
}

// Texto base de términos y condiciones (el vendedor puede reemplazarlo desde el admin)
function buildDefaultTerms() {
  const store = storeSettings.storeName || "la tienda";
  return [
    `Términos y condiciones de ${store}`,
    "",
    "1. Precios y disponibilidad: los precios publicados pueden modificarse. La disponibilidad de cada producto se confirma al coordinar el pedido por WhatsApp.",
    "2. Pedido: al enviar el pedido por WhatsApp, el vendedor confirma el total, la forma de pago y la modalidad de entrega o retiro.",
    "3. Promociones: cada oferta rige durante las fechas y con las condiciones que se informan en la tienda.",
    "4. Derecho de arrepentimiento: en compras a distancia podés revocar la compra dentro de los 10 días corridos contados desde la entrega del producto o la celebración del contrato, lo que ocurra último. Podés hacerlo desde el botón de arrepentimiento al pie de esta página.",
    "5. Contacto: consultas y reclamos por WhatsApp o a los datos del vendedor que figuran al pie de la página."
  ].join("\n");
}

function showTerms() {
  const box = document.createElement("div");
  box.className = "terms-box";
  box.textContent = (storeSettings.termsText || "").trim() || buildDefaultTerms();

  Swal.fire({ title: "Términos y condiciones", html: box, confirmButtonText: "Cerrar", width: 640 });
}

// Botón de arrepentimiento: arma la solicitud y la envía por WhatsApp al vendedor
function openWithdrawalForm() {
  if (String(storeSettings.whatsapp || "").trim() === "") {
    Swal.fire("Botón de arrepentimiento", "Esta tienda todavía no cargó su número de WhatsApp. Escribile al vendedor por los datos de contacto del pie de página.", "info");
    return;
  }

  Swal.fire({
    title: "Botón de arrepentimiento",
    html: `
      <p class="small text-muted text-start">Completá estos datos y se enviará tu solicitud de revocación al vendedor por WhatsApp.</p>
      <input id="wdName" class="swal2-input" placeholder="Nombre y apellido">
      <input id="wdOrder" class="swal2-input" placeholder="Número de pedido o producto">
      <textarea id="wdReason" class="swal2-textarea" placeholder="Motivo (opcional)"></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: "Enviar solicitud",
    cancelButtonText: "Cancelar",
    focusConfirm: false,
    preConfirm: () => {
      const name = document.getElementById("wdName").value.trim();
      const order = document.getElementById("wdOrder").value.trim();
      if (!name || !order) {
        Swal.showValidationMessage("Completá tu nombre y el número de pedido o producto.");
        return false;
      }
      return { name, order, reason: document.getElementById("wdReason").value.trim() };
    }
  }).then(result => {
    if (!result.isConfirmed) return;

    const { name, order, reason } = result.value;
    let text = `Hola *${storeSettings.storeName}*. Quiero ejercer mi derecho de arrepentimiento y revocar mi compra.\n\n`;
    text += `👤 *Nombre:* ${name}\n📦 *Pedido / producto:* ${order}`;
    if (reason) text += `\n📝 *Motivo:* ${reason}`;

    window.open(`https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
  });
}

/* ==========================================================================
   3.2 ESTILO VISUAL ELEGIDO, ÍCONOS Y TELÉFONO DEL COMPRADOR
   ========================================================================== */
function getCartIconName() {
  const name = String(storeSettings.cartIcon || "").trim();
  return isKnownCartIcon(name) ? name : "";
}

// Ícono de "sumar al pedido": el que eligió el vendedor (Material Symbols) o el clásico de Bootstrap
function cartIconMarkup(bootstrapClass) {
  const name = getCartIconName();
  return name
    ? `<span class="material-symbols-outlined">${escapeHtml(name)}</span>`
    : `<i class="bi ${bootstrapClass}"></i>`;
}

// Reemplaza los íconos fijos de index.html: botón del carrito, "Agregar al Pedido" y título del pedido
function applyCartIcon() {
  const name = getCartIconName();
  if (!name) return;

  ensureMaterialIcons([name]);
  [
    ["cartBtnIcon", ""],
    ["qvAddIcon", "me-1"],
    ["cartTitleIcon", "me-2 text-theme-primary"]
  ].forEach(([id, extraClasses]) => {
    const el = document.getElementById(id);
    el.className = `material-symbols-outlined ${extraClasses}`.trim();
    el.textContent = name;
  });
}

// Deja el teléfono solo con números y en formato internacional de WhatsApp (549 + área + número).
// Si no parece un número válido, devuelve "".
function normalizeArPhone(rawPhone) {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("549")) return digits.length >= 12 ? digits : "";
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Quita el "15" de los celulares: 11 15 2233 4455 -> 11 2233 4455
  const withFifteen = digits.match(/^(\d{2,4})15(\d{6,8})$/);
  if (withFifteen && withFifteen[1].length + withFifteen[2].length === 10) {
    digits = withFifteen[1] + withFifteen[2];
  }

  return digits.length === 10 ? `549${digits}` : "";
}

/* ==========================================================================
   4. CARRITO, CUPONES Y MERCADO PAGO
   ========================================================================== */
function validateCoupon() {
  const inputCode = document.getElementById("couponInput").value.trim().toUpperCase();
  const validCode = (storeSettings.couponCode || "").trim().toUpperCase();
  const validPercent = Number(storeSettings.couponPercent || 0);

  if (!inputCode) return;

  if (validCode && inputCode === validCode && validPercent > 0) {
    if (!isOfferActive(storeSettings.couponStart, storeSettings.couponEnd)) {
      appliedCouponPercent = 0;
      appliedCouponCode = "";
      updateCartUI();
      Swal.fire("Cupón fuera de fecha", "Este cupón todavía no comenzó o ya no está vigente.", "info");
      return;
    }

    const minPurchase = Number(storeSettings.couponMinPurchase || 0);
    if (minPurchase > 0 && calculateCartTotals().subtotal < minPurchase) {
      Swal.fire("Compra mínima", `Este cupón se aplica en compras desde ${storeSettings.currency}${minPurchase.toLocaleString("es-AR")}.`, "info");
      return;
    }

    appliedCouponPercent = validPercent;
    appliedCouponCode = validCode;
    updateCartUI();
    const until = storeSettings.couponEnd ? ` Válido hasta el ${formatISODate(storeSettings.couponEnd)}.` : "";
    Swal.fire("¡Cupón aplicado!", `Tenés un ${validPercent}% de descuento extra en tu compra.${until}`, "success");
  } else {
    appliedCouponPercent = 0;
    appliedCouponCode = "";
    updateCartUI();
    Swal.fire("Cupón inválido", "El código ingresado no existe o expiró.", "error");
  }
}

function addToCart(productId, variant = "") {
  const product = allProducts.find(p => p.id === productId);
  if (!product || getTotalStock(product) <= 0) return;

  // Stock de la opción elegida (o del producto, si no maneja stock por variante)
  const available = getAvailableStock(product, variant);
  const hasVariantStock = getVariantStockList(product).length > 0;

  const cartItemKey = `${product.id}_${variant}`;
  const existing = cart.find(item => item.cartKey === cartItemKey);

  const alreadyInCart = hasVariantStock
    ? (existing ? existing.quantity : 0)
    : cart.filter(item => item.productId === product.id).reduce((acc, i) => acc + i.quantity, 0);

  if (alreadyInCart >= available) {
    Swal.fire({
      icon: "warning",
      title: "Stock máximo alcanzado",
      text: available > 0
        ? `Solo quedan ${available} unidades disponibles.`
        : "Esta opción no tiene stock disponible.",
      timer: 2000,
      showConfirmButton: false
    });
    return;
  }

  if (existing) {
    existing.quantity += 1;
    existing.maxStock = available;
  } else {
    cart.push({
      cartKey: cartItemKey,
      productId: product.id,
      title: product.title,
      variant: variant,
      price: Number(product.price),
      image: product.image,
      maxStock: available,
      quantity: 1
    });
  }

  saveAndRefreshCart();

  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "Sumado al pedido",
    showConfirmButton: false,
    timer: 1100
  });
}

function changeQuantity(cartKey, delta) {
  const item = cart.find(i => i.cartKey === cartKey);
  if (!item) return;

  const nextQty = item.quantity + delta;
  if (nextQty <= 0) {
    cart = cart.filter(i => i.cartKey !== cartKey);
  } else if (nextQty > item.maxStock) {
    Swal.fire("Aviso", `Stock máximo: ${item.maxStock}`, "info");
    return;
  } else {
    item.quantity = nextQty;
  }
  saveAndRefreshCart();
}

function saveAndRefreshCart() {
  localStorage.setItem("ecommerce_v4_cart", JSON.stringify(cart));
  updateCartUI();
}

function calculateCartTotals() {
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryMethod = document.getElementById("deliveryMethod").value;
  const paymentMethod = document.getElementById("buyerPayment").value;
  const coordinate = isCoordinateMode();

  // Cupón: solo cuenta si está vigente y se alcanza la compra mínima
  const minPurchase = Number(storeSettings.couponMinPurchase || 0);
  const couponUsable = !coordinate
    && isOfferActive(storeSettings.couponStart, storeSettings.couponEnd)
    && subtotal >= minPurchase;
  const couponAmount = (couponUsable && appliedCouponPercent > 0) ? Math.round(subtotal * (appliedCouponPercent / 100)) : 0;
  const afterCoupon = Math.max(0, subtotal - couponAmount);

  // Descuento por pagar en efectivo o transferencia: solo dentro de sus fechas
  const discountPercent = Number(storeSettings.transferDiscountPercent || 0);
  const discountUsable = !coordinate
    && (paymentMethod === "transfer" || paymentMethod === "cash")
    && isOfferActive(storeSettings.discountStart, storeSettings.discountEnd);
  const discountAmount = (discountUsable && discountPercent > 0)
    ? Math.round(afterCoupon * (discountPercent / 100))
    : 0;

  // Envío: por zona o costo único; gratis si se alcanza el monto configurado
  const freeThreshold = Number(storeSettings.freeShippingThreshold || 0);
  let finalShipping = 0;

  if (!coordinate && deliveryMethod === "delivery" && subtotal > 0) {
    finalShipping = (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : getShippingBaseCost();
  }

  const finalTotal = Math.max(0, afterCoupon - discountAmount + finalShipping);
  return { subtotal, couponAmount, discountPercent, discountAmount, finalShipping, finalTotal, coordinate };
}

function updateCartUI() {
  const list = document.getElementById("cartItemsList");
  const counter = document.getElementById("cartCounter");
  const mobileBar = document.getElementById("mobileCartBar");
  const btnMp = document.getElementById("btnPayMercadoPago");

  const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
  counter.innerText = totalUnits;

  updateCheckoutHints();
  const { subtotal, couponAmount, discountPercent, discountAmount, finalShipping, finalTotal, coordinate } = calculateCartTotals();

  // Mostrar botón de Mercado Pago si está habilitado y el cliente eligió Mercado Pago
  const paymentMethod = document.getElementById("buyerPayment").value;
  if (storeSettings.mpEnabled && paymentMethod === "mp" && totalUnits > 0) {
    btnMp.classList.remove("d-none");
  } else {
    btnMp.classList.add("d-none");
  }

  if (totalUnits > 0) {
    mobileBar.classList.remove("d-none");
    document.getElementById("mobileBarCount").innerText = `${totalUnits} u.`;
    document.getElementById("mobileBarTotal").innerText = `${storeSettings.currency}${finalTotal.toLocaleString("es-AR")}`;
  } else {
    mobileBar.classList.add("d-none");
  }

  if (cart.length === 0) {
    list.innerHTML = `<p class="text-center text-muted my-5 small">Tu carrito está vacío.</p>`;
    document.getElementById("summarySubtotal").innerText = "$0";
    document.getElementById("cartTotalPrice").innerText = "$0";
    document.getElementById("summaryCouponRow").classList.add("d-none");
    document.getElementById("summaryDiscountRow").classList.add("d-none");
    document.getElementById("summaryShippingRow").classList.add("d-none");
    return;
  }

  list.innerHTML = "";
  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "d-flex align-items-center justify-content-between border-bottom py-2";
    div.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <img src="${escapeHtml(optimizeImageUrl(item.image, 120))}" style="width:46px; height:46px; object-fit:cover; border-radius:8px;">
        <div>
          <h6 class="mb-0 small fw-bold">${escapeHtml(item.title)}</h6>
          ${item.variant ? `<span class="badge bg-secondary-subtle text-dark" style="font-size:0.68rem;">${escapeHtml(item.variant)}</span>` : ""}
          <div class="text-muted" style="font-size:0.75rem;">${escapeHtml(storeSettings.currency)}${item.price.toLocaleString("es-AR")} c/u</div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="changeQuantity('${item.cartKey}', -1)">-</button>
        <span class="px-2 small fw-bold">${item.quantity}</span>
        <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="changeQuantity('${item.cartKey}', 1)">+</button>
      </div>
    `;
    list.appendChild(div);
  });

  document.getElementById("summarySubtotal").innerText = `${storeSettings.currency}${subtotal.toLocaleString("es-AR")}`;

  const coupRow = document.getElementById("summaryCouponRow");
  if (couponAmount > 0) {
    coupRow.classList.remove("d-none");
    document.getElementById("couponLabel").innerText = `Cupón (${appliedCouponCode}):`;
    document.getElementById("summaryCoupon").innerText = `-${storeSettings.currency}${couponAmount.toLocaleString("es-AR")}`;
  } else {
    coupRow.classList.add("d-none");
  }

  const discRow = document.getElementById("summaryDiscountRow");
  if (discountAmount > 0) {
    discRow.classList.remove("d-none");
    document.getElementById("discountLabel").innerText = `Descuento (${discountPercent}%):`;
    document.getElementById("summaryDiscount").innerText = `-${storeSettings.currency}${discountAmount.toLocaleString("es-AR")}`;
  } else {
    discRow.classList.add("d-none");
  }

  const shipRow = document.getElementById("summaryShippingRow");
  if (document.getElementById("deliveryMethod").value === "delivery") {
    shipRow.classList.remove("d-none");
    document.getElementById("summaryShipping").innerText = coordinate
      ? "A coordinar"
      : finalShipping === 0
        ? "¡GRATIS!"
        : `${storeSettings.currency}${finalShipping.toLocaleString("es-AR")}`;
  } else {
    shipRow.classList.add("d-none");
  }

  document.getElementById("cartTotalPrice").innerText = `${storeSettings.currency}${finalTotal.toLocaleString("es-AR")}`;
}

async function handleMercadoPagoCheckout() {
  const name = document.getElementById("buyerName").value.trim();
  const delivery = document.getElementById("deliveryMethod").value;
  const address = document.getElementById("buyerAddress").value.trim();
  const phone = normalizeArPhone(document.getElementById("buyerPhone").value);

  if (!name || !phone || (delivery === "delivery" && !address)) {
    Swal.fire("Completá tus datos", "Ingresá tu nombre, tu WhatsApp con código de área y la dirección (si pedís envío) antes de pasar a Mercado Pago.", "warning");
    return;
  }

  const totals = calculateCartTotals();
  const mpConfig = (storeSettings.mpAliasOrLink || "").trim();

  // Si el dueño puso un link https:// de Mercado Pago lo abre, si puso un Alias lo copia al portapapeles
  if (mpConfig.startsWith("http")) {
    window.open(mpConfig, "_blank");
  } else if (mpConfig !== "") {
    navigator.clipboard.writeText(mpConfig);
  }

  const res = await Swal.fire({
    icon: "info",
    title: "Pago con Mercado Pago",
    html: `
      <div class="small text-start">
        <p class="mb-2">Total a abonar: <strong class="fs-5 text-primary">${escapeHtml(storeSettings.currency)}${totals.finalTotal.toLocaleString("es-AR")}</strong></p>
        <p class="mb-2">Alias / Cuenta de Mercado Pago copiada:<br><code class="fs-6 fw-bold">${escapeHtml(mpConfig) || 'Consultar por WhatsApp'}</code></p>
        <p class="text-muted mb-0">Al confirmar, se enviará el detalle de tu pedido por WhatsApp para adjuntar el comprobante.</p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Confirmar y Enviar Pedido",
    cancelButtonText: "Volver"
  });

  if (res.isConfirmed) {
    sendOrderViaWhatsApp(true);
  }
}

async function sendOrderViaWhatsApp(fromMp = false) {
  if (cart.length === 0) return;

  if (String(storeSettings.whatsapp || "").trim() === "") {
    Swal.fire("WhatsApp no configurado", "Esta tienda todavía no cargó su número de WhatsApp para recibir pedidos.", "info");
    return;
  }

  const name = document.getElementById("buyerName").value.trim();
  const delivery = document.getElementById("deliveryMethod").value;
  const address = document.getElementById("buyerAddress").value.trim();
  const payment = document.getElementById("buyerPayment").value;

  const phone = normalizeArPhone(document.getElementById("buyerPhone").value);

  if (!name || !phone || (delivery === "delivery" && !address)) {
    Swal.fire("Faltan datos", "Completá tu nombre, tu WhatsApp con código de área (ej: 11 2233 4455) y la dirección si pedís envío.", "warning");
    return;
  }

  const totals = calculateCartTotals();
  const zone = (delivery === "delivery") ? getSelectedZone() : null;
  const zoneSuffix = zone ? ` (${zone.name})` : "";

  const savedOrder = await DataService.createOrder({
    customer: name,
    phone: phone,
    delivery: delivery === "delivery" ? `Envío a: ${address}${zoneSuffix}` : "Retiro en el local",
    payment: (PAYMENT_METHODS[payment] || { label: payment }).label,
    total: totals.finalTotal,
    items: cart
  });

  let text = `Hola *${storeSettings.storeName}*! Nuevo Pedido *#${String(savedOrder.id).slice(-4)}*:\n\n`;
  cart.forEach(item => {
    const sub = item.price * item.quantity;
    const varLabel = item.variant ? ` [${item.variant}]` : "";
    text += `• ${item.quantity}x *${item.title}*${varLabel} (${storeSettings.currency}${sub.toLocaleString("es-AR")})\n`;
  });

  text += `\nSubtotal: ${storeSettings.currency}${totals.subtotal.toLocaleString("es-AR")}`;
  if (totals.couponAmount > 0) text += `\nCupón (${appliedCouponCode}): -${storeSettings.currency}${totals.couponAmount.toLocaleString("es-AR")}`;
  if (totals.discountAmount > 0) text += `\nDescuento pago: -${storeSettings.currency}${totals.discountAmount.toLocaleString("es-AR")}`;
  if (delivery === "delivery") {
    const shippingText = totals.coordinate
      ? "a coordinar"
      : (totals.finalShipping === 0 ? "GRATIS" : storeSettings.currency + totals.finalShipping.toLocaleString("es-AR"));
    text += `\nEnvío: ${shippingText}`;
  }
  const totalLabel = totals.coordinate ? "TOTAL ESTIMADO (a confirmar)" : "TOTAL FINAL";
  text += `\n*${totalLabel}: ${storeSettings.currency}${totals.finalTotal.toLocaleString("es-AR")}*\n\n`;
  text += `👤 *Cliente:* ${name}\n📞 *WhatsApp:* +${phone}\n🚚 *Entrega:* ${savedOrder.delivery}\n💳 *Pago:* ${savedOrder.payment}`;
  if (fromMp) text += `\n📎 *Envío comprobante de Mercado Pago a continuación.*`;

  cart = [];
  appliedCouponPercent = 0;
  appliedCouponCode = "";
  saveAndRefreshCart();

  window.open(`https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
}