import type {RawMapData} from "../api/RawMapData";

export type Point = {x: number; y: number};

export class MapViewport {
    width = 0;
    height = 0;
    dpr = 1;
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    initialized = false;
    private fitScale = 1;

    resize(width: number, height: number, dpr: number, map: RawMapData): void {
        if (!width || !height) return;
        const oldWidth = this.width;
        const oldHeight = this.height;
        const oldScale = this.scale;
        const zoomRatio = this.scale / this.fitScale;
        const center = {
            x: (oldWidth / 2 - this.offsetX) / oldScale,
            y: (oldHeight / 2 - this.offsetY) / oldScale
        };
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        if (!this.initialized) {
            this.fit(map);
        } else if (oldWidth && oldHeight) {
            this.fit(map);
            this.scale *= zoomRatio;
            this.offsetX = width / 2 - center.x * this.scale;
            this.offsetY = height / 2 - center.y * this.scale;
        }
    }

    fit(map: RawMapData): void {
        const bounds = map.layers.reduce((box, layer) => ({
            minX: Math.min(box.minX, layer.dimensions.x.min),
            minY: Math.min(box.minY, layer.dimensions.y.min),
            maxX: Math.max(box.maxX, layer.dimensions.x.max),
            maxY: Math.max(box.maxY, layer.dimensions.y.max)
        }), {
            minX: map.size.x / map.pixelSize,
            minY: map.size.y / map.pixelSize,
            maxX: 0,
            maxY: 0
        });
        const width = Math.max(1, bounds.maxX - bounds.minX);
        const height = Math.max(1, bounds.maxY - bounds.minY);
        this.scale = Math.max(0.01, Math.min(this.width / (width * 1.1), this.height / (height * 1.1)));
        this.fitScale = this.scale;
        this.offsetX = (this.width - width * this.scale) / 2 - bounds.minX * this.scale;
        this.offsetY = (this.height - height * this.scale) / 2 - bounds.minY * this.scale;
        this.initialized = true;
    }

    toMapPoint(screen: Point, map: RawMapData): Point {
        const point = this.toWorldPoint(screen);
        return {
            x: Math.max(0, Math.min(map.size.x / map.pixelSize, point.x)),
            y: Math.max(0, Math.min(map.size.y / map.pixelSize, point.y))
        };
    }

    toWorldPoint(screen: Point): Point {
        return {
            x: (screen.x * this.dpr - this.offsetX) / this.scale,
            y: (screen.y * this.dpr - this.offsetY) / this.scale
        };
    }

    toCanvasPoint(world: Point): Point {
        return {x: world.x * this.scale + this.offsetX, y: world.y * this.scale + this.offsetY};
    }

    pan(delta: Point): void {
        this.offsetX += delta.x * this.dpr;
        this.offsetY += delta.y * this.dpr;
    }

    zoom(factor: number, at: Point): void {
        if (!Number.isFinite(factor) || factor <= 0) return;
        const world = this.toWorldPoint(at);
        this.scale = Math.max(this.fitScale * 0.3, Math.min(this.fitScale * 30, this.scale * factor));
        this.offsetX = at.x * this.dpr - world.x * this.scale;
        this.offsetY = at.y * this.dpr - world.y * this.scale;
    }

    get worldUnitsPerCssPixel(): number {
        return this.dpr / this.scale;
    }
}
