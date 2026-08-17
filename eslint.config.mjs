import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Assets servidos tal cual (vendor/binarios) — no son código fuente del
    // proyecto: el decoder de Draco (three/examples/jsm/libs/draco) usado
    // para el modelo 3D comprimido del camión.
    "public/**",
  ]),
]);

export default eslintConfig;
