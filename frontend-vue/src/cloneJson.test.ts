import {describe, expect, it} from "vitest";
import {reactive} from "vue";
import {cloneJson} from "./cloneJson";

describe("cloneJson", () => {
    it("copies nested Vue reactive API data for editable drafts", () => {
        const source = reactive({entities: [{points: [1, 2]}]});
        const draft = cloneJson(source);
        draft.entities[0].points[0] = 5;
        expect(source.entities[0].points[0]).toBe(1);
    });
});
