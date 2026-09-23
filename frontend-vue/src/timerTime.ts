import type {Timer} from "../../frontend/src/api/types";
import {cloneJson} from "./cloneJson";

export function shiftTimer(timer: Timer, offsetMinutes: number): Timer {
    const shifted = cloneJson(timer);
    const minutes = timer.hour * 60 + timer.minute + offsetMinutes;
    if (minutes >= 1440) shifted.dow = timer.dow.map(day => (day + 1) % 7);
    else if (minutes < 0) shifted.dow = timer.dow.map(day => (day + 6) % 7);
    const normalized = ((minutes % 1440) + 1440) % 1440;
    shifted.hour = Math.floor(normalized / 60);
    shifted.minute = normalized % 60;
    return shifted;
}
