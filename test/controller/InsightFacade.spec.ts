import {
	InsightDataset,
	InsightDatasetKind,
	InsightError, NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {testFolder} from "@ubccpsc310/folder-test";
import {expect} from "chai";

let chai = require("chai");
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;
	let insightFacade2: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		// This is a unit test. You should create more like this!
		it("Should add a valid course dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("Should add a valid room dataset", function () {
			const id: string = "rooms";
			const content = fs.readFileSync("test/resources/archives/rooms.zip").toString("base64");
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("invalid id that contains underscore, addDataset should be rejected with InsightError", function () {
			const content: string = datasetContents.get("courses") ?? "";
			const ids =  insightFacade.addDataset("courses_", content, InsightDatasetKind.Courses);
			return expect(ids).eventually.to.be.rejectedWith(InsightError);
		});

		it("invalid id that contains only whitespace characters, should be rejected with InsightError", function () {
			const content: string = datasetContents.get("courses") ?? "";
			const ids =  insightFacade.addDataset("   ", content, InsightDatasetKind.Courses);
			return expect(ids).eventually.to.be.rejectedWith(InsightError);
		});

		it("id is the same as the id of an already added dataset, should be rejected with InsightError", function () {
			const content: string = datasetContents.get("courses") ?? "";
			return insightFacade.addDataset("courses", content, InsightDatasetKind.Courses)
				.then(() => {
					const ids = insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
					return expect(ids).to.be.rejectedWith(InsightError);
				});
		});

		// Remove Dataset
		it("attempt to remove a dataset that hasn't been added, should be rejected with NotFoundError", function () {
			const id = insightFacade.removeDataset("courses");
			return expect(id).eventually.to.be.rejectedWith(NotFoundError);
		});

		it("invalid id that contains underscore, removeDataset should be rejected with InsightError", function () {
			const id = insightFacade.removeDataset("courses_");
			return expect(id).eventually.to.be.rejectedWith(InsightError);
		});

		it("invalid id that contains only whitespace, removeDataset should be rejected with InsightError", function () {
			const id = insightFacade.removeDataset("   ");
			return expect(id).eventually.to.be.rejectedWith(InsightError);
		});

		it("successfully remove", function () {
			return insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.removeDataset("courses");
				}).then((id) => {
					expect(id).to.deep.equal("courses");
				});
		});

		// List Datasets
		it("list 0 dataset", function () {
			return insightFacade.listDatasets().then((dataset) => {
				expect(dataset).to.be.an.instanceof(Array);
				expect(dataset).to.have.length(0);
			});
		});

		it("list 1 dataset", function () {
			// this.timeout(3500);
			const content: string = datasetContents.get("courses") ?? "";
			return insightFacade.addDataset("courses", content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.listDatasets();
				}).then((dataset) => {
					expect(dataset).to.be.an.instanceof(Array);
					expect(dataset).to.have.length(1);
					expect(dataset).to.deep.equal([{
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					}]);
				});
		});

		it("list multiple datasets", function () {
			// this.timeout(5000);
			const content: string = datasetContents.get("courses") ?? "";
			return insightFacade.addDataset("courses-1", content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
				}).then(() => {
					return insightFacade.listDatasets();
				}).then((dataset) => {
					expect(dataset).to.be.an.instanceof(Array);
					expect(dataset).to.have.length(2);
					const expected: InsightDataset[] = [
						{
							id: "courses-1",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "courses-2",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						}
					];
					expect(dataset).to.have.deep.members(expected);
				});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			this.timeout(10000);
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();
			const loadDatasetPromises = [
				insightFacade.addDataset("rooms",
					fs.readFileSync("test/resources/archives/rooms.zip").toString("base64"),
					InsightDatasetKind.Rooms),
				insightFacade.addDataset("courses",
					fs.readFileSync("test/resources/archives/courses.zip").toString("base64"),
					InsightDatasetKind.Courses)
			];
			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		testFolder<any, any[], PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(expected, actual) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
