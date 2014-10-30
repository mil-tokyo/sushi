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
		var c = $M.add(a, b);
		for (var i = 0; i < a.length; i++) {
			if (c.data[i] !== a.data[i] + b.data[i]) {
				return false;
			}
		}
		return true;
	},
	checkMul : function() {
		var a = new $M(2, 3);
		var b = new $M(3, 2);
		a.setArray([
			[1, 2, 3],
			[4, 5, 6]
		]);
		b.setArray([
			[1, 2],
			[3, 4],
			[5, 6]
		]);
		return $M.mul(a, b).equals((new $M(2,2)).setArray([
			[22, 28],
			[49, 64]
		]));
	},
};

Object.keys(tests).forEach(function (test_name) {
	var result = false;
	console.log('### test ' + test_name + ' : ');
	try {
		var result = tests[test_name]();
	} catch (exception) {
		console.log('exception catched');
		console.log(exception);
	} finally {
		console.log(result);
	};
});