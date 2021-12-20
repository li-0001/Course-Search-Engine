import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import QueryValidator from "./QueryValidator";
import Decimal from "decimal.js";

export default class QueryPart {
	private allUnits: any[] = [];

	private id: string = "";

	private result: any[] = [];

	public static readonly logicComparators: string[] = ["AND" , "OR"];

	public static readonly numComparators: string[] = ["LT", "GT", "EQ"];

	public static readonly stringComparator: string = "IS";

	public static readonly negation: string = "NOT";

	public static readonly allComparators: string[] = ["AND" , "OR", "LT", "GT", "EQ", "IS", "NOT"];

	public doQuery(query: any, datasets: any): any[] {
		let queryValidator: QueryValidator = new QueryValidator(query, datasets);
		if (queryValidator.isQueryValid()) {
			this.id = queryValidator.id;
			this.allUnits = queryValidator.dataset;
			this.result = this.doWHERE(query["WHERE"]);
			if (this.result.length > 0) {
				if (query["TRANSFORMATIONS"] !== undefined) {
					this.result = this.doTRANSFORMATIONS(query["TRANSFORMATIONS"]);
				}
				if (this.result.length > 5000) {
					throw new ResultTooLargeError();
				}
				this.result = this.doOPTIONS(query["OPTIONS"]);
				return this.result;
			} else {
				return [];
			}
		} else {
			throw new InsightError("Invalid query");
		}
	}

	private doWHERE(queryWHERE: any): any[] {
		let tempResult: any[] = [];
		for (const unit of this.allUnits) {
			if (this.unitFilter(queryWHERE, unit)) {
				tempResult.push(unit);
			}
		}
		return tempResult;
	}

	private unitFilter(queryWHERE: any, unit: any): boolean {
		let keepUnit: boolean = true;
		let keyWHERE = Object.keys(queryWHERE);
		if (QueryPart.numComparators.includes((keyWHERE[0]))) {
			return keepUnit && QueryPart.queryNumLogic(queryWHERE, unit);
		} else if (QueryPart.stringComparator.includes((keyWHERE[0]))) {
			return keepUnit && QueryPart.queryStringLogic(queryWHERE, unit);
		} else if (QueryPart.negation === keyWHERE[0]) {
			return !(keepUnit && this.unitFilter(queryWHERE[keyWHERE[0]], unit));
		} else if (QueryPart.logicComparators.includes(keyWHERE[0])) {
			return keepUnit && this.queryLogicCompLogic(queryWHERE, unit);
		} else if (keyWHERE.length === 0) {
			return true;
		} else {
			throw new InsightError("Unexpected unitFilter");
		}
	}

	private static queryNumLogic(whereQuery: any, unit: any): boolean {
		let queryNumComparatorKeys = Object.keys(whereQuery);
		if (queryNumComparatorKeys[0] === "LT") {
			let numQuery = whereQuery["LT"];
			let key = Object.keys(numQuery);
			return unit[key[0].split("_")[1]] < numQuery[key[0]];
		} else if (queryNumComparatorKeys[0] === "GT") {
			let numQuery = whereQuery["GT"];
			let key = Object.keys(numQuery);
			return unit[key[0].split("_")[1]] > numQuery[key[0]];
		} else if (queryNumComparatorKeys[0] === "EQ") {
			let numQuery = whereQuery["EQ"];
			let key = Object.keys(numQuery);
			return unit[key[0].split("_")[1]] === numQuery[key[0]];
		} else {
			throw new InsightError("Invalid num comparator at queryNumLogic");
		}
	}

	private static queryStringLogic(whereQuery: any, unit: any): boolean {
		let regexInBetween = new RegExp("^.+(\\*).+$");
		let queryStrComparatorKey = Object.keys(whereQuery);
		if (queryStrComparatorKey[0] === "IS") {
			let strQuery = whereQuery["IS"];
			let key = Object.keys(strQuery);
			if (!strQuery[key[0]].includes("*")) {
				return unit[key[0].split("_")[1]] === strQuery[key[0]];
			} else if (regexInBetween.test(strQuery[key[0]]) || strQuery[key[0]].split("").filter((char: string) =>
				char === "*").length > 2) {
				throw new InsightError("Invalid Wildcard at queryStringLogic");
			} else if (strQuery[key[0]] === "*" || strQuery[key[0]] === "**") {
				return true;
			} else {
				return QueryPart.handleValidWildcard(unit[key[0].split("_")[1]], strQuery[key[0]]);
			}
		} else {
			throw new InsightError("Invalid String Comparator at queryStringLogic");
		}
	}

	private queryLogicCompLogic(whereQuery: any, unit: any) {
		let keep: boolean = true;
		let queryLogicComparatorKeys = Object.keys(whereQuery);
		let logicQuery = whereQuery[queryLogicComparatorKeys[0]];
		let partOfLogicQueryKeys = Object.keys(logicQuery);
		if (queryLogicComparatorKeys[0] === "OR") {
			keep = false;
			for (let subKey in partOfLogicQueryKeys) {
				keep = keep || this.unitFilter(logicQuery[subKey], unit);
			}
		} else if (queryLogicComparatorKeys[0] === "AND") {
			keep = true;
			for (let subKey in partOfLogicQueryKeys) {
				keep = keep && this.unitFilter(logicQuery[subKey], unit);
			}
		}
		return keep;
	}

	private static handleValidWildcard(unitPart: any, queryPart: any): boolean {
		let regexTwoEnds = new RegExp("^(\\*)\\w+(\\*)$");
		let regexFront = new RegExp("^(\\*)\\w+$");
		let regexBack = new RegExp("^\\w+(\\*)$");
		let modifiedQueryPart, modifiedUnitPart: string;
		if (regexTwoEnds.test(queryPart)) {
			modifiedQueryPart = queryPart.substring(1, queryPart.length - 1);
			return unitPart.includes(modifiedQueryPart);
		} else if (regexFront.test(queryPart)) {
			modifiedQueryPart = queryPart.substring(1, queryPart.length);
			modifiedUnitPart = unitPart.substr(-(queryPart.length - 1));
			return modifiedQueryPart === modifiedUnitPart;
		} else if (regexBack.test(queryPart)) {
			let strLen = queryPart.length;
			modifiedQueryPart = queryPart.substring(0, strLen - 1);
			modifiedUnitPart = unitPart.substring(0, strLen - 1);
			return modifiedQueryPart === modifiedUnitPart;
		}
		return false;
	}

	private doOPTIONS(optionQuery: any): any[] {
		let tempResult: any[];
		tempResult = this.doCOLUMNS(optionQuery["COLUMNS"]);
		if (optionQuery["ORDER"] !== undefined) {
			tempResult = this.doORDER(optionQuery["ORDER"]);
		}
		return tempResult;
	}

	// Reference: https://stackoverflow.com/questions/57350092/string-cant-be-used-to-index-type
	// https://www.digitalocean.com/community/tutorials/4-uses-of-javascripts-arraymap-you-should-know
	private doCOLUMNS(columnsQuery: any): any[] {
		let tempResult: any[] = [];
		let fieldToKeep: string[] = columnsQuery;
		this.result.map((unit) => {
			let filteredUnit: {[index: string]: any} = {};
			fieldToKeep.map((field) => {
				let modifiedField: string;
				if (field.includes("_")) {
					modifiedField = field.split("_")[1];
				} else {
					modifiedField = field;
				}
				filteredUnit[field] = unit[modifiedField];
			});
			tempResult.push(filteredUnit);
		});
		this.result = tempResult;
		return this.result;
	}

	private doORDER(orderQuery: any): any[] {
		if (orderQuery["dir"] === undefined) {
			this.result.sort((a,b) => (a[orderQuery] < b[orderQuery]) ? -1 : 1);
		} else {
			let dir = orderQuery["dir"];
			let keys = orderQuery["keys"].reverse();
			for (let key of keys) {
				if (dir === "UP") {
					this.result.sort((a,b) => (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0);
				} else if (dir === "DOWN") {
					this.result.sort((a,b) => (a[key] > b[key]) ? -1 : (a[key] < b[key]) ? 1 : 0);
				}
			}
		}
		return this.result;
	}

	private doTRANSFORMATIONS(transformationsQuery: any): any[] {
		let groupKeys = [];
		for (let groupKey of transformationsQuery["GROUP"]) {
			groupKeys.push(groupKey.split("_")[1]);
		}
		let groupedResult = this.doGROUP(groupKeys);
		let tempResult = [];
		for (const unit of QueryPart.doAPPLY(transformationsQuery["APPLY"], groupedResult).values()) {
			tempResult.push(unit[0]);
		}
		this.result = tempResult;
		return this.result;
	}

	// Reference: https://stackoverflow.com/questions/14446511/
	// most-efficient-method-to-groupby-on-an-array-of-objects?page=1&tab=votes#tab-top
	private doGROUP(groupKeys: any): Map<any, any[]> {
		let allGroups = new Map();
		for (const unit of this.result) {
			let groupKeyFields = [];
			for (let groupKey of groupKeys) {
				groupKeyFields.push(unit[groupKey]);
			}
			if (allGroups.has((groupKeyFields).toString())) {
				allGroups.get((groupKeyFields).toString()).push(unit);
			} else {
				allGroups.set((groupKeyFields).toString(), [unit]);
			}
		}
		return allGroups;
	}

	private static doAPPLY(queryApply: any, allGroups: Map<any, any[]>): Map<any, any[]> {
		for (const units of allGroups.values()) {
			for (const applyRule of queryApply) {
				let applyResult: any;
				let applySum: any;
				let applyKey = Object.keys(applyRule)[0];
				let applyTokenAndField = applyRule[applyKey];
				let applyToken = Object.keys(applyTokenAndField)[0];
				let applyField = applyTokenAndField[applyToken].split("_")[1];
				for (const unit of units) {
					if (applyToken === "MAX" || applyToken === "MIN") {
						if (applyResult === undefined) {
							applyResult = unit[applyField];
						} else if (applyToken === "MAX" && unit[applyField] > applyResult) {
							applyResult = unit[applyField];
						} else if (applyToken === "MIN" && unit[applyField] < applyResult) {
							applyResult = unit[applyField];
						}
					} else if (applyToken === "COUNT") {
						if (applyResult === undefined) {
							applyResult = [];
						}
						if (!applyResult.includes(unit[applyField])) {
							applyResult.push(unit[applyField]);
						}
					} else if (applyToken === "SUM" || applyToken === "AVG") {
						if (applySum === undefined) {
							applySum = new Decimal(unit[applyField]);
						} else {
							applySum = applySum.add(new Decimal(unit[applyField]));
						}
						if (applyToken === "SUM") {
							applyResult = Number(applySum.toFixed(2));
						}
					}
				}
				if (applyToken === "AVG") {
					applyResult = Number((applySum / units.length).toFixed(2));
				} else if (applyToken === "COUNT") {
					applyResult = applyResult.length;
				}
				for (const unit of units) {
					unit[applyKey] = applyResult;
				}
			}
		}
		return allGroups;
	}
}
