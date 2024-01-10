import { main as _main } from "effection";
import { inspect } from "../inspect.mjs";

export * from "effection";

export const main: typeof _main = (body) => _main(inspect(body));
