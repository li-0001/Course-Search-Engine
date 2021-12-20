import Section from "./Section";
import JSZip from "jszip";
import {InsightError} from "./IInsightFacade";

export default class Course {
	public course: Section[];

	constructor(sections: Section[]) {
		this.course = sections;
	}

	public getSections(): Section[] {
		return this.course;
	}
}
