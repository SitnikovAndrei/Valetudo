export type SegmentLookupInfo = {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    top: number;
    left: number;
    idMapping: {[key: string]: string};
};

export function getSegmentAtPoint(lookup: SegmentLookupInfo, x: number, y: number): string | null {
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
        x < lookup.left || y < lookup.top ||
        x >= lookup.left + lookup.width || y >= lookup.top + lookup.height) {
        return null;
    }

    const column = Math.floor(x) - lookup.left;
    const row = Math.floor(y) - lookup.top;
    return lookup.idMapping[lookup.data[column + row * lookup.width]] ?? null;
}
