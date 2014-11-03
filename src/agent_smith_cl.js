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
		WebCL = require(node_webcl_root + '/webcl');
	} else {
		WebCL = window.webcl;
	}
	
	if (WebCL === void 0) {
		return;
	}

	var $M = AgentSmith.Matrix;
	$M.CL = {};
	var $CL = $M.CL;
	var $P = $M.prototype;
	
	// Prepare WebCL
	var platformList = WebCL.getPlatforms();
	$CL.platform = platformList[0];
	$CL.platform_info = $CL.platform.getInfo(WebCL.PLATFORM_NAME);
	$CL.devices = $CL.platform.getDevices(WebCL.DEVICE_TYPE_DEFAULT);
	$CL.device_info = $CL.devices[0].getInfo(WebCL.DEVICE_NAME);
	// Create command queue
	if (nodejs) {
		var context = WebCL.createContext({
			deviceType : WebCL.DEVICE_TYPE_DEFAULT,
			platform : $CL.platform
		});
		var kernelSetArg = function(kernel, idx, param, type) {
			kernel.setArg(idx, param, type);
		};
	} else {
		var context = WebCL.createContext();
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
		var kernelSetArg = function(kernel, idx, param, type) {
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
	var queue = context.createCommandQueue($CL.devices[0], 0);
	var createKernel = function(name, code) {
		var program = context.createProgram(code);
		program.build($CL.devices);
		return program.createKernel(name);
	};
	// Parallelization parameter
	var localWS = [12];
	var roundUp = function (group_size, global_size) {
		return Math.ceil(global_size / group_size) * group_size;
	};

	var eachOperationGenerator = function(id, operator) {
		// if the wises are same
		var kernel1 = createKernel(
			"kernel_" + id + "_1", [
			"__kernel void kernel_" + id + "_1(__global float *a, __global float *b, uint iNumElements) ",
			"{                                                                           ",
			"    size_t i =  get_global_id(0);                                           ",
			"    if(i >= iNumElements) return;                                           ",
			"    a[i] = a[i] " + operator + " b[i];                                      ",
			"}                                                                           "].join('\r\n')
		);
		// different wises
		var kernel2 = createKernel(
			"kernel_" + id + "_2", [
			"__kernel void kernel_" + id + "_2(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols) ",
			"{                                                                           ",
			"    size_t i =  get_global_id(0);                                           ",
			"    if(i >= iNumElements) return;                                           ",
			"    a[i] = a[i] " + operator + " b[(i % cols) * rows + i / cols];           ",
			"}                                                                           "].join('\r\n')
		);
		
		// different wises (particularly for incommutable function)
		var kernel3 = createKernel(
			"kernel_" + id + "_3", [
			"__kernel void kernel_" + id + "_3(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols) ",
			"{                                                                                             ",
			"    size_t i =  get_global_id(0);                                                             ",
			"    if(i >= iNumElements) return;                                                             ",
			"    a[(i % cols) * rows + i / cols] = a[(i % cols) * rows + i / cols] " + operator + " b[i];  ",
			"}                                                                                             "].join('\r\n')
		);
		
		// broadcast 1
		var kernel4 = createKernel(
			"kernel_" + id + "_4", [
			"__kernel void kernel_" + id + "_4(__global float *a, __global float *b, uint iNumElements, uint b_length) ",
			"{                                                                                             ",
			"    size_t i =  get_global_id(0);                                                             ",
			"    if(i >= iNumElements) return;                                                             ",
			"    a[i] = a[i] " + operator + " b[i % b_length];                                             ",
			"}                                                                                             "].join('\r\n')
		);
		
		// broadcast 2
		var kernel5 = createKernel(
				"kernel_" + id + "_5", [
				"__kernel void kernel_" + id + "_5(__global float *a, __global float *b, uint iNumElements, uint b_skip) ",
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
			// Prepare buffer
			var size1 = mat1.length * Float32Array.BYTES_PER_ELEMENT;
			var size2 = mat2.length * Float32Array.BYTES_PER_ELEMENT;
			var aBuffer = context.createBuffer(WebCL.MEM_READ_WRITE, size1);
			var bBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size2);
			kernelSetArg(kernel_to_use, 0, aBuffer);
			kernelSetArg(kernel_to_use, 1, bBuffer);
			kernelSetArg(kernel_to_use, 2, mat1.length, WebCL.type.UINT);
			if (kernel_to_use === kernel1) {
			} else if (kernel_to_use === kernel2 || kernel_to_use === kernel3) {
				kernelSetArg(kernel_to_use, 3, mat1.rows, WebCL.type.UINT);
				kernelSetArg(kernel_to_use, 4, mat1.cols, WebCL.type.UINT);
			} else if (kernel_to_use === kernel4) {
				kernelSetArg(kernel_to_use, 3, mat2.length, WebCL.type.UINT);
			} else if (kernel_to_use === kernel5) {
				kernelSetArg(kernel_to_use, 3, mat1.length / mat2.length, WebCL.type.UINT);
			}
			
			// Execute the OpenCL kernel on the list
			var globalWS = [roundUp(localWS, mat1.length)]; // process entire list

			// Do the work
			queue.enqueueWriteBuffer(aBuffer, false, 0, size1, mat1.data);
			queue.enqueueWriteBuffer(bBuffer, false, 0, size2, mat2.data);
			// Execute (enqueue) kernel
			if (nodejs) {
				queue.enqueueNDRangeKernel(kernel_to_use, null, globalWS, localWS);
			} else {
				queue.enqueueNDRangeKernel(kernel_to_use, globalWS.length, null, globalWS, localWS);
			}

			// get results and block while getting them
			queue.enqueueReadBuffer(aBuffer, true, 0, size1, mat1.data);
			
			aBuffer.release();
			bBuffer.release();
		};
	};
	
	$CL.add = eachOperationGenerator('add', '+');
	
	$CL.sub = eachOperationGenerator('sub', '-');
	
	$CL.mulEach = eachOperationGenerator('mulEach', '*');
	
	$CL.mul = function() {
		var kernel1 = createKernel(
				"kernel_mul_1",
				"__kernel void kernel_mul_1(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) " +
				"{                                                                           " +
				"    size_t i =  get_global_id(0);                                           " +
				"    if(i >= iNumElements) return;                                           " +
				"    uint row = i / cols;                                                    " +
				"    uint col = i % cols;                                                    " +
				"    float sum = 0.0;                                                        " +
				"    for (uint j = 0; j < width; j++) {                                      " +
				"        sum += a[row * width + j] * b[j * cols + col];                      " +
				"    }                                                                       " +
				"    c[i] = sum;                                                             " +
				"}                                                                           "
			);
		var kernel2 = createKernel(
				"kernel_mul_2", [
				"__kernel void kernel_mul_2(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    float sum = 0.0;                                                        ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        sum += a[row * width + j] * b[j + col * width];                     ",
				"    }                                                                       ",
				"    c[i] = sum;                                                             ",
				"}                                                                           "].join('\r\n')
			);
		var kernel3 = createKernel(
				"kernel_mul_3", [
				"__kernel void kernel_mul_3(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    float sum = 0.0;                                                        ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        sum += a[row + j * rows] * b[j * cols + col];                       ",
				"    }                                                                       ",
				"    c[i] = sum;                                                             ",
				"}                                                                           "].join('\r\n')
			);
		var kernel4 = createKernel(
				"kernel_mul_4", [
				"__kernel void kernel_mul_4(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ",
				"{                                                                           ",
				"    size_t i =  get_global_id(0);                                           ",
				"    if(i >= iNumElements) return;                                           ",
				"    uint row = i / cols;                                                    ",
				"    uint col = i % cols;                                                    ",
				"    float sum = 0.0;                                                        ",
				"    for (uint j = 0; j < width; j++) {                                      ",
				"        sum += a[row + j * rows] * b[j + col * width];                      ",
				"    }                                                                       ",
				"    c[i] = sum;                                                             ",
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
			// Prepare buffer
			var newM = new $M(mat1.rows, mat2.cols);
			var aBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, mat1.length * Float32Array.BYTES_PER_ELEMENT);
			var bBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, mat2.length * Float32Array.BYTES_PER_ELEMENT);
			var cBuffer = context.createBuffer(WebCL.MEM_WRITE_ONLY, newM.length * Float32Array.BYTES_PER_ELEMENT);
			kernelSetArg(kernel_to_use, 0, aBuffer);
			kernelSetArg(kernel_to_use, 1, bBuffer);
			kernelSetArg(kernel_to_use, 2, cBuffer);
			kernelSetArg(kernel_to_use, 3, newM.length, WebCL.type.UINT);
			kernelSetArg(kernel_to_use, 4, newM.rows, WebCL.type.UINT);
			kernelSetArg(kernel_to_use, 5, newM.cols, WebCL.type.UINT);
			kernelSetArg(kernel_to_use, 6, mat1.cols, WebCL.type.UINT);

			// Execute the OpenCL kernel on the list
			var globalWS = [roundUp(localWS, newM.length)]; // process entire list

			// Do the work
			queue.enqueueWriteBuffer(aBuffer, false, 0, mat1.length * Float32Array.BYTES_PER_ELEMENT, mat1.data);
			queue.enqueueWriteBuffer(bBuffer, false, 0, mat2.length * Float32Array.BYTES_PER_ELEMENT, mat2.data);

			// Execute (enqueue) kernel
			if (nodejs) {
				queue.enqueueNDRangeKernel(kernel_to_use, null, globalWS, localWS);
			} else {
				queue.enqueueNDRangeKernel(kernel_to_use, globalWS.length, null, globalWS, localWS);
			}

			// get results and block while getting them
			queue.enqueueReadBuffer(cBuffer, true, 0, newM.length * Float32Array.BYTES_PER_ELEMENT, newM.data);
			
			aBuffer.release();
			bBuffer.release();
			cBuffer.release();
			return newM;
		};
	}();
	
	$CL.times = function() {
		var kernel_to_use = createKernel(
				"kernel_times",
				"__kernel void kernel_times(__global float *a, float b, uint iNumElements)   " +
				"{                                                                           " +
				"    size_t i =  get_global_id(0);                                           " +
				"    if(i >= iNumElements) return;                                           " +
				"    a[i] *= b;                                                              " +
				"}                                                                           "
			);
		return function(mat1, times) {
			// Prepare buffer
			var aBuffer = context.createBuffer(WebCL.MEM_READ_WRITE, mat1.length * Float32Array.BYTES_PER_ELEMENT);
			kernelSetArg(kernel_to_use, 0, aBuffer);
			kernelSetArg(kernel_to_use, 1, times, WebCL.type.FLOAT);
			kernelSetArg(kernel_to_use, 2, mat1.length, WebCL.type.UINT);

			// Execute the OpenCL kernel on the list
			var globalWS = [roundUp(localWS, mat1.length)]; // process entire list

			// Do the work
			queue.enqueueWriteBuffer(aBuffer, false, 0, mat1.length * Float32Array.BYTES_PER_ELEMENT, mat1.data);

			// Execute (enqueue) kernel
			if (nodejs) {
				queue.enqueueNDRangeKernel(kernel_to_use, null, globalWS, localWS);
			} else {
				queue.enqueueNDRangeKernel(kernel_to_use, globalWS.length, null, globalWS, localWS);
			}

			// get results and block while getting them
			queue.enqueueReadBuffer(aBuffer, true, 0, mat1.length * Float32Array.BYTES_PER_ELEMENT, mat1.data);
			
			aBuffer.release();
			return mat1;
		};
	}();
	
	// alter large matrix calculation
	(function() {
		$P.largeAdd = function(mat) { $CL.add(this, mat); return this; };
		$M.largeAdd = function(mat1, mat2) { return mat1.clone().largeAdd(mat2); };
		$P.largeSub = function(mat) { $CL.sub(this, mat); return this; };
		$M.largeSub = function(mat1, mat2) { return mat1.clone().largeSub(mat2); };
		$P.largeMulEach = function(mat) { $CL.mulEach(this, mat); return this; };
		$M.largeMulEach = function(mat1, mat2) { return mat1.clone().largeMulEach(mat2); };
		$P.largeMul = function(mat) { return $CL.mul(this, mat); };
		$M.largeMul = $CL.mul;
		$P.largeTimes = function(times) { return $CL.times(this, times); };
	})();
})();