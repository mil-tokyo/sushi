var AgentSmith = {};

AgentSmith.Matrix = function(rows, cols, data) {
	this.rows = rows;
	this.cols = cols;
	this.length = rows * cols;
	this.datum_type = Float32Array;
	this.byte_length = this.length * this.datum_type.BYTES_PER_ELEMENT;
	if (data === void 0) {
		this.data = new this.datum_type(this.length);
	} else {
		this.data = data;
	}
	this.row_wise = true;
};

(function() {
	var $M = AgentSmith.Matrix;
	var $P = AgentSmith.Matrix.prototype;
	
	/* ##### utilities ##### */
	
	$P.syncData = function() { };
	
	$P.destruct = function() { this.data = void 0; };
	
	$P.copyPropertyFrom = function(original) {
		this.rows = original.rows;
		this.cols = original.cols;
		this.length = original.length;
		this.datum_type = original.datum_type;
		this.row_wise = original.row_wise;
	};
	
	$P.equals = function(mat) {
		this.syncData();
		mat.syncData();
		if (this.rows !== mat.rows || this.cols !== mat.cols) {
			return false;
		}
		if (this.row_wise == mat.row_wise) {
			for (var i = 0; i < this.length; i++) {
				if (this.data[i] !== mat.data[i]) {
					return false;
				}
			}
		} else {
			for (var row = 0; row < this.rows; row++) {
				for (var col = 0; col < this.cols; col++) {
					if (this.get(row, col) !== mat.get(row, col)) {
						return false;
					}				
				}
			};
		}
		return true;
	};
	
	$P.nearlyEquals = function(mat, epsilon) {
		this.syncData();
		mat.syncData();
		if (epsilon === void 0) {
			var epsilon = 0.01;
		}
		var nearlyEquals = function(a, b) {
			var tmp = a - b;
			return -epsilon < tmp && tmp < epsilon;
		};
		if (this.rows !== mat.rows || this.cols !== mat.cols) {
			return false;
		}
		if (this.row_wise == mat.row_wise) {
			for (var i = 0; i < this.length; i++) {
				if (!nearlyEquals(this.data[i], mat.data[i])) {
					return false;
				}
			}
		} else {
			for (var row = 0; row < this.rows; row++) {
				for (var col = 0; col < this.cols; col++) {
					if (!nearlyEquals(this.get(row, col), mat.get(row, col))) {
						return false;
					}				
				}
			};
		}
		return true;
	};
	
	$P.print = function() {
		console.log(this.toString());
	};
	
	$P.toString = function() {
		this.syncData();
		var formatWidth = function(str, width) {
			while(str.length < width) {
				str = ' ' + str;
			}
			return str;
		};
		var isInt = function(x) {
			return x % 1 === 0;
		}
		var write_buf = '-- Matrix (' + this.rows + ' x ' + this.cols + ') --';
		write_buf += '\r\n';
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				var tmp = this.get(row, col);
				write_buf += formatWidth(isInt(tmp) ? String(tmp) : tmp.toFixed(6), 10);
			}
			if (row != this.rows - 1) { write_buf += '\r\n'; }
		}
		return write_buf;
	};
	
	$P.clone = function() {
		this.syncData();
		var newM = new $M(this.rows, this.cols);
		newM.copyPropertyFrom(this);
		newM.data = new this.datum_type(this.data);
		return newM;
	};
	
	$P.alias = function() {
		this.syncData();
		var newM = new $M(this.rows, this.cols);
		newM.copyPropertyFrom(this);
		newM.data = this.data;
		return newM;
	};

	/* #####initializer ##### */
	
	$P.zeros = function() {
		this.syncData();
		for (var i = 0; i < this.length; i++) {
			this.data[i] = 0;
		}
		return this;
	};
	
	$P.random = function(min, max) {
		this.syncData();
		if (min === void 0) {
			var min = 0.0;
		}
		if (max === void 0) {
			var max = 1.0;
		}
		for (var i = 0; i < this.length; i++) {
			this.data[i] = min + (max - min) * Math.random();
		}
		return this;
	};
	
	$P.range = function() {
		this.syncData();
		for (var i = 0; i < this.data.length; i++) {
			this.data[i] = i;
		}
	};
	
	$M.fromArray = function(original_array) {
		var newM = new $M(original_array.length, original_array[0].length, null);
		newM.setArray(original_array);
		return newM;
	};
	
	$P.setArray = function(original_array) {
		this.syncData();
		var flatten = Array.prototype.concat.apply([], original_array);
		this.data = new this.datum_type(flatten);
		return this;
	};
	
	$M.fromColVectors = function(original_vectors) {
		if (!(original_vectors instanceof Array)) {
			throw new Error('input must be an array');
		}
		if (original_vectors[0].cols !== 1) {
			throw new Error('vectors must be col vectors');
		}
		var newM = new $M(original_vectors[0].length, original_vectors.length);
		newM.setEach(function(row, col) {
			return original_vectors[col].get(row, 0);
		});
		return newM;
	};
	
	$M.extract = function(mat, offest_row, offset_col, rows, cols) {
		throw new Error('not implemented');
	};
	
	$M.writeSubmat = function(mat, submat, offset_row, offset_col) {
		throw new Error('not implemented');
	};

	/* ##### general manipulation ##### */
	$P.get = function(row, col) {
		this.syncData();
		if (row >= this.rows || col >= this.cols) {
			throw new Error('out of range');
		}
		if (this.row_wise) {
			return this.data[row * this.cols + col];
		} else {
			return this.data[col * this.rows + row];
		}
	};
	
	$P.set = function(row, col, datum) {
		this.syncData();
		if (row >= this.rows || col >= this.cols) {
			throw new Error('out of range');
		}
		if (this.row_wise) {
			this.data[row * this.cols + col] = datum;
		} else {
			this.data[col * this.rows + row] = datum;
		}
		return this;
	};
	
	$P.map = function(func) {
		this.syncData();
		for (var i = 0; i < this.length; i++) {
			this.data[i] = func(this.data[i]);
		};
		return this;
	};
	
	$P.setEach = function(func) {
		this.syncData();
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				this.set(row, col, func(row, col));
			}
		}
		return this;
	};
	
	$P.forEach = function(func) {
		this.syncData();
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				func(row, col);
			}
		}
		return this;
	}

	/* ##### shape ##### */
	
	$P.reshape = function(rows, cols) {
		if (rows * cols !== this.rows * this.cols) {
			throw new Error('shape does not match');
		}
		this.rows = rows;
		this.cols = cols;
		return this;
	};
	
	$P.t = function() {
		var alias = this.alias();
		alias.row_wise = !alias.row_wise;
		var tmp = alias.rows;
		alias.rows = alias.cols;
		alias.cols = tmp;
		return alias;
	};
	
	$P.getShape = function() {
		return { rows : this.rows, cols : this.cols };
	};

	/* ##### statistics ##### */
	
	$M.argmax = function(mat) {
		mat.syncData();
		var max_val = mat.data[0];
		var arg = { row : 0, col : 0 };
		for (var row = 0; row < mat.rows; row++) {
			for (var col = 0; col < mat.cols; col++) {
				if (mat.get(row, col) > max_val) {
					max_val = mat.get(row, col);
					arg.row = row;
					arg.col = col;
				}		
			}
		}
		return arg;
	};
	
	$M.sum = function(mat) {
		mat.syncData();
		var sum = 0.0;
		for (var i = 0; i < mat.length; i++) {
			sum += mat.data[i];
		}
		return sum;
	};
	
	$M.sumEachRow = function(mat) {
		mat.syncData();
		var newM = new $M(mat.rows, 1);
		for (var row = 0; row < mat.rows; row++) {
			var tmp = 0;
			for (var col = 0; col < mat.cols; col++) {
				tmp += mat.get(row, col);
			}
			newM.set(row, 0, tmp);
		}
		return newM;
	};
	
	$M.sumEachCol = function(mat) {
		mat.syncData();
		var newM = new $M(1, mat.cols);
		for (var col = 0; col < mat.cols; col++) {
			var tmp = 0;
			for (var row = 0; row < mat.rows; row++) {
				tmp += mat.get(row, col);
			}
			newM.set(0, col, tmp);
		}
		return newM;
	};

	/* ##### basic calculation ##### */
	
	var eachOperationGenerator = function(op) {
		return eval(
			[
			"	(function(mat) {																			",
			"		this.syncData();																		",
			"		mat.syncData();																			",
			"		if (!( (this.rows === mat.rows && this.cols === mat.cols) || 							",
			"			   (this.rows === mat.rows && mat.cols === 1) ||									",
			"			   (this.cols === mat.cols && mat.rows === 1) ) ) {									",
			"			throw new Error('shape does not match');											",
			"		}																						",
			"		if (this.rows === mat.rows && this.cols === mat.cols) {									",
			"			if (this.row_wise == mat.row_wise) {												",
			"				for (var i = 0; i < this.length; i++) {											",
			"					this.data[i] " + op + "= mat.data[i];										",
			"				}																				",
			"			} else {																			",
			"				this.forEach(function(row, col) {												",
			"					this.set(row, col, this.get(row, col) " + op + " mat.get(row, col));		",
			"				}.bind(this));																	",
			"			}																					",
			"		} else if (this.row_wise) {																",
			"			if (mat.cols ===1) {																",
			"				for (var row = 0; row < mat.rows; row++) {										",
			"					for (var col = 0; col < this.cols; col++) {									",
			"						this.data[row * this.cols + col] " + op + "= mat.data[row];				",
			"					}																			",
			"				}																				",
			"			} else {																			",
			"				for (var col = 0; col < mat.cols; col++) {										",
			"					for (var row = 0; row < this.rows; row++) {									",
			"						this.data[row * this.cols + col] " + op + "= mat.data[col];				",
			"					}																			",
			"				}																				",
			"			}																					",
			"		} else {																				",
			"			if (mat.cols ===1) {																",
			"				for (var row = 0; row < mat.rows; row++) {										",
			"					for (var col = 0; col < this.cols; col++) {									",
			"						this.data[col * this.rows + row] " + op + "= mat.data[row];				",
			"					}																			",
			"				}																				",
			"			} else {																			",
			"				for (var col = 0; col < mat.cols; col++) {										",
			"					for (var row = 0; row < this.rows; row++) {									",
			"						this.data[col * this.rows + row] " + op + "= mat.data[col];				",
			"					}																			",
			"				}																				",
			"			}																					",
			"		}																						",
			"		return this;																			",
			"	});																							"
			].join('\r\n')
		);
	};
	
	$P.times = function(times) {
		this.syncData();
		for (var i = 0; i < this.length; i++) {
			this.data[i] *= times;
		}
		return this;
	};
	
	$P.add = eachOperationGenerator("+");
	
	$M.add = function(mat1, mat2) {
		return mat1.clone().add(mat2);
	};
	
	$P.sub = eachOperationGenerator("-");
	
	$M.sub = function(mat1, mat2) {
		return mat1.clone().sub(mat2);
	};
	
	$P.mulEach = eachOperationGenerator("*");
	
	$M.mulEach = function(mat1, mat2) {
		return mat1.clone().mulEach(mat2);
	};
	
	$P.divEach = eachOperationGenerator("/");
	
	$M.divEach = function(mat1, mat2) {
		return mat1.clone().divEach(mat2);
	};
	
	$P.dot = function(mat) {
		this.syncData();
		mat.syncData();
		if (this.rows !== mat.rows || this.cols !== mat.cols) {
			throw new Error('shape does not match');
		}
		var sum = 0.0;
		if (this.row_wise == mat.row_wise) {
			for (var i = 0; i < this.length; i++) {
				sum += this.data[i] * mat.data[i];
			}
		} else {
			this.forEach(function(row, col) {
				sum += this.get(row, col) * mat.get(row, col);
			}.bind(this));
		}
		return sum;
	};
	
	$M.dot = function(mat1, mat2) {
		return mat1.dot(mat2);
	};
	
	$P.mul = function(mat) {
		return $M.mul(this, mat);
	};
	
	$M.mul = function(mat1, mat2) {
		mat1.syncData();
		mat2.syncData();
		if (mat1.cols !== mat2.rows) {
			throw new Error('shape does not match');
		}
		var newM = new $M(mat1.rows, mat2.cols);
		var tmp = 0;
		for (var row = 0; row < newM.rows; row++) {
			for (var col = 0; col < newM.cols; col++) {
				var tmp = 0.0;
				for (var i = 0; i < mat1.cols; i++) {
					tmp += mat1.get(row, i) * mat2.get(i, col);
				}
				newM.data[row * newM.cols + col] = tmp;
			}
		}
		return newM;
	};
	
	$M.convolve = function(mat1, mat2, mode) {
		throw new Error('not implemented');
	};

	/* ##### large matrix calculation ##### */
	
	$P.largeAdd = $P.add;
	$P.largeSub = $P.sub;
	$P.largeMulEach = $P.mulEach;
	$P.largeDivEach = $P.divEach;
	$P.largeMul = $P.mul;
	$P.largeTimes = $P.times;
	$P.largeClone = $P.clone;
	
	$M.largeAdd = $M.add;
	$M.largeSub = $M.sub;
	$M.largeMulEach = $M.mulEach;
	$M.largeDivEach = $M.divEach;
	$M.largeMul = $M.mul;
	$M.largeSum = $M.sum;
	
	$M.largeSumEachRow = $M.sumEachRow;
	$M.largeSumEachCol = $M.sumEachCol;
	$M.largeConvolve = $M.convolve;
	$M.largeExtract = $M.extract;
	$M.largeWriteSubmat = $M.writeSubmat;
})();

var nodejs = (typeof window === 'undefined');
if (nodejs) {
	module.exports = AgentSmith;
}
