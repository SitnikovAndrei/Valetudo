const assert = require("node:assert/strict");
const UpdaterRouter = require("../../../lib/webserver/UpdaterRouter");
const {describe, it} = require("node:test");

describe("UpdaterRouter configuration", () => {
    const initialConfig = {
        enabled: true,
        updateProvider: {type: "github", implementationSpecificConfig: {}}
    };

    function createRouter() {
        let currentConfig = initialConfig;
        const config = {
            get: () => currentConfig,
            set: (key, value) => {
                assert.equal(key, "updater");
                currentConfig = value;
            }
        };
        const router = new UpdaterRouter({config: config, updater: {}, validator: (req, res, next) => next()}).getRouter();
        const getRoute = router.stack.find(layer => layer.route?.path === "/config" && layer.route.methods.get).route;
        const putRoute = router.stack.find(layer => layer.route?.path === "/config" && layer.route.methods.put).route;
        const get = getRoute.stack.at(-1).handle;
        const put = putRoute.stack.at(-1).handle;

        return {get: get, put: put, getConfig: () => currentConfig};
    }

    it("reports the enabled state", () => {
        const {get} = createRouter();
        get({}, {json: value => assert.deepEqual(value, {enabled: true, updateProvider: "github"})});
    });

    it("disables the updater without changing its channel", () => {
        const {put, getConfig} = createRouter();
        put({body: {enabled: false}}, {sendStatus: status => assert.equal(status, 200)});
        assert.deepEqual(getConfig(), {...initialConfig, enabled: false});
    });

    it("changes the channel without enabling a disabled updater", () => {
        const {put, getConfig} = createRouter();
        put({body: {enabled: false}}, {sendStatus: () => {}});
        put({body: {updateProvider: "github_nightly"}}, {sendStatus: status => assert.equal(status, 200)});
        assert.equal(getConfig().enabled, false);
        assert.equal(getConfig().updateProvider.type, "github_nightly");
    });

    it("rejects invalid enabled values", () => {
        const {put, getConfig} = createRouter();
        put({body: {enabled: "false"}}, {sendStatus: status => assert.equal(status, 400)});
        assert.deepEqual(getConfig(), initialConfig);
    });
});
