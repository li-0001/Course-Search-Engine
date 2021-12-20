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
exports.getCourseRows = exports.addCourse = void 0;
const IInsightFacade_1 = require("./IInsightFacade");
const Course_1 = __importDefault(require("./Course"));
const Section_1 = __importDefault(require("./Section"));
const jszip_1 = __importDefault(require("jszip"));
const fs = __importStar(require("fs-extra"));
function addCourse(id, content, dataset) {
    let sections = [];
    let promises = [];
    return new Promise((resolve, reject) => {
        let jsZip = new jszip_1.default();
        return jsZip.loadAsync(content, { base64: true }).then(function (zip) {
            let folder = zip.folder("courses");
            if (folder == null) {
                reject(new IInsightFacade_1.InsightError("the zip's root directory does not contain a folder called courses/"));
            }
            folder.forEach(function (relativePath) {
                let course = folder.file(relativePath);
                if (course != null) {
                    parseCourse(course, sections, promises);
                }
            });
        }).then(() => {
            Promise.all(promises).then(() => {
                if (sections.length === 0) {
                    reject(new IInsightFacade_1.InsightError("Courses dataset does not contain any valid sections"));
                }
                else {
                    saveCourse(sections, dataset, id);
                    return resolve(Array.from(dataset.keys()));
                }
            });
        }).catch((error) => {
            return reject(error);
        });
    });
}
exports.addCourse = addCourse;
function parseCourse(course, sections, promises) {
    let promise = course.async("string").then((courseContent) => {
        let array = JSON.parse(courseContent).result;
        for (let arr of array) {
            let section;
            if (arr.Section === "overall") {
                let uuid = arr.id + "";
                section = new Section_1.default(arr.Subject, arr.Course, arr.Professor, arr.Title, uuid, arr.Avg, 1900, arr.Pass, arr.Fail, arr.Audit);
            }
            else {
                let uuid = arr.id + "";
                let year = parseInt(arr.Year, 10);
                section = new Section_1.default(arr.Subject, arr.Course, arr.Professor, arr.Title, uuid, arr.Avg, year, arr.Pass, arr.Fail, arr.Audit);
            }
            sections.push(section);
        }
    }).catch((error) => {
        return;
    });
    promises.push(promise);
}
function saveCourse(sections, dataset, id) {
    let c = new Course_1.default(sections);
    dataset.set(id, c);
    if (!fs.existsSync("data")) {
        fs.mkdirSync("data");
    }
    fs.writeFileSync("data/" + id + ".json", JSON.stringify(sections));
}
function getCourseRows(data) {
    let row = 0;
    if (data != null) {
        let sections = data.getSections();
        row = sections.length;
    }
    return row;
}
exports.getCourseRows = getCourseRows;
//# sourceMappingURL=CourseOperations.js.map