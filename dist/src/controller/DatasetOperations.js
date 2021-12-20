"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDataset = void 0;
const IInsightFacade_1 = require("./IInsightFacade");
const CourseOperations_1 = require("./CourseOperations");
const RoomOperations_1 = require("./RoomOperations");
function processDataset(id, content, kind, dataset) {
    return new Promise((resolve, reject) => {
        try {
            if (kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                (0, CourseOperations_1.addCourse)(id, content, dataset).then((ids) => {
                    resolve(ids);
                }).catch((error) => {
                    reject(error);
                });
            }
            else if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                (0, RoomOperations_1.addRoom)(id, content, dataset).then((ids) => {
                    resolve(ids);
                }).catch((error) => {
                    reject(error);
                });
            }
            else {
                reject(new IInsightFacade_1.InsightError("Invalid InsightDatasetKind"));
            }
        }
        catch (error) {
            return reject(error);
        }
    });
}
exports.processDataset = processDataset;
//# sourceMappingURL=DatasetOperations.js.map