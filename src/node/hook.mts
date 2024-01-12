import { ResolveHook } from "node:module";

const shimURL = new URL("./shim.mjs", import.meta.url).href;

export const resolve: ResolveHook = (specifier, context, next) => {
  if (specifier === "effection" && context.parentURL !== shimURL) {
    return {
      shortCircuit: true,
      url: shimURL,
      format: "module",
    };
  }

  return next(specifier, context);
};
