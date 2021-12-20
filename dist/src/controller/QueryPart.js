"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const QueryValidator_1 = __importDefault(require("./QueryValidator"));
const decimal_js_1 = __importDefault(require("decimal.js"));
class QueryPart {
    constructor() {
        this.allUnits = [];
        this.id = "";
        this.result = [];
    }
    doQuery(query, datasets) {
        let queryValidator = new QueryValidator_1.default(query, datasets);
        if (queryValidator.isQueryValid()) {
            this.id = queryValidator.id;
            this.allUnits = queryValidator.dataset;
            this.result = this.doWHERE(query["WHERE"]);
            if (this.result.length > 0) {
                if (query["TRANSFORMATIONS"] !== undefined) {
                    this.result = this.doTRANSFORMATIONS(query["TRANSFORMATIONS"]);
                }
                if (this.result.length > 5000) {
                    throw new IInsightFacade_1.ResultTooLargeError();
                }
                this.result = this.doOPTIONS(query["OPTIONS"]);
                return this.result;
            }
            else {
                return [];
            }
        }
        else {
            throw new IInsightFacade_1.InsightError("Invalid query");
        }
    }
    doWHERE(queryWHERE) {
        let tempResult = [];
        for (const unit of this.allUnits) {
            if (this.unitFilter(queryWHERE, unit)) {
                tempResult.push(unit);
            }
        }
        return tempResult;
    }
    unitFilter(queryWHERE, unit) {
        let keepUnit = true;
        let keyWHERE = Object.keys(queryWHERE);
        if (QueryPart.numComparators.includes((keyWHERE[0]))) {
            return keepUnit && QueryPart.queryNumLogic(queryWHERE, unit);
        }
        else if (QueryPart.stringComparator.includes((keyWHERE[0]))) {
            return keepUnit && QueryPart.queryStringLogic(queryWHERE, unit);
        }
        else if (QueryPart.negation === keyWHERE[0]) {
            return !(keepUnit && this.unitFilter(queryWHERE[keyWHERE[0]], unit));
        }
        else if (QueryPart.logicComparators.includes(keyWHERE[0])) {
            return keepUnit && this.queryLogicCompLogic(queryWHERE, unit);
        }
        else if (keyWHERE.length === 0) {
            return true;
        }
        else {
            throw new IInsightFacade_1.InsightError("Unexpected unitFilter");
        }
    }
    static queryNumLogic(whereQuery, unit) {
        let queryNumComparatorKeys = Object.keys(whereQuery);
        if (queryNumComparatorKeys[0] === "LT") {
            let numQuery = whereQuery["LT"];
            let key = Object.keys(numQuery);
            return unit[key[0].split("_")[1]] < numQuery[key[0]];
        }
        else if (queryNumComparatorKeys[0] === "GT") {
            let numQuery = whereQuery["GT"];
            let key = Object.keys(numQuery);
            return unit[key[0].split("_")[1]] > numQuery[key[0]];
        }
        else if (queryNumComparatorKeys[0] === "EQ") {
            let numQuery = whereQuery["EQ"];
            let key = Object.keys(numQuery);
            return unit[key[0].split("_")[1]] === numQuery[key[0]];
        }
        else {
            throw new IInsightFacade_1.InsightError("Invalid num comparator at queryNumLogic");
        }
    }
    static queryStringLogic(whereQuery, unit) {
        let regexInBetween = new RegExp("^.+(\\*).+$");
        let queryStrComparatorKey = Object.keys(whereQuery);
        if (queryStrComparatorKey[0] === "IS") {
            let strQuery = whereQuery["IS"];
            let key = Object.keys(strQuery);
            if (!strQuery[key[0]].includes("*")) {
                return unit[key[0].split("_")[1]] === strQuery[key[0]];
            }
            else if (regexInBetween.test(strQuery[key[0]]) || strQuery[key[0]].split("").filter((char) => char === "*").length > 2) {
                throw new IInsightFacade_1.InsightError("Invalid Wildcard at queryStringLogic");
            }
            else if (strQuery[key[0]] === "*" || strQuery[key[0]] === "**") {
                return true;
            }
            else {
                return QueryPart.handleValidWildcard(unit[key[0].split("_")[1]], strQuery[key[0]]);
            }
        }
        else {
            throw new IInsightFacade_1.InsightError("Invalid String Comparator at queryStringLogic");
        }
    }
    queryLogicCompLogic(whereQuery, unit) {
        let keep = true;
        let queryLogicComparatorKeys = Object.keys(whereQuery);
        let logicQuery = whereQuery[queryLogicComparatorKeys[0]];
        let partOfLogicQueryKeys = Object.keys(logicQuery);
        if (queryLogicComparatorKeys[0] === "OR") {
            keep = false;
            for (let subKey in partOfLogicQueryKeys) {
                keep = keep || this.unitFilter(logicQuery[subKey], unit);
            }
        }
        else if (queryLogicComparatorKeys[0] === "AND") {
            keep = true;
            for (let subKey in partOfLogicQueryKeys) {
                keep = keep && this.unitFilter(logicQuery[subKey], unit);
            }
        }
        return keep;
    }
    static handleValidWildcard(unitPart, queryPart) {
        let regexTwoEnds = new RegExp("^(\\*)\\w+(\\*)$");
        let regexFront = new RegExp("^(\\*)\\w+$");
        let regexBack = new RegExp("^\\w+(\\*)$");
        let modifiedQueryPart, modifiedUnitPart;
        if (regexTwoEnds.test(queryPart)) {
            modifiedQueryPart = queryPart.substring(1, queryPart.length - 1);
            return unitPart.includes(modifiedQueryPart);
        }
        else if (regexFront.test(queryPart)) {
            modifiedQueryPart = queryPart.substring(1, queryPart.length);
            modifiedUnitPart = unitPart.substr(-(queryPart.length - 1));
            return modifiedQueryPart === modifiedUnitPart;
        }
        else if (regexBack.test(queryPart)) {
            let strLen = queryPart.length;
            modifiedQueryPart = queryPart.substring(0, strLen - 1);
            modifiedUnitPart = unitPart.substring(0, strLen - 1);
            return modifiedQueryPart === modifiedUnitPart;
        }
        return false;
    }
    doOPTIONS(optionQuery) {
        let tempResult;
        tempResult = this.doCOLUMNS(optionQuery["COLUMNS"]);
        if (optionQuery["ORDER"] !== undefined) {
            tempResult = this.doORDER(optionQuery["ORDER"]);
        }
        return tempResult;
    }
    doCOLUMNS(columnsQuery) {
        let tempResult = [];
        let fieldToKeep = columnsQuery;
        this.result.map((unit) => {
            let filteredUnit = {};
            fieldToKeep.map((field) => {
                let modifiedField;
                if (field.includes("_")) {
                    modifiedField = field.split("_")[1];
                }
                else {
                    modifiedField = field;
                }
                filteredUnit[field] = unit[modifiedField];
            });
            tempResult.push(filteredUnit);
        });
        this.result = tempResult;
        return this.result;
    }
    doORDER(orderQuery) {
        if (orderQuery["dir"] === undefined) {
            this.result.sort((a, b) => (a[orderQuery] < b[orderQuery]) ? -1 : 1);
        }
        else {
            let dir = orderQuery["dir"];
            let keys = orderQuery["keys"].reverse();
            for (let key of keys) {
                if (dir === "UP") {
                    this.result.sort((a, b) => (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0);
                }
                else if (dir === "DOWN") {
                    this.result.sort((a, b) => (a[key] > b[key]) ? -1 : (a[key] < b[key]) ? 1 : 0);
                }
            }
        }
        return this.result;
    }
    doTRANSFORMATIONS(transformationsQuery) {
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
    doGROUP(groupKeys) {
        let allGroups = new Map();
        for (const unit of this.result) {
            let groupKeyFields = [];
            for (let groupKey of groupKeys) {
                groupKeyFields.push(unit[groupKey]);
            }
            if (allGroups.has((groupKeyFields).toString())) {
                allGroups.get((groupKeyFields).toString()).push(unit);
            }
            else {
                allGroups.set((groupKeyFields).toString(), [unit]);
            }
        }
        return allGroups;
    }
    static doAPPLY(queryApply, allGroups) {
        for (const units of allGroups.values()) {
            for (const applyRule of queryApply) {
                let applyResult;
                let applySum;
                let applyKey = Object.keys(applyRule)[0];
                let applyTokenAndField = applyRule[applyKey];
                let applyToken = Object.keys(applyTokenAndField)[0];
                let applyField = applyTokenAndField[applyToken].split("_")[1];
                for (const unit of units) {
                    if (applyToken === "MAX" || applyToken === "MIN") {
                        if (applyResult === undefined) {
                            applyResult = unit[applyField];
                        }
                        else if (applyToken === "MAX" && unit[applyField] > applyResult) {
                            applyResult = unit[applyField];
                        }
                        else if (applyToken === "MIN" && unit[applyField] < applyResult) {
                            applyResult = unit[applyField];
                        }
                    }
                    else if (applyToken === "COUNT") {
                        if (applyResult === undefined) {
                            applyResult = [];
                        }
                        if (!applyResult.includes(unit[applyField])) {
                            applyResult.push(unit[applyField]);
                        }
                    }
                    else if (applyToken === "SUM" || applyToken === "AVG") {
                        if (applySum === undefined) {
                            applySum = new decimal_js_1.default(unit[applyField]);
                        }
                        else {
                            applySum = applySum.add(new decimal_js_1.default(unit[applyField]));
                        }
                        if (applyToken === "SUM") {
                            applyResult = Number(applySum.toFixed(2));
                        }
                    }
                }
                if (applyToken === "AVG") {
                    applyResult = Number((applySum / units.length).toFixed(2));
                }
                else if (applyToken === "COUNT") {
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
exports.default = QueryPart;
QueryPart.logicComparators = ["AND", "OR"];
QueryPart.numComparators = ["LT", "GT", "EQ"];
QueryPart.stringComparator = "IS";
QueryPart.negation = "NOT";
QueryPart.allComparators = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
//# sourceMappingURL=QueryPart.js.map