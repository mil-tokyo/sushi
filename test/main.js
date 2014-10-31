var AgentSmith = require('../src/agent_smith');
var $M = AgentSmith.Matrix;

var tests = {
	checkEquals : function() {
		var a = new $M(3, 7);
		var b = new $M(3, 7);
		for (var i = 0; i < a.length; i++) {
			var tmp = Math.random();
			a.data[i] = tmp;
			b.data[i] = tmp;
		}
		if (a.equals(b) !== true) {
			return false;
		}
		a.set(0, 0, -100);
		if (a.equals(b) === true) {
			return false;
		}
		return true;
	},
	checkAdd : function() {
		var a = new $M(3, 7);
		var b = new $M(3, 7);
		a.random();
		b.random();
		var c1 = $M.add(a, b);
		for (var i = 0; i < a.length; i++) {
			if (c1.data[i] !== a.data[i] + b.data[i]) {
				return false;
			}
		}
		var c2 = a.clone().add(b);
		for (var i = 0; i < a.length; i++) {
			if (c2.data[i] !== a.data[i] + b.data[i]) {
				return false;
			}
		}
		return true;
	},
	checkSub : function() {
		var a = new $M(3, 7);
		var b = new $M(3, 7);
		a.random();
		b.random();
		var c1 = $M.sub(a, b);
		for (var i = 0; i < a.length; i++) {
			if (c1.data[i] !== a.data[i] - b.data[i]) {
				return false;
			}
		}
		var c2 = a.clone().sub(b);
		for (var i = 0; i < a.length; i++) {
			if (c2.data[i] !== a.data[i] - b.data[i]) {
				return false;
			}
		}
		return true;
	},
	checkMulEach : function() {
		var a = new $M(3, 7);
		var b = new $M(3, 7);
		a.random();
		b.random();
		var c1 = $M.mulEach(a, b);
		for (var i = 0; i < a.length; i++) {
			if (c1.data[i] !== a.data[i] * b.data[i]) {
				return false;
			}
		}
		var c2 = a.clone().mulEach(b);
		for (var i = 0; i < a.length; i++) {
			if (c2.data[i] !== a.data[i] * b.data[i]) {
				return false;
			}
		}
		return true;
	},
	checkDot : function() {
		var a = new $M(3, 7);
		var b = new $M(3, 7);
		a.random();
		b.random();
		var c1 = $M.dot(a, b);
		var sum1 = 0.0;
		for (var i = 0; i < a.length; i++) {
			sum1 += a.data[i] * b.data[i];
		}
		if (sum1 !== c1) { return false; }
		var c2 = a.clone().dot(b);
		var sum2 = 0.0;
		for (var i = 0; i < a.length; i++) {
			sum2 += a.data[i] * b.data[i];
		}
		if (sum2 !== c2) { return false; }
		return true;
	},
	checkMul : function() {
		var a = $M.fromArray([
			[1, 2, 3],
			[4, 5, 6]
		]);
		var b = $M.fromArray([
			[1, 2],
			[3, 4],
			[5, 6]
		]);
		return 	$M.mul(a, b).equals(
			$M.fromArray([
				[22, 28],
				[49, 64]
			])
		)
		&&
		a.mul(b).equals(
			$M.fromArray([
				[22, 28],
				[49, 64]
			])
		);
	},
	checkTimes : function() {
		var a = $M.fromArray([
			[1, 2, 3],
			[4, 5, 6]
		]);
		return a.times(2).equals(
			$M.fromArray([
				[2, 4, 6],
				[8, 10, 12]
			])
		);
	},
};
var start_test = function(tests) {
	var success = 0;
	Object.keys(tests).forEach(function (test_name) {
		var start_time = (new Date()).getTime();
		var result = false;
		console.log('######## test ' + test_name + ' ########');
		try {
			var result = tests[test_name]();
		} catch (exception) {
			console.log('exception catched');
			console.log(exception);
			throw exception;
		} finally {
			console.log(result);
			console.log('elapsed time : ' + ((new Date()).getTime() - start_time) + ' ms');
			if (result) {
				success++;
			}
		};
	});
	console.log();
	console.log(success + ' / ' + Object.keys(tests).length + ' test cases succeeded.');
};

start_test(tests);