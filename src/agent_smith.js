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
	
	P.get = function(row, col) {
		return this.data[row * this.cols + col];
	};
	
	P.set = function(row, col, datum) {
		this.data[row * this.cols + col] = datum;
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
		var write_buf = '-- Matrix (' + this.rows + ' x ' + this.cols + ') --';
		write_buf += '\r\n';
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				write_buf += formatWidth(String(this.get(row, col)), 10);
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
	};
	
	M.add = function(mat1, mat2) {
		var newM = new M(mat1.rows, mat1.cols);
		newM.map(function(datum, row, col) {
			return mat1.get(row, col) + mat2.get(row, col);
		});
		return newM;
	};
	
	M.sub = function(mat1, mat2) {
		var newM = new M(mat1.rows, mat1.cols);
		newM.map(function(datum, row, col) {
			return mat1.get(row, col) - mat2.get(row, col);
		});
		return newM;
	};
	
	M.mul = function(mat1, mat2) {
		var newM = new M(mat1.rows, mat2.cols);
		newM.map(function(datum, row, col) {
			var tmp = 0;
			for (var i = 0; i < mat1.cols; i++) {
				tmp += mat1.get(row, i) * mat2.get(i, col);
			}
			return tmp;
		});
		return newM;
	}
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = AgentSmith;
}