import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    base: "./",
    publicDir: "public",
    plugins: [vue(), tailwindcss()],
    build: {
        outDir: "build",
        assetsDir: "static",
        target: "es2020"
    },
    server: {
        proxy: {
            "/api": process.env.VALETUDO_DEV_BACKEND ?? "http://127.0.0.1:80",
            "/_ssdp": process.env.VALETUDO_DEV_BACKEND ?? "http://127.0.0.1:80",
            "/_killswitch": process.env.VALETUDO_DEV_BACKEND ?? "http://127.0.0.1:80"
        }
    }
});
