document.getElementById("search-button").onclick = function() {
	// Reference: https://www.geeksforgeeks.org/search-bar-using-html-css-and-javascript/
	let input = document.getElementById("search-input").value;
	input = input.toLowerCase();
	const arr = input.split(" ");
	const dept = arr[0];
	const id = arr[1];
	let error = document.getElementById("error-message");

	// Check if the input is valid
	// A valid input has to be in the format of "DEPT ID"
	// Where DEPT contains 2 to 4 alphabets, and ID contains 3 digits (sometimes followed by an alphabet)
	if (input.trim() === "" || arr.length !== 2 || /^[a-z]{2,4}$/.test(dept) === false || /^[\d]{3}[a-z]*$/.test(id) === false) {
		error.innerHTML="Invalid input. Please try again.";
		setTimeout(function() {
			error.innerHTML = "";
		}, 1000);
	} else {
		let courseQuery = {
			"WHERE": {
				"AND": [
					{
						"IS": {
							"courses_dept": dept
						}
					},
					{
						"IS": {
							"courses_id": id
						}
					}
				]
			},
			"OPTIONS": {
				"COLUMNS": [
					"courses_avg",
					"courses_year",
					"courses_instructor",
					"courses_pass",
					"courses_fail"
				],
				"ORDER": {
					"dir": "DOWN",
					"keys": [
						"courses_avg"
					]
				}
			}
		};
		// References:
		// https://stackoverflow.com/questions/1973140/parsing-json-from-xmlhttprequest-responsejson
		// https://stackoverflow.com/questions/2482916/what-am-i-missing-in-the-xmlhttprequest
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === XMLHttpRequest.DONE) {
				let response = JSON.parse(xhr.responseText);
				let result = response["result"];
				const tableBody = document.getElementById("search-result");
				let dataHtml = "";
				result = result.filter(section => section["courses_year"] !== 1900);
				if (result.length === 0) {
					error.innerHTML = "No matching results found.";
					setTimeout(function() {
						error.innerHTML = "";
					}, 1000);
				};
				result.sort((a, b) => (a["courses_year"] < b["courses_year"]) ? 1 : -1);
				for (let section of result) {
					dataHtml += `<tr><td>${section["courses_instructor"]}</td>
							<td>${section["courses_year"]}</td>
							<td>${section["courses_avg"]}</td>
							<td>${section["courses_pass"]}</td>
							<td>${section["courses_fail"]}</td></tr>`;
				}
				tableBody.innerHTML = dataHtml;
			}
		}
		xhr.open("POST", "http://localhost:4321/query", true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(JSON.stringify(courseQuery));
	}
}
