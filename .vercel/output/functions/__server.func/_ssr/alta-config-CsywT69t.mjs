//#region node_modules/.nitro/vite/services/ssr/assets/alta-config-CsywT69t.js
function formatEUR(amount) {
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2
	}).format(amount);
}
function generarSubdominio(nombre) {
	return `${nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40) || "tu-restaurante"}.powerup.menu`;
}
//#endregion
export { generarSubdominio as n, formatEUR as t };
