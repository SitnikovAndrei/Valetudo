const canonicalOrder = ["off", "min", "low", "medium", "high", "max", "turbo"];

export function presetLevels<T extends string>(options: readonly T[]) {
    const ordered = [...options];
    if (ordered.every(value => canonicalOrder.includes(value))) {
        ordered.sort((left, right) => canonicalOrder.indexOf(left) - canonicalOrder.indexOf(right));
    }
    const enabled = ordered.filter(value => value !== "off");
    return ordered.map(value => ({value, level: value === "off" ? 0 : enabled.indexOf(value) + 1, levels: enabled.length}));
}
