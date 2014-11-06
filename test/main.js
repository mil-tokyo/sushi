(function() {
	var nodejs = (typeof window === 'undefined');
	if (nodejs) {
		AgentSmith = require('../src/agent_smith');
		require('../src/agent_smith_cl');
	}
	var $M = AgentSmith.Matrix;
	
	var nearlyEquals = function(a, b) {
		var tmp = a - b;
		return -0.01 < tmp && tmp < 0.01;
	};
	
	var tests = {
		General : {
			checkEquals : function() {
				var a = new $M(3, 7);
				var b = new $M(3, 7);
				for (var i = 0; i < a.length; i++) {
					var tmp = Math.random();
					a.data[i] = tmp;
					b.data[i] = tmp;
				}
				if (a.nearlyEquals(b) !== true) {
					return false;
				}
				a.set(0, 0, -100);
				if (a.nearlyEquals(b) === true) {
					return false;
				}
				return true;
			},
			checkMap : function() {
				var a = $M.fromArray([
		  			[1, 2, 3],
		  			[4, 5, 6]
		  		]);
		  		return a.map(function(datum) { return datum *2; }).equals(
		  			$M.fromArray([
		  				[2, 4, 6],
		  				[8, 10, 12]
		  			])
		  		);
			},
			checkAdd : function() {
				var a = new $M(3, 7);
				var b = new $M(3, 7);
				a.random();
				b.random();
				var c1 = $M.add(a, b);
				for (var i = 0; i < a.length; i++) {
					if (!nearlyEquals(c1.data[i], a.data[i] + b.data[i])) {
						return false;
					}
				}
				var c2 = a.clone().add(b);
				for (var i = 0; i < a.length; i++) {
					if (!nearlyEquals(c2.data[i], a.data[i] + b.data[i])) {
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
					if (!nearlyEquals(c1.data[i], a.data[i] - b.data[i])) {
						return false;
					}
				}
				var c2 = a.clone().sub(b);
				for (var i = 0; i < a.length; i++) {
					if (!nearlyEquals(c2.data[i], a.data[i] - b.data[i])) {
						return false;
					}
				}
				return true;
			},
			checkTransposeAddSub : function() {
				var a = new $M(4, 6);
				a.random();
				var b = new $M(6, 4);
				b.random();
				var a_add_bt = $M.add(a, b.t());
				for (var row = 0; row < a_add_bt.rows; row++) {
					for (var col = 0; col < a_add_bt.cols; col++) {
						if (!nearlyEquals(a_add_bt.get(row, col), (a.get(row, col) + b.t().get(row, col)))) {
							return false;
						}
					}
				}
				var a_sub_bt = $M.sub(a, b.t());
				for (var row = 0; row < a_sub_bt.rows; row++) {
					for (var col = 0; col < a_sub_bt.cols; col++) {
						if (!nearlyEquals(a_sub_bt.get(row, col), (a.get(row, col) - b.t().get(row, col)))) {
							return false;
						}
					}
				}
				return true;
			},
			checkBroadCastAdd : function() {
				var a = $M.fromArray([
					[1, 2, 3],
					[4, 5, 6]
				]);
				var b = $M.fromArray([
					[1, 2, 3]
				]);
				var c = $M.fromArray([
					[1],
					[4]
				]);
				var d = $M.fromArray([
					[1, 4]
				]);
				var e = $M.fromArray([
					[1, 4],
					[2, 5],
					[3, 6]
				]);
				var f = $M.fromArray([
					[1],
					[2],
					[3]
				]);
				return 	$M.add(a, b).equals(
					$M.fromArray([
						[2, 4, 6],
						[5, 7, 9]
					])
				) && $M.add(a, c).equals(
					$M.fromArray([
						[2, 3, 4],
						[8, 9, 10]
					])
				) && $M.add(a, d.t()).equals(
					$M.add(a, c)
				) && $M.add(a, f.t()).equals(
					$M.add(a, b)
				) && $M.add(a.t(), d).equals(
					$M.add(e, d)
				) && $M.add(a.t(), f).equals(
					$M.add(e, f)
				) && $M.add(a.t(), b.t()).equals(
					$M.add(a, b).t()
				) && $M.add(a.t(), c.t()).equals(
					$M.add(a, c).t()
				);
			},
			checkMulEach : function() {
				var a = new $M(3, 7);
				var b = new $M(3, 7);
				a.random();
				b.random();
				var c1 = $M.mulEach(a, b);
				for (var i = 0; i < a.length; i++) {
					if (!nearlyEquals(c1.data[i], a.data[i] * b.data[i])) {
						return false;
					}
				}
				var c2 = a.clone().mulEach(b);
				for (var i = 0; i < a.length; i++) {
					if (!nearlyEquals(c2.data[i], a.data[i] * b.data[i])) {
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
					[1, 2, 1],
					[3, 4, 0],
					[5, 6, 0]
				]);
				return 	$M.mul(a, b).equals(
					$M.fromArray([
						[22, 28, 1],
						[49, 64, 4]
					])
				)
				&&
				a.mul(b).equals(
					$M.fromArray([
						[22, 28, 1],
						[49, 64, 4]
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
			checkColVectors : function() {
				var vectors = [];
				for (var i = 0; i < 5; i++) {
					vectors.push((new $M(10, 1)).random());
				}
				var mat = $M.fromColVectors(vectors);
				for (var i = 0; i < vectors.length; i++) {
					for (var row = 0; row < vectors[i].rows; row++) {
						if (vectors[i].get(row, 0) !== mat.get(row, i)) {
							return false;
						}
					}
				}
				return true;
			},
			checkSumEachRow : function() {
				var a = $M.fromArray([
					[1, 2, 3, 4],
					[5, 6, 7, 8]
				]);
				return a.sumEachRow().equals(
					$M.fromArray([
						[10],
						[26]
					])
				);
			},
			checkSumEachCol : function() {
				var a = $M.fromArray([
					[1, 2, 3, 4],
					[5, 6, 7, 8]
				]);
				return a.sumEachCol().equals(
					$M.fromArray([
						[6, 8, 10, 12]
					])
				);
			},
		},
		Large : {
			checkAddLarge : function() {
				var a = new $M(7, 9);
				a.random();
				var b = new $M(7, 9);
				b.random();
				var b2 = new $M(9, 7);
				b2.random();
				return (
					$M.largeAdd(a, b).nearlyEquals($M.add(a, b)) &&
					$M.largeAdd(a.t(), b2).nearlyEquals($M.add(a.t(), b2)) &&
					$M.largeAdd(a, b2.t()).nearlyEquals($M.add(a, b2.t())) &&
					$M.largeAdd(a.t(), b.t()).nearlyEquals($M.add(a.t(), b.t()))
					);
			},
			checkSubLarge : function() {
				var a = new $M(7, 9);
				a.random();
				var b = new $M(7, 9);
				b.random();
				var b2 = new $M(9, 7);
				b2.random();
				return (
					$M.largeSub(a, b).nearlyEquals($M.sub(a, b)) &&
					$M.largeSub(a.t(), b2).nearlyEquals($M.sub(a.t(), b2)) &&
					$M.largeSub(a, b2.t()).nearlyEquals($M.sub(a, b2.t())) &&
					$M.largeSub(a.t(), b.t()).nearlyEquals($M.sub(a.t(), b.t()))
					);
			},
			checkMulEachLarge : function() {
				var a = new $M(7, 9);
				a.random();
				var b = new $M(7, 9);
				b.random();
				var b2 = new $M(9, 7);
				b2.random();
				return (
					$M.largeMulEach(a, b).nearlyEquals($M.mulEach(a, b)) &&
					$M.largeMulEach(a.t(), b2).nearlyEquals($M.mulEach(a.t(), b2)) &&
					$M.largeMulEach(a, b2.t()).nearlyEquals($M.mulEach(a, b2.t())) &&
					$M.largeMulEach(a.t(), b.t()).nearlyEquals($M.mulEach(a.t(), b.t()))
					);
			},
			checkBroadCastAddLarge : function() {
				var a = $M.fromArray([
					[1, 2, 3],
					[4, 5, 6]
				]);
				var b = $M.fromArray([
					[1, 2, 3]
				]);
				var c = $M.fromArray([
					[1],
					[4]
				]);
				var d = $M.fromArray([
					[1, 4]
				]);
				var e = $M.fromArray([
					[1, 4],
					[2, 5],
					[3, 6]
				]);
				var f = $M.fromArray([
					[1],
					[2],
					[3]
				]);
				return 	$M.largeAdd(a, b).equals(
					$M.fromArray([
						[2, 4, 6],
						[5, 7, 9]
					])
				) && $M.largeAdd(a, c).equals(
					$M.fromArray([
						[2, 3, 4],
						[8, 9, 10]
					])
				) && $M.largeAdd(a, d.t()).equals(
					$M.add(a, c)
				) && $M.largeAdd(a, f.t()).equals(
					$M.add(a, b)
				) && $M.largeAdd(a.t(), d).equals(
					$M.add(e, d)
				) && $M.largeAdd(a.t(), f).equals(
					$M.add(e, f)
				) && $M.largeAdd(a.t(), b.t()).equals(
					$M.add(a, b).t()
				) && $M.largeAdd(a.t(), c.t()).equals(
					$M.add(a, c).t()
				);
			},
			checkMulLarge : function() {
				var a = new $M(7, 9);
				a.random();
				var b = new $M(9, 4);
				b.random();
				var b2 = new $M(7, 4);
				b2.random();
				var b3 = new $M(4, 9);
				b3.random();
				var b4 = new $M(4, 7);
				b4.random();
				return (
					$M.largeMul(a, b).nearlyEquals($M.mul(a, b)) &&
					$M.largeMul(a.t(), b2).nearlyEquals($M.mul(a.t(), b2)) &&
					$M.largeMul(a, b3.t()).nearlyEquals($M.mul(a, b3.t())) &&
					$M.largeMul(a.t(), b4.t()).nearlyEquals($M.mul(a.t(), b4.t()))
					);
			},
			checkTimesLarge : function() {
				var a = $M.fromArray([
					[1, 2, 3],
					[4, 5, 6]
				]);
				return a.largeTimes(2).nearlyEquals(
					$M.fromArray([
						[2, 4, 6],
						[8, 10, 12]
					])
				);
			},
			checkSumEachRow : function() {
				var a = $M.fromArray([
					[1, 2, 3],
					[4, 5, 6]
				]);
				console.log(a.largeSumEachRow().toString());
				console.log(a.t().largeSumEachRow().toString());
				return a.largeSumEachRow().nearlyEquals(
					$M.fromArray([
						[6],
						[15]
					])
				) && a.t().largeSumEachRow().nearlyEquals(
					$M.fromArray([
						[5],
						[7],
						[9]
					])
				);
			},
			benchAddNormal : function() {
				var a = new $M(100, 2000);
				a.random();
				var b = new $M(100, 2000);
				b.random();
				var b2 = new $M(2000, 100).t();
				b2.random();
				for (var i = 0; i < 1; i++) {
					a.add(b)
					a.add(b2);
				}
				return true;
			},
			benchAddLarge : function() {
				var a = new $M(100, 2000);
				a.random();
				var b = new $M(100, 2000);
				b.random();
				var b2 = new $M(2000, 100).t();
				b2.random();
				for (var i = 0; i < 1; i++) {
					a.largeAdd(b);
					a.largeAdd(b2);
				}
				return true;
			},
			benchMulNormal : function() {
				var a = new $M(128, 768);
				a.random();
				var b = new $M(768, 100);
				b.random();
				for (var i = 0; i < 1; i++) {
					$M.mul(a, b);
				}
				return true;
			},
			benchMulLarge : function() {
				var a = new $M(128, 768);
				a.random();
				var b = new $M(768, 100);
				b.random();
				for (var i = 0; i < 1; i++) {
					$M.largeMul(a, b);
				}
				return true;
			},
			benchTimesNormal : function() {
				var a = new $M(1000, 1000);
				a.random();
				a.times(10);
				return true;
			},
			benchTimesLarge : function() {
				var a = new $M(1000, 1000);
				a.random();
				a.largeTimes(10);
				return true;
			},
		}
	};
	
	var start_tests = function(tests) {
		console.log('==================== start tests ====================');
		var success = 0;
		var all = 0;
		var results_statistics = {};
		Object.keys(tests).forEach(function (test_name) {
			console.log('################ TEST : ' + test_name + ' ########################');
			var test = tests[test_name];
			results_statistics[test_name] = { success : 0, all : 0 };
			Object.keys(test).forEach(function (test_case_name) {
				var start_time = (new Date()).getTime();
				var result = false;
				console.log('-------- TEST CASE : ' + test_case_name + ' --------');
				try {
					var result = test[test_case_name]();
				} catch (exception) {
					console.log('exception catched');
					console.log(exception);
					throw exception;
				} finally {
					console.log(result);
					console.log('elapsed time : ' + ((new Date()).getTime() - start_time) + ' ms');
					if (result) {
						success++;
						results_statistics[test_name].success++;
					}
					all++;
					results_statistics[test_name].all++;
				};
			});
		});
		console.log();
		console.log('=====================================');
		Object.keys(results_statistics).forEach(function (test_name) {
			console.log(test_name + ' : ' + results_statistics[test_name].success + ' / ' + results_statistics[test_name].all + ' test cases succeeded.');
		});
		console.log('=====================================');
		console.log('TOTAL : ' + success + ' / ' + all + ' test cases succeeded.');
		console.log();
	};

	start_tests(tests);
})();
