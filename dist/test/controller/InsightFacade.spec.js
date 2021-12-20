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
const IInsightFacade_1 = require("../../src/controller/IInsightFacade");
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const fs = __importStar(require("fs-extra"));
const folder_test_1 = require("@ubccpsc310/folder-test");
const chai_1 = require("chai");
let chai = require("chai");
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
describe("InsightFacade", function () {
    let insightFacade;
    let insightFacade2;
    const persistDir = "./data";
    const datasetContents = new Map();
    const datasetsToLoad = {
        courses: "./test/resources/archives/courses.zip",
    };
    before(function () {
        for (const key of Object.keys(datasetsToLoad)) {
            const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
            datasetContents.set(key, content);
        }
        fs.removeSync(persistDir);
    });
    describe("Add/Remove/List Dataset", function () {
        before(function () {
            console.info(`Before: ${this.test?.parent?.title}`);
        });
        beforeEach(function () {
            console.info(`BeforeTest: ${this.currentTest?.title}`);
            insightFacade = new InsightFacade_1.default();
        });
        after(function () {
            console.info(`After: ${this.test?.parent?.title}`);
        });
        afterEach(function () {
            console.info(`AfterTest: ${this.currentTest?.title}`);
            fs.removeSync(persistDir);
        });
        it("Should add a valid course dataset", function () {
            const id = "courses";
            const content = datasetContents.get("courses") ?? "";
            const expected = [id];
            return insightFacade.addDataset(id, content, IInsightFacade_1.InsightDatasetKind.Courses).then((result) => {
                (0, chai_1.expect)(result).to.deep.equal(expected);
            });
        });
        it("Should add a valid room dataset", function () {
            const id = "rooms";
            const content = fs.readFileSync("test/resources/archives/rooms.zip").toString("base64");
            const expected = [id];
            return insightFacade.addDataset(id, content, IInsightFacade_1.InsightDatasetKind.Rooms).then((result) => {
                (0, chai_1.expect)(result).to.deep.equal(expected);
            });
        });
        it("invalid id that contains underscore, addDataset should be rejected with InsightError", function () {
            const content = datasetContents.get("courses") ?? "";
            const ids = insightFacade.addDataset("courses_", content, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(ids).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("invalid id that contains only whitespace characters, should be rejected with InsightError", function () {
            const content = datasetContents.get("courses") ?? "";
            const ids = insightFacade.addDataset("   ", content, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(ids).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("id is the same as the id of an already added dataset, should be rejected with InsightError", function () {
            const content = datasetContents.get("courses") ?? "";
            return insightFacade.addDataset("courses", content, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                const ids = insightFacade.addDataset("courses", content, IInsightFacade_1.InsightDatasetKind.Courses);
                return (0, chai_1.expect)(ids).to.be.rejectedWith(IInsightFacade_1.InsightError);
            });
        });
        it("attempt to remove a dataset that hasn't been added, should be rejected with NotFoundError", function () {
            const id = insightFacade.removeDataset("courses");
            return (0, chai_1.expect)(id).eventually.to.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
        it("invalid id that contains underscore, removeDataset should be rejected with InsightError", function () {
            const id = insightFacade.removeDataset("courses_");
            return (0, chai_1.expect)(id).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("invalid id that contains only whitespace, removeDataset should be rejected with InsightError", function () {
            const id = insightFacade.removeDataset("   ");
            return (0, chai_1.expect)(id).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("successfully remove", function () {
            return insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return insightFacade.removeDataset("courses");
            }).then((id) => {
                (0, chai_1.expect)(id).to.deep.equal("courses");
            });
        });
        it("list 0 dataset", function () {
            return insightFacade.listDatasets().then((dataset) => {
                (0, chai_1.expect)(dataset).to.be.an.instanceof(Array);
                (0, chai_1.expect)(dataset).to.have.length(0);
            });
        });
        it("list 1 dataset", function () {
            const content = datasetContents.get("courses") ?? "";
            return insightFacade.addDataset("courses", content, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return insightFacade.listDatasets();
            }).then((dataset) => {
                (0, chai_1.expect)(dataset).to.be.an.instanceof(Array);
                (0, chai_1.expect)(dataset).to.have.length(1);
                (0, chai_1.expect)(dataset).to.deep.equal([{
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    }]);
            });
        });
        it("list multiple datasets", function () {
            const content = datasetContents.get("courses") ?? "";
            return insightFacade.addDataset("courses-1", content, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return insightFacade.addDataset("courses-2", content, IInsightFacade_1.InsightDatasetKind.Courses);
            }).then(() => {
                return insightFacade.listDatasets();
            }).then((dataset) => {
                (0, chai_1.expect)(dataset).to.be.an.instanceof(Array);
                (0, chai_1.expect)(dataset).to.have.length(2);
                const expected = [
                    {
                        id: "courses-1",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                    {
                        id: "courses-2",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    }
                ];
                (0, chai_1.expect)(dataset).to.have.deep.members(expected);
            });
        });
    });
    describe("PerformQuery", () => {
        before(function () {
            this.timeout(10000);
            console.info(`Before: ${this.test?.parent?.title}`);
            insightFacade = new InsightFacade_1.default();
            const loadDatasetPromises = [
                insightFacade.addDataset("rooms", fs.readFileSync("test/resources/archives/rooms.zip").toString("base64"), IInsightFacade_1.InsightDatasetKind.Rooms),
                insightFacade.addDataset("courses", fs.readFileSync("test/resources/archives/courses.zip").toString("base64"), IInsightFacade_1.InsightDatasetKind.Courses)
            ];
            return Promise.all(loadDatasetPromises);
        });
        after(function () {
            console.info(`After: ${this.test?.parent?.title}`);
            fs.removeSync(persistDir);
        });
        (0, folder_test_1.testFolder)("Dynamic InsightFacade PerformQuery tests", (input) => insightFacade.performQuery(input), "./test/resources/queries", {
            errorValidator: (error) => error === "ResultTooLargeError" || error === "InsightError",
            assertOnError(expected, actual) {
                if (expected === "ResultTooLargeError") {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.ResultTooLargeError);
                }
                else {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.InsightError);
                }
            },
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map