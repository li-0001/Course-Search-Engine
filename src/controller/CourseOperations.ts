import {InsightError} from "./IInsightFacade";
import Course from "./Course";
import Section from "./Section";
import JSZip, {JSZipObject} from "jszip";
import * as fs from "fs-extra";

function addCourse(id: string, content: string, dataset: Map<string, any>): Promise<string[]> {
	let sections: Section[] = [];
	let promises: any[] = [];
	return new Promise((resolve, reject) => {
		let jsZip = new JSZip();
		return jsZip.loadAsync(content, {base64: true}).then(function (zip) {
			let folder = zip.folder("courses");
			if (folder == null) {
				reject(new InsightError("the zip's root directory does not contain a folder called courses/"));
			}
			folder!.forEach(function (relativePath) {
				let course = folder!.file(relativePath);
				if (course != null) {
					parseCourse(course, sections, promises);
				}
			});
		}).then(() => {
			Promise.all(promises).then(() => {
				// reject invalid dataset
				if (sections.length === 0) {
					reject(new InsightError("Courses dataset does not contain any valid sections"));
				} else {
					saveCourse(sections, dataset, id);
					// return list of ids
					return resolve(Array.from(dataset.keys()));
				}
			});
		}).catch((error) => {
			return reject(error);
		});
	});
}

function parseCourse(course: JSZipObject, sections: Section[], promises: any[]): void {
	let promise = course.async("string").then((courseContent) => {
		let array = JSON.parse(courseContent).result;
		for (let arr of array) {
			let section: Section;
			if (arr.Section === "overall") {
				let uuid: string = arr.id + "";
				section = new Section(arr.Subject, arr.Course, arr.Professor, arr.Title,
					uuid, arr.Avg, 1900, arr.Pass, arr.Fail, arr.Audit);
			} else {
				let uuid: string = arr.id + "";
				let year: number = parseInt(arr.Year, 10);
				section = new Section(arr.Subject, arr.Course, arr.Professor, arr.Title,
					uuid, arr.Avg, year, arr.Pass, arr.Fail, arr.Audit);
			}
			sections.push(section);
		}
	}).catch((error) => {
		return;
	});
	promises.push(promise);
}

function saveCourse(sections: Section[], dataset: Map<string, any>, id: string) {
	// store dataset in memory
	let c = new Course(sections);
	dataset.set(id, c);
	// store dataset to disk
	if (!fs.existsSync("data")) {
		fs.mkdirSync("data");
	}
	fs.writeFileSync("data/" + id + ".json", JSON.stringify(sections));
}

function getCourseRows(data: any): number {
	let row = 0;
	if (data != null) {
		let sections = data.getSections();
		row = sections.length;
	}
	return row;
}

export {addCourse, getCourseRows};
