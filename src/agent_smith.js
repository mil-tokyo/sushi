(function() {
	if (typeof AgentSmith !== 'undefined' && typeof AgentSmith.Matrix !== 'undefined') {
		return;
	}
	AgentSmith = {};
	
	AgentSmith.Matrix = function(rows, cols, data) {
		this.rows = rows;
		this.cols = cols;
		this.length = rows * cols;
		this.datum_type = Float32Array;
		this.byte_length = this.length * this.datum_type.BYTES_PER_ELEMENT;
		if (!data) {
			this.data = null;
		} else {
			this.data = data;
		}
		this.row_wise = true;
	};
	
	var $M = AgentSmith.Matrix;
	var $P = AgentSmith.Matrix.prototype;
	
	/* ##### utilities ##### */
	
	$P.syncData = function() {
		if (!this.data) {
			this.data = new this.datum_type(this.length);
		}
	};
	
	$P.destruct = function() { this.data = void 0; };
	
	$M.newMatOrReuseMat = function(rows, cols, mat) {
		if (!mat) {
			return new $M(rows, cols);
		} else if (mat.rows !== rows || mat.cols !== cols) {
			throw new Error('The shape of the matrix to reuse does not match');
		} else {
			mat.rows = rows;
			mat.cols = cols;
			mat.row_wise = true;
			return mat;
		}
	};
	
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
	
	$P.saveString = function(filename, async) {
		if (async) {
			async = true;
		} else {
			async = false;
		}
		var fs = require('fs');
		if (async) {
			fs.writeFile(filename, this.toString() , function (err) {
				if (err) {
					throw new Error(err);
				}
			});
		} else {
			fs.writeFileSync(filename, this.toString());
		}
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
		var digit = Math.max(1, Math.floor(Math.LOG10E * Math.log(Math.max($M.max(this), -$M.min(this)))));
		for (var row = 0; row < this.rows; row++) {
			for (var col = 0; col < this.cols; col++) {
				var tmp = this.get(row, col);
				write_buf += formatWidth(isInt(tmp) ? String(tmp) : tmp.toFixed(6), 10 + digit);
			}
			if (row != this.rows - 1) { write_buf += '\r\n'; }
		}
		return write_buf;
	};
	
	$P.clone = function(output) {
		this.syncData();
		var newM = $M.newMatOrReuseMat(this.rows, this.cols, output);
		newM.syncData();
		newM.copyPropertyFrom(this);
		newM.data = new this.datum_type(this.data);
		return newM;
	};
	
	$P.alias = function() {
		this.syncData();
		var newM = new $M(this.rows, this.cols, null);
		newM.copyPropertyFrom(this);
		newM.data = this.data;
		return newM;
	};
	
	$M.hasNaN = function(mat) {
		mat.syncData();
		for (var i = 0; i < mat.length; i++) {
			if (isNaN(mat.data[i])) {
				return true;
			}
		}
		return false;
	}

	/* #####initializer ##### */
	
	$P.zeros = function(num) {
		if (!num) { var num = 0; }
		this.syncData();
		for (var i = 0; i < this.length; i++) {
			this.data[i] = num;
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
	
	$P.gaussRandom = function() {
		var getGauss = function(mu, std) {
			var a = 1 - Math.random();
			var b = 1 - Math.random();
			var c = Math.sqrt(-2 * Math.log(a));
			if (0.5 - Math.random() > 0) {
				return c * Math.sin(Math.PI * 2 * b) * std + mu;
			} else {
				return c * Math.cos(Math.PI * 2 * b) * std + mu;
			}
		};
		return function(mu, std) {
			this.syncData();
			for (var i = 0; i < this.length; i++) {
				this.data[i] = getGauss(mu, std);
			}
			return this;
		}
	}();
	
	$P.range = function() {
		this.syncData();
		for (var i = 0; i < this.data.length; i++) {
			this.data[i] = i;
		}
		return this;
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
	
	$M.fromColVectors = function(original_vectors, output) {
		if (!(original_vectors instanceof Array)) {
			throw new Error('input must be an array');
		}
		if (original_vectors[0].cols !== 1) {
			throw new Error('vectors must be col vectors');
		}
		var newM = $M.newMatOrReuseMat(original_vectors[0].length, original_vectors.length, output);
		newM.setEach(function(row, col) {
			return original_vectors[col].get(row, 0);
		});
		return newM;
	};
	
	$M.eye = function(size, output) {
		var newM = $M.newMatOrReuseMat(size, size, output);
		newM.syncData();
		for (var i = 0; i < size; i++) {
			newM.data[i * (size + 1)] = 1;
		}
		return newM;
	};
	
	$M.extract = function(mat, offest_row, offset_col, rows, cols) {
		throw new Error('not implemented');
	};
	
	$M.writeSubmat = function(mat, submat, offset_row, offset_col) {
		throw new Error('not implemented');
	};
	
	$P.toJSON = function() {
		this.syncData();
		var bytes = new Uint8Array(this.data.buffer);
		if (nodejs) {
			var base64 = (new Buffer(bytes)).toString("base64");
		} else {
			var binary = '';
			var len = bytes.byteLength;
			for (var i = 0; i < len; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			var base64 = window.btoa(binary);
		}
		
		return {
			rows : this.rows,
			cols : this.cols,
			data : base64,
			row_wise : this.row_wise
		};
	};
	
	$M.fromJSON = function(data) {
		var newM = new $M(data.rows, data.cols, null);
		newM.row_wise = data.row_wise;
		newM.syncData();
		var ab = newM.data.buffer;
		var bytes = new Uint8Array(ab);
		var base64 = data.data;
		if (nodejs) {
			var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
			var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
			if (base64[base64.length - 1] === "=") {
				bufferLength--;
				if (base64[base64.length - 2] === "=") {
					bufferLength--;
				}
			}
			if (bufferLength !== ab.byteLength) {
				throw new Error('length does not match');
			}

			for (i = 0; i < len; i += 4) {
				encoded1 = chars.indexOf(base64[i]);
				encoded2 = chars.indexOf(base64[i + 1]);
				encoded3 = chars.indexOf(base64[i + 2]);
				encoded4 = chars.indexOf(base64[i + 3]);

				bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
				bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
				bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
			}
		} else {
			var binary = window.atob(base64);
			var len = binary.length;
			if (len !== ab.byteLength) {
				throw new Error('length does not match');
			}
			for (var i = 0; i < len; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
		}
		return newM;
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
	$M.max = function(mat) {
		mat.syncData();
		var max_val = mat.data[0];
		for (var row = 0; row < mat.rows; row++) {
			for (var col = 0; col < mat.cols; col++) {
				if (mat.get(row, col) > max_val) {
					max_val = mat.get(row, col);
				}		
			}
		}
		return max_val;
	};
	
	$M.min = function(mat) {
		mat.syncData();
		var min_val = mat.data[0];
		for (var row = 0; row < mat.rows; row++) {
			for (var col = 0; col < mat.cols; col++) {
				if (mat.get(row, col) < min_val) {
					min_val = mat.get(row, col);
				}		
			}
		}
		return min_val;
	};
	
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
	
	$M.sumEachRow = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(mat.rows, 1, output);
		for (var row = 0; row < mat.rows; row++) {
			var tmp = 0;
			for (var col = 0; col < mat.cols; col++) {
				tmp += mat.get(row, col);
			}
			newM.set(row, 0, tmp);
		}
		return newM;
	};
	
	$M.sumEachCol = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(1, mat.cols, output);
		for (var col = 0; col < mat.cols; col++) {
			var tmp = 0;
			for (var row = 0; row < mat.rows; row++) {
				tmp += mat.get(row, col);
			}
			newM.set(0, col, tmp);
		}
		return newM;
	};
	
	$M.maxEachRow = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(mat.rows, 1, output);
		for (var row = 0; row < mat.rows; row++) {
			var tmp = mat.get(row, 0);
			for (var col = 0; col < mat.cols; col++) {
				tmp = Math.max(tmp, mat.get(row, col));
			}
			newM.set(row, 0, tmp);
		}
		return newM;
	};
	
	$M.maxEachCol = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(1, mat.cols, output);
		for (var col = 0; col < mat.cols; col++) {
			var tmp = mat.get(0, col);
			for (var row = 0; row < mat.rows; row++) {
				tmp = Math.max(tmp, mat.get(row, col));
			}
			newM.set(0, col, tmp);
		}
		return newM;
	};
	
	$M.argmaxEachRow = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(mat.rows, 1, output);
		for (var row = 0; row < mat.rows; row++) {
			var max = mat.get(row, 0);
			var arg = 0;
			for (var col = 0; col < mat.cols; col++) {
				var tmp = mat.get(row, col);
				if (max < tmp) {
					arg = col;
					max = tmp;
				}
			}
			newM.set(row, 0, arg);
		}
		return newM;
	};
	
	$M.argmaxEachCol = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(1, mat.cols, output);
		for (var col = 0; col < mat.cols; col++) {
			var max = mat.get(0, col);
			var arg = 0;
			for (var row = 0; row < mat.rows; row++) {
				var tmp = mat.get(row, col);
				if (max < tmp) {
					arg = row;
					max = tmp;
				}
			}
			newM.set(0, col, arg);
		}
		return newM;
	};
	
	$M.argminEachRow = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(mat.rows, 1, output);
		for (var row = 0; row < mat.rows; row++) {
			var max = mat.get(row, 0);
			var arg = 0;
			for (var col = 0; col < mat.cols; col++) {
				var tmp = mat.get(row, col);
				if (max > tmp) {
					arg = col;
					max = tmp;
				}
			}
			newM.set(row, 0, arg);
		}
		return newM;
	};
	
	$M.argminEachCol = function(mat, output) {
		mat.syncData();
		var newM = $M.newMatOrReuseMat(1, mat.cols, output);
		for (var col = 0; col < mat.cols; col++) {
			var max = mat.get(0, col);
			var arg = 0;
			for (var row = 0; row < mat.rows; row++) {
				var tmp = mat.get(row, col);
				if (max > tmp) {
					arg = row;
					max = tmp;
				}
			}
			newM.set(0, col, arg);
		}
		return newM;
	};
	

	/* ##### basic calculation ##### */
	
	var eachOperationPGenerator = function(op) {
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
			"		var this_data = this.data;														",
			"		var mat_data = mat.data;														",
			"		if (this.rows === mat.rows && this.cols === mat.cols) {									",
			"			if (this.row_wise == mat.row_wise) {												",
			"				for (var i = 0; i < this.length; i++) {											",
			"					this_data[i] " + op + "= mat_data[i];										",
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
			"						this_data[row * this.cols + col] " + op + "= mat_data[row];				",
			"					}																			",
			"				}																				",
			"			} else {																			",
			"				for (var col = 0; col < mat.cols; col++) {										",
			"					for (var row = 0; row < this.rows; row++) {									",
			"						this_data[row * this.cols + col] " + op + "= mat_data[col];				",
			"					}																			",
			"				}																				",
			"			}																					",
			"		} else {																				",
			"			if (mat.cols ===1) {																",
			"				for (var row = 0; row < mat.rows; row++) {										",
			"					for (var col = 0; col < this.cols; col++) {									",
			"						this_data[col * this.rows + row] " + op + "= mat_data[row];				",
			"					}																			",
			"				}																				",
			"			} else {																			",
			"				for (var col = 0; col < mat.cols; col++) {										",
			"					for (var row = 0; row < this.rows; row++) {									",
			"						this_data[col * this.rows + row] " + op + "= mat_data[col];				",
			"					}																			",
			"				}																				",
			"			}																					",
			"		}																						",
			"		return this;																			",
			"	});																							"
			].join('\r\n')
		);
	};
	
	var eachOperationMGenerator = function(op) {
		return eval(
			[
			"	(function(mat1, mat2, output) {																",
			"		mat1.syncData();																		",
			"		mat2.syncData();																		",
			"		if (!( (mat1.rows === mat2.rows && mat1.cols === mat2.cols) || 							",
			"			   (mat1.rows === mat2.rows && mat2.cols === 1) ||									",
			"			   (mat1.cols === mat2.cols && mat2.rows === 1) ) ) {								",
			"			throw new Error('shape does not match');											",
			"		}																						",
			"		var newM = $M.newMatOrReuseMat(mat1.rows, mat1.cols, output);							",
			"		newM.syncData();																		",
			"		var newM_data = newM.data;																",
			"		var mat1_data = mat1.data;																",
			"		var mat2_data = mat2.data;																",
			"		if (mat1.rows === mat2.rows && mat1.cols === mat2.cols) {								",
			"			if (mat1.row_wise && mat2.row_wise) {												",
			"				for (var i = 0; i < newM.length; i++) {											",
			"					newM_data[i] = mat1_data[i] " + op + " mat2_data[i];						",
			"				}																				",
			"			} else {																			",
			"				for (var row = 0; row < mat1.rows; row++) {										",
			"					for (var col = 0; col < mat1.cols; col++) {									",
			"						newM.set(row, col, mat1.get(row, col) " + op + " mat2.get(row, col));	",
			"					}																			",
			"				}																				",
			"			}																					",
			"		} else if (mat1.row_wise) {																",
			"			if (mat2.cols ===1) {																",
			"				for (var row = 0; row < mat1.rows; row++) {										",
			"					for (var col = 0; col < mat1.cols; col++) {									",
			"						newM_data[row * newM.cols + col] = 										",
			"							mat1_data[row * mat1.cols + col] " + op + " mat2_data[row];			",
			"					}																			",
			"				}																				",
			"			} else {																			",
			"				for (var col = 0; col < mat1.cols; col++) {										",
			"					for (var row = 0; row < mat1.rows; row++) {									",
			"						newM_data[row * newM.cols + col] = 										",
			"							mat1_data[row * mat1.cols + col] " + op + " mat2_data[col];			",
			"					}																			",
			"				}																				",
			"			}																					",
			"		} else {																				",
			"			if (mat2.cols ===1) {																",
			"				for (var row = 0; row < mat1.rows; row++) {										",
			"					for (var col = 0; col < mat1.cols; col++) {									",
			"						newM_data[row * newM.cols + col] =										",
			"							mat1_data[col * mat1.rows + row] " + op + " mat2_data[row];			",
			"					}																			",
			"				}																				",
			"			} else {																			",
			"				for (var col = 0; col < mat1.cols; col++) {										",
			"					for (var row = 0; row < mat1.rows; row++) {									",
			"						newM_data[row * newM.cols + col] = 										",
			"							mat1_data[col * mat1.rows + row] " + op + " mat2_data[col];			",
			"					}																			",
			"				}																				",
			"			}																					",
			"		}																						",
			"		return newM;																			",
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
	
	$P.add = eachOperationPGenerator("+");
	
	$M.add = eachOperationMGenerator("+");
	
	$P.sub = eachOperationPGenerator("-");
	
	$M.sub = eachOperationMGenerator("-");
	
	$P.mulEach = eachOperationPGenerator("*");
	
	$M.mulEach = eachOperationMGenerator("*");
	
	$P.divEach = eachOperationPGenerator("/");
	
	$M.divEach = eachOperationMGenerator("/");
	
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
	
	$P.mul = function(mat, output) {
		return $M.mul(this, mat, output);
	};
	
	$M.mul = function() {
		var mulGenerator = function(mat1_row_zero_to_idx, mat1_idx_skip, mat2_zero_col_to_idx, mat2_idx_skip) {
			return eval([
				"(function(mat1, mat2, output) {														",
				"	mat1.syncData();																	",
				"	mat2.syncData();																	",
				"	if (mat1.cols !== mat2.rows) {														",
				"		throw new Error('shape does not match');										",
				"	}																					",
				"	var newM = $M.newMatOrReuseMat(mat1.rows, mat2.cols, output);						",
				"	newM.syncData();																	",
				"	var tmp = 0;																		",
				"	var newM_data = newM.data; var mat1_data = mat1.data; var mat2_data = mat2.data;	",
				"	var newM_cols = newM.cols; var mat1_cols = mat1.cols; var mat2_cols = mat2.cols;	",
				"	var newM_rows = newM.rows; var mat1_rows = mat1.rows; var mat2_rows = mat2.rows;	",
				"	var newM_idx = 0;																	",
				"	for (var row = 0; row < newM_rows; row++) {											",
				"		for (var col = 0; col < newM_cols; col++) {										",
				"			var tmp = 0.0;																",
				"			var mat1_idx = " + mat1_row_zero_to_idx('row') + ";							",
				"			var mat2_idx = " + mat2_zero_col_to_idx('col') + ";							",
				"			for (var i = 0; i < mat1_cols; i++) {										",
				"				tmp += mat1_data[mat1_idx] * mat2_data[mat2_idx];						",
				"				mat1_idx += " + mat1_idx_skip + ";										",
				"				mat2_idx += " + mat2_idx_skip + ";										",
				"			}																			",
				"			newM_data[newM_idx++] = tmp;												",
				"		}																				",
				"	}																					",
				"	return newM;																		",
				"});																					"
			].join('\r\n'));
		};
		var mulRowRow = mulGenerator(
			function(row) { return [row,' * mat1_cols'].join('') }, 1,
			function(col) { return [col].join('') }, 'mat2_cols'
		);
		var mulRowCol = mulGenerator(
			function(row) { return [row,' * mat1_cols'].join('') }, 1,
			function(col) { return [col,' * mat2_rows'].join('') }, 1
			);
		var mulColRow = mulGenerator(
			function(row) { return [row].join('') }, 'mat1_rows',
			function(col) { return [col].join('') }, 'mat2_cols'
			);
		var mulColCol = mulGenerator(
			function(row) { return [row].join('') }, 'mat1_rows',
			function(col) { return [col,' * mat2_rows'].join('') }, 1
		);
		return function(mat1, mat2, output) {
			if (mat1.row_wise && mat2.row_wise) {
				return mulRowRow(mat1, mat2, output);
			} else if (mat1.row_wise && !mat2.row_wise) {
				return mulRowCol(mat1, mat2, output);
			} else if (!mat1.row_wise && mat2.row_wise) {
				return mulColRow(mat1, mat2, output);
			} else if (!mat1.row_wise && !mat2.row_wise) {
				return mulColCol(mat1, mat2, output);
			} else {
				throw new Error('mysterious error')
			}
		};
	}();
	
	/* ##### advanced calculation ##### */
	
	$M.convolve = function(mat1, mat2, mode, output) {
		throw new Error('not implemented');
	};
	
	$M.upperTriangular = function(mat, output) {
		var newM = mat.clone(output);
		var rows = newM.rows;
		var cols = newM.cols;
		newM.syncData();
		var newM_data = newM.data;
		if (mat.row_wise) {
			for (var col = 0; col < cols; col++) {
				if (newM_data[col + cols * col] === 0) {
					for (var row = col + 1; row < rows; row++) {
						if (newM_data[col + cols * row] !== 0) {
							for (var i = col; i < cols; i++) {
								newM_data[i + cols * col] += newM_data[i + cols * row];
							}
							break;
						}
					}
				}
				if (newM_data[col + cols * col] !== 0) {
					for (var row = col + 1; row < rows; row++) {
						var multiplier = newM_data[col + cols * row] / newM_data[col + cols * col];
						newM_data[col + cols * row] = 0;
						for (var i = col + 1; i < cols; i++) {
							newM_data[i + cols * row] -= newM_data[i + cols * col] * multiplier;
						}
					}
				}
			}
		} else {
			for (var col = 0; col < cols; col++) {
				if (newM_data[col + cols * col] === 0) {
					for (var row = col + 1; row < rows; row++) {
						if (newM_data[rows * col + row] !== 0) {
							for (var i = col; i < cols; i++) {
								newM_data[rows * i + col] += newM_data[rows * i + row];
							}
							break;
						}
					}
				}
				if (newM_data[col + cols * col] !== 0) {
					for (var row = col + 1; row < rows; row++) {
						var multiplier = newM_data[rows * col + row] / newM_data[rows * col + col];
						newM_data[rows * col + row] = 0;
						for (var i = col + 1; i < cols; i++) {
							newM_data[rows * i + row] -= newM_data[rows * i + col] * multiplier;
						}
					}
				}
			}
		}
		return newM;
	};
	
	$P.det = function() {
		if (this.rows !== this.cols) {
			throw new Error('the matrix must be square');
		}
		this.syncData();
		if (this.rows === 2) {
			return this.data[0] * this.data[3] - this.data[1] * this.data[2];
		} else {
			var ut = $M.upperTriangular(this);
			ut.syncData();
			var det = ut.data[0];
			for (var i = 0; i < ut.rows; i++) {
				det *= ut.data[i * (ut.rows + 1)];
			}
			return det;
		}
	};
	
	$P.inverse = function() {
		if (this.rows !== this.cols) {
			throw new Error('the matrix must be square');
		}
		var rows = this.rows;
		var cols = this.cols;
		
		// make jointed upper triangular matrix
		var tmp_mat = new $M(rows, cols * 2);
		this.syncData();
		tmp_mat.syncData();
		this_data = this.data;
		tmp_mat_data = tmp_mat.data;
		if (this.row_wise) {
			for (var row = 0; row < rows; row++) {
				for (var col = 0; col < cols; col++) {
					tmp_mat_data[col + (cols * 2) * row] = this_data[col + cols * row];
					tmp_mat_data[col + cols + (cols * 2) * row] = (row === col ? 1 : 0);
				}
			}
		} else {
			for (var row = 0; row < rows; row++) {
				for (var col = 0; col < cols; col++) {
					tmp_mat_data[col + (cols * 2) * row] = this_data[row + rows * col];
					tmp_mat_data[col + cols + (cols * 2) * row] = (row === col ? 1 : 0);
				}
			}
		}
		var tri_mat = $M.upperTriangular(tmp_mat);
		tri_mat.syncData();
		var tri_mat_data = tri_mat.data;
		
		// normalize
		for (var i = 0; i < rows; i++) {
			var multiply = tri_mat_data[i + (cols * 2) * i];
			if (multiply === 0) {
				throw new Error('the matrix is singular');
			}
			tri_mat_data[i + (cols * 2) * i] = 1;
			for (var j = 0; j < cols; j++) {
				tri_mat_data[j + i + 1 + (cols * 2) * i] /= multiply;
			}
		}
		
		// inverse
		for (var row_p = rows - 1; row_p >= 0; row_p--) {
			for (var row = row_p - 1; row >= 0; row--) {
				for (var col = 0; col < cols; col++) {
					tri_mat_data[cols + col + (cols * 2) * row] -=
						tri_mat_data[cols + col + (cols * 2) * row_p] * tri_mat_data[row_p + (cols * 2) * row];
				}
			}
		}
		var return_mat = new $M(rows, cols);
		return_mat.syncData();
		var return_mat_data = return_mat.data;
		for (var row = 0; row < rows; row++) {
			for (var col = 0; col < cols; col++) {
				return_mat_data[col + cols * row] = tri_mat_data[cols + col + (cols * 2) * row];
			}
		}
		
		tri_mat.destruct();
		tmp_mat.destruct();
		return return_mat;
	};
	
	$M.qr = function(A) {
		// http://www.riken.jp/brict/Ijiri/study/QRfactorization.htm
		var n = A.rows;
		var m = A.cols;
		if (n < m) {
			throw new Error('rows must be equal to or greater than cols');
		}
		
		// Gram-Schmidt orthonormalization
		var B = A.clone();
		A.syncData();
		B.syncData();
		var X = new $M(m, m);
		X.syncData();
		var calcXij = function(i, j) {
			// A and B have the same "row_wise"
			var offset_A = A.row_wise ? j : j * A.rows;
			var offset_B = A.row_wise ? i : i * A.rows;
			var skip = A.row_wise ? A.cols : 1;
			var dividend = 0;
			var divisor = 0;
			for (var k = 0; k < A.rows; k++) {
				dividend += A.data[offset_A] * B.data[offset_B];
				divisor += B.data[offset_B] * B.data[offset_B];
				offset_A += skip;
				offset_B += skip;
			}
			return dividend / divisor;
		};
		
		for (var i = 0; i < m; i++) {
			for (var j = 0; j < i; j++) {
				var xji = calcXij(j, i);
				var offset_Bi = B.row_wise ? i : i * B.rows;
				var offset_Bj = B.row_wise ? j : j * B.rows;
				var skip = B.row_wise ? B.cols : 1;
				for (var row = 0; row < n; row++) {
					B.data[offset_Bi] -= xji * B.data[offset_Bj];
					offset_Bi += skip;
					offset_Bj += skip;					
				}
				X.data[i + X.cols * j] = xji;
			}
			X.data[i + X.cols * i] = 1;
		}
		
		// normalization
		var Q = new $M(n, n);
		Q.syncData();
		for (var row = 0; row < n; row++) {
			var offset = B.row_wise ? B.cols * row : row;
			var skip = B.row_wise ? 1 : B.rows;
			for (var col = 0; col < m; col++) {
				Q.data[col + Q.cols * row] = B.data[offset];
				offset += skip;
			}
		}
		for (var col = 0; col < m; col++) {
			var sum = 0;
			for (var row = 0; row < n; row++) {
				sum += Q.data[col + row * n] * Q.data[col + row * n]
			}
			sum = Math.sqrt(sum);
			for (var row = 0; row < n; row++) {
				Q.data[col + row * n] /= sum;
			}
			for (var i = 0; i < m; i++) {
				X.data[i + col * m] *= sum;
			}			
		}
		
		// expansion
		for (var i = m; i < n; i++) {
			Q.data[i + i * n] = 1;
			for (var j = 0; j < i; j++) {
				// calcXij
				var dividend = Q.data[j + i * n];
				var divisor = 0;
				for (var k = 0; k < n; k++) {
					divisor += Q.data[j + k * n] * Q.data[j + k * n];
				}
				var multiplier = dividend / divisor;
				for (var row = 0; row < n; row++) {
					Q.data[i + row * n] -= multiplier * Q.data[j + row * n];
				}
			}
			var sum = 0;
			for (var row = 0; row < n; row++) {
				sum += Q.data[i + row * n] * Q.data[i + row * n]
			}
			sum = Math.sqrt(sum);
			for (var row = 0; row < n; row++) {
				Q.data[i + row * n] /= sum;
			}
		}
		var R = new $M(n, m);
		R.syncData();
		for (var i = 0; i < X.length; i++) {
			R.data[i] = X.data[i];
		}
		
		return { Q : Q, R : R };
	}
	
	$M.eig = function(A, tolerance) {
		// http://na-inet.jp/nasoft/chap11.pdf
		if (A.rows !== A.cols) {
			throw new Error('the matrix must be square');
		}
		if (!tolerance) {
			tolerance = 0.01;
		}
		// calculate eigenvalue using qr decomposition
		var converged = function(mat) {
			mat.syncData();
			var max_diff = 0;
			for (var row = 0; row < mat.rows; row++) {
				for (var col = 0; col < row; col++) {
					max_diff = Math.max(max_diff, Math.abs(mat.data[col + row * mat.cols]));
				}
			}
			return max_diff < tolerance;
		};
		for (var i = 0; i < 1000; i++) {
			var qr = $M.qr(A);
			var Q = qr.Q;
			var R = qr.R;
			A = R.mul(Q);
			if (converged(A)) { break; }
		}
		
		var eigen_values = [];
		A.syncData();
		for (var i = 0; i < A.cols; i++) {
			eigen_values.push(A.data[i * (A.cols + 1)]);
		}
		console.log(eigen_values);
		
		// calculate eigenvector using inverse iteration method
		// http://okwave.jp/qa/q712683.html
		for (var i = 0; i < eigen_values.length; i++) {
			
		}
		
		return {
			eigen_values : eigen_values,
			eigen_vectors : [] 
		};
	};

	/* ##### large matrix calculation ##### */
	
	$P.largeAdd = $P.add;
	$P.largeSub = $P.sub;
	$P.largeMulEach = $P.mulEach;
	$P.largeDivEach = $P.divEach;
	$P.largeMul = $P.mul;
	$P.largeTimes = $P.times;
	$P.largeClone = $P.clone;
	$P.largeZeros = $P.zeros;
	
	$M.largeAdd = $M.add;
	$M.largeSub = $M.sub;
	$M.largeMulEach = $M.mulEach;
	$M.largeDivEach = $M.divEach;
	$M.largeMul = $M.mul;
	$M.largeSum = $M.sum;
	
	$M.largeSumEachRow = $M.sumEachRow;
	$M.largeSumEachCol = $M.sumEachCol;
	$M.largeMaxEachRow = $M.maxEachRow;
	$M.largeMaxEachCol = $M.maxEachCol;
	$M.largeArgmaxEachRow = $M.argmaxEachRow;
	$M.largeArgmaxEachCol = $M.argmaxEachCol;
	$M.largeArgminEachRow = $M.argminEachRow;
	$M.largeArgminEachCol = $M.argminEachCol;
	$M.largeConvolve = $M.convolve;
	$M.largeExtract = $M.extract;
	$M.largeWriteSubmat = $M.writeSubmat;
})();

var nodejs = (typeof window === 'undefined');
if (nodejs) {
	module.exports = AgentSmith;
}
