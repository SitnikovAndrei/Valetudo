import {describe, expect, it} from "vitest";
import {RobotAttributeClass, type StatusState} from "./api/RawRobotState";
import {homePrimaryAction} from "./homePrimaryAction";

const state = (value: StatusState["value"], flag: StatusState["flag"] = "none"): StatusState => ({
    __class: RobotAttributeClass.StatusState, metaData: {}, value, flag
});

describe("phone primary action", () => {
    it("pauses moving jobs even with a selection or resumable flag", () => {
        for (const value of ["cleaning", "returning", "moving"] as const) {
            expect(homePrimaryAction(state(value, "resumable"), "segments")).toBe("pause");
        }
    });
    it("resumes a job before starting a selected area", () => {
        expect(homePrimaryAction(state("paused", "resumable"), "zones")).toBe("start");
        expect(homePrimaryAction(state("idle", "resumable"), "goto")).toBe("start");
        expect(homePrimaryAction(state("paused"), "segments")).toBe("start");
    });
    it("starts full cleanup or dispatches the selected map action", () => {
        for (const value of ["idle", "docked", "error"] as const) {
            expect(homePrimaryAction(state(value), "all")).toBe("start");
            for (const mode of ["segments", "zones", "goto"] as const) {
                expect(homePrimaryAction(state(value), mode)).toBe("selection");
            }
        }
        expect(homePrimaryAction(undefined, "all")).toBe("start");
    });
});
