import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import Course from "./Course";
import Room from "./Room";
import QueryPart from "./QueryPart";
import {processDataset} from "./DatasetOperations";
import {getCourseRows} from "./CourseOperations";
import * as fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public dataset: Map<string, any>;

	constructor() {
		console.trace("InsightFacadeImpl::init()");
		this.dataset = new Map();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise((resolve, reject) => {
			try {
				if ((id.includes("_")) || (id.trim().length === 0) || (this.dataset.has(id))) {
					reject(new InsightError());
				}
				processDataset(id, content, kind, this.dataset).then((ids) => {
					resolve(ids);
				}).catch((error) => {
					reject(error);
				});
			} catch (error) {
				return reject(error);
			}
		});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				// reject invalid id
				if ((id.includes("_")) || (id.trim().length === 0)) {
					reject(new InsightError());
				}
				// reject valid id that is not yet added
				if (!this.dataset.has(id)) {
					reject(new NotFoundError());
				}
				// remove from memory
				this.dataset.delete(id);
				// remove from disk
				fs.removeSync("data/" + id + ".json");
				resolve(id);
			} catch (error) {
				return reject(error);
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let datasets: InsightDataset[] = [];
		return new Promise((resolve, reject) => {
			try {
				for (let key of this.dataset.keys()) {
					let data = this.dataset.get(key);
					if (data instanceof Course) {
						let rows: number = getCourseRows(data);
						let curr = {
							id: key,
							kind: InsightDatasetKind.Courses,
							numRows: rows,
						};
						datasets.push(curr);
					} else if (data[0] instanceof Room) {
						let rows: number = data.length;
						let curr = {
							id: key,
							kind: InsightDatasetKind.Rooms,
							numRows: rows,
						};
						datasets.push(curr);
					}
				}
				resolve(datasets);
			} catch (error) {
				return reject(error);
			}
		});
	}

	public performQuery(query: any): Promise<any[]> {
		return new Promise<any>((resolve, reject) => {
			try {
				let queryPart = new QueryPart();
				let result = queryPart.doQuery(query, this.dataset);
				resolve(result);
			} catch (error) {
				if (error instanceof InsightError || error instanceof ResultTooLargeError) {
					reject(error);
				} else {
					reject(new InsightError("Unexpected Error"));
				}
			}
		});
	}
}
