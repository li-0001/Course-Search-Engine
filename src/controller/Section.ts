export default class Section {
	[key: string]: any;
	public dept: string;
	public id: string;
	public instructor: string;
	public title: string;
	public uuid: string;
	public avg: number;
	public year: number;
	public pass: number;
	public fail: number;
	public audit: number;

	constructor(dept: string, id: string, instructor: string, title: string,
		uuid: string, avg: number, year: number, pass: number,
		fail: number, audit: number) {
		this.dept = dept;
		this.id = id;
		this.instructor = instructor;
		this.title = title;
		this.uuid = uuid;
		this.avg = avg;
		this.year = year;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}
}
