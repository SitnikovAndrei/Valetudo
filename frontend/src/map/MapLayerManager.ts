import {RawMapData} from "../api";
import {PROCESS_LAYERS} from "./MapLayerManagerUtils";
import {getSegmentAtPoint, SegmentLookupInfo} from "./SegmentLookup";

type PaletteMode = "light" | "dark";

export class MapLayerManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    private mapLayerManagerWorker: Worker;
    private mapLayerManagerWorkerAvailable = false;
    private mapLayerManagerWorkerLastNonce = "";
    private pendingCallback: (() => void) | undefined;
    private pendingDraw: {data: RawMapData, paletteMode: PaletteMode} | undefined;

    private segmentLookupInfo: SegmentLookupInfo;
    private selectedSegmentIds: string[];

    constructor() {
        this.width = 1;
        this.height = 1;

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ctx = this.canvas.getContext("2d")!;

        this.mapLayerManagerWorker = new Worker(new URL("./MapLayerManager.worker.ts", import.meta.url), {type: "module"});

        this.mapLayerManagerWorker.onerror = (ev => {
            // eslint-disable-next-line no-console
            console.warn("MapLayerManager.worker unavailable.");

            this.mapLayerManagerWorkerAvailable = false;
            this.mapLayerManagerWorker.terminate();
            const pendingDraw = this.pendingDraw;
            const pendingCallback = this.pendingCallback;
            this.pendingDraw = undefined;
            this.pendingCallback = undefined;
            if (pendingDraw && pendingCallback) {
                void this.draw(pendingDraw.data, pendingDraw.paletteMode).then(pendingCallback, pendingCallback);
            }
        });

        this.mapLayerManagerWorker.onmessage = (evt) => {
            if (evt.data.pixelData !== undefined) {
                const imageData = new ImageData(
                    new Uint8ClampedArray(evt.data.pixelData),
                    evt.data.width,
                    evt.data.height
                );

                this.segmentLookupInfo = {
                    data: new Uint8ClampedArray(evt.data.segmentLookupData),
                    width: evt.data.width,
                    height: evt.data.height,
                    top: evt.data.top,
                    left: evt.data.left,
                    idMapping: evt.data.segmentLookupIdMapping
                };

                this.ctx.clearRect(0, 0, this.width, this.height);
                this.ctx.putImageData(imageData, evt.data.left, evt.data.top);

                if (typeof this.pendingCallback === "function") {
                    this.pendingCallback();
                    this.pendingCallback = undefined;
                }
                this.pendingDraw = undefined;
            } else {
                if (evt.data.ready === true) {
                    // eslint-disable-next-line no-console
                    console.info("MapLayerManager.worker available");

                    this.mapLayerManagerWorkerAvailable = true;

                    return;
                }
            }
        };

        this.pendingCallback = undefined;

        this.segmentLookupInfo = {
            data: new Uint8ClampedArray(),
            width: 1,
            height: 1,
            top: 0,
            left: 0,
            idMapping: {}
        };
        this.selectedSegmentIds = [];
    }

    draw(data : RawMapData, paletteMode: PaletteMode): Promise<void> {
        return new Promise((resolve, reject) => {
            //As the map data might change dimensions, we need to keep track of that.
            if (
                this.canvas.width !== Math.round(data.size.x / data.pixelSize) ||
                this.canvas.height !== Math.round(data.size.y / data.pixelSize)
            ) {
                this.width = Math.round(data.size.x / data.pixelSize);
                this.height = Math.round(data.size.y / data.pixelSize);

                this.canvas.width = this.width;
                this.canvas.height = this.height;
            }
            if (data.layers.length > 0) {
                if (this.mapLayerManagerWorkerAvailable) {
                    this.pendingDraw = {data: data, paletteMode: paletteMode};
                    this.mapLayerManagerWorker.postMessage( {
                        mapLayers: data.metaData.nonce !== this.mapLayerManagerWorkerLastNonce ? data.layers : undefined,
                        pixelSize: data.pixelSize,
                        paletteMode: paletteMode,
                        selectedSegmentIds: this.selectedSegmentIds
                    });

                    this.mapLayerManagerWorkerLastNonce = data.metaData.nonce;

                    //I'm not 100% sure if this cleanup is necessary, but it should prevent eternally stuck promises
                    if (typeof this.pendingCallback === "function") {
                        this.pendingCallback();
                        this.pendingCallback = undefined;
                    }

                    this.pendingCallback = () => {
                        resolve();
                    };
                } else { //Fallback if there's no worker for some reason
                    const rendered = PROCESS_LAYERS(
                        data.layers,
                        data.pixelSize,
                        paletteMode,
                        this.selectedSegmentIds
                    );

                    this.segmentLookupInfo = {
                        data: new Uint8ClampedArray(rendered.segmentLookupData),
                        width: rendered.width,
                        height: rendered.height,
                        top: rendered.top,
                        left: rendered.left,
                        idMapping: rendered.segmentLookupIdMapping
                    };


                    this.ctx.clearRect(0, 0, this.width, this.height);
                    this.ctx.putImageData(
                        new ImageData(
                            new Uint8ClampedArray(rendered.pixelData),
                            rendered.width,
                            rendered.height
                        ),
                        rendered.left,
                        rendered.top
                    );

                    resolve();
                }
            } else {
                this.ctx.clearRect(0, 0, this.width, this.height);
                resolve();
            }
        });
    }

    /**
     * 
     * @param {number} x - in cm coordinates
     * @param {number} y - in cm coordinates
     */
    getIntersectingSegment(x: number, y: number): string|null {
        return getSegmentAtPoint(this.segmentLookupInfo, x, y);
    }

    setSelectedSegmentIds(selectedSegmentIds: string[]) {
        this.selectedSegmentIds = selectedSegmentIds;
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    dispose(): void {
        this.mapLayerManagerWorker.onmessage = null;
        this.mapLayerManagerWorker.onerror = null;
        this.mapLayerManagerWorker.terminate();
        this.pendingCallback?.();
        this.pendingCallback = undefined;
        this.pendingDraw = undefined;
    }
}
