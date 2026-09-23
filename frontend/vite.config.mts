import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import {visualizer} from "rollup-plugin-visualizer";

export default defineConfig(({mode}) => {
    const backendTarget = process.env.VALETUDO_DEV_BACKEND ?? "http://127.0.0.1:80";

    return {
        base: "./",
        publicDir: "public",
        plugins: [
            react(),
            svgr({svgrOptions: {titleProp: true}}),
            mode === "stats" && visualizer({filename: "build/bundle-stats.html", gzipSize: true})
        ],
        assetsInclude: ["**/*.gz"],
        build: {
            outDir: "build",
            assetsDir: "static",
            target: "es2015",
            sourcemap: false,
            rolldownOptions: {
                output: {
                    entryFileNames: "static/js/[name]-[hash].js",
                    chunkFileNames: "static/js/[name]-[hash].js",
                    assetFileNames: "static/media/[name]-[hash][extname]"
                }
            }
        },
        server: {
            proxy: {
                "/api": backendTarget,
                "/_ssdp": backendTarget,
                "/_killswitch": backendTarget
            }
        }
    };
});
