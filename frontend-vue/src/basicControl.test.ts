import {describe, expect, it} from "vitest";
import {RobotAttributeClass, type StatusState} from "./api/RawRobotState";
import {isBasicCommandEnabled} from "./basicControl";

const state = (value: StatusState["value"], flag: StatusState["flag"] = "none"): StatusState => ({
    __class: RobotAttributeClass.StatusState,
    metaData: {},
    value,
    flag
});

describe("basic control availability", () => {
    it("disables every command when the robot status is unknown", () => {
        for (const command of ["start", "pause", "stop", "home"] as const) {
            expect(isBasicCommandEnabled(command, undefined)).toBe(false);
        }
    });

    it("matches the current full-cleanup state rules", () => {
        expect(isBasicCommandEnabled("start", state("idle"))).toBe(true);
        expect(isBasicCommandEnabled("start", state("paused", "resumable"))).toBe(true);
        expect(isBasicCommandEnabled("start", state("cleaning"))).toBe(false);
        expect(isBasicCommandEnabled("pause", state("cleaning"))).toBe(true);
        expect(isBasicCommandEnabled("pause", state("docked"))).toBe(false);
        expect(isBasicCommandEnabled("stop", state("paused", "resumable"))).toBe(true);
        expect(isBasicCommandEnabled("stop", state("docked"))).toBe(false);
        expect(isBasicCommandEnabled("home", state("error"))).toBe(true);
        expect(isBasicCommandEnabled("home", state("returning"))).toBe(false);
    });
});
