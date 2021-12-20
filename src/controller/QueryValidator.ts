import QueryPart from "./QueryPart";
import * as fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class QueryValidator{
	private readonly query: any;

	public id: string = "";

	public dataset: any;

	public kind: any;

	private datasetReady: boolean = false;

	private static readonly regexID = new RegExp("^[^_]+$");

	private static readonly regexApplyKey = new RegExp("^[^_]+$");

	public static readonly validNumKeys: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];

	public static readonly validStrKeys: string[] = ["dept", "id", "instructor", "title", "uuid",
		"fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

	public static readonly validCourseKeys: string[] =["avg", "pass", "fail", "audit", "year",
		"dept", "id", "instructor", "title", "uuid"]

	public static readonly validRoomKeys: string[] =["lat", "lon", "seats", "fullname", "shortname", "number", "name",
		"address", "type", "furniture", "href"];

	public static readonly validDirections: string[] = ["UP", "DOWN"];

	public static readonly validApplyToken: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

	constructor(query: any, datasets: any) {
		this.query = query;
		this.dataset = datasets;
	}

	public isQueryValid(): boolean {
		if (this.query === null || !this.checkQueryComponent()) {
			throw new InsightError("Query is NULL or Invalid Component");
		}
		let whereValid = this.checkWHERE(this.query.WHERE);
		if (!whereValid) {
			throw new InsightError("Invalid Where Component");
		}
		let optionValid = this.checkOPTIONS(this.query.OPTIONS);
		if (!optionValid) {
			throw new InsightError("Invalid Option Component");
		}
		return Object.keys(this.query).includes("TRANSFORMATIONS") ?
			this.checkTRANSFORMATIONS(this.query.TRANSFORMATIONS, this.query.OPTIONS.COLUMNS) : true;
	}

	private checkQueryComponent(): boolean {
		let allKeys = Object.keys(this.query);
		let numComponents: number = allKeys.length;
		if (this.query.WHERE === undefined) {
			throw new InsightError("Where undefined");
		}
		switch (numComponents) {
			case 2:
				return allKeys.includes("WHERE") && allKeys.includes("OPTIONS") &&
					this.checkOPTIONSComponent();
			case 3:
				return allKeys.includes("WHERE") && allKeys.includes("OPTIONS") &&
					this.checkOPTIONSComponent() && allKeys.includes("TRANSFORMATIONS") &&
					this.checkTRANSFORMATIONSComponent();
			default:
				throw new InsightError("Invalid Number of Components");
		}
	}

	private checkOPTIONSComponent(): boolean {
		let allKeysInOPTION = Object.keys(this.query.OPTIONS);
		return (allKeysInOPTION.length === 1 && allKeysInOPTION[0] === "COLUMNS") ||
			(allKeysInOPTION.length === 2 && allKeysInOPTION.includes("ORDER") && allKeysInOPTION.includes("COLUMNS"));
	}

	private checkTRANSFORMATIONSComponent(): boolean {
		let allKeysInTRANSFORMATIONS = Object.keys(this.query.TRANSFORMATIONS);
		return (allKeysInTRANSFORMATIONS.length === 2 &&
			allKeysInTRANSFORMATIONS.includes("GROUP") && allKeysInTRANSFORMATIONS.includes("APPLY"));
	}

	private checkWHERE(where: any): boolean {
		if (!(where instanceof Object) || where instanceof Array) {
			throw new InsightError("Where is Not An Object");
		}
		let levelOne = Object.keys(where);
		if (levelOne.length === 0) {
			return true;
		}
		if (levelOne.length !== 1 || !QueryPart.allComparators.includes(levelOne[0])) {
			throw new InsightError("Invalid comparators in Where");
		}
		let innerQuery = where[levelOne[0]];
		let innerKeys = Object.keys(innerQuery);
		if (QueryPart.stringComparator.includes(levelOne[0]) ||
			QueryPart.numComparators.includes(levelOne[0])) {
			return this.checkBaseCaseKeyAndField(levelOne[0], innerQuery, innerKeys);
		} else if (QueryPart.negation.includes(levelOne[0])) {
			if ((!QueryPart.allComparators.includes(innerKeys[0])) || innerKeys.length !== 1) {
				throw new InsightError("Invalid inner negation part");
			}
			return this.checkWHERE(innerQuery);
		} else if (QueryPart.logicComparators.includes(levelOne[0])) {
			if (innerKeys.length < 1) {
				throw new InsightError("Invalid Logic Component");
			}
			let isInnerValid = true;
			for (let key in innerKeys) {
				isInnerValid = isInnerValid && this.checkWHERE(innerQuery[key]) &&
					(Object.keys(innerQuery[key]).length !== 0);
				if (!isInnerValid) {
					throw new InsightError("Invalid inner logic component");
				}
			}
			return isInnerValid;
		}
		return false;
	}

	private checkBaseCaseKeyAndField(outKey: any, query: any, key: any[]): boolean {
		let datasetName = key[0].split("_")[0];
		let keyName = key[0].split("_")[1];
		if (!this.datasetReady) {
			this.id = datasetName;
			this.getDatasetAndKind();
		}
		if (!((QueryValidator.regexID.test(datasetName)) && this.checkValidKey(keyName) && this.id === datasetName)) {
			throw new InsightError("Invalid base case keyName");
		}
		if (outKey !== "SKIP") {
			if (key.length !== 1) {
				throw new InsightError("Invalid base case length");
			}
			if (QueryValidator.validStrKeys.includes(keyName) && QueryPart.stringComparator.includes(outKey)) {
				return (typeof query[key[0]] === "string");
			} else if (QueryValidator.validNumKeys.includes(keyName) && QueryPart.numComparators.includes(outKey)) {
				return (typeof query[key[0]] === "number");
			} else {
				throw new InsightError("Invalid base case");
			}
		}
		return true;
	}

	private getDatasetAndKind() {
		this.datasetReady = true;
		this.dataset = JSON.parse(fs.readFileSync("data/" + this.id + ".json", "utf8"));
		if (this.dataset[0]["dept"] !== undefined) {
			this.kind = InsightDatasetKind.Courses;
		} else if (this.dataset[0]["fullname"] !== undefined) {
			this.kind = InsightDatasetKind.Rooms;
		} else {
			throw new InsightError("Invalid Dataset Kind");
		}
	}

	private checkValidKey(key: any): boolean {
		if (this.kind === InsightDatasetKind.Courses) {
			return QueryValidator.validCourseKeys.includes(key);
		} else {
			return QueryValidator.validRoomKeys.includes(key);
		}
	}

	private checkOPTIONS(option: any): boolean {
		let optionKeys = Object.keys(option);
		if (!(optionKeys.length === 1 || optionKeys.length === 2)) {
			throw new InsightError("Invalid Option key length");
		}
		let columnsPart: any;
		if (optionKeys.includes("COLUMNS")) {
			columnsPart = option.COLUMNS;
			if (columnsPart.length === 0) {
				throw new InsightError("Invalid column length");
			}
			for (const item of columnsPart) {
				if (item.split("_")[1] !== undefined) {
					if (!this.checkBaseCaseKeyAndField("SKIP", "", [item])) {
						throw new InsightError("Invalid key in column");
					}
				} else if (!QueryValidator.regexApplyKey.test(item) || this.query.TRANSFORMATIONS === undefined) {
					throw new InsightError("Invalid column part");
				}
			}
		} else {
			throw new InsightError("No COLUMNS part");
		}
		if (option.ORDER !== undefined) {
			let orderValid = QueryValidator.checkORDER(option.ORDER, columnsPart);
			if (!orderValid) {
				throw new InsightError("Invalid order part");
			}
		} else if (optionKeys.length === 2) {
			throw new InsightError("Invalid at line 219");
		}
		return true;
	}

	private static checkORDER(orderPart: any, columnsPart: any): boolean {
		let orderPartKeys = Object.keys(orderPart);
		if (orderPartKeys.length === 2 &&
				orderPartKeys.includes("dir") && orderPartKeys.includes("keys")) {
			let dir = orderPart["dir"];
			if (!QueryValidator.validDirections.includes(dir)) {
				throw new InsightError("Invalid dir");
			}
			let keys = orderPart["keys"];
			if (keys.length < 1) {
				throw new InsightError("Invalid at line 234");
			}
			for (let key of keys) {
				if (!columnsPart.includes(key)) {
					throw new InsightError("Invalid at line 238");
				}
			}
			return true;
		} else {
			return columnsPart.includes(orderPart);
		}
	}

	private checkTRANSFORMATIONS(queryTrans: any, columnsPart: any): boolean {
		let queryGroup = queryTrans.GROUP;
		let groupKeys = Object.keys(queryGroup);
		if (groupKeys.length < 1) {
			throw new InsightError("Invalid group keys");
		}
		for (let key of queryGroup) {
			if (!this.checkBaseCaseKeyAndField("SKIP", "", [key])) {
				throw new InsightError("Invalid key at line 255");
			}
		}
		let queryApply = queryTrans.APPLY;
		let applyKeys: any[] = [];
		if (queryApply.length !== 0) {
			for (let applyRule of queryApply) {
				let applyKey = Object.keys(applyRule);
				if (applyKey.length !== 1 || !QueryValidator.regexApplyKey.test(applyKey[0])) {
					throw new InsightError("Invalid apply key length");
				}
				if (applyKeys.includes(applyKey[0])) {
					throw new InsightError("Duplicated apply keys");
				} else {
					applyKeys.push(applyKey[0]);
				}
				let applyTokenAndKey = applyRule[applyKey[0]];
				let applyToken = Object.keys(applyTokenAndKey);
				if (applyToken.length !== 1 || !QueryValidator.validApplyToken.includes(applyToken[0])) {
					throw new InsightError("Invalid apply token 276");
				}
				let applyTokenField = applyTokenAndKey[applyToken[0]].split("_");
				if (!(this.checkBaseCaseKeyAndField("SKIP","", [applyTokenAndKey[applyToken[0]]]) &&
					(applyToken[0] === "COUNT" || (QueryValidator.validNumKeys.includes(applyTokenField[1]) &&
						["MAX", "MIN", "AVG", "SUM"].includes(applyToken[0]))))) {
					throw new InsightError("Invalid apply token and field");
				}
			}
		}
		for (let columnKey of columnsPart) {
			if (!queryGroup.includes(columnKey) && !applyKeys.includes(columnKey)) {
				throw new InsightError("Invalid apply key not in column");
			}
		}
		return true;
	}
}
