import type {Point} from "./MapViewport";

type Drag = {kind: "drag"; previous: Point; current: Point; start: Point; afterPinch: boolean};
type Pinch = {kind: "pinch"; pan: Point; factor: number; center: Point};
type End = {start: Point; end: Point; moved: number; tap: boolean; cancelled: boolean; afterPinch: boolean};

export class MapGestures {
    private readonly pointers = new Map<number, Point>();
    private start?: Point;
    private previous?: Point;
    private pinchCenter?: Point;
    private pinchDistance = 0;
    private afterPinch = false;

    get pointerCount(): number {
        return this.pointers.size;
    }

    get preview(): {start: Point; current: Point} | undefined {
        if (this.pointers.size !== 1 || this.afterPinch || !this.start || !this.previous) return undefined;
        return {start: this.start, current: this.previous};
    }

    startPointer(id: number, point: Point): void {
        this.pointers.set(id, point);
        if (this.pointers.size === 1) {
            this.start = point;
            this.previous = point;
            this.afterPinch = false;
        } else {
            this.afterPinch = true;
            this.updatePinchReference();
        }
    }

    movePointer(id: number, point: Point): Drag | Pinch | undefined {
        if (!this.pointers.has(id)) return undefined;
        this.pointers.set(id, point);
        if (this.pointers.size >= 2) {
            const [a, b] = [...this.pointers.values()];
            const center = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            const result: Pinch = {
                kind: "pinch",
                pan: this.pinchCenter ? {x: center.x - this.pinchCenter.x, y: center.y - this.pinchCenter.y} : {x: 0, y: 0},
                factor: this.pinchDistance && distance ? distance / this.pinchDistance : 1,
                center: center
            };
            this.pinchCenter = center;
            this.pinchDistance = distance;
            return result;
        }
        if (!this.previous || !this.start) return undefined;
        const result: Drag = {kind: "drag", previous: this.previous, current: point, start: this.start, afterPinch: this.afterPinch};
        this.previous = point;
        return result;
    }

    endPointer(id: number, point: Point, cancelled = false): End | undefined {
        if (!this.pointers.has(id)) return undefined;
        const start = this.start ?? point;
        const moved = Math.hypot(point.x - start.x, point.y - start.y);
        const end: End = {
            start: start,
            end: point,
            moved: moved,
            tap: !cancelled && !this.afterPinch && this.pointers.size === 1 && moved < 8,
            cancelled: cancelled,
            afterPinch: this.afterPinch
        };
        this.pointers.delete(id);
        if (this.pointers.size >= 2) {
            this.updatePinchReference();
        } else {
            this.pinchCenter = undefined;
            this.pinchDistance = 0;
            const remaining = this.pointers.values().next().value as Point | undefined;
            this.start = remaining;
            this.previous = remaining;
            if (!remaining) this.afterPinch = false;
        }
        return end;
    }

    private updatePinchReference(): void {
        const [a, b] = [...this.pointers.values()];
        this.pinchCenter = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
}
