module.exports = {
    root: true,
    env: {browser: true, es2020: true},
    extends: ["plugin:vue/vue3-essential"],
    parser: "vue-eslint-parser",
    parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2020,
        sourceType: "module"
    },
    rules: {
        "vue/multi-word-component-names": "off"
    }
};
