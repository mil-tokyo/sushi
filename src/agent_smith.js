var AgentSmith = {};

AgentSmith.Matrix = function(rows, cols) {
	this.rows = rows;
	this.cols = cols;
	this.length = rows * cols;
	this.datum_type = Float64Array
	this.data = new this.datum_type(this.length);
};

(function() {
	var M = AgentSmith.Matrix;
	var P = M.prototype;
	
	P.getShape = function() {
		return { rows : this.rows, cols : this.cols };
	};
	
	P.get = function(row, col) {
		if (row >= this.rows || col >= this.cols) {
			throw new Error('out of range');
		}
		return this.data[row * this.cols + col];
	};
	
	P.set = function(row, col, datum) {
		if (row >= this.rows || col >= this.cols) {
			throw new Error('out of range');
		}
		this.data[row * this.cols + col] = datum;
		return this;
	};
	
	P.print = function() {
		console.log(this.toString());
	};
	
	P.toString = function() {
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
				write_buf += formatWidth(isInt(this.get(row, col)) ? String(this.get(row, col)) : this.get(row, col).toFixed(6), 10);
			}
			if (row != this.rows - 1) { write_buf += '\r\n'; }
		}
		return write_buf;
	};
	
	P.map = function(func) {
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				this.set(row, col, func(this.get(row, col), row, col));
			}
		}
		return this;
	};
	
	P.setEach = function(func) {
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				this.set(row, col, func(row, col));
			}
		}
		return this;
	};
	
	P.t = function() {
		var newM = new M(this.cols, this.rows);
		newM.map(function(datum, row, col) {
			return this.get(col, row);
		}.bind(this));
		return newM;
	};
	
	P.clone = function() {
		var newM = new M(this.rows, this.cols);
		newM.data = new this.datum_type(this.data);
		return newM;
	};
	
	P.reshape = function(rows, cols) {
		if (rows * cols !== this.rows * this.cols) {
			console.error('shape does not match');
		}
		this.rows = rows;
		this.cols = cols;
		return this;
	};
	
	P.alias = function() {
		var newM = new M(this.rows, this.cols);
		newM.data = this.data;
		return newM;
	};
	
	P.random = function(min, max) {
		if (typeof min === 'undefined') {
			var min = 0.0;
		}
		if (typeof max === 'undefined') {
			var max = 1.0;
		}
		this.setEach(function(row, col) { return min + (max - min) * Math.random(); });
		return this;
	};
	
	P.argmax = function() {
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
	
	M.add = function(mat1, mat2) {
		var newM = new M(mat1.rows, mat1.cols);
		newM.setEach(function(row, col) {
			return mat1.get(row, col) + mat2.get(row, col);
		});
		return newM;
	};
	
	M.sub = function(mat1, mat2) {
		var newM = new M(mat1.rows, mat1.cols);
		newM.setEach(function(row, col) {
			return mat1.get(row, col) - mat2.get(row, col);
		});
		return newM;
	};
	
	M.mul = function(mat1, mat2) {
		if (typeof mat1 === 'number' && typeof mat2 !== 'number') {
			return mat2.clone().map(function(datum) { return datum * mat1; });
		}
		if (typeof mat2 === 'number' && typeof mat1 !== 'number') {
			return M.mul(mat2, mat1);
		}
		if (typeof mat1 === 'number' && typeof mat2 === 'number') {
			return mat1 * mat2;
		}
		if (mat1.cols !== mat2.rows) {
			throw new Error('shape does not match');
		}
		var newM = new M(mat1.rows, mat2.cols);
		newM.setEach(function(row, col) {
			var tmp = 0;
			for (var i = 0; i < mat1.cols; i++) {
				tmp += mat1.get(row, i) * mat2.get(i, col);
			}
			return tmp;
		});
		return newM;
	};
	
	M.mulEach = function(mat1, mat2) {
		if (mat1.rows !== mat2.rows || mat1.cols !== mat2.cols) {
			throw new Error('shape does not match');
		}
		var newM = new M(mat1.rows, mat1.cols);
		newM.setEach(function(row, col) {
			return mat1.get(row, col) * mat2.get(row, col);
		});
		return newM;
	}
	
	M.dot = function(mat1, mat2) {
		if (mat1.rows !== mat2.rows || mat1.cols !== mat2.cols) {
			throw new Error('shape does not match');
		}
		var sum = 0.0;
		for (var i = 0; i < mat1.length; i++) {
			sum += mat1.data[i] * mat2.data[i];
		}
		return sum;
	};
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = AgentSmith;
}