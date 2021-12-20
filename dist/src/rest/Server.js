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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const InsightFacade_1 = __importDefault(require("../controller/InsightFacade"));
const IInsightFacade_1 = require("../controller/IInsightFacade");
const fs = __importStar(require("fs"));
const Course_1 = __importDefault(require("../controller/Course"));
const Room_1 = __importDefault(require("../controller/Room"));
class Server {
    constructor(port) {
        console.info(`Server::<init>( ${port} )`);
        this.port = port;
        this.express = (0, express_1.default)();
        Server.insightFacade = new InsightFacade_1.default();
        this.registerMiddleware();
        this.registerRoutes();
        const directory = "data";
        if (fs.existsSync(directory)) {
            let files = fs.readdirSync(directory);
            for (const file of files) {
                let id = file.split(".")[0];
                let content = JSON.parse(fs.readFileSync("data/" + file, "utf-8"));
                let kind;
                if (content[0]["dept"] !== undefined) {
                    let sections = content;
                    kind = IInsightFacade_1.InsightDatasetKind.Courses;
                    let courseContent = new Course_1.default(sections);
                    Server.insightFacade.dataset.set(id, courseContent);
                }
                else if (content[0]["fullname"] !== undefined) {
                    let rooms = [];
                    for (const unit of content) {
                        let tempRoom = new Room_1.default(unit["fullname"], unit["shortname"], unit["number"], unit["name"], unit["address"], unit["lat"], unit["lon"], unit["seats"], unit["type"], unit["furniture"], unit["href"]);
                        rooms.push(tempRoom);
                    }
                    kind = IInsightFacade_1.InsightDatasetKind.Rooms;
                    Server.insightFacade.dataset.set(id, rooms);
                }
            }
        }
        this.express.use(express_1.default.static("./frontend/public"));
    }
    start() {
        return new Promise((resolve, reject) => {
            console.info("Server::start() - start");
            if (this.server !== undefined) {
                console.error("Server::start() - server already listening");
                reject();
            }
            else {
                this.server = this.express.listen(this.port, () => {
                    console.info(`Server::start() - server listening on port: ${this.port}`);
                    resolve();
                }).on("error", (err) => {
                    console.error(`Server::start() - server ERROR: ${err.message}`);
                    reject(err);
                });
            }
        });
    }
    stop() {
        console.info("Server::stop()");
        return new Promise((resolve, reject) => {
            if (this.server === undefined) {
                console.error("Server::stop() - ERROR: server not started");
                reject();
            }
            else {
                this.server.close(() => {
                    console.info("Server::stop() - server closed");
                    resolve();
                });
            }
        });
    }
    registerMiddleware() {
        this.express.use(express_1.default.json());
        this.express.use(express_1.default.raw({ type: "application/*", limit: "10mb" }));
        this.express.use((0, cors_1.default)());
    }
    registerRoutes() {
        this.express.get("/echo/:msg", Server.echo);
        this.express.put("/dataset/:id/:kind", Server.putDataset);
        this.express.delete("/dataset/:id", Server.deleteDataset);
        this.express.get("/datasets", Server.getDatasets);
        this.express.post("/query", Server.postQuery);
    }
    static echo(req, res) {
        try {
            console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
            const response = Server.performEcho(req.params.msg);
            res.status(200).json({ result: response });
        }
        catch (err) {
            res.status(400).json({ error: err });
        }
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
    static putDataset(req, res) {
        const buffer = req.body;
        const content = buffer.toString("base64");
        let kind;
        if (req.params.kind === "courses") {
            kind = IInsightFacade_1.InsightDatasetKind.Courses;
        }
        else if (req.params.kind === "rooms") {
            kind = IInsightFacade_1.InsightDatasetKind.Rooms;
        }
        Server.insightFacade.addDataset(req.params.id, content, kind).then((response) => {
            res.status(200).json({ result: response });
        }).catch((err) => {
            res.status(400).json({ error: err.message });
        });
    }
    static deleteDataset(req, res) {
        Server.insightFacade.removeDataset(req.params.id).then((response) => {
            res.status(200).json({ result: response });
        }).catch((err) => {
            if (err instanceof IInsightFacade_1.NotFoundError) {
                res.status(404).json({ error: err.message });
            }
            else {
                res.status(400).json({ error: err.message });
            }
        });
    }
    static getDatasets(req, res) {
        Server.insightFacade.listDatasets().then((response) => {
            res.status(200).json({ result: response });
        }).catch((err) => {
            console.log(err);
        });
    }
    static postQuery(req, res) {
        Server.insightFacade.performQuery(req.body).then((response) => {
            res.status(200).json({ result: response });
        }).catch((err) => {
            res.status(400).json({ error: err.message });
        });
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map