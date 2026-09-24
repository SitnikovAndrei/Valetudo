import {RawMapData} from "../api/RawMapData";
import {getSegmentAtPoint, SegmentLookupInfo} from "./SegmentLookup";

type PaletteMode = "light" | "dark";
type Rendered = {
    pixelData: ArrayBuffer;
    width: number;
    height: number;
    left: number;
    top: number;
    segmentLookupData: ArrayBuffer;
    segmentLookupIdMapping: SegmentLookupInfo["idMapping"];
};
type Job = {data: RawMapData; paletteMode: PaletteMode; resolve: () => void; reject: (error: unknown) => void};

/**
 * Rasterizes map layers into an offscreen canvas. The heavy lifting runs in a web worker;
 * if the worker cannot start, the same code is loaded lazily and run on the main thread.
 */
export class MapLayerManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly worker: Worker;
    private workerState: "starting" | "ready" | "failed" = "starting";
    private workerLastNonce = "";
    /** Latest job waiting for the worker; older ones are superseded and resolved immediately. */
    private pending: Job | undefined;
    private inFlight: Job | undefined;

    private segmentLookupInfo: SegmentLookupInfo = {data: new Uint8ClampedArray(), width: 1, height: 1, top: 0, left: 0, idMapping: {}};
    private selectedSegmentIds: string[] = [];

    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.ctx = this.canvas.getContext("2d")!;

        this.worker = new Worker(new URL("./MapLayerManager.worker.ts", import.meta.url), {type: "module"});
        this.worker.onerror = () => {
            // eslint-disable-next-line no-console
            console.warn("MapLayerManager.worker unavailable.");
            this.workerState = "failed";
            this.worker.terminate();
            const jobs = [this.inFlight, this.pending].filter((job): job is Job => job !== undefined);
            this.inFlight = undefined;
            this.pending = undefined;
            jobs.forEach(job => this.drawOnMainThread(job));
        };
        this.worker.onmessage = event => {
            if (event.data.ready === true) {
                this.workerState = "ready";
                this.flush();
                return;
            }
            if (event.data.pixelData === undefined) return;
            this.apply(event.data as Rendered);
            this.inFlight?.resolve();
            this.inFlight = undefined;
            this.flush();
        };
    }

    draw(data: RawMapData, paletteMode: PaletteMode): Promise<void> {
        return new Promise((resolve, reject) => {
            const width = Math.round(data.size.x / data.pixelSize);
            const height = Math.round(data.size.y / data.pixelSize);
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            if (data.layers.length === 0) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                resolve();
                return;
            }
            const job = {data, paletteMode, resolve, reject};
            if (this.workerState === "failed") {
                this.drawOnMainThread(job);
                return;
            }
            this.pending?.resolve();
            this.pending = job;
            this.flush();
        });
    }

    private flush() {
        if (this.workerState !== "ready" || this.inFlight || !this.pending) return;
        const job = this.pending;
        this.pending = undefined;
        this.inFlight = job;
        this.worker.postMessage({
            mapLayers: job.data.metaData.nonce !== this.workerLastNonce ? job.data.layers : undefined,
            pixelSize: job.data.pixelSize,
            paletteMode: job.paletteMode,
            selectedSegmentIds: this.selectedSegmentIds
        });
        this.workerLastNonce = job.data.metaData.nonce;
    }

    private drawOnMainThread(job: Job) {
        import("./MapLayerManagerUtils").then(({PROCESS_LAYERS}) => {
            const rendered = PROCESS_LAYERS(job.data.layers, job.data.pixelSize, job.paletteMode, this.selectedSegmentIds);
            this.apply({...rendered, pixelData: rendered.pixelData.buffer as ArrayBuffer, segmentLookupData: rendered.segmentLookupData.buffer as ArrayBuffer});
            job.resolve();
        }, job.reject);
    }

    private apply(rendered: Rendered) {
        this.segmentLookupInfo = {
            data: new Uint8ClampedArray(rendered.segmentLookupData),
            width: rendered.width,
            height: rendered.height,
            top: rendered.top,
            left: rendered.left,
            idMapping: rendered.segmentLookupIdMapping
        };
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(new ImageData(new Uint8ClampedArray(rendered.pixelData), rendered.width, rendered.height), rendered.left, rendered.top);
    }

    /**
     * @param x - in cm coordinates
     * @param y - in cm coordinates
     */
    getIntersectingSegment(x: number, y: number): string | null {
        return getSegmentAtPoint(this.segmentLookupInfo, x, y);
    }

    setSelectedSegmentIds(selectedSegmentIds: string[]) {
        this.selectedSegmentIds = selectedSegmentIds;
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    dispose(): void {
        this.worker.onmessage = null;
        this.worker.onerror = null;
        this.worker.terminate();
        this.inFlight?.resolve();
        this.pending?.resolve();
        this.inFlight = undefined;
        this.pending = undefined;
    }
}
