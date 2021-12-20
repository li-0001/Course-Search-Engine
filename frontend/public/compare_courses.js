document.getElementById("compare-button").onclick = async function () {
	// Reference: https://www.geeksforgeeks.org/search-bar-using-html-css-and-javascript/
	let input1 = document.getElementById("compare-input1").value.toLowerCase();
	let input2 = document.getElementById("compare-input2").value.toLowerCase();
	const arr1 = input1.split(" ");
	const arr2 = input2.split(" ");
	const dept1 = arr1[0];
	const id1 = arr1[1];
	const dept2 = arr2[0];
	const id2 = arr2[1];

	// Check if the input is valid
	// A valid input has to be in the format of "DEPT ID"
	// Where DEPT contains 2 to 4 alphabets, and ID contains 3 digits (sometimes followed by an alphabet)
	if ((input1.trim() === "" || arr1.length !== 2 || /^[a-z]{2,4}$/.test(dept1) === false ||
			/^[\d]{3}[a-z]*$/.test(id1) === false) ||
		(input2.trim() === "" || arr2.length !== 2 || /^[a-z]{2,4}$/.test(dept2) === false ||
			/^[\d]{3}[a-z]*$/.test(id2) === false)) {
		let error = document.getElementById("error-message");
		error.innerHTML = "Invalid input. Please try again.";
		setTimeout(function () {
			error.innerHTML = "";
		}, 1000);
	} else {
		let courseQuery_1 = {
			"WHERE": {
				"AND": [
					{
						"IS": {
							"courses_dept": dept1
						}
					},
					{
						"IS": {
							"courses_id": id1
						}
					}
				]
			},
			"OPTIONS": {
				"COLUMNS": [
					"courses_dept",
					"courses_id",
					"overallAvg",
					"overallPass",
					"overallFail"
				]
			},
			"TRANSFORMATIONS": {
				"GROUP": [
					"courses_dept",
					"courses_id",
					"courses_pass",
					"courses_fail"
				],
				"APPLY": [
					{
						"overallAvg": {
							"AVG": "courses_avg"
						}
					},
					{
						"overallPass": {
							"SUM": "courses_pass"
						}
					},
					{
						"overallFail": {
							"SUM": "courses_fail"
						}
					}
				]
			}
		};
		let courseQuery_2 = {
			"WHERE": {
				"AND": [
					{
						"IS": {
							"courses_dept": dept2
						}
					},
					{
						"IS": {
							"courses_id": id2
						}
					}
				]
			},
			"OPTIONS": {
				"COLUMNS": [
					"courses_dept",
					"courses_id",
					"overallAvg",
					"overallPass",
					"overallFail"
				]
			},
			"TRANSFORMATIONS": {
				"GROUP": [
					"courses_dept",
					"courses_id",
					"courses_pass",
					"courses_fail"
				],
				"APPLY": [
					{
						"overallAvg": {
							"AVG": "courses_avg"
						}
					},
					{
						"overallPass": {
							"SUM": "courses_pass"
						}
					},
					{
						"overallFail": {
							"SUM": "courses_fail"
						}
					}
				]
			}
		};
		// References:
		// https://stackoverflow.com/questions/1973140/parsing-json-from-xmlhttprequest-responsejson
		// https://stackoverflow.com/questions/2482916/what-am-i-missing-in-the-xmlhttprequest
		let xhr_1 = new XMLHttpRequest();
		xhr_1.open("POST", "http://localhost:4321/query", true);
		xhr_1.setRequestHeader('Content-Type', 'application/json');
		xhr_1.send(JSON.stringify(courseQuery_1));
		xhr_1.onreadystatechange = function () {
			if (xhr_1.readyState === XMLHttpRequest.DONE) {
				let response = JSON.parse(xhr_1.responseText);
				let result_1 = response["result"];
				result_1 = result_1.filter(section => section["courses_year"] !== 1900);
				let result_2 = {};
				let xhr_2 = new XMLHttpRequest();
				xhr_2.open("POST", "http://localhost:4321/query", true);
				xhr_2.setRequestHeader('Content-Type', 'application/json');
				xhr_2.send(JSON.stringify(courseQuery_2));
				xhr_2.onreadystatechange = function () {
					if (xhr_2.readyState === XMLHttpRequest.DONE) {
						let response = JSON.parse(xhr_2.responseText);
						result_2 = response["result"].filter(section => section["courses_year"] !== 1900);
						let avg_1 = 0;
						let avg_2 = 0;
						for (const section of result_1) {
							avg_1+=section["overallAvg"];
						}
						avg_1 = avg_1 / result_1.length;
						for (const section of result_2) {
							avg_2+=section["overallAvg"];
						}
						avg_2 = avg_2 / result_2.length;
						if (result_1.length<=0 || result_2.length<=0 || avg_1<=0 || avg_2<=0 || avg_1>100 || avg_2>100) {
							let error = document.getElementById("error-message");
							error.innerHTML = "No matching results found.";
							setTimeout(function () {
								error.innerHTML = "";
							}, 1000);
						}
						// Reference: https://canvasjs.com/
						const chart  = new CanvasJS.Chart("chartContainer", {
							theme: "light1",
							animationEnabled: true,
							title:{
								text: dept1.toUpperCase() + " " + id1 + " VS " + dept2.toUpperCase() + " " + id2
							},
							axisY:{
								minimum: 0,
								maximum: 100
							},
							data: [
								{
									type: "column",
									dataPoints: [
										{ label: dept1.toUpperCase() + " " + id1 + " Average", y: avg_1},
										{ label: dept2.toUpperCase() + " " + id2 + " Average", y: avg_2}
									]
								}
							]
						});
						chart.render();
					}
				}
			}
		}
	}
}
