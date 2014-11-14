if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	AgentSmith = require('./agent_smith');
}

if (typeof AgentSmith === 'undefined' || typeof AgentSmith.Matrix === 'undefined') {
	throw new Error('AgentSmith.Matrix is not loaded');
}

(function() {
	var nodejs = (typeof window === 'undefined');
	if (nodejs) {
		var node_webcl_root = '../../node_modules/node-webcl'; // depends on the environment
		try {
			WebCL = require(node_webcl_root + '/webcl');
		} catch (e) {
			WebCL = void 0;
		}
	} else {
		WebCL = window.webcl;
	}
	
	if (WebCL === void 0) {
		console.error('WebCL is not supported in this environment');
		return;
	}

	var $M = AgentSmith.Matrix;
	$M.CL = {};
	var $CL = $M.CL;
	var $P = $M.prototype;
	
	// Prepare WebCL and functions
	(function () {
		var platformList = WebCL.getPlatforms();
		$CL.platform = platformList[0];
		$CL.platform_info = $CL.platform.getInfo(WebCL.PLATFORM_NAME);
		$CL.devices = $CL.platform.getDevices(WebCL.DEVICE_TYPE_DEFAULT);
		$CL.device_info = $CL.devices[0].getInfo(WebCL.DEVICE_NAME);
		
		if (nodejs) {
			$CL.context = WebCL.createContext({
				deviceType : WebCL.DEVICE_TYPE_DEFAULT,
				platform : $CL.platform
			});
			$CL.kernelSetArg = function(kernel, idx, param, type) {
				kernel.setArg(idx, param, type);
			};
		} else {
			$CL.context = WebCL.createContext();
			WebCL.type = {
				CHAR: 0,
				UCHAR: 1,
				SHORT: 2,
				USHORT: 3,
				INT: 4,
				UINT: 5,
				LONG: 6,
				ULONG: 7,
				FLOAT: 8,
				HALF: 9,
				DOUBLE: 10,
				QUAD: 11,
				LONG_LONG: 12,
				VEC2: 65536,
				VEC3: 131072,
				VEC4: 262144,
				VEC8: 524288,
				VEC16: 1048576,
				LOCAL_MEMORY_SIZE: 255
			};
			$CL.kernelSetArg = function(kernel, idx, param, type) {
				if (type !== void 0) {
					switch (type) {
						case WebCL.type.UINT:
							param = new Uint32Array([param]);
							break;
						case WebCL.type.INT:
							param = new Int32Array([param]);
							break;
						case WebCL.type.FLOAT:
							param = new Float32Array([param]);
							break;
					}
				}
				kernel.setArg(idx, param);
			};
		}
		
		var queue = $CL.context.createCommandQueue($CL.devices[0], 0);
		
		$P.syncData = function() {
			// there being buffer means data is obsolete
			if (this.buffer) {
				if (this.data === null) {
					this.data = new this.datum_type(this.length);
				}
				// console.trace("Write Back!! This may cause the slower calculation.");
				queue.enqueueReadBuffer(this.buffer, true, 0, this.byte_length, this.data);
				this.buffer.release();
				this.buffer = null;
			}
		};
		
		$P.destruct = function() {
			this.data = void 0;
			if (this.buffer) {
				this.buffer.release();
				this.buffer = void 0;
			}
		};
		
		$CL.createKernel = function(code) {
			var program = $CL.context.createProgram(code);
			program.build($CL.devices);
			return program.createKernel('kernel_func');
		};
		
		$CL.executeKernel = function() {
			var localWS = [12];
			
			return function(kernel, params, parallelization) {
				for (var i = 0; i < params.length; i++) {
					if (params[i].type === void 0) {
						// matrix
						if (!params[i].datum.buffer) {
							params[i].datum.buffer = $CL.context.createBuffer(WebCL.MEM_READ_WRITE, params[i].datum.byte_length);
							if (params[i].access !== WebCL.MEM_WRITE_ONLY) {
								queue.enqueueWriteBuffer(params[i].datum.buffer, false, 0, params[i].datum.byte_length, params[i].datum.data);
							}
						}
						$CL.kernelSetArg(kernel, i, params[i].datum.buffer);
					} else {
						// native type
						$CL.kernelSetArg(kernel, i, params[i].datum, params[i].type);
					}
				};

				var globalWS = [Math.ceil(parallelization / localWS) * localWS];
	
				// Execute kernel
				if (nodejs) {
					queue.enqueueNDRangeKernel(kernel, null, globalWS, localWS);
				} else {
					queue.enqueueNDRangeKernel(kernel, globalWS.length, null, globalWS, localWS);
				}
			};
		}();
	})();

	$CL.eachOperationGenerator = function(id, operator) {
		// if the wises are same
		var kernel1 = $CL.createKernel([
			"__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements) ",
			"{                                                                           ",
			"    size_t i =  get_global_id(0);                                           ",
			"    if(i >= iNumElements) return;                                           ",
			"    a[i] = a[i] " + operator + " b[i];                                      ",
			"}                                                                           "].join('\r\n')
		);
		// different wises
		var kernel2 = $CL.createKernel([
			"__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols) ",
			"{                                                                           ",
			"    size_t i =  get_global_id(0);                                           ",
			"    if(i >= iNumElements) return;                                           ",
			"    a[i] = a[i] " + operator + " b[(i % cols) * rows + i / cols];           ",
			"}                                                                           "].join('\r\n')
		);
		
		// different wises (particularly for incommutable function)
		var kernel3 = $CL.createKernel([
			"__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols) ",
			"{                                                                                             ",
			"    size_t i =  get_global_id(0);                                                             ",
			"    if(i >= iNumElements) return;                                                             ",
			"    a[(i % cols) * rows + i / cols] = a[(i % cols) * rows + i / cols] " + operator + " b[i];  ",
			"}                                                                                             "].join('\r\n')
		);
		
		// broadcast 1
		var kernel4 = $CL.createKernel([
			"__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint b_length) ",
			"{                                                                                             ",
			"    size_t i =  get_global_id(0);                                                             ",
			"    if(i >= iNumElements) return;                                                             ",
			"    a[i] = a[i] " + operator + " b[i % b_length];                                             ",
			"}                                                                                             "].join('\r\n')
		);
		
		// broadcast 2
		var kernel5 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint b_skip) ",
				"{                                                                                             ",
				"    size_t i =  get_global_id(0);                                                             ",
				"    if(i >= iNumElements) return;                                                             ",
				"    a[i] = a[i] " + operator + " b[i / b_skip];                                               ",
				"}                                                                                             "].join('\r\n')
			);
		
		return function(mat1, mat2) {
			if (!(
				(mat1.rows === mat2.rows && mat1.cols === mat2.cols) ||
				(mat1.rows === mat2.rows && mat2.cols === 1) ||
				(mat1.cols === mat2.cols && mat2.rows === 1) ) ) {
					throw new Error('shape does not match');
			}
			var kernel_to_use = null;
			if (mat1.rows === mat2.rows && mat1.cols === mat2.cols) {
				if (mat1.row_wise === mat2.row_wise) {
					kernel_to_use = kernel1;
				} else if (mat1.row_wise === true) {
					kernel_to_use = kernel2;
				} else {
					kernel_to_use = kernel3;
				}
			} else if ((mat1.row_wise && mat2.rows === 1) || (!mat1.row_wise && mat2.cols === 1)) {
				// broadcast 1
				kernel_to_use = kernel4;
			} else {
				// broadcast 2
				kernel_to_use = kernel5;
			}
			
			var params = [
				{ access : WebCL.MEM_READ_WRITE, datum : mat1 },
				{ access : WebCL.MEM_READ_ONLY, datum : mat2 },
				{ datum : mat1.length, type : WebCL.type.UINT }
			];
			if (kernel_to_use === kernel2 || kernel_to_use === kernel3) {
				params.push({ datum : mat1.rows, type : WebCL.type.UINT });
				params.push({ datum : mat1.cols, type : WebCL.type.UINT });
			} else if (kernel_to_use === kernel4) {
				params.push({ datum : mat2.length, type : WebCL.type.UINT });
			} else if (kernel_to_use === kernel5) {
				params.push({ datum : mat1.length / mat2.length, type : WebCL.type.UINT });
			}
			
			$CL.executeKernel(kernel_to_use, params, mat1.length);
		};
	};
	
	$CL.mapGenerator = function(expression_ai) {
		// if the wises are same
		var kernel = $CL.createKernel([
			"__kernel void kernel_func(__global float *a, uint iNumElements) ",
			"{                                                                           ",
			"    size_t i =  get_global_id(0);                                           ",
			"    if(i >= iNumElements) return;                                           ",
			"    a[i] = " + expression_ai + ";                                            ",
			"}                                                                           "].join('\r\n')
		);
		
		return function(mat) {
			var params = [
				{ access : WebCL.MEM_READ_WRITE, datum : mat },
				{ datum : mat.length, type : WebCL.type.UINT }
			];
			$CL.executeKernel(kernel, params, mat.length);
		};
	};
	
	$CL.add = $CL.eachOperationGenerator('add', '+');
	
	$CL.sub = $CL.eachOperationGenerator('sub', '-');
	
	$CL.mulEach = $CL.eachOperationGenerator('mulEach', '*');
	
	$CL.divEach = $CL.eachOperationGenerator('divEach', '/');
	
	$CL.mul = function() {
		var kernel1 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    c[i] = 0.0;                                                             ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        c[i] += a[row * width + j] * b[j * cols + col];                     ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		var kernel2 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    c[i] = 0.0;                                                             ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        c[i] += a[row * width + j] * b[j + col * width];                    ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		var kernel3 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    c[i] = 0.0;                                                             ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        c[i] += a[row + j * rows] * b[j * cols + col];                      ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		var kernel4 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    c[i] = 0.0;                                                             ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        c[i] += a[row + j * rows] * b[j + col * width];                     ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		return function(mat1, mat2) {
			if (mat1.cols !== mat2.rows) {
				throw new Error('shape does not match');
			}
			if (mat1.row_wise === true && mat2.row_wise === true) {
				kernel_to_use = kernel1;
			} else if (mat1.row_wise === true && mat2.row_wise === false) {
				kernel_to_use = kernel2;
			} else if (mat1.row_wise === false && mat2.row_wise === true) {
				kernel_to_use = kernel3;
			} else {
				kernel_to_use = kernel4;
			}
			
			var newM = new $M(mat1.rows, mat2.cols, null);
			$CL.executeKernel(
				kernel_to_use,
				[
					{ access : WebCL.MEM_READ_ONLY, datum : mat1 },
					{ access : WebCL.MEM_READ_ONLY, datum : mat2 },
					{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
					{ datum : newM.length, type : WebCL.type.UINT},
					{ datum : newM.rows, type : WebCL.type.UINT},
					{ datum : newM.cols, type : WebCL.type.UINT},
					{ datum : mat1.cols, type : WebCL.type.UINT }
				],
				newM.length
			);
			return newM;
		};
	}();
	
	$CL.convolve = function() {
		var createConvolveKernelCode = function(mat1_row_col_to_idx, mat2_row_col_to_idx) {
			return [
					"__kernel void kernel_func(__global float *mat1, __global float *mat2, __global float *output, uint cols, uint mat1_rows, uint mat1_cols, uint mat2_rows, uint mat2_cols, uint offset_row, uint offset_col, uint iNumElements) ",
					"{                                                                              ",
					"    size_t i =  get_global_id(0);                                              ",
					"    if(i >= iNumElements) return;                                              ",
					"    uint row = i / cols;                                                       ",
					"    uint col = i % cols;                                                       ",
					"    int tmp_row;                                                               ",
					"    int tmp_col;                                                               ",
					"    output[i] = 0.0;                                                           ",
					"    for (uint d_row = 0; d_row < mat2_rows; d_row++) {                          ",
					"        for (uint d_col = 0; d_col < mat2_cols; d_col++) {                      ",
					"            tmp_row = row + d_row - offset_row;                                ",
					"            tmp_col = col + d_col - offset_col;                                ",
					"            if (tmp_row < 0 || tmp_row >= mat1_rows ||                         ",
					"                tmp_col < 0 || tmp_col >= mat1_cols ) {                        ",
					"                continue;                                                      ",
					"            }                                                                  ",
					"            output[i] += mat1[",mat1_row_col_to_idx('tmp_row', 'tmp_col'),"] * ",
					"                    mat2[",mat2_row_col_to_idx('d_row', 'd_col'),"];           ",
					"        }                                                                      ",
					"    }                                                                          ",
					"}                                                                              "].join('\r\n');
		};
		var kernel1 = $CL.createKernel(
				createConvolveKernelCode(
					function(row, col) { return ['mat1_cols * ',row,' + ',col,''].join(''); },
					function(row, col) { return ['mat2_cols * ',row,' + ',col,''].join(''); }
				)
			);
		var kernel2 = $CL.createKernel(
				createConvolveKernelCode(
					function(row, col) { return ['mat1_cols * ',row,' + ',col,''].join(''); },
					function(row, col) { return ['mat2_rows * ',col,' + ',row,''].join(''); }
				)
			);
		var kernel3 = $CL.createKernel(
				createConvolveKernelCode(
					function(row, col) { return ['mat1_rows * ',col,' + ',row,''].join(''); },
					function(row, col) { return ['mat2_cols * ',row,' + ',col,''].join(''); }
				)
			);
		var kernel4 = $CL.createKernel(
				createConvolveKernelCode(
					function(row, col) { return ['mat1_rows * ',col,' + ',row,''].join(''); },
					function(row, col) { return ['mat2_rows * ',col,' + ',row,''].join(''); }
				)
			);
		createConvolveKernelCode = null;
		return function(mat1, mat2, mode) {
			if (mode === 'valid' && mat1.cols < mat2.cols || mat1.rows < mat2.rows) {
				throw new Error('the size of the second matrix must be smaller than that of the first one');
			}
			if (mat1.row_wise === true && mat2.row_wise === true) {
				kernel_to_use = kernel1;
			} else if (mat1.row_wise === true && mat2.row_wise === false) {
				kernel_to_use = kernel2;
			} else if (mat1.row_wise === false && mat2.row_wise === true) {
				kernel_to_use = kernel3;
			} else {
				kernel_to_use = kernel4;
			}
			
			if (mode === 'valid') {
				var newM = new $M(mat1.rows - mat2.rows + 1, mat1.cols - mat2.cols + 1, null);
				var offset_row = 0;
				var offset_col = 0;
			} else if (mode === 'full') {
				var newM = new $M(mat1.rows + mat2.rows - 1, mat1.cols + mat2.cols - 1, null);
				var offset_row = mat2.rows - 1;
				var offset_col = mat2.cols - 1;
			} else if (mode === 'same') {
				var newM = new $M(mat1.rows, mat1.cols, null);
				var offset_row = Math.floor((mat2.rows - 1) / 2);
				var offset_col = Math.floor((mat2.cols - 1) / 2);
			} else {
				throw new Error('the mode is not supported');
			}
			$CL.executeKernel(
				kernel_to_use,
				[
					{ access : WebCL.MEM_READ_ONLY, datum : mat1 },
					{ access : WebCL.MEM_READ_ONLY, datum : mat2 },
					{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
					{ datum : newM.cols, type : WebCL.type.UINT},
					{ datum : mat1.rows, type : WebCL.type.UINT},
					{ datum : mat1.cols, type : WebCL.type.UINT},
					{ datum : mat2.rows, type : WebCL.type.UINT},
					{ datum : mat2.cols, type : WebCL.type.UINT},
					{ datum : offset_row, type : WebCL.type.UINT},
					{ datum : offset_col, type : WebCL.type.UINT},
					{ datum : newM.length, type : WebCL.type.UINT}
				],
				newM.length
			);
			return newM;
		};
	}();
	
	$CL.times = function() {
		var kernel_to_use = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, float b, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    a[i] *= b;                                                              ",
				"}                                                                           "].join('\r\n')
			);
		return function(mat1, times) {
			$CL.executeKernel(
				kernel_to_use,
				[
					{ access : WebCL.MEM_READ_WRITE, datum : mat1 },
					{ datum : times, type : WebCL.type.FLOAT}, 
					{ datum : mat1.length, type : WebCL.type.UINT }
				],
				mat1.length
			);
			return mat1;
		};
	}();
	
	$CL.sumEachRow = function() {
		var kernel1 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, uint cols, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    a[i] = 0;                                                               ",
				"    for (uint j = 0; j < cols; j++) {                                       ",
				"        a[i] += b[i * cols + j];                                            ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		var kernel2 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, uint cols, uint rows, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    a[i] = 0;                                                               ",
				"    for (uint j = 0; j < cols; j++) {                                       ",
				"        a[i] += b[j * rows + i];                                            ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		return function(mat1) {
			if (mat1.row_wise) {
				var newM = new $M(mat1.rows, 1, null);
				$CL.executeKernel(
					kernel1,
					[
						{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
						{ access : WebCL.MEM_READ_ONLY, datum : mat1 },
						{ datum : mat1.cols, type : WebCL.type.UINT}, 
						{ datum : newM.length, type : WebCL.type.UINT }
					],
					newM.length
				);
			} else {
				var newM = new $M(mat1.rows, 1, null);
				$CL.executeKernel(
					kernel2,
					[
						{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
						{ access : WebCL.MEM_READ_ONLY, datum : mat1 },
						{ datum : mat1.cols, type : WebCL.type.UINT},
						{ datum : mat1.rows, type : WebCL.type.UINT},
						{ datum : newM.length, type : WebCL.type.UINT }
					],
					newM.length
				);
			}
			return newM;
		};
	}();

	$CL.sumEachCol = function() {
		var kernel1 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    a[i] = 0;                                                               ",
				"    for (uint j = 0; j < rows; j++) {                                       ",
				"        a[i] += b[i + j * cols];                                            ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		var kernel2 = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    a[i] = 0;                                                               ",
				"    for (uint j = 0; j < rows; j++) {                                       ",
				"        a[i] += b[i * rows + j];                                            ",
				"    }                                                                       ",
				"}                                                                           "].join('\r\n')
			);
		return function(mat1) {
			if (mat1.row_wise) {
				var newM = new $M(1, mat1.cols, null);
				$CL.executeKernel(
					kernel1,
					[
						{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
						{ access : WebCL.MEM_READ_ONLY, datum : mat1 },
						{ datum : mat1.rows, type : WebCL.type.UINT}, 
						{ datum : mat1.cols, type : WebCL.type.UINT}, 
						{ datum : newM.length, type : WebCL.type.UINT }
					],
					newM.length
				);
			} else {
				var newM = new $M(1, mat1.cols, null);
				$CL.executeKernel(
					kernel2,
					[
						{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
						{ access : WebCL.MEM_READ_ONLY, datum : mat1 },
						{ datum : mat1.rows, type : WebCL.type.UINT},
						{ datum : newM.length, type : WebCL.type.UINT }
					],
					newM.length
				);
			}
			return newM;
		};
	}();
	
	$P.alias = function() {
		var newM = new $M(this.rows, this.cols, null);
		newM.copyPropertyFrom(this);
		newM.data = this.data;
		newM.buffer = this.buffer;
		return newM;
	};
	
	$CL.clone = function() {
		var kernel = $CL.createKernel([
				"__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    a[i] = b[i];                                                            ",
				"}                                                                           "].join('\r\n')
			);
		return function(mat) {
			var newM = new $M(mat.rows, mat.cols, null);
			newM.copyPropertyFrom(mat);
			$CL.executeKernel(
					kernel,
					[
						{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
						{ access : WebCL.MEM_READ_ONLY, datum : mat },
						{ datum : newM.length, type : WebCL.type.UINT }
					],
					newM.length
				);
			return newM;
		};
	}();
	
	$CL.extract = function() {
		var createExtractKernelCode = function(input_row_col_to_idx) {
			return [
				"__kernel void kernel_func(__global float *output, __global float *input, uint offset_row, uint offset_col, uint input_rows, uint input_cols, uint cols, uint iNumElements)   ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = offset_row + i / cols;                                       ",
				"    uint col = offset_col + i % cols;                                       ",
				"    output[i] = input[" + input_row_col_to_idx("row", "col") + "];          ",
				"}                                                                           "].join('\r\n');
		};
		var kernel1 = $CL.createKernel(
				createExtractKernelCode(function(row, col) { return ['input_cols * ',row,' + ',col,''].join(''); })
			);
		var kernel2 = $CL.createKernel(
				createExtractKernelCode(function(row, col) { return ['input_rows * ',col,' + ',row,''].join(''); })
			);
		createExtractKernelCode = null;
		return function(mat, offset_row, offset_col, rows, cols) {
			if ((mat.rows < rows + offset_row) || (mat.cols < cols + offset_col)) {
				throw new Error('out of bounds');
			}
			var newM = new $M(rows, cols, null);
			if (mat.row_wise) {
				var kernel_to_use = kernel1;
			} else {
				var kernel_to_use = kernel2;
			}
			$CL.executeKernel(
					kernel_to_use,
					[
						{ access : WebCL.MEM_WRITE_ONLY, datum : newM },
						{ access : WebCL.MEM_READ_ONLY, datum : mat },
						{ datum : offset_row, type : WebCL.type.UINT },
						{ datum : offset_col, type : WebCL.type.UINT },
						{ datum : mat.rows, type : WebCL.type.UINT },
						{ datum : mat.cols, type : WebCL.type.UINT },
						{ datum : cols, type : WebCL.type.UINT },
						{ datum : newM.length, type : WebCL.type.UINT }
					],
					newM.length
				);
			return newM;
		}
	}();
	
	$CL.writeSubmat = function() {
		var createSubMatKernelCode = function(mat_row_col_to_idx, submat_row_col_to_idx) {
			return [
				"__kernel void kernel_func(__global float *mat, __global float *submat, uint offset_row, uint offset_col, uint mat_rows, uint mat_cols, uint submat_rows, uint submat_cols, uint iNumElements)   ",
				"{                                                                              ",
				"    size_t i =  get_global_id(0);                                              ",
				"    if(i >= iNumElements) return;                                              ",
				"    uint row = i / submat_cols;                                                ",
				"    uint col = i % submat_cols;                                                ",
				"    mat[",mat_row_col_to_idx("(offset_row + row)", "(offset_col + col)"),"] =  ",
				"        submat[",submat_row_col_to_idx("row", "col"),"];                       ",
				"}                                                                           "].join('\r\n');
		};
		var kernel1 = $CL.createKernel(
				createSubMatKernelCode(
					function(row, col) { return ['mat_cols * ',row,' + ',col,''].join(''); },
					function(row, col) { return ['submat_cols * ',row,' + ',col,''].join(''); }
				)
			);
		var kernel2 = $CL.createKernel(
				createSubMatKernelCode(
					function(row, col) { return ['mat_cols * ',row,' + ',col,''].join(''); },
					function(row, col) { return ['submat_rows * ',col,' + ',row,''].join(''); }
				)
			);
		var kernel3 = $CL.createKernel(
				createSubMatKernelCode(
					function(row, col) { return ['mat_rows * ',col,' + ',row,''].join(''); },
					function(row, col) { return ['submat_cols * ',row,' + ',col,''].join(''); }
				)
			);
		var kernel4 = $CL.createKernel(
				createSubMatKernelCode(
					function(row, col) { return ['mat_rows * ',col,' + ',row,''].join(''); },
					function(row, col) { return ['submat_rows * ',col,' + ',row,''].join(''); }
				)
			);
		createSubMatKernelCode = null;
		return function(mat, submat, offset_row, offset_col) {
			if ((mat.rows < submat.rows + offset_row) || (mat.cols < submat.cols + offset_col)) {
				throw new Error('out of bounds');
			}
			if (mat.row_wise) {
				if (submat.row_wise) {
					var kernel_to_use = kernel1;
				} else {
					var kernel_to_use = kernel2;
				}
			} else {
				if (submat.row_wise) {
					var kernel_to_use = kernel3;
				} else {
					var kernel_to_use = kernel4;
				}
			}
			$CL.executeKernel(
					kernel_to_use,
					[
						{ access : WebCL.MEM_READ_WRITE, datum : mat },
						{ access : WebCL.MEM_READ_ONLY, datum : submat },
						{ datum : offset_row, type : WebCL.type.UINT },
						{ datum : offset_col, type : WebCL.type.UINT },
						{ datum : mat.rows, type : WebCL.type.UINT },
						{ datum : mat.cols, type : WebCL.type.UINT },
						{ datum : submat.rows, type : WebCL.type.UINT },
						{ datum : submat.cols, type : WebCL.type.UINT },
						{ datum : submat.length, type : WebCL.type.UINT }
					],
					submat.length
				);
			return mat;
		}
	}();
	
	// alter large matrix calculation
	(function() {
		$P.largeAdd = function(mat) { $CL.add(this, mat); return this; };
		$P.largeSub = function(mat) { $CL.sub(this, mat); return this; };
		$P.largeMulEach = function(mat) { $CL.mulEach(this, mat); return this; };
		$P.largeDivEach = function(mat) { $CL.divEach(this, mat); return this; };
		$P.largeMul = function(mat) { return $CL.mul(this, mat); };
		$P.largeTimes = function(times) { return $CL.times(this, times); };
		$P.largeClone = function() { return $CL.clone(this); };
		
		$M.largeAdd = function(mat1, mat2) { return mat1.largeClone().largeAdd(mat2); };
		$M.largeSub = function(mat1, mat2) { return mat1.largeClone().largeSub(mat2); };
		$M.largeMulEach = function(mat1, mat2) { return mat1.largeClone().largeMulEach(mat2); };
		$M.largeDivEach = function(mat1, mat2) { return mat1.largeClone().largeDivEach(mat2); };
		$M.largeMul = $CL.mul;
		$M.largeSum = function(mat) {
			var row_sum = $CL.sumEachRow(mat);
			var col_sum = $CL.sumEachCol(row_sum);
			var sum = col_sum.get(0, 0);
			row_sum.destruct();
			col_sum.destruct();
			return sum;
		};
		
		$M.largeSumEachRow = $CL.sumEachRow;
		$M.largeSumEachCol = $CL.sumEachCol;
		$M.largeConvolve = $CL.convolve;
		$M.largeExtract = $CL.extract;
		$M.largeWriteSubmat = $CL.writeSubmat;
	})();
})();
