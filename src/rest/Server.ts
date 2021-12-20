import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError} from "../controller/IInsightFacade";
import * as fs from "fs";
import Course from "../controller/Course";
import Section from "../controller/Section";
import Room from "../controller/Room";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static insightFacade: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		Server.insightFacade = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();

		const directory = "data";
		if (fs.existsSync(directory)) {
			let files = fs.readdirSync(directory);
			for (const file of files) {
				let id = file.split(".")[0];
				let content = JSON.parse(fs.readFileSync("data/" + file, "utf-8"));
				let kind: InsightDatasetKind;
				if (content[0]["dept"] !== undefined) {
					let sections: Section[] = content;
					kind = InsightDatasetKind.Courses;
					let courseContent = new Course(sections);
					Server.insightFacade.dataset.set(id, courseContent);
				} else if (content[0]["fullname"] !== undefined) {
					let rooms: Room[] = [];
					for (const unit of content) {
						let tempRoom = new Room(unit["fullname"], unit["shortname"], unit["number"], unit["name"],
							unit["address"], unit["lat"], unit["lon"], unit["seats"], unit["type"], unit["furniture"],
							unit["href"]);
						rooms.push(tempRoom);
					}
					kind = InsightDatasetKind.Rooms;
					Server.insightFacade.dataset.set(id, rooms);
				}
			}
		}

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		this.express.put("/dataset/:id/:kind", Server.putDataset);
		this.express.delete("/dataset/:id", Server.deleteDataset);
		this.express.get("/datasets", Server.getDatasets);
		this.express.post("/query", Server.postQuery);
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private static putDataset(req: Request, res: Response) {
		const buffer: Buffer = req.body;
		const content = buffer.toString("base64");

		let kind: InsightDatasetKind;
		if (req.params.kind === "courses") {
			kind = InsightDatasetKind.Courses;
		} else if (req.params.kind === "rooms") {
			kind = InsightDatasetKind.Rooms;
		}

		Server.insightFacade.addDataset(req.params.id, content, kind!).then((response) => {
			res.status(200).json({result: response});
		}).catch((err: any) => {
			res.status(400).json({error: err.message});
		});
	}

	private static deleteDataset(req: Request, res: Response) {
		Server.insightFacade.removeDataset(req.params.id).then((response) => {
			res.status(200).json({result: response});
		}).catch((err) => {
			if (err instanceof NotFoundError) {
				res.status(404).json({error: err.message});
			} else {
				res.status(400).json({error: err.message});
			}
		});
	}

	private static getDatasets(req: Request, res: Response) {
		Server.insightFacade.listDatasets().then((response) => {
			res.status(200).json({result: response});
		}).catch((err) => {
			console.log(err);
		});
	}

	private static postQuery(req: Request, res: Response) {
		Server.insightFacade.performQuery(req.body).then((response) => {
			res.status(200).json({result: response});
		}).catch ((err) => {
			res.status(400).json({error: err.message});
		});
	}
}
