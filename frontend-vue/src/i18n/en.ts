import {ru} from "./ru";

// English source strings are the message keys. Keep both catalogs in sync.
export const en = Object.fromEntries(Object.keys(ru).map(key => [key, key]));
