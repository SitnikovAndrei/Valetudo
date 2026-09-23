/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module "*.gz" {
    const url: string;
    export default url;
}
