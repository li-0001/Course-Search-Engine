import {InsightError} from "./IInsightFacade";
import Room from "./Room";
import JSZip from "jszip";
import * as parse5 from "parse5";
import * as http from "http";
import * as fs from "fs-extra";

function addRoom(id: string, content: string, dataset: Map<string, any>): Promise<string[]> {
	return new Promise((resolve, reject) => {
		let jsZip = new JSZip();
		jsZip.loadAsync(content, {base64: true}).then(function (zip) {
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

function addRoomHelper(id: string, dataset: Map<string, any>, zip: JSZip): Promise<string[]> {
	let fullnames: string[] = [], shortnames: string[] = [], numbers: string[] = [], names: string[] = [],
		addresses: string[] = [], lats: Map<string, number> = new Map(), lons: Map<string, number> = new Map(),
		seats: number[] = [], types: string[] = [], furnitures: string[] = [], hrefs: string[] = [],
		promises: any[] = [], gpromises: any[] = [];
	return new Promise((resolve, reject) => {
		try {
			// go to rooms folder
			let folder = zip.folder("rooms");
			if (folder != null) {
				let index = folder.file("index.htm");
				if (index != null) {
					index.async("string").then((indexContent) => {
						let indexDoc = parse5.parse(indexContent);
						let indexBodyNode = reachBodyNode(indexDoc);
						if (indexBodyNode != null) {
							parseHTML(folder!, indexBodyNode, fullnames, shortnames, numbers, names, addresses,
								lats, lons, seats, types, furnitures, hrefs, promises, gpromises);
							saveRoom(id, dataset, fullnames, shortnames, numbers, names, addresses,
								lats, lons, seats, types, furnitures, hrefs, promises, gpromises)
								.then((ids) => {
									resolve(ids);
								}).catch((error) => {
									reject(error);
								});
						}
					});
				} else {
					reject(new InsightError("Rooms dataset does not contain index.htm"));
				}
			}
		} catch (error) {
			return reject(error);
		}
	});
}

function parseHTML(folder: JSZip, indexBodyNode: any, fullnames: string[], shortnames: string[], numbers: string[],
	names: string[], addresses: string[], lats: Map<string, number>, lons: Map<string, number>, seats: number[],
	types: string[], furnitures: string[], hrefs: string[], promises: any[], gpromises: any[]) {
	getBuildingInfo(indexBodyNode, shortnames, fullnames, addresses);
	if (shortnames.length !== 0) {
		let subfolder = folder!.folder("campus")?.folder("discover")?.folder("buildings-and-classrooms");
		if (subfolder != null) {
			for (let shortname of shortnames) {
				let file = subfolder.file(shortname);
				if (file != null) {
					let p = file.async("string").then((fileContent) => {
						let roomDoc = parse5.parse(fileContent);
						let roomBodyNode = reachBodyNode(roomDoc);
						if (roomBodyNode != null) {
							getRoomInfo(roomBodyNode,shortname,numbers,names,seats,types,furnitures,hrefs);
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

function getBuildingInfo(node: any, shortnames: string[], fullnames: string[], addresses: string[]) {
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

function addBuildingInfo(attr: any, node: any, shortnames: string[], fullnames: string[], addresses: string[]) {
	if (attr.name === "class" && attr.value === "views-field views-field-field-building-code") {
		let shortname = node.childNodes[0].value.trim();
		shortnames.push(shortname);
	} else if (attr.name === "class" && attr.value === "views-field views-field-title") {
		for (let child of node.childNodes) {
			if (child.nodeName === "a") {
				let fullname = child.childNodes[0].value;
				fullnames.push(fullname);
			}
		}
	} else if (attr.name === "class" && attr.value === "views-field views-field-field-building-address") {
		let address = node.childNodes[0].value.trim();
		addresses.push(address);
	}
}

function getRoomInfo(node: any, shortname: string, numbers: string[], names: string[], seats: number[],
	types: string[], furnitures: string[], hrefs: string[]) {
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

function addRoomInfo(attr: any, node: any, shortname: string, numbers: string[], names: string[],
	seats: number[], types: string[], furnitures: string[], hrefs: string[]) {
	if (attr.name === "class" && attr.value === "views-field views-field-field-room-number") {
		for (let child of node.childNodes) {
			if (child.nodeName === "a") {
				let number = child.childNodes[0].value;
				numbers.push(number);
				let name = shortname + "_" + number;
				names.push(name);
			}
		}
	} else if (attr.name === "class" && attr.value === "views-field views-field-field-room-capacity") {
		let seat = node.childNodes[0].value.trim();
		let seatNum = 0;
		if (seat.length !== 0) {
			seatNum = parseInt(seat, 10);
		}
		seats.push(seatNum);
	} else if (attr.name === "class" && attr.value === "views-field views-field-field-room-furniture") {
		let furniture = node.childNodes[0].value.trim();
		furnitures.push(furniture);
	} else if (attr.name === "class" && attr.value === "views-field views-field-field-room-type") {
		let type = node.childNodes[0].value.trim();
		types.push(type);
	} else if (attr.name === "class" && attr.value === "views-field views-field-nothing") {
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

// reference: https://nodejs.org/api/http.html#httpgeturl-options-callback
function getGeolocation(address: string, lats: Map<string, number>, lons: Map<string, number>, gpromises: any[]) {
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
				} catch (e: any) {
					console.error(e.message);
					reject(e);
				}
			});
		});
	});
	gpromises.push(p);
}

function saveRoom(id: string, dataset: Map<string, any>, fullnames: string[], shortnames: string[], numbers: string[],
	names: string[], addresses: string[], lats: Map<string, number>, lons: Map<string, number>, seats: number[],
	types: string[], furnitures: string[], hrefs: string[], promises: any[], gpromises: any[]): Promise<string[]> {
	let rooms: Room[] = [];
	return new Promise((resolve, reject) => {
		Promise.all(promises).then(() => {
			Promise.all(gpromises).then(() => {
				for (let b = 0; b < shortnames.length; b++) {
					for (let r = 0; r < names.length; r++) {
						let name = names[r].split("_")[0];
						if (shortnames[b] === name) {
							let room = new Room(fullnames[b], shortnames[b], numbers[r], names[r], addresses[b],
								lats.get(addresses[b])!, lons.get(addresses[b])!, seats[r], types[r],
								furnitures[r],hrefs[r]);
							if (!rooms.includes(room)) {
								rooms.push(room);
							}
						}
					}
				}
				// reject invalid dataset
				if (rooms.length < 1) {
					return reject(new InsightError("Rooms dataset does not contain any valid rooms"));
				}
				dataset.set(id, rooms);
				// store dataset to disk
				if (!fs.existsSync("data")) {
					fs.mkdirSync("data");
				}
				fs.writeFileSync("data/" + id + ".json", JSON.stringify(rooms));
				// return list of ids
				return resolve(Array.from(dataset.keys()));
			}).catch((error) => {
				return reject(error);
			});
		}).catch((error) => {
			return reject(error);
		});
	});
}

function reachBodyNode(doc: parse5.Document): parse5.Node | null {
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

export {addRoom};
