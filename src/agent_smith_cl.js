if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	AgentSmith = require('./agent_smith');
}

if (typeof AgentSmith === 'undefined' || typeof AgentSmith.Matrix === 'undefined') {
	throw new Error('AgentSmith.Matrix is not loaded');
}

var nodejs = (typeof window === 'undefined');
if (nodejs) {
	var node_webcl_root = '../../node_modules/node-webcl'; // depends on the environment
	WebCL = require(node_webcl_root + '/webcl');
	clu = require(node_webcl_root + '/lib/clUtils');
} else {
	WebCL = window.webcl;
}

(function(WebCL) {
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
	var context = WebCL.createContext({
		deviceType : WebCL.DEVICE_TYPE_DEFAULT,
		platform : $CL.platform
	});
	var queue = context.createCommandQueue($CL.devices[0], 0);
	var createKernel = function(name, code) {
		var program = context.createProgram(code);
		program.build($CL.devices);
		return program.createKernel(name);
	};

	var eachOperationGenerator = function(id, operator) {
		// if the wises are same
		var kernel1 = createKernel(
			"kernel_" + id + "_1",
			"__kernel void kernel_" + id + "_1(__global float *a, __global float *b, uint iNumElements) " +
			"{                                                                           " +
			"    size_t i =  get_global_id(0);                                           " +
			"    if(i >= iNumElements) return;                                           " +
			"    a[i] = a[i] " + operator + " b[i];                                      " +
			"}                                                                           "
		);
		// different wises
		var kernel2 = createKernel(
			"kernel_" + id + "_2",
			"__kernel void kernel_" + id + "_2(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols) " +
			"{                                                                           " +
			"    size_t i =  get_global_id(0);                                           " +
			"    if(i >= iNumElements) return;                                           " +
			"    a[i] = a[i] " + operator + " b[(i % cols) * rows + i / cols];           " +
			"}                                                                           "
		);
		
		// different wises (particularly for incommutable function)
		var kernel3 = createKernel(
			"kernel_" + id + "_3",
			"__kernel void kernel_" + id + "_3(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols) " +
			"{                                                                                             " +
			"    size_t i =  get_global_id(0);                                                             " +
			"    if(i >= iNumElements) return;                                                             " +
			"    a[(i % cols) * rows + i / cols] = a[(i % cols) * rows + i / cols] " + operator + " b[i];  " +
			"}                                                                                             "
		);
		
		return function(mat1, mat2) {
			if (mat1.rows !== mat2.rows || mat1.cols !== mat2.cols) {
				throw new Error('shape does not match');
			}
			var kernel_to_use = null;
			if (mat1.row_wise === mat2.row_wise) {
				kernel_to_use = kernel1;
			} else if (mat1.row_wise === true) {
				kernel_to_use = kernel2;
			} else {
				kernel_to_use = kernel3;
			}
			// Prepare buffer
			var size = mat1.length * Float32Array.BYTES_PER_ELEMENT;
			var aBuffer = context.createBuffer(WebCL.MEM_READ_WRITE, size);
			var bBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);
			kernel_to_use.setArg(0, aBuffer);
			kernel_to_use.setArg(1, bBuffer);
			kernel_to_use.setArg(2, mat1.length, WebCL.type.UINT);
			if (mat1.row_wise !== mat2.row_wise) {
				kernel_to_use.setArg(3, mat1.rows, WebCL.type.UINT);
				kernel_to_use.setArg(4, mat1.cols, WebCL.type.UINT);
			}
			
			// Execute the OpenCL kernel on the list
			var localWS = [5]; // process one list at a time
			var globalWS = [clu.roundUp(localWS, mat1.length)]; // process entire list

			// Do the work
			queue.enqueueWriteBuffer(aBuffer, false, 0, size, mat1.data);
			queue.enqueueWriteBuffer(bBuffer, false, 0, size, mat2.data);

			// Execute (enqueue) kernel
			queue.enqueueNDRangeKernel(kernel_to_use, null, globalWS, localWS);

			// get results and block while getting them
			queue.enqueueReadBuffer(aBuffer, true, 0, size, mat1.data);
			
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
				"kernel_mul_2",
				"__kernel void kernel_mul_2(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) " +
				"{                                                                           " +
				"    size_t i =  get_global_id(0);                                           " +
				"    if(i >= iNumElements) return;                                           " +
				"    uint row = i / cols;                                                    " +
				"    uint col = i % cols;                                                    " +
				"    float sum = 0.0;                                                        " +
				"    for (uint j = 0; j < width; j++) {                                      " +
				"        sum += a[row * width + j] * b[j + col * width];                     " +
				"    }                                                                       " +
				"    c[i] = sum;                                                             " +
				"}                                                                           "
			);
		var kernel3 = createKernel(
				"kernel_mul_3",
				"__kernel void kernel_mul_3(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) " +
				"{                                                                           " +
				"    size_t i =  get_global_id(0);                                           " +
				"    if(i >= iNumElements) return;                                           " +
				"    uint row = i / cols;                                                    " +
				"    uint col = i % cols;                                                    " +
				"    float sum = 0.0;                                                        " +
				"    for (uint j = 0; j < width; j++) {                                      " +
				"        sum += a[row + j * rows] * b[j * cols + col];                       " +
				"    }                                                                       " +
				"    c[i] = sum;                                                             " +
				"}                                                                           "
			);
		var kernel4 = createKernel(
				"kernel_mul_4",
				"__kernel void kernel_mul_4(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) " +
				"{                                                                           " +
				"    size_t i =  get_global_id(0);                                           " +
				"    if(i >= iNumElements) return;                                           " +
				"    uint row = i / cols;                                                    " +
				"    uint col = i % cols;                                                    " +
				"    float sum = 0.0;                                                        " +
				"    for (uint j = 0; j < width; j++) {                                      " +
				"        sum += a[row + j * rows] * b[j + col * width];                      " +
				"    }                                                                       " +
				"    c[i] = sum;                                                             " +
				"}                                                                           "
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
			kernel_to_use.setArg(0, aBuffer);
			kernel_to_use.setArg(1, bBuffer);
			kernel_to_use.setArg(2, cBuffer);
			kernel_to_use.setArg(3, newM.length, WebCL.type.UINT);
			kernel_to_use.setArg(4, newM.rows, WebCL.type.UINT);
			kernel_to_use.setArg(5, newM.cols, WebCL.type.UINT);
			kernel_to_use.setArg(6, mat1.cols, WebCL.type.UINT);

			// Execute the OpenCL kernel on the list
			var localWS = [5]; // process one list at a time
			var globalWS = [clu.roundUp(localWS, newM.length)]; // process entire list

			// Do the work
			queue.enqueueWriteBuffer(aBuffer, false, 0, mat1.length * Float32Array.BYTES_PER_ELEMENT, mat1.data);
			queue.enqueueWriteBuffer(bBuffer, false, 0, mat2.length * Float32Array.BYTES_PER_ELEMENT, mat2.data);

			// Execute (enqueue) kernel
			queue.enqueueNDRangeKernel(kernel_to_use, null, globalWS, localWS);

			// get results and block while getting them
			queue.enqueueReadBuffer(cBuffer, true, 0, newM.length * Float32Array.BYTES_PER_ELEMENT, newM.data);
			
			aBuffer.release();
			bBuffer.release();
			cBuffer.release();
			return newM;
		};
	}();
	
	// alter large matrix calculation
	(function() {
		$P.largeAdd = function(mat) { $CL.add(this, mat); return this; };
		$P.largeSub = function(mat) { $CL.sub(this, mat); return this; };
		$P.largeMulEach = function(mat) { $CL.mulEach(this, mat); return this; };
		$P.largeMul = function(mat) { return $CL.mul(this, mat); };
		$M.largeAdd = function(mat1, mat2) { return mat1.clone().largeAdd(mat2); };
		$M.largeSub = function(mat1, mat2) { return mat1.clone().largeSub(mat2); };
		$M.largeMulEach = function(mat1, mat2) { return mat1.clone().largeMulEach(mat2); };
		$M.largeMul = $CL.mul;
	})();
})(WebCL);