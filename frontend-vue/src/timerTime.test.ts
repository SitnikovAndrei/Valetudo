import {describe, expect, it} from "vitest";
import {ValetudoTimerActionType, type Timer} from "../../frontend/src/api/types";
import {shiftTimer} from "./timerTime";

const timer: Timer = {id: "one", enabled: true, dow: [1, 5], hour: 23, minute: 30, action: {type: ValetudoTimerActionType.FULL_CLEANUP, params: {}}};

describe("shiftTimer", () => {
    it("moves weekdays and time across midnight without mutating the original", () => {
        const local = shiftTimer(timer, 120);
        expect(local.hour).toBe(1);
        expect(local.minute).toBe(30);
        expect(local.dow).toEqual([2, 6]);
        expect(shiftTimer(local, -120)).toEqual(timer);
        expect(timer.hour).toBe(23);
    });

    it("wraps Sunday when moving backward", () => {
        const sunday: Timer = {...timer, dow: [0], hour: 0, minute: 15};
        expect(shiftTimer(sunday, -60).dow).toEqual([6]);
    });
});
