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
const IInsightFacade_1 = require("./IInsightFacade");
const Course_1 = __importDefault(require("./Course"));
const Room_1 = __importDefault(require("./Room"));
const QueryPart_1 = __importDefault(require("./QueryPart"));
const DatasetOperations_1 = require("./DatasetOperations");
const CourseOperations_1 = require("./CourseOperations");
const fs = __importStar(require("fs-extra"));
class InsightFacade {
    constructor() {
        console.trace("InsightFacadeImpl::init()");
        this.dataset = new Map();
    }
    addDataset(id, content, kind) {
        return new Promise((resolve, reject) => {
            try {
                if ((id.includes("_")) || (id.trim().length === 0) || (this.dataset.has(id))) {
                    reject(new IInsightFacade_1.InsightError());
                }
                (0, DatasetOperations_1.processDataset)(id, content, kind, this.dataset).then((ids) => {
                    resolve(ids);
                }).catch((error) => {
                    reject(error);
                });
            }
            catch (error) {
                return reject(error);
            }
        });
    }
    removeDataset(id) {
        return new Promise((resolve, reject) => {
            try {
                if ((id.includes("_")) || (id.trim().length === 0)) {
                    reject(new IInsightFacade_1.InsightError());
                }
                if (!this.dataset.has(id)) {
                    reject(new IInsightFacade_1.NotFoundError());
                }
                this.dataset.delete(id);
                fs.removeSync("data/" + id + ".json");
                resolve(id);
            }
            catch (error) {
                return reject(error);
            }
        });
    }
    listDatasets() {
        let datasets = [];
        return new Promise((resolve, reject) => {
            try {
                for (let key of this.dataset.keys()) {
                    let data = this.dataset.get(key);
                    if (data instanceof Course_1.default) {
                        let rows = (0, CourseOperations_1.getCourseRows)(data);
                        let curr = {
                            id: key,
                            kind: IInsightFacade_1.InsightDatasetKind.Courses,
                            numRows: rows,
                        };
                        datasets.push(curr);
                    }
                    else if (data[0] instanceof Room_1.default) {
                        let rows = data.length;
                        let curr = {
                            id: key,
                            kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                            numRows: rows,
                        };
                        datasets.push(curr);
                    }
                }
                resolve(datasets);
            }
            catch (error) {
                return reject(error);
            }
        });
    }
    performQuery(query) {
        return new Promise((resolve, reject) => {
            try {
                let queryPart = new QueryPart_1.default();
                let result = queryPart.doQuery(query, this.dataset);
                resolve(result);
            }
            catch (error) {
                if (error instanceof IInsightFacade_1.InsightError || error instanceof IInsightFacade_1.ResultTooLargeError) {
                    reject(error);
                }
                else {
                    reject(new IInsightFacade_1.InsightError("Unexpected Error"));
                }
            }
        });
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map