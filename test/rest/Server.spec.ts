import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import chai, {expect, use} from "chai";
import chaiHttp from "chai-http";
import * as fs from "fs";
import Log from "@ubccpsc310/folder-test/build/Log";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;

	use(chaiHttp);

	before(function () {
		facade = new InsightFacade();
		server = new Server(4321);
		server.start();
	});

	after(function () {
		server.stop();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", function () {
		this.timeout(3000);
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/courses/courses")
				.send(fs.readFileSync("test/resources/archives/courses.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: any) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					Log.trace(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			Log.trace("Error:" + err);
		}
	});

	it("PUT test for rooms dataset", function () {
		this.timeout(3000);
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/rooms/rooms")
				.send(fs.readFileSync("test/resources/archives/rooms.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: any) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					Log.trace(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			Log.trace("Error:" + err);
		}
	});

	it("DELETE test for courses dataset", function () {
		this.timeout(3000);
		try {
			return chai.request("http://localhost:4321")
				.delete("/dataset/courses_")
				.then(function (res: any) {
					// some logging here please!
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					// some logging here please!
					Log.trace(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			Log.trace("Error:" + err);
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
