// Prueba con el test runner de Node (npm test). Importa el .ts directamente (Node 22.6+ quita los tipos).
import test from "node:test";
import assert from "node:assert/strict";
import {
  canAddToCart,
  countByChannel,
  differingPickupUnit,
  filterNodeByChannel,
  filterTreeByChannel,
  hasDelivery,
  hasPickup,
  isPickupOnly,
  matchesChannel,
  parseUnifiedCatalog,
  safeMapUrl,
  siteDetails,
  splitSites,
} from "../catalog-channel.ts";
import { buildProductHierarchy } from "../product-hierarchy.ts";

const site = (siteId, name = siteId) => ({ siteId, name });
const both = { delivery: { available: true, unit: "KILO" }, pickup: { available: true, unit: "KILO", sites: [site("ALA")] } };
const deliveryOnly = { delivery: { available: true, unit: "UND" }, pickup: { available: false, unit: null, sites: [] } };
const pickupOnly = { delivery: { available: false, unit: null }, pickup: { available: true, unit: "UND", sites: [site("ALA"), site("SJO")] } };

const row = (id, name, h, availability) => ({
  ItemId: id,
  ItemName: name,
  Hierarchy1: h[0],
  Hierarchy2: h[1],
  Hierarchy3: h[2],
  Hierarchy4: h[3] ?? "",
  Hierarchy5: "",
  ...(availability ? { availability } : {}),
});

test("canales: sin availability (lectura de respaldo) = solo A domicilio, como antes", () => {
  const legacy = { id: "A", name: "Arroz" };
  assert.equal(hasDelivery(legacy), true);
  assert.equal(hasPickup(legacy), false);
  assert.equal(canAddToCart(legacy), true);
  assert.equal(isPickupOnly(legacy), false);
});

test("canales: solo retiro NO se puede agregar al carrito; ambos y solo domicilio sí", () => {
  assert.equal(canAddToCart({ availability: pickupOnly }), false);
  assert.equal(isPickupOnly({ availability: pickupOnly }), true);
  assert.equal(canAddToCart({ availability: both }), true);
  assert.equal(isPickupOnly({ availability: both }), false);
  assert.equal(canAddToCart({ availability: deliveryOnly }), true);
});

test("matchesChannel: todos / domicilio / retiro", () => {
  assert.deepEqual(
    [both, deliveryOnly, pickupOnly].map((a) => [matchesChannel({ availability: a }, "all"), matchesChannel({ availability: a }, "delivery"), matchesChannel({ availability: a }, "pickup")]),
    [[true, true, true], [true, true, false], [true, false, true]],
  );
});

test("unidad de retiro: solo se informa cuando difiere de la de domicilio", () => {
  assert.equal(differingPickupUnit(both), null);
  assert.equal(differingPickupUnit({ ...both, pickup: { ...both.pickup, unit: "CAJA" } }), "CAJA");
  assert.equal(differingPickupUnit(pickupOnly), "UND");
  assert.equal(differingPickupUnit(deliveryOnly), null);
  assert.equal(differingPickupUnit(undefined), null);
});

test("splitSites: hasta 3 visibles y el resto para el +N", () => {
  const sites = ["ALA", "CCA", "CPR", "CPT", "SFN"].map((s) => site(s));
  const { shown, hidden } = splitSites(sites);
  assert.deepEqual(shown.map((s) => s.siteId), ["ALA", "CCA", "CPR"]);
  assert.deepEqual(hidden.map((s) => s.siteId), ["CPT", "SFN"]);
  assert.equal(splitSites(sites.slice(0, 2)).hidden.length, 0);
});

const items = [
  row("A", "Arroz", ["Alimentos", "Granos", "Arroz"], both),
  row("B", "Frijol", ["Alimentos", "Granos", "Frijol"], deliveryOnly),
  row("C", "Tornillo", ["Ferretería", "Fijaciones", "Tornillos"], pickupOnly),
  row("D", "Clavo", ["Alimentos", "Granos", "Arroz"], pickupOnly),
];

test("árbol: el availability llega a cada producto de la categoría", () => {
  const tree = buildProductHierarchy(items);
  const arroz = tree.find((f) => f.name === "Alimentos").children[0].children.find((c) => c.name === "Arroz");
  assert.deepEqual(arroz.products.map((p) => [p.id, p.availability.delivery.available, p.availability.pickup.available]), [
    ["A", true, true],
    ["D", false, true],
  ]);
});

test("conteo por canal: productos distintos", () => {
  const tree = buildProductHierarchy(items);
  assert.deepEqual(countByChannel(tree), { all: 4, delivery: 2, pickup: 3 });
});

test("filtro: deja solo el canal, poda lo vacío y recalcula itemCount", () => {
  const tree = buildProductHierarchy(items);
  const delivery = filterTreeByChannel(tree, "delivery");
  assert.deepEqual(delivery.map((f) => [f.name, f.itemCount]), [["Alimentos", 2]]); // Ferretería (solo retiro) desaparece
  const cats = delivery[0].children[0].children;
  assert.deepEqual(cats.map((c) => [c.name, c.itemCount, c.products.map((p) => p.id)]).sort(), [
    ["Arroz", 1, ["A"]],
    ["Frijol", 1, ["B"]],
  ]);

  const pickup = filterTreeByChannel(tree, "pickup");
  assert.deepEqual(pickup.map((f) => f.name).sort(), ["Alimentos", "Ferretería"]);
  assert.equal(pickup.find((f) => f.name === "Alimentos").itemCount, 2); // A y D
});

test("filtro: 'all' devuelve el mismo árbol; una familia sin productos del canal es null", () => {
  const tree = buildProductHierarchy(items);
  assert.equal(filterTreeByChannel(tree, "all"), tree);
  const ferreteria = tree.find((f) => f.name === "Ferretería");
  assert.equal(filterNodeByChannel(ferreteria, "delivery"), null);
  assert.notEqual(filterNodeByChannel(ferreteria, "pickup"), null);
});

test("filtro: los tamaños de empaque quedan solo para los productos que sobreviven", () => {
  const tree = buildProductHierarchy([
    row("P1", "Aceite 1L", ["Alimentos", "Aceites", "Aceite", "1L"], deliveryOnly),
    row("P2", "Aceite 5L", ["Alimentos", "Aceites", "Aceite", "5L"], pickupOnly),
  ]);
  const category = tree[0].children[0].children[0];
  assert.deepEqual(category.packSizes, ["1L", "5L"]);
  const filtered = filterNodeByChannel(category, "delivery");
  assert.deepEqual(filtered.packSizes, ["1L"]);
});

test("parseUnifiedCatalog: la tienda trae ciudad, dirección, horario y mapa; lo que falta se omite", () => {
  const full = { siteId: "CCA", name: "Homex Tejar", city: "Cartago, El Guarco", address: " 800mts sur ", hours: "Lunes a Sábado 9:00am a 8:00pm", mapUrl: "https://www.google.com/maps/place/Homex" };
  const partial = { siteId: "SJO", name: "San José", city: "", address: null };
  const raw = [{ itemId: "A", availability: { delivery: { available: false }, pickup: { available: true, sites: [full, partial] } } }];
  const [item] = parseUnifiedCatalog(raw);
  assert.deepEqual(item.availability.pickup.sites[0], { ...full, address: "800mts sur" });
  assert.deepEqual(item.availability.pickup.sites[1], { siteId: "SJO", name: "San José" }); // sin claves vacías
});

test("safeMapUrl: solo http(s); lo demás se descarta", () => {
  assert.equal(safeMapUrl("https://www.google.com/maps/place/Homex+%E2%80%A2+El+Guarco"), "https://www.google.com/maps/place/Homex+%E2%80%A2+El+Guarco");
  assert.equal(safeMapUrl("  http://maps.example/x  "), "http://maps.example/x");
  assert.equal(safeMapUrl("javascript:alert(1)"), null);
  assert.equal(safeMapUrl("data:text/html,x"), null);
  assert.equal(safeMapUrl("no es url"), null);
  assert.equal(safeMapUrl(""), null);
  assert.equal(safeMapUrl(undefined), null);
});

test("siteDetails: muestra solo lo que hay; sin nada, null (la tienda no se despliega)", () => {
  assert.equal(siteDetails(site("ALA")), null);
  assert.equal(siteDetails({ ...site("ALA"), city: "Alajuela, La Trinidad", mapUrl: "javascript:x" }), null); // ciudad sola no es un detalle
  assert.deepEqual(siteDetails({ ...site("ALA"), hours: "Lunes a Sábado 9:00am a 7:00pm" }), { address: null, hours: "Lunes a Sábado 9:00am a 7:00pm", mapUrl: null });
  assert.deepEqual(
    siteDetails({ ...site("ALA"), address: "Frente al Cementerio", hours: "H", mapUrl: "https://maps.example/a" }),
    { address: "Frente al Cementerio", hours: "H", mapUrl: "https://maps.example/a" },
  );
});

test("parseUnifiedCatalog: forma esperada de mercasa-api; descarta productos sin canal; null si no es lista", () => {
  const raw = [
    { itemId: " A ", itemName: "Arroz", unitId: "KILO", hierarchy1: "Alimentos", hierarchy2: "", hierarchy3: "", hierarchy4: "", hierarchy5: "", availability: { delivery: { available: true, unit: "KILO" }, pickup: { available: true, unit: "UND", sites: [{ siteId: "ALA", name: "" }] } } },
    { itemId: "X", itemName: "Sin canal", availability: { delivery: { available: false }, pickup: { available: false, sites: [] } } },
    { itemId: "Y", itemName: "Retiro sin tiendas", availability: { delivery: { available: false }, pickup: { available: true, sites: [] } } },
  ];
  const parsed = parseUnifiedCatalog(raw);
  assert.equal(parsed.length, 1); // X y Y no tienen ningún canal real
  assert.equal(parsed[0].itemId, "A");
  assert.deepEqual(parsed[0].availability.pickup.sites, [{ siteId: "ALA", name: "ALA" }]); // nombre vacío -> el código
  assert.equal(parseUnifiedCatalog({ error: "x" }), null);
  assert.equal(parseUnifiedCatalog([{ itemName: "sin id" }]), null);
});
