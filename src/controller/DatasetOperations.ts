import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {addCourse} from "./CourseOperations";
import {addRoom} from "./RoomOperations";

function processDataset(id: string, content: string, kind: InsightDatasetKind, dataset: Map<string, any>):
	Promise<string[]> {
	return new Promise((resolve, reject) => {
		try {
			if (kind === InsightDatasetKind.Courses) {
				addCourse(id, content, dataset).then((ids) => {
					resolve(ids);
				}).catch((error) => {
					reject(error);
				});
			} else if (kind === InsightDatasetKind.Rooms) {
				addRoom(id, content, dataset).then((ids) => {
					resolve(ids);
				}).catch((error) => {
					reject(error);
				});
			} else {
				reject(new InsightError("Invalid InsightDatasetKind"));
			}
		} catch (error) {
			return reject(error);
		}
	});
}

export {processDataset};
