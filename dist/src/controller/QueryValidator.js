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
const QueryPart_1 = __importDefault(require("./QueryPart"));
const fs = __importStar(require("fs-extra"));
const IInsightFacade_1 = require("./IInsightFacade");
class QueryValidator {
    constructor(query, datasets) {
        this.id = "";
        this.datasetReady = false;
        this.query = query;
        this.dataset = datasets;
    }
    isQueryValid() {
        if (this.query === null || !this.checkQueryComponent()) {
            throw new IInsightFacade_1.InsightError("Query is NULL or Invalid Component");
        }
        let whereValid = this.checkWHERE(this.query.WHERE);
        if (!whereValid) {
            throw new IInsightFacade_1.InsightError("Invalid Where Component");
        }
        let optionValid = this.checkOPTIONS(this.query.OPTIONS);
        if (!optionValid) {
            throw new IInsightFacade_1.InsightError("Invalid Option Component");
        }
        return Object.keys(this.query).includes("TRANSFORMATIONS") ?
            this.checkTRANSFORMATIONS(this.query.TRANSFORMATIONS, this.query.OPTIONS.COLUMNS) : true;
    }
    checkQueryComponent() {
        let allKeys = Object.keys(this.query);
        let numComponents = allKeys.length;
        if (this.query.WHERE === undefined) {
            throw new IInsightFacade_1.InsightError("Where undefined");
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
                throw new IInsightFacade_1.InsightError("Invalid Number of Components");
        }
    }
    checkOPTIONSComponent() {
        let allKeysInOPTION = Object.keys(this.query.OPTIONS);
        return (allKeysInOPTION.length === 1 && allKeysInOPTION[0] === "COLUMNS") ||
            (allKeysInOPTION.length === 2 && allKeysInOPTION.includes("ORDER") && allKeysInOPTION.includes("COLUMNS"));
    }
    checkTRANSFORMATIONSComponent() {
        let allKeysInTRANSFORMATIONS = Object.keys(this.query.TRANSFORMATIONS);
        return (allKeysInTRANSFORMATIONS.length === 2 &&
            allKeysInTRANSFORMATIONS.includes("GROUP") && allKeysInTRANSFORMATIONS.includes("APPLY"));
    }
    checkWHERE(where) {
        if (!(where instanceof Object) || where instanceof Array) {
            throw new IInsightFacade_1.InsightError("Where is Not An Object");
        }
        let levelOne = Object.keys(where);
        if (levelOne.length === 0) {
            return true;
        }
        if (levelOne.length !== 1 || !QueryPart_1.default.allComparators.includes(levelOne[0])) {
            throw new IInsightFacade_1.InsightError("Invalid comparators in Where");
        }
        let innerQuery = where[levelOne[0]];
        let innerKeys = Object.keys(innerQuery);
        if (QueryPart_1.default.stringComparator.includes(levelOne[0]) ||
            QueryPart_1.default.numComparators.includes(levelOne[0])) {
            return this.checkBaseCaseKeyAndField(levelOne[0], innerQuery, innerKeys);
        }
        else if (QueryPart_1.default.negation.includes(levelOne[0])) {
            if ((!QueryPart_1.default.allComparators.includes(innerKeys[0])) || innerKeys.length !== 1) {
                throw new IInsightFacade_1.InsightError("Invalid inner negation part");
            }
            return this.checkWHERE(innerQuery);
        }
        else if (QueryPart_1.default.logicComparators.includes(levelOne[0])) {
            if (innerKeys.length < 1) {
                throw new IInsightFacade_1.InsightError("Invalid Logic Component");
            }
            let isInnerValid = true;
            for (let key in innerKeys) {
                isInnerValid = isInnerValid && this.checkWHERE(innerQuery[key]) &&
                    (Object.keys(innerQuery[key]).length !== 0);
                if (!isInnerValid) {
                    throw new IInsightFacade_1.InsightError("Invalid inner logic component");
                }
            }
            return isInnerValid;
        }
        return false;
    }
    checkBaseCaseKeyAndField(outKey, query, key) {
        let datasetName = key[0].split("_")[0];
        let keyName = key[0].split("_")[1];
        if (!this.datasetReady) {
            this.id = datasetName;
            this.getDatasetAndKind();
        }
        if (!((QueryValidator.regexID.test(datasetName)) && this.checkValidKey(keyName) && this.id === datasetName)) {
            throw new IInsightFacade_1.InsightError("Invalid base case keyName");
        }
        if (outKey !== "SKIP") {
            if (key.length !== 1) {
                throw new IInsightFacade_1.InsightError("Invalid base case length");
            }
            if (QueryValidator.validStrKeys.includes(keyName) && QueryPart_1.default.stringComparator.includes(outKey)) {
                return (typeof query[key[0]] === "string");
            }
            else if (QueryValidator.validNumKeys.includes(keyName) && QueryPart_1.default.numComparators.includes(outKey)) {
                return (typeof query[key[0]] === "number");
            }
            else {
                throw new IInsightFacade_1.InsightError("Invalid base case");
            }
        }
        return true;
    }
    getDatasetAndKind() {
        this.datasetReady = true;
        this.dataset = JSON.parse(fs.readFileSync("data/" + this.id + ".json", "utf8"));
        if (this.dataset[0]["dept"] !== undefined) {
            this.kind = IInsightFacade_1.InsightDatasetKind.Courses;
        }
        else if (this.dataset[0]["fullname"] !== undefined) {
            this.kind = IInsightFacade_1.InsightDatasetKind.Rooms;
        }
        else {
            throw new IInsightFacade_1.InsightError("Invalid Dataset Kind");
        }
    }
    checkValidKey(key) {
        if (this.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            return QueryValidator.validCourseKeys.includes(key);
        }
        else {
            return QueryValidator.validRoomKeys.includes(key);
        }
    }
    checkOPTIONS(option) {
        let optionKeys = Object.keys(option);
        if (!(optionKeys.length === 1 || optionKeys.length === 2)) {
            throw new IInsightFacade_1.InsightError("Invalid Option key length");
        }
        let columnsPart;
        if (optionKeys.includes("COLUMNS")) {
            columnsPart = option.COLUMNS;
            if (columnsPart.length === 0) {
                throw new IInsightFacade_1.InsightError("Invalid column length");
            }
            for (const item of columnsPart) {
                if (item.split("_")[1] !== undefined) {
                    if (!this.checkBaseCaseKeyAndField("SKIP", "", [item])) {
                        throw new IInsightFacade_1.InsightError("Invalid key in column");
                    }
                }
                else if (!QueryValidator.regexApplyKey.test(item) || this.query.TRANSFORMATIONS === undefined) {
                    throw new IInsightFacade_1.InsightError("Invalid column part");
                }
            }
        }
        else {
            throw new IInsightFacade_1.InsightError("No COLUMNS part");
        }
        if (option.ORDER !== undefined) {
            let orderValid = QueryValidator.checkORDER(option.ORDER, columnsPart);
            if (!orderValid) {
                throw new IInsightFacade_1.InsightError("Invalid order part");
            }
        }
        else if (optionKeys.length === 2) {
            throw new IInsightFacade_1.InsightError("Invalid at line 219");
        }
        return true;
    }
    static checkORDER(orderPart, columnsPart) {
        let orderPartKeys = Object.keys(orderPart);
        if (orderPartKeys.length === 2 &&
            orderPartKeys.includes("dir") && orderPartKeys.includes("keys")) {
            let dir = orderPart["dir"];
            if (!QueryValidator.validDirections.includes(dir)) {
                throw new IInsightFacade_1.InsightError("Invalid dir");
            }
            let keys = orderPart["keys"];
            if (keys.length < 1) {
                throw new IInsightFacade_1.InsightError("Invalid at line 234");
            }
            for (let key of keys) {
                if (!columnsPart.includes(key)) {
                    throw new IInsightFacade_1.InsightError("Invalid at line 238");
                }
            }
            return true;
        }
        else {
            return columnsPart.includes(orderPart);
        }
    }
    checkTRANSFORMATIONS(queryTrans, columnsPart) {
        let queryGroup = queryTrans.GROUP;
        let groupKeys = Object.keys(queryGroup);
        if (groupKeys.length < 1) {
            throw new IInsightFacade_1.InsightError("Invalid group keys");
        }
        for (let key of queryGroup) {
            if (!this.checkBaseCaseKeyAndField("SKIP", "", [key])) {
                throw new IInsightFacade_1.InsightError("Invalid key at line 255");
            }
        }
        let queryApply = queryTrans.APPLY;
        let applyKeys = [];
        if (queryApply.length !== 0) {
            for (let applyRule of queryApply) {
                let applyKey = Object.keys(applyRule);
                if (applyKey.length !== 1 || !QueryValidator.regexApplyKey.test(applyKey[0])) {
                    throw new IInsightFacade_1.InsightError("Invalid apply key length");
                }
                if (applyKeys.includes(applyKey[0])) {
                    throw new IInsightFacade_1.InsightError("Duplicated apply keys");
                }
                else {
                    applyKeys.push(applyKey[0]);
                }
                let applyTokenAndKey = applyRule[applyKey[0]];
                let applyToken = Object.keys(applyTokenAndKey);
                if (applyToken.length !== 1 || !QueryValidator.validApplyToken.includes(applyToken[0])) {
                    throw new IInsightFacade_1.InsightError("Invalid apply token 276");
                }
                let applyTokenField = applyTokenAndKey[applyToken[0]].split("_");
                if (!(this.checkBaseCaseKeyAndField("SKIP", "", [applyTokenAndKey[applyToken[0]]]) &&
                    (applyToken[0] === "COUNT" || (QueryValidator.validNumKeys.includes(applyTokenField[1]) &&
                        ["MAX", "MIN", "AVG", "SUM"].includes(applyToken[0]))))) {
                    throw new IInsightFacade_1.InsightError("Invalid apply token and field");
                }
            }
        }
        for (let columnKey of columnsPart) {
            if (!queryGroup.includes(columnKey) && !applyKeys.includes(columnKey)) {
                throw new IInsightFacade_1.InsightError("Invalid apply key not in column");
            }
        }
        return true;
    }
}
exports.default = QueryValidator;
QueryValidator.regexID = new RegExp("^[^_]+$");
QueryValidator.regexApplyKey = new RegExp("^[^_]+$");
QueryValidator.validNumKeys = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
QueryValidator.validStrKeys = ["dept", "id", "instructor", "title", "uuid",
    "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
QueryValidator.validCourseKeys = ["avg", "pass", "fail", "audit", "year",
    "dept", "id", "instructor", "title", "uuid"];
QueryValidator.validRoomKeys = ["lat", "lon", "seats", "fullname", "shortname", "number", "name",
    "address", "type", "furniture", "href"];
QueryValidator.validDirections = ["UP", "DOWN"];
QueryValidator.validApplyToken = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
//# sourceMappingURL=QueryValidator.js.map