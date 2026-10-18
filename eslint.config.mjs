import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Same rule set as before the Next 16 upgrade (next/core-web-vitals), in ESLint's flat config format.
export default defineConfig([
  ...nextVitals,
  {
    // New React Compiler checks that arrived with the updated react-hooks plugin. They were not enforced before,
    // and they flag patterns this app uses on purpose (reading saved settings into state on mount, keeping the
    // latest value in a ref for effects). Turn them on again when the code is migrated to the compiler.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "public/**", "next-env.d.ts"]),
]);
