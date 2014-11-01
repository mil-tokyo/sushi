var AgentSmith = {};

AgentSmith.Matrix = function(rows, cols, data) {
	this.rows = rows;
	this.cols = cols;
	this.length = rows * cols;
	this.datum_type = Float32Array;
	if (data === void 0) {
		this.data = new this.datum_type(this.length);
	} else {
		this.data = data;
	}
	this.row_wise = true;
};

// utilities
(function() {
	var $M = AgentSmith.Matrix;
	var $P = $M.prototype;
	
	$P.copyPropertyFrom = function(original) {
		this.rows = original.rows;
		this.cols = original.cols;
		this.length = original.length;
		this.datum_type = original.datum_type;
		this.row_wise = original.row_wise;
	};
	
	$P.equals = function(mat) {
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
		var newM = new $M(this.rows, this.cols);
		newM.copyPropertyFrom(this);
		newM.data = new this.datum_type(this.data);
		return newM;
	};
	
	$P.alias = function() {
		var newM = new $M(this.rows, this.cols);
		newM.copyPropertyFrom(this);
		newM.data = this.data;
		return newM;
	};
})();

// initializer
(function() {
	var $M = AgentSmith.Matrix;
	var $P = $M.prototype;
	
	$P.zeros = function() {
		for (var i = 0; i < this.length; i++) {
			this.data[i] = 0;
		}
		return this;
	};
	
	$P.random = function(min, max) {
		if (typeof min === 'undefined') {
			var min = 0.0;
		}
		if (typeof max === 'undefined') {
			var max = 1.0;
		}
		this.setEach(function(row, col) { return min + (max - min) * Math.random(); });
		return this;
	};
	
	$M.fromArray = function(original_array) {
		var newM = new $M(original_array.length, original_array[0].length, null);
		newM.setArray(original_array);
		return newM;
	};
	
	$P.setArray = function(original_array) {
		var flatten = Array.prototype.concat.apply([], original_array);
		this.data = new this.datum_type(flatten);
		return this;
	};
})();

// general manipulation
(function() {
	var $M = AgentSmith.Matrix;
	var $P = $M.prototype;
	
	$P.get = function(row, col) {
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
		for (var i = 0; i < this.length; i++) {
			this.data[i] = func(this.data[i]);
		};
		return this;
	};
	
	$P.setEach = function(func) {
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				this.set(row, col, func(row, col));
			}
		}
		return this;
	};
	
	$P.forEach = function(func) {
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				func(row, col);
			}
		}
		return this;
	}
})();

// shape
(function() {
	var $M = AgentSmith.Matrix;
	var $P = $M.prototype;
	
	$P.reshape = function(rows, cols) {
		if (rows * cols !== this.rows * this.cols) {
			console.error('shape does not match');
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
})();

// statistics
(function() {
	var $M = AgentSmith.Matrix;
	var $P = $M.prototype;
	
	$P.argmax = function() {
		var max_val = this.data[0];
		var arg = { row : 0, col : 0 };
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				if (this.get(row, col) > max_val) {
					max_val = this.get(row, col);
					arg.row = row;
					arg.col = col;
				}		
			}
		}
		return arg;
	};
	
	$P.sum = function() {
		var sum = 0.0;
		for (var i = 0; i < this.length; i++) {
			sum += this.data[i];
		}
		return sum;
	};
})();

// basic calculation
(function() {
	var $M = AgentSmith.Matrix;
	var $P = $M.prototype;
	
	$P.times = function(times) {
		for (var i = 0; i < this.length; i++) {
			this.data[i] *= times;
		}
		return this;
	};
	
	$P.add = function(mat) {
		if (this.rows !== mat.rows || this.cols !== mat.cols) {
			throw new Error('shape does not match');
		}
		if (this.row_wise == mat.row_wise) {
			for (var i = 0; i < this.length; i++) {
				this.data[i] += mat.data[i];
			}
		} else {
			this.forEach(function(row, col) {
				this.set(row, col, this.get(row, col) + mat.get(row, col));
			}.bind(this));
		}
		return this;
	};
	
	$M.add = function(mat1, mat2) {
		return mat1.clone().add(mat2);
	};
	
	$P.sub = function(mat) {
		if (this.rows !== mat.rows || this.cols !== mat.cols) {
			throw new Error('shape does not match');
		}
		if (this.row_wise == mat.row_wise) {
			for (var i = 0; i < this.length; i++) {
				this.data[i] -= mat.data[i];
			}
		} else {
			this.forEach(function(row, col) {
				this.set(row, col, this.get(row, col) - mat.get(row, col));
			}.bind(this));
		}
		return this;
	};
	
	$M.sub = function(mat1, mat2) {
		return mat1.clone().sub(mat2);
	};
	
	$P.mulEach = function(mat) {
		if (this.rows !== mat.rows || this.cols !== mat.cols) {
			throw new Error('shape does not match');
		}
		if (this.row_wise == mat.row_wise) {
			for (var i = 0; i < this.length; i++) {
				this.data[i] *= mat.data[i];
			}
		} else {
			this.forEach(function(row, col) {
				this.set(row, col, this.get(row, col) * mat.get(row, col));
			}.bind(this));
		}
		return this;
	};
	
	$M.mulEach = function(mat1, mat2) {
		return mat1.clone().mulEach(mat2);
	};
	
	$P.dot = function(mat) {
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
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = AgentSmith;
}