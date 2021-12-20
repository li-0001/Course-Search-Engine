"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = __importDefault(require("../../src/rest/Server"));
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const chai_1 = __importStar(require("chai"));
const chai_http_1 = __importDefault(require("chai-http"));
const fs = __importStar(require("fs"));
const Log_1 = __importDefault(require("@ubccpsc310/folder-test/build/Log"));
describe("Facade D3", function () {
    let facade;
    let server;
    (0, chai_1.use)(chai_http_1.default);
    before(function () {
        facade = new InsightFacade_1.default();
        server = new Server_1.default(4321);
        server.start();
    });
    after(function () {
        server.stop();
    });
    beforeEach(function () {
    });
    afterEach(function () {
    });
    it("PUT test for courses dataset", function () {
        this.timeout(3000);
        try {
            return chai_1.default.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .send(fs.readFileSync("test/resources/archives/courses.zip"))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                (0, chai_1.expect)(res.status).to.be.equal(200);
            })
                .catch(function (err) {
                Log_1.default.trace(err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Log_1.default.trace("Error:" + err);
        }
    });
    it("PUT test for rooms dataset", function () {
        this.timeout(3000);
        try {
            return chai_1.default.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .send(fs.readFileSync("test/resources/archives/rooms.zip"))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                (0, chai_1.expect)(res.status).to.be.equal(200);
            })
                .catch(function (err) {
                Log_1.default.trace(err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Log_1.default.trace("Error:" + err);
        }
    });
    it("DELETE test for courses dataset", function () {
        this.timeout(3000);
        try {
            return chai_1.default.request("http://localhost:4321")
                .delete("/dataset/courses_")
                .then(function (res) {
                (0, chai_1.expect)(res.status).to.be.equal(400);
            })
                .catch(function (err) {
                Log_1.default.trace(err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Log_1.default.trace("Error:" + err);
        }
    });
});
//# sourceMappingURL=Server.spec.js.map