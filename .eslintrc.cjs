module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["react-hooks", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    // Keep the project lint lightweight and non-blocking.
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-vars": "off",

    // React hooks core rules are useful; turn off opinionated perf rules.
    "react-hooks/immutability": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/infer-effect-dependencies": "off",
  },
  ignorePatterns: ["dist", "node_modules"],
};

