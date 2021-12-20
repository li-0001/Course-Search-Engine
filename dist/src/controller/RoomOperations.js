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
exports.addRoom = void 0;
const IInsightFacade_1 = require("./IInsightFacade");
const Room_1 = __importDefault(require("./Room"));
const jszip_1 = __importDefault(require("jszip"));
const parse5 = __importStar(require("parse5"));
const http = __importStar(require("http"));
const fs = __importStar(require("fs-extra"));
function addRoom(id, content, dataset) {
    return new Promise((resolve, reject) => {
        let jsZip = new jszip_1.default();
        jsZip.loadAsync(content, { base64: true }).then(function (zip) {
            addRoomHelper(id, dataset, zip).then((ids) => {
                resolve(ids);
            }).catch((error) => {
                reject(error);
            });
        }).catch((error) => {
            return reject(error);
        });
    });
}
exports.addRoom = addRoom;
function addRoomHelper(id, dataset, zip) {
    let fullnames = [], shortnames = [], numbers = [], names = [], addresses = [], lats = new Map(), lons = new Map(), seats = [], types = [], furnitures = [], hrefs = [], promises = [], gpromises = [];
    return new Promise((resolve, reject) => {
        try {
            let folder = zip.folder("rooms");
            if (folder != null) {
                let index = folder.file("index.htm");
                if (index != null) {
                    index.async("string").then((indexContent) => {
                        let indexDoc = parse5.parse(indexContent);
                        let indexBodyNode = reachBodyNode(indexDoc);
                        if (indexBodyNode != null) {
                            parseHTML(folder, indexBodyNode, fullnames, shortnames, numbers, names, addresses, lats, lons, seats, types, furnitures, hrefs, promises, gpromises);
                            saveRoom(id, dataset, fullnames, shortnames, numbers, names, addresses, lats, lons, seats, types, furnitures, hrefs, promises, gpromises)
                                .then((ids) => {
                                resolve(ids);
                            }).catch((error) => {
                                reject(error);
                            });
                        }
                    });
                }
                else {
                    reject(new IInsightFacade_1.InsightError("Rooms dataset does not contain index.htm"));
                }
            }
        }
        catch (error) {
            return reject(error);
        }
    });
}
function parseHTML(folder, indexBodyNode, fullnames, shortnames, numbers, names, addresses, lats, lons, seats, types, furnitures, hrefs, promises, gpromises) {
    getBuildingInfo(indexBodyNode, shortnames, fullnames, addresses);
    if (shortnames.length !== 0) {
        let subfolder = folder.folder("campus")?.folder("discover")?.folder("buildings-and-classrooms");
        if (subfolder != null) {
            for (let shortname of shortnames) {
                let file = subfolder.file(shortname);
                if (file != null) {
                    let p = file.async("string").then((fileContent) => {
                        let roomDoc = parse5.parse(fileContent);
                        let roomBodyNode = reachBodyNode(roomDoc);
                        if (roomBodyNode != null) {
                            getRoomInfo(roomBodyNode, shortname, numbers, names, seats, types, furnitures, hrefs);
                        }
                    });
                    promises.push(p);
                }
            }
        }
    }
    for (let address of addresses) {
        getGeolocation(address, lats, lons, gpromises);
    }
}
function getBuildingInfo(node, shortnames, fullnames, addresses) {
    if (node.childNodes === undefined || node.childNodes.length === 0) {
        return;
    }
    if (node.nodeName === "td") {
        if (node.attrs === undefined || node.attrs.length === 0) {
            return;
        }
        for (let attr of node.attrs) {
            addBuildingInfo(attr, node, shortnames, fullnames, addresses);
        }
    }
    for (let child of node.childNodes) {
        getBuildingInfo(child, shortnames, fullnames, addresses);
    }
}
function addBuildingInfo(attr, node, shortnames, fullnames, addresses) {
    if (attr.name === "class" && attr.value === "views-field views-field-field-building-code") {
        let shortname = node.childNodes[0].value.trim();
        shortnames.push(shortname);
    }
    else if (attr.name === "class" && attr.value === "views-field views-field-title") {
        for (let child of node.childNodes) {
            if (child.nodeName === "a") {
                let fullname = child.childNodes[0].value;
                fullnames.push(fullname);
            }
        }
    }
    else if (attr.name === "class" && attr.value === "views-field views-field-field-building-address") {
        let address = node.childNodes[0].value.trim();
        addresses.push(address);
    }
}
function getRoomInfo(node, shortname, numbers, names, seats, types, furnitures, hrefs) {
    if (node.childNodes === undefined || node.childNodes.length === 0) {
        return;
    }
    if (node.nodeName === "td") {
        if (node.attrs === undefined || node.attrs.length === 0) {
            return;
        }
        for (let attr of node.attrs) {
            addRoomInfo(attr, node, shortname, numbers, names, seats, types, furnitures, hrefs);
        }
    }
    for (let child of node.childNodes) {
        getRoomInfo(child, shortname, numbers, names, seats, types, furnitures, hrefs);
    }
}
function addRoomInfo(attr, node, shortname, numbers, names, seats, types, furnitures, hrefs) {
    if (attr.name === "class" && attr.value === "views-field views-field-field-room-number") {
        for (let child of node.childNodes) {
            if (child.nodeName === "a") {
                let number = child.childNodes[0].value;
                numbers.push(number);
                let name = shortname + "_" + number;
                names.push(name);
            }
        }
    }
    else if (attr.name === "class" && attr.value === "views-field views-field-field-room-capacity") {
        let seat = node.childNodes[0].value.trim();
        let seatNum = 0;
        if (seat.length !== 0) {
            seatNum = parseInt(seat, 10);
        }
        seats.push(seatNum);
    }
    else if (attr.name === "class" && attr.value === "views-field views-field-field-room-furniture") {
        let furniture = node.childNodes[0].value.trim();
        furnitures.push(furniture);
    }
    else if (attr.name === "class" && attr.value === "views-field views-field-field-room-type") {
        let type = node.childNodes[0].value.trim();
        types.push(type);
    }
    else if (attr.name === "class" && attr.value === "views-field views-field-nothing") {
        let anchorAttrs = null;
        for (let child of node.childNodes) {
            if (child.nodeName === "a") {
                anchorAttrs = child.attrs;
                if (anchorAttrs === undefined || anchorAttrs.length === 0) {
                    return;
                }
            }
        }
        for (let anchorAttr of anchorAttrs) {
            if (anchorAttr.name === "href") {
                let href = anchorAttr.value;
                hrefs.push(href);
            }
        }
    }
}
function getGeolocation(address, lats, lons, gpromises) {
    let addressEncoding = encodeURIComponent(address);
    let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team83/" + addressEncoding;
    let p = new Promise((resolve, reject) => {
        let q = http.get(url, (res) => {
            let rawData = "";
            res.on("data", (chunk) => {
                rawData += chunk;
            });
            res.on("end", () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    lats.set(address, parsedData.lat);
                    lons.set(address, parsedData.lon);
                    resolve(q);
                }
                catch (e) {
                    console.error(e.message);
                    reject(e);
                }
            });
        });
    });
    gpromises.push(p);
}
function saveRoom(id, dataset, fullnames, shortnames, numbers, names, addresses, lats, lons, seats, types, furnitures, hrefs, promises, gpromises) {
    let rooms = [];
    return new Promise((resolve, reject) => {
        Promise.all(promises).then(() => {
            Promise.all(gpromises).then(() => {
                for (let b = 0; b < shortnames.length; b++) {
                    for (let r = 0; r < names.length; r++) {
                        let name = names[r].split("_")[0];
                        if (shortnames[b] === name) {
                            let room = new Room_1.default(fullnames[b], shortnames[b], numbers[r], names[r], addresses[b], lats.get(addresses[b]), lons.get(addresses[b]), seats[r], types[r], furnitures[r], hrefs[r]);
                            if (!rooms.includes(room)) {
                                rooms.push(room);
                            }
                        }
                    }
                }
                if (rooms.length < 1) {
                    return reject(new IInsightFacade_1.InsightError("Rooms dataset does not contain any valid rooms"));
                }
                dataset.set(id, rooms);
                if (!fs.existsSync("data")) {
                    fs.mkdirSync("data");
                }
                fs.writeFileSync("data/" + id + ".json", JSON.stringify(rooms));
                return resolve(Array.from(dataset.keys()));
            }).catch((error) => {
                return reject(error);
            });
        }).catch((error) => {
            return reject(error);
        });
    });
}
function reachBodyNode(doc) {
    let htmlNode = null;
    for (let child of doc.childNodes) {
        if (child.nodeName === "html") {
            htmlNode = child;
        }
    }
    let bodyNode = null;
    if (htmlNode != null) {
        for (let child of htmlNode.childNodes) {
            if (child.nodeName === "body") {
                bodyNode = child;
            }
        }
    }
    return bodyNode;
}
//# sourceMappingURL=RoomOperations.js.map