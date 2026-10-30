/* ==========================================================================
   0. MODO DEMOSTRACIÓN
   true  -> tienda de demo: muestra el cartel de demostración, el enlace al panel
            Admin y las ofertas de ejemplo.
   false -> versión para un cliente: sin cartel, sin enlace público al Admin y con
            todas las ofertas apagadas hasta que el vendedor las configure.
   ========================================================================== */
const DEMO_MODE = true;

/* ==========================================================================
   1. CREDENCIALES DE APIS (SUPABASE + CLOUDINARY)
   Mantené USE_CLOUD_APIS en false para probar todo en modo local sin cuentas.
   ========================================================================== */
const API_CREDENTIALS = {
  USE_CLOUD_APIS: true,

  SUPABASE_URL: "https://dgpgqytsyvfrajzmpntd.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_uIpTOA7xdVreo6aEBZ_B9g_sMiMNePe",

  CLOUDINARY_CLOUD_NAME: "wwlzs2nu",
  CLOUDINARY_UPLOAD_PRESET: "hannova_fotos"
};

/* ==========================================================================
   2. DICCIONARIO MAESTRO DE 14 MACRO-RUBROS Y SUB-ESPECIALIDADES
   Inspirado en el árbol de categorías de Mercado Libre.
   ========================================================================== */
const INDUSTRY_PRESETS = [
  {
    id: "deportes",
    name: "Deportes y Fitness",
    icon: "🏋️‍♂️",
    color: "#ea580c",
    slogan: "Superá tus límites con equipamiento y nutrición de primer nivel",
    banner: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80",
    variantHint: "Ej: Sabor Vainilla, Sabor Chocolate / Talle M, L / 5kg, 10kg",
    subcategories: [
      { name: "Suplementos y Nutrición", cats: ["Proteínas", "Creatinas", "Pre-Entrenos", "Aminoácidos", "Shakers y Barras"] },
      { name: "Gimnasio, Pesas y Fitness", cats: ["Mancuernas y Pesas", "Bandas Elásticas", "Colchonetas", "Accesorios Gym"] },
      { name: "Natación y Deportes Acuáticos", cats: ["Antiparras", "Mallas Competición", "Gorras Silicona", "Aletas y Patas de Rana", "Toallas Secado Rápido"] },
      { name: "Fútbol, Pádel y Raqueta", cats: ["Paletas de Pádel", "Pelotas", "Botines", "Camisetas", "Bolsos y Grips"] },
      { name: "Indumentaria Deportiva", cats: ["Calzas y Tops", "Remeras Dry-Fit", "Shorts Deportivos", "Buzos Térmicos"] }
    ]
  },
  {
    id: "gastronomia",
    name: "Gastronomía y Delivery",
    icon: "🍕",
    color: "#dc2626",
    slogan: "Recetas recién hechas, ingredientes frescos y envío rápido a tu puerta",
    banner: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1400&q=80",
    variantHint: "Ej: Grande (8 porc), Chica / Simple, Doble con Cheddar / Carne, Jamón y Queso",
    subcategories: [
      { name: "Pizzería y Empanadas", cats: ["Pizzas Clásicas", "Pizzas Especiales", "Empanadas", "Fainá y Calzones"] },
      { name: "Hamburguesas y Minutas", cats: ["Hamburguesas", "Lomitos y Sándwiches", "Papas Fritas", "Milanesas"] },
      { name: "Cafetería, Pastelería y Helados", cats: ["Tortas y Postres", "Helados", "Facturas y Medialunas", "Cafetería"] },
      { name: "Viandas y Comida Saludable", cats: ["Ensaladas", "Tartas y Wraps", "Menú del Día", "Opciones Veggie"] }
    ]
  },
  {
    id: "hogar_bazar",
    name: "Hogar, Bazar y Limpieza",
    icon: "🏠",
    color: "#b45309",
    slogan: "Todo para equipar tu cocina, limpiar y renovar cada rincón de tu casa",
    banner: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1400&q=80",
    variantHint: "Ej: Bidón 5 Litros, 1 Litro / Color Blanco, Madera / Medida 24cm",
    subcategories: [
      { name: "Bazar y Utensilios de Cocina", cats: ["Ollas y Sartenes", "Vajilla y Vasos", "Cubiertos", "Herméticos y Tuppers", "Termos y Mates"] },
      { name: "Artículos de Limpieza y Lavandería", cats: ["Jabón Líquido y Suavizantes", "Lavandinas y Desinfectantes", "Escobas y Mopas", "Papel Higiénico y Rollos"] },
      { name: "Textil y Blanquearía", cats: ["Sábanas y Acolchados", "Toallas y Toallones", "Cortinas", "Almohadones"] },
      { name: "Iluminación y Decoración", cats: ["Lámparas", "Velas y Difusores", "Cuadros y Espejos", "Organizadores"] },
      { name: "Jardinería y Exterior", cats: ["Macetas", "Plantas y Tierra", "Mangueras y Riego", "Parrilla y Asado"] }
    ]
  },
  {
    id: "supermercado",
    name: "Supermercado, Almacén y Bebidas",
    icon: "🛒",
    color: "#16a34a",
    slogan: "Hacé las compras de la semana desde tu celular al mejor precio",
    banner: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80",
    variantHint: "Ej: Pack x6, Unidad / Botella 1L, Lata 473ml / Bolsa 1kg, 500g",
    subcategories: [
      { name: "Almacén y Despensa", cats: ["Fideos y Arroz", "Aceites y Condimentos", "Yerba, Café y Té", "Galletitas", "Conservas"] },
      { name: "Bebidas, Vinos y Cervezas", cats: ["Cervezas", "Vinos y Espumantes", "Gaseosas y Jugos", "Aguas", "Aperitivos"] },
      { name: "Kiosco y Golosinas", cats: ["Chocolates y Alfajores", "Snacks y Papas Fritas", "Caramelos y Chicles"] },
      { name: "Dietética y Productos Naturales", cats: ["Frutos Secos", "Semillas y Cereales", "Sin TACC", "Suplementos Naturales"] }
    ]
  },
  {
    id: "indumentaria",
    name: "Ropa, Moda y Calzado",
    icon: "👕",
    color: "#18181b",
    slogan: "Prendas de temporada, calce único y envíos a todo el país",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80",
    variantHint: "Ej: Talle S, M, L, XL / Talle 38, 39, 40, 41 / Negro, Blanco, Beige",
    subcategories: [
      { name: "Ropa Urbana y Casual", cats: ["Remeras y Chombas", "Jeans y Pantalones", "Buzos y Sweaters", "Camperas", "Vestidos"] },
      { name: "Calzado y Zapatillas", cats: ["Zapatillas Urbanas", "Botas y Borcegos", "Zapatos", "Sandalias y Ojotas"] },
      { name: "Ropa Interior, Lencería y Pijamas", cats: ["Conjuntos y Lencería", "Boxers y Bombachas", "Pijamas", "Medias"] },
      { name: "Marroquinería, Bolsos y Accesorios", cats: ["Carteras y Mochilas", "Billeteras", "Cinturones", "Relojes y Joyería", "Gorras y Lentes"] }
    ]
  },
  {
    id: "belleza",
    name: "Belleza, Estética y Peluquería",
    icon: "💅",
    color: "#e11d48",
    slogan: "Cuidado capilar profesional, cosmética y bienestar personal",
    banner: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1400&q=80",
    variantHint: "Ej: Envase 250ml, 500ml, 1 Litro / Tono Natural, Dorado / Piel Seca, Mixta",
    subcategories: [
      { name: "Cuidado Capilar y Peluquería", cats: ["Shampoos y Acondicionadores", "Máscaras y Baños de Crema", "Tinturas y Oxidantes", "Aceites y Serums Capilares", "Planchitas y Secadores"] },
      { name: "Skincare, Maquillaje y Uñas", cats: ["Limpieza e Hidratación Facial", "Maquillaje", "Esmaltes e Insumos de Uñas", "Protectores Solares"] },
      { name: "Barbería y Afeitado", cats: ["Ceras y Pomadas", "Aceites para Barba", "Máquinas y Tijeras", "After Shave"] },
      { name: "Perfumería y Corporal", cats: ["Perfumes y Fragancias", "Cremas Corporales", "Desodorantes"] }
    ]
  },
  {
    id: "ferreteria",
    name: "Herramientas y Construcción",
    icon: "🔧",
    color: "#0284c7",
    slogan: "Ferretería integral, materiales eléctricos, plomería y pinturería",
    banner: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=1400&q=80",
    variantHint: "Ej: Medida 1/2, 3/4 pulgada / Rollo 10m, 50m / Lata 1L, 4L, 20L",
    subcategories: [
      { name: "Herramientas Manuales y Eléctricas", cats: ["Taladros y Amoladoras", "Destornilladores y Llaves", "Discos y Mechas", "Cajas de Herramientas"] },
      { name: "Electricidad e Iluminación", cats: ["Cables y Rollos", "Térmicas y Disyuntores", "Llaves de Luz y Tomas", "Lámparas y Reflectores LED"] },
      { name: "Plomería, Gas y Sanitarios", cats: ["Caños y Conexiones", "Grifería", "Tanques y Bombas de Agua", "Selladores y Teflón"] },
      { name: "Pinturería y Fijaciones", cats: ["Pinturas Látex y Esmaltes", "Impermeabilizantes", "Rodillos y Pinceles", "Tornillos y Tarugos"] }
    ]
  },
  {
    id: "tecnologia",
    name: "Tecnología, Audio y Celulares",
    icon: "📱",
    color: "#4f46e5",
    slogan: "Innovación, accesorios para tu celular, audio y computación",
    banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80",
    variantHint: "Ej: iPhone 13, 14, 15 / Samsung S24 / Ficha Tipo-C, Lightning / Color Negro, Blanco",
    subcategories: [
      { name: "Celulares y Accesorios", cats: ["Fundas Antigolpes", "Vidrios Templados", "Cargadores y Cables", "Smartwatches", "Soportes Auto"] },
      { name: "Computación y Periféricos", cats: ["Teclados y Mouses", "Notebooks y Tablets", "Pendrives y Discos SSD", "Monitores y Routers"] },
      { name: "Audio y Video", cats: ["Auriculares Inalámbricos", "Parlantes Bluetooth", "Micrófonos", "Cables HDMI y Adaptadores"] },
      { name: "Gaming y Consolas", cats: ["Joysticks", "Auriculares Gamer", "Sillas Gamer", "Juegos y Consolas"] }
    ]
  },
  {
    id: "mascotas",
    name: "Animales y Mascotas (Pet Shop)",
    icon: "🐾",
    color: "#059669",
    slogan: "Nutrición, paseo, higiene y mimo para tus compañeros de vida",
    banner: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1400&q=80",
    variantHint: "Ej: Bolsa 3kg, 7.5kg, 15kg / Raza Pequeña, Mediana, Grande",
    subcategories: [
      { name: "Alimentos para Perros y Gatos", cats: ["Alimento Perros Adultos", "Alimento Cachorros", "Alimento Gatos", "Sobrecitos Húmedos y Snacks"] },
      { name: "Accesorios, Paseo y Juguetes", cats: ["Collares, Correas y Pretales", "Juguetes y Mordillos", "Comederos y Bebederos", "Ropa Abrigo Mascotas"] },
      { name: "Higiene, Camas y Cuidado", cats: ["Piedras Sanitarias y Litera", "Cuchas y Moisés", "Rascadores", "Pipetas y Antiparasitarios"] }
    ]
  },
  {
    id: "vehiculos",
    name: "Repuestos y Accesorios Vehiculares",
    icon: "🚗",
    color: "#334155",
    slogan: "Repuestos mecánicos, baterías, audio car y estética vehicular",
    banner: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1400&q=80",
    variantHint: "Ej: Viscosidad 10W40, 5W30 / Lámpara H4, H7 / Talle Casco M, L, XL",
    subcategories: [
      { name: "Repuestos Auto y Moto", cats: ["Filtros y Aceites", "Frenos y Embrague", "Baterías", "Encendido y Electricidad", "Suspensión"] },
      { name: "Estética Vehicular (Detailing)", cats: ["Shampoos y Espumas", "Ceras y Selladores", "Paños de Microfibra", "Revividores de Cubiertas"] },
      { name: "Audio Car, Luces y Motoqueros", cats: ["Lámparas Cree LED", "Estéreos y Parlantes", "Cascos y Guantes", "Cubiertas y Cámaras"] }
    ]
  },
  {
    id: "libreria",
    name: "Librería, Arte y Papelería",
    icon: "📚",
    color: "#d97706",
    slogan: "Artículos escolares, insumos de oficina, artística y lectura",
    banner: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=1400&q=80",
    variantHint: "Ej: Rayado, Cuadriculado / Tapa Dura, Tapa Blanda / Pack x12, x24",
    subcategories: [
      { name: "Escolar y Oficina", cats: ["Cuadernos y Repuestos", "Mochilas y Cartucheras", "Lapiceras y Marcadores", "Resmas e Impresión"] },
      { name: "Artística y Manualidades", cats: ["Acrílicos y Acuarelas", "Pinceles y Bastidores", "Papeles Especiales", "Porcelana y Modelado"] },
      { name: "Libros, Cómics y Regalería", cats: ["Novelas y Ficción", "Cómics y Mangas", "Libros Infantiles", "Agendas y Regalos"] }
    ]
  },
  {
    id: "jugueteria",
    name: "Bebés, Niños y Juguetería",
    icon: "🧸",
    color: "#ec4899",
    slogan: "Juegos didácticos, diversión y todo para el cuidado de los más chicos",
    banner: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1400&q=80",
    variantHint: "Ej: Talle RN, 3M, 6M, 12M / Talle Pañal P, M, G, XG",
    subcategories: [
      { name: "Juguetes y Juegos de Mesa", cats: ["Juegos de Mesa", "Muñecos y Peluches", "Bloques y Construcción", "Rodados y Aire Libre"] },
      { name: "Ropa Infantil y Bebés", cats: ["Bodies y Conjuntos Bebé", "Ropa Niños", "Calzado Infantil", "Accesorios Bebé"] },
      { name: "Maternidad y Cuidado Diario", cats: ["Pañales y Toallitas", "Mamaderas y Chupetes", "Cochecitos y Practicunas"] }
    ]
  },
  {
    id: "salud",
    name: "Salud, Óptica y Ortopedia",
    icon: "⚕️",
    color: "#0d9488",
    slogan: "Equipamiento para el cuidado de la salud, rehabilitación y bienestar",
    banner: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1400&q=80",
    variantHint: "Ej: Talle S, M, L / Graduación +1.0, +1.5, +2.0 / Caja x50 unidades",
    subcategories: [
      { name: "Ortopedia y Rehabilitación", cats: ["Fajas y Rodilleras", "Muletas y Bastones", "Plantillas y Confort", "Rehabilitación"] },
      { name: "Equipamiento e Insumos Médicos", cats: ["Tensiómetros y Oxímetros", "Nebulizadores", "Guantes y Descartables", "Primeros Auxilios"] },
      { name: "Óptica y Cuidado Visual", cats: ["Lentes de Sol", "Armazones Recetados", "Lentes de Lectura", "Líquidos y Estuches"] }
    ]
  },
  {
    id: "servicios",
    name: "Servicios, Turnos y Digitales",
    icon: "💻",
    color: "#7c3aed",
    slogan: "Reservá tu turno, contratá servicios profesionales o adquirí productos digitales",
    banner: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400&q=80",
    variantHint: "Ej: Modalidad Online, Presencial / Pack Mensual, Clase Suelta / Licencia 1 Año",
    subcategories: [
      { name: "Turnos y Servicios Técnicos", cats: ["Servicio Técnico y Reparación", "Turnos y Sesiones", "Mantenimiento e Instalación"] },
      { name: "Cursos, Clases y Asesorías", cats: ["Cursos Grabados", "Clases Personalizadas", "Asesorías Profesionales", "E-Books y Guías"] },
      { name: "Software, Diseño y Gift Cards", cats: ["Plantillas y Sistemas", "Diseño Gráfico y Web", "Gift Cards y Suscripciones"] }
    ]
  }
];

/* ==========================================================================
   3. CONFIGURACIÓN GENERAL POR DEFECTO
   ========================================================================== */
const DEFAULT_SETTINGS = {
  wizardCompleted: false,
  selectedIndustryId: "deportes",
  variantPlaceholder: "Ej: Talle S, M, L / Color Negro, Blanco",
  storeName: "Mi Tienda Online",
  slogan: "Elegí tus productos desde el celular y recibilos en el día",
  announcement: "🔥 ¡10% OFF abonando por Transferencia! Envío gratis en compras mayores a $60.000",
  whatsapp: "5491122334455",
  currency: "$",
  primaryColor: "#2563eb",
  logoUrl: "",
  bannerUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80",
  shippingCost: 4500,
  freeShippingThreshold: 60000,
  transferDiscountPercent: 10,
  mpEnabled: true,
  mpAliasOrLink: "mitienda.mp",
  couponCode: "BIENVENIDA10",
  couponPercent: 10,
  benefit1Title: "Envíos Rápidos",
  benefit1Desc: "A domicilio o retiro gratis",
  benefit2Title: "Medios de Pago",
  benefit2Desc: "Mercado Pago o Transferencia",
  benefit3Title: "Atención Directa",
  benefit3Desc: "Asesoramiento por WhatsApp",
  storeStatusOpen: true,
  businessHours: "Lunes a Sábados de 9:00 a 20:00 hs",
  businessAddress: "Av. Principal 1234, Buenos Aires",
  aboutUsText: "Somos una tienda dedicada a brindarte productos de primera calidad con atención personalizada y entrega inmediata.",
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  categories: ["Todos", "Destacados", "Ofertas", "Novedades"],

  // Medios de pago y entrega
  payCashEnabled: true,
  payTransferEnabled: true,
  transferDetails: "",
  pickupEnabled: true,
  deliveryEnabled: true,
  shippingZones: [],
  coordinateMode: false,

  // Fechas y condiciones de las ofertas (vacío = sin límite)
  couponStart: "",
  couponEnd: "",
  couponMinPurchase: 0,
  discountStart: "",
  discountEnd: "",

  // Estilo visual
  fontStyle: "moderno",
  cartIcon: "",

  // Datos del vendedor y textos legales
  sellerLegalName: "",
  sellerTaxId: "",
  sellerEmail: "",
  termsText: ""
};

// Versión para clientes: arranca sin ofertas ni datos de ejemplo.
// No se calcula ni se promete nada hasta que el vendedor lo configure en el panel Admin.
if (!DEMO_MODE) {
  Object.assign(DEFAULT_SETTINGS, {
    storeName: "Mi Tienda",
    announcement: "",
    whatsapp: "",
    shippingCost: 0,
    freeShippingThreshold: 0,
    transferDiscountPercent: 0,
    mpEnabled: false,
    mpAliasOrLink: "",
    couponCode: "",
    couponPercent: 0,
    benefit1Title: "Envíos y Retiro",
    benefit1Desc: "Consultá las opciones por WhatsApp",
    benefit2Title: "Medios de Pago",
    benefit2Desc: "Se coordinan con el vendedor",
    businessHours: "",
    businessAddress: "",
    aboutUsText: "",
    instagramUrl: "",
    facebookUrl: "",
    coordinateMode: true
  });
}

const DEFAULT_PRODUCTS = [
  {
    id: 401,
    title: "Producto Destacado de Muestra",
    category: "Destacados",
    price: 28000,
    comparePrice: 35000,
    stock: 12,
    active: true,
    variants: ["Opción 1", "Opción 2"],
    description: "Podés editar este producto o usar el Asistente de Rubros en el panel Admin para adaptar toda la tienda a tu negocio.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=80"
  },
  {
    id: 402,
    title: "Artículo en Oferta Especial",
    category: "Ofertas",
    price: 19500,
    comparePrice: 24000,
    stock: 5,
    active: true,
    variants: [],
    description: "Incluye cálculo automático de porcentaje de descuento y control de stock en tiempo real.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=80"
  }
];

/* ==========================================================================
   3.1 OPTIMIZADOR DE IMÁGENES CLOUDINARY (opcional, no rompe nada)
   Agrega f_auto (mejor formato) y q_auto (mejor calidad/peso) a la URL.
   Si se pasa un ancho, también limita el tamaño: optimizeImageUrl(url, 600).
   Si la URL no es de Cloudinary o ya fue optimizada, la devuelve igual.
   ========================================================================== */
function optimizeImageUrl(url, width) {
  if (typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  if (/\/image\/upload\/(f_|q_|w_|c_)/.test(url)) return url;

  let transformations = "f_auto,q_auto";
  if (width) transformations += `,w_${Number(width)},c_limit`;
  return url.replace("/image/upload/", `/image/upload/${transformations}/`);
}

/* ==========================================================================
   3.2 ESCAPE DE TEXTO PARA HTML (protege contra código inyectado)
   Convierte < > & " ' en texto inofensivo. Usar siempre que un dato escrito
   por una persona (título, nombre, dirección, etc.) se pegue dentro de
   un template con innerHTML:  ${escapeHtml(dato)}
   ========================================================================== */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ==========================================================================
   3.3 PERSONALIZACIÓN VISUAL, STOCK POR VARIANTE Y ESTADOS DE PEDIDO
   Funciones compartidas por la tienda y el panel Admin.
   ========================================================================== */
// --- Tipografías (Google Fonts). Solo se descarga la que el vendedor elige ---
const FONT_STYLES = {
  moderno: {
    label: "Moderno (Plus Jakarta Sans)",
    text: "'Plus Jakarta Sans'",
    title: "'Plus Jakarta Sans'",
    url: ""
  },
  elegante: {
    label: "Elegante (Playfair Display + Lato)",
    text: "'Lato'",
    title: "'Playfair Display'",
    url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@600;700;800&display=swap"
  },
  minimalista: {
    label: "Minimalista (Inter)",
    text: "'Inter'",
    title: "'Inter'",
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
  }
};

// Descarga la tipografía si hace falta y devuelve su definición
function ensureFontLoaded(styleKey) {
  const style = FONT_STYLES[styleKey] || FONT_STYLES.moderno;
  const linkId = `font-style-${styleKey}`;

  if (style.url && !document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = style.url;
    document.head.appendChild(link);
  }
  return style;
}

// Cambia las variables --fuente-principal y --fuente-titulos del CSS
function applyFontStyle(styleKey) {
  const style = ensureFontLoaded(styleKey);
  const fallback = "system-ui, -apple-system, sans-serif";
  document.documentElement.style.setProperty("--fuente-principal", `${style.text}, ${fallback}`);
  document.documentElement.style.setProperty("--fuente-titulos", `${style.title}, ${fallback}`);
}

// --- Íconos del carrito (Google Material Symbols), agrupados por familia de rubros ---
const ICON_FAMILIES = {
  moda: [
    { name: "shopping_bag", label: "Bolsa" },
    { name: "local_mall", label: "Bolsa de compras" },
    { name: "checkroom", label: "Percha" },
    { name: "storefront", label: "Tienda" }
  ],
  general: [
    { name: "shopping_cart", label: "Carrito clásico" },
    { name: "add_shopping_cart", label: "Carrito con +" },
    { name: "inventory_2", label: "Caja" },
    { name: "shopping_bag", label: "Bolsa" }
  ],
  comida: [
    { name: "shopping_basket", label: "Canasta" },
    { name: "local_grocery_store", label: "Carrito de súper" },
    { name: "takeout_dining", label: "Para llevar" },
    { name: "shopping_cart", label: "Carrito clásico" }
  ],
  hogar: [
    { name: "shopping_basket", label: "Canasta" },
    { name: "shopping_bag", label: "Bolsa" },
    { name: "redeem", label: "Regalo" },
    { name: "storefront", label: "Tienda" }
  ]
};

const INDUSTRY_ICON_FAMILY = {
  indumentaria: "moda", deportes: "moda", belleza: "moda",
  gastronomia: "comida", supermercado: "comida",
  hogar_bazar: "hogar", mascotas: "hogar", jugueteria: "hogar",
  tecnologia: "general", ferreteria: "general", vehiculos: "general",
  libreria: "general", salud: "general", servicios: "general"
};

// Opciones del selector de íconos según el rubro guardado (la primera es el ícono clásico actual)
function getIconOptionsForIndustry(industryId) {
  const family = ICON_FAMILIES[INDUSTRY_ICON_FAMILY[industryId] || "general"];
  return [{ name: "", label: "Clásico (por defecto)" }].concat(family);
}

// Solo se aceptan nombres de ícono de nuestra lista (evita texto raro en los botones)
function isKnownCartIcon(name) {
  return Object.values(ICON_FAMILIES).some(list => list.some(icon => icon.name === name));
}

// Descarga solo los íconos indicados (la API exige la lista ordenada alfabéticamente)
function ensureMaterialIcons(names) {
  const list = Array.from(new Set(names.filter(Boolean))).sort();
  if (list.length === 0) return;

  let link = document.getElementById("materialSymbolsLink");
  if (!link) {
    link = document.createElement("link");
    link.id = "materialSymbolsLink";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=${list.join(",")}&display=block`;
}

// --- Stock por variante (talle y color) ---
const VARIANT_STOCK_INDUSTRIES = ["indumentaria", "deportes"];

// Si el vendedor no eligió nada, el manejo de talles y colores se activa según el rubro
function isVariantStockEnabled(settings) {
  if (typeof settings.variantsEnabled === "boolean") return settings.variantsEnabled;
  return VARIANT_STOCK_INDUSTRIES.includes(settings.selectedIndustryId);
}

function getVariantStockList(product) {
  return Array.isArray(product && product.variantStock)
    ? product.variantStock.filter(entry => entry && entry.label)
    : [];
}

// Stock total: si hay variantes con stock propio, es la suma de todas
function getTotalStock(product) {
  const list = getVariantStockList(product);
  if (list.length > 0) {
    return list.reduce((acc, entry) => acc + Math.max(0, Number(entry.stock) || 0), 0);
  }
  return Math.max(0, Number(product && product.stock) || 0);
}

// Stock de una variante concreta (o el stock simple si el producto no maneja variantes con stock)
function getAvailableStock(product, variantLabel) {
  const list = getVariantStockList(product);
  if (list.length === 0) return Math.max(0, Number(product && product.stock) || 0);
  const entry = list.find(v => v.label === variantLabel);
  return entry ? Math.max(0, Number(entry.stock) || 0) : 0;
}

// Suma o resta stock (delta) de una variante o del producto, y recalcula el total
function applyStockChange(product, variantLabel, delta) {
  const list = getVariantStockList(product);
  if (list.length > 0) {
    const entry = list.find(v => v.label === variantLabel);
    if (entry) entry.stock = Math.max(0, (Number(entry.stock) || 0) + delta);
    product.stock = getTotalStock(product);
  } else {
    product.stock = Math.max(0, (Number(product.stock) || 0) + delta);
  }
}

// --- Número de pedido: la hora en milisegundos más 3 dígitos al azar (evita repetidos si dos pedidos entran juntos) ---
function generateOrderId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// --- Estados de los pedidos ---
const ORDER_STATUSES = ["Pendiente", "En preparación", "Despachado", "Entregado", "Cancelado"];
// Desde "En preparación" el stock ya está comprometido: se descuenta en ese momento
const STATUSES_WITH_STOCK_COMMITTED = ["En preparación", "Despachado", "Entregado"];

// --- Configuración: los valores vacíos (null) de la base no pisan a los valores por defecto ---
function mergeSettingsWithDefaults(stored) {
  const merged = { ...DEFAULT_SETTINGS };
  Object.keys(stored || {}).forEach(key => {
    if (stored[key] !== null && stored[key] !== undefined) merged[key] = stored[key];
  });
  return merged;
}

// --- Escritura en Supabase que sobrevive a columnas que todavía no existen ---
async function writeRowWithFallback(method, url, payload) {
  const body = { ...payload };
  const skipped = [];
  const headers = {
    "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
  };

  for (let attempt = 0; attempt < 60; attempt++) {
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (res.ok) return { ok: true, skipped };

    const errText = await res.text();
    let errJson = {};
    try { errJson = JSON.parse(errText); } catch (_) {}

    const match = /Could not find the '([^']+)' column/i.exec(errJson.message || errText);
    if (match && match[1] !== "id" && match[1] in body) {
      skipped.push(match[1]);
      delete body[match[1]];
      continue;
    }
    return { ok: false, skipped, status: res.status, errText };
  }
  return { ok: false, skipped, status: 0, errText: "Demasiados reintentos" };
}

/* ==========================================================================
   4. SERVICIO CENTRAL DE DATOS (BLINDADO CONTRA ID NULOS)
   ========================================================================== */
const DataService = {
  async getSettings() {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      try {
        const res = await fetch(`${API_CREDENTIALS.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
          headers: {
            "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`
          }
        });
        const data = await res.json();
        return mergeSettingsWithDefaults(data && data.length > 0 ? data[0] : {});
      } catch (e) {
        console.error("Error obteniendo settings:", e);
        return DEFAULT_SETTINGS;
      }
    } else {
      const saved = localStorage.getItem("ecommerce_v4_settings");
      return saved ? mergeSettingsWithDefaults(JSON.parse(saved)) : DEFAULT_SETTINGS;
    }
  },

  async saveSettings(newSettings) {
    DataService.lastSkippedColumns = [];
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      // Forzamos el id: 1 para que Supabase siempre guarde la configuración en la misma fila
      const payload = { ...newSettings, id: 1 };
      const headers = {
        "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      };
      const baseUrl = `${API_CREDENTIALS.SUPABASE_URL}/rest/v1/settings`;
      const skippedColumns = [];
      DataService.lastSkippedColumns = skippedColumns;

      // Envía el payload; si Supabase rechaza una columna que no existe en la tabla,
      // la quita del envío y reintenta (así el resto de la configuración sí se guarda).
      const sendWithRetry = async (method, url) => {
        for (let attempt = 0; attempt < 60; attempt++) {
          const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
          if (res.ok) return { ok: true };

          const errText = await res.text();
          let errJson = {};
          try { errJson = JSON.parse(errText); } catch (_) {}

          const match = /Could not find the '([^']+)' column/i.exec(errJson.message || errText);
          if (match && match[1] !== "id" && match[1] in payload) {
            skippedColumns.push(match[1]);
            delete payload[match[1]];
            continue;
          }
          return { ok: false, status: res.status, errText };
        }
        return { ok: false, status: 0, errText: "Demasiados reintentos" };
      };

      let result = await sendWithRetry("PATCH", `${baseUrl}?id=eq.1`);
      if (!result.ok) {
        // Si la fila id=1 todavía no existe, la creamos
        result = await sendWithRetry("POST", baseUrl);
      }

      if (skippedColumns.length > 0) {
        console.warn(
          "Estas columnas NO existen en la tabla 'settings' de Supabase y no se guardaron:",
          skippedColumns,
          "→ Agregalas con el SQL del editor de Supabase."
        );
      }
      if (!result.ok) {
        console.error(`Detalle error Supabase (Settings) [${result.status}]:`, result.errText);
        return false;
      }
    } else {
      localStorage.setItem("ecommerce_v4_settings", JSON.stringify(newSettings));
    }
    return true;
  },

  async getProducts() {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      try {
        const res = await fetch(`${API_CREDENTIALS.SUPABASE_URL}/rest/v1/products?select=*&order=id.desc`, {
          headers: {
            "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`
          }
        });
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error("Error obteniendo productos:", e);
        return [];
      }
    } else {
      const saved = localStorage.getItem("ecommerce_v4_products");
      if (!saved) {
        localStorage.setItem("ecommerce_v4_products", JSON.stringify(DEFAULT_PRODUCTS));
        return DEFAULT_PRODUCTS;
      }
      return JSON.parse(saved);
    }
  },

  async saveAllProducts(productsList) {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      for (let p of productsList) {
        await this.saveProduct(p);
      }
    } else {
      localStorage.setItem("ecommerce_v4_products", JSON.stringify(productsList));
    }
    return true;
  },

  async saveProduct(product) {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      const productPayload = { ...product };
      
      // SOLUCIÓN AL ERROR DE ID NULO: Si no tiene ID o es nuevo, le generamos uno único numérico con Date.now()
      if (!productPayload.id) {
        productPayload.id = Date.now();
      }

      // Verificamos si ya existe el producto para decidir si hacemos PATCH (actualizar) o POST (crear)
      const checkRes = await fetch(`${API_CREDENTIALS.SUPABASE_URL}/rest/v1/products?id=eq.${productPayload.id}`, {
        headers: {
          "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`
        }
      });
      const existing = await checkRes.json();
      const isExisting = existing && existing.length > 0;

      const method = isExisting ? "PATCH" : "POST";
      const url = isExisting
        ? `${API_CREDENTIALS.SUPABASE_URL}/rest/v1/products?id=eq.${productPayload.id}`
        : `${API_CREDENTIALS.SUPABASE_URL}/rest/v1/products`;

      const result = await writeRowWithFallback(method, url, productPayload);
      DataService.lastSkippedColumns = result.skipped;

      if (!result.ok) {
        console.error("Detalle error Supabase (Product):", result.errText);
        throw new Error("Error al guardar el producto en Supabase");
      }
    } else {
      const products = await this.getProducts();
      if (product.id) {
        const index = products.findIndex(p => p.id === product.id);
        if (index !== -1) products[index] = product;
      } else {
        product.id = Date.now();
        products.unshift(product);
      }
      localStorage.setItem("ecommerce_v4_products", JSON.stringify(products));
    }
    return true;
  },

  async deleteProduct(id) {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      await fetch(`${API_CREDENTIALS.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`
        }
      });
    } else {
      const products = await this.getProducts();
      const filtered = products.filter(p => p.id !== id);
      localStorage.setItem("ecommerce_v4_products", JSON.stringify(filtered));
    }
    return true;
  },

  async getOrders() {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      try {
        const res = await fetch(`${API_CREDENTIALS.SUPABASE_URL}/rest/v1/orders?select=*&order=id.desc`, {
          headers: {
            "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`
          }
        });
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    } else {
      const saved = localStorage.getItem("ecommerce_v4_orders");
      return saved ? JSON.parse(saved) : [];
    }
  },

  async createOrder(orderData) {
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      const payload = { ...orderData };
      if (!payload.id) payload.id = generateOrderId();
      payload.date = new Date().toLocaleString("es-AR");
      payload.createdAt = new Date().toISOString();
      payload.status = "Pendiente";
      payload.stockDiscounted = false;

      const result = await writeRowWithFallback("POST", `${API_CREDENTIALS.SUPABASE_URL}/rest/v1/orders`, payload);
      if (!result.ok) console.error("Detalle error Supabase (Pedido):", result.errText);
      return payload;
    } else {
      const orders = await this.getOrders();
      orderData.id = generateOrderId();
      orderData.date = new Date().toLocaleString("es-AR");
      orderData.createdAt = new Date().toISOString();
      orderData.status = "Pendiente";
      orderData.stockDiscounted = false;
      orders.unshift(orderData);
      localStorage.setItem("ecommerce_v4_orders", JSON.stringify(orders));
      return orderData;
    }
  },

  // Se mantiene por compatibilidad: equivale a pasar el pedido a "Entregado"
  async completeOrderAndDiscountStock(orderId) {
    return this.updateOrderStatus(orderId, "Entregado");
  },

  // Suma (direction = 1) o descuenta (direction = -1) el stock de todos los productos de un pedido
  async adjustStockForOrder(order, direction) {
    const products = await this.getProducts();
    const touched = new Map();

    (order.items || []).forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      applyStockChange(product, item.variant || "", direction * Number(item.quantity || 0));
      touched.set(product.id, product);
    });

    for (const product of touched.values()) {
      await this.saveProduct(product);
    }
    return true;
  },

  // Pasa el pedido a un nuevo estado y mueve el stock cuando corresponde:
  // se descuenta al pasar a "En preparación" y se devuelve si el pedido se cancela
  async updateOrderStatus(orderId, newStatus) {
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === newStatus || !ORDER_STATUSES.includes(newStatus)) return false;

    const stockWasMoved = order.stockDiscounted === true;
    const stockMustBeMoved = STATUSES_WITH_STOCK_COMMITTED.includes(newStatus);

    if (stockMustBeMoved && !stockWasMoved) await this.adjustStockForOrder(order, -1);
    if (!stockMustBeMoved && stockWasMoved) await this.adjustStockForOrder(order, 1);

    const changes = { status: newStatus, stockDiscounted: stockMustBeMoved };

    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      const result = await writeRowWithFallback(
        "PATCH",
        `${API_CREDENTIALS.SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
        changes
      );

      if (!result.ok) {
        console.error("Detalle error Supabase (Estado del pedido):", result.errText);
        // Si el estado no se pudo guardar, se deshace el movimiento de stock
        if (stockMustBeMoved !== stockWasMoved) {
          await this.adjustStockForOrder(order, stockMustBeMoved ? 1 : -1);
        }
        return false;
      }
      if (result.skipped.includes("stockDiscounted")) {
        console.error("Falta la columna stockDiscounted en la tabla orders: ejecutá el SQL definitivo de Supabase.");
      }
    } else {
      Object.assign(order, changes);
      localStorage.setItem("ecommerce_v4_orders", JSON.stringify(orders));
    }
    return { ...order, ...changes };
  },

  async deleteOrder(orderId) {
    // Si el pedido tenía el stock descontado y todavía no se entregó, se devuelve antes de borrarlo
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order && order.stockDiscounted === true && order.status !== "Entregado") {
      await this.adjustStockForOrder(order, 1);
    }

    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      await fetch(`${API_CREDENTIALS.SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: "DELETE",
        headers: {
          "apikey": API_CREDENTIALS.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${API_CREDENTIALS.SUPABASE_ANON_KEY}`
        }
      });
    } else {
      const filtered = orders.filter(o => o.id !== orderId);
      localStorage.setItem("ecommerce_v4_orders", JSON.stringify(filtered));
    }
    return true;
  },

  async uploadImage(file) {
    if (!file) return null;
    if (API_CREDENTIALS.USE_CLOUD_APIS) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", API_CREDENTIALS.CLOUDINARY_UPLOAD_PRESET);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${API_CREDENTIALS.CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (!response.ok || !data.secure_url) {
        const msg = (data && data.error && data.error.message) || "Respuesta inválida de Cloudinary";
        console.error("Detalle error Cloudinary:", data);
        throw new Error("Error al subir imagen a Cloudinary: " + msg);
      }
      console.log("Cloudinary OK, imagen subida:", data.secure_url);
      // Las imágenes nuevas se guardan ya optimizadas (menos peso = menos créditos)
      return optimizeImageUrl(data.secure_url);
    } else {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }
  }
};