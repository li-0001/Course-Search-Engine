"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultTooLargeError = exports.NotFoundError = exports.InsightError = exports.InsightDatasetKind = void 0;
var InsightDatasetKind;
(function (InsightDatasetKind) {
    InsightDatasetKind["Courses"] = "courses";
    InsightDatasetKind["Rooms"] = "rooms";
})(InsightDatasetKind = exports.InsightDatasetKind || (exports.InsightDatasetKind = {}));
class InsightError extends Error {
    constructor(...args) {
        super(...args);
        Error.captureStackTrace(this, InsightError);
    }
}
exports.InsightError = InsightError;
class NotFoundError extends Error {
    constructor(...args) {
        super(...args);
        Error.captureStackTrace(this, NotFoundError);
    }
}
exports.NotFoundError = NotFoundError;
class ResultTooLargeError extends Error {
    constructor(...args) {
        super(...args);
        Error.captureStackTrace(this, ResultTooLargeError);
    }
}
exports.ResultTooLargeError = ResultTooLargeError;
//# sourceMappingURL=IInsightFacade.js.map