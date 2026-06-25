//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-BRrNiceQ.js
var manifest = {
	"36abb3efca09c2571234e96d44adddb3ffb369a84faab4f425b96117620ef42b": {
		functionName: "gmbSearch_createServerFn_handler",
		importer: () => import("./_ssr/alta.functions-BXDTdGxH.mjs")
	},
	"788e643c341bbe718cdcf27389b009b78afcc5f0f1d6090db6f89ebb1efe85cf": {
		functionName: "finalizeCheckout_createServerFn_handler",
		importer: () => import("./_ssr/alta.functions-BXDTdGxH.mjs")
	},
	"7c9df230948fa17b7a56625859a98d770eba9eb5dd9f219319e62401ed8d7bbb": {
		functionName: "checkDomain_createServerFn_handler",
		importer: () => import("./_ssr/alta.functions-BXDTdGxH.mjs")
	},
	"cb1ed746c881f0a1ac4a5398ac39153fc72154bf77147b8c4b9772c624307c5d": {
		functionName: "createCheckout_createServerFn_handler",
		importer: () => import("./_ssr/alta.functions-BXDTdGxH.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
