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
	var context = WebCL.createContext({
		deviceType : WebCL.DEVICE_TYPE_DEFAULT,
		platform : $CL.platform
	});
	var createKernel = function(name, code) {
		var program = context.createProgram(code);
		program.build($CL.devices);
		return program.createKernel(name);
	};

	var eachOperationGenerator = function(id, operator) {
		// if the wises are same
		var kernel = createKernel(
			"kernel" + id + "1",
			"__kernel void kernel" + id + "1(__global float *a, __global float *b, __global float *c, uint iNumElements) " +
			"{                                                                           " +
			"    size_t i =  get_global_id(0);                                           " +
			"    if(i >= iNumElements) return;                                           " +
			"    c[i] = a[i] " + operator + " b[i];                                      " +
			"}                                                                           "
		);
		// different wises
		var kernel2 = createKernel(
			"kernel" + id + "2",
			"__kernel void kernel" + id + "2(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols) " +
			"{                                                                           " +
			"    size_t i =  get_global_id(0);                                           " +
			"    if(i >= iNumElements) return;                                           " +
			"    c[i] = a[i] " + operator + " b[(i % cols) * rows + i / cols];           " +
			"}                                                                           "
		);
		
		// different wises (particularly for incommutable function)
		var kernel3 = createKernel(
			"kernel" + id + "3",
			"__kernel void kernel" + id + "3(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols) " +
			"{                                                                           " +
			"    size_t i =  get_global_id(0);                                           " +
			"    if(i >= iNumElements) return;                                           " +
			"    c[i] = a[(i % cols) * rows + i / cols] " + operator + " b[i];           " +
			"}                                                                           "
		);
		
		return function(mat1, mat2) {
			if (mat1.rows !== mat2.rows || mat1.cols !== mat2.cols) {
				throw new Error('shape does not match');
			}
			if (mat1.row_wise == mat2.row_wise) {
				// Prepare buffer
				var size = mat1.length * Float32Array.BYTES_PER_ELEMENT;
				var aBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);
				var bBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);
				var cBuffer = context.createBuffer(WebCL.MEM_WRITE_ONLY, size);
				kernel.setArg(0, aBuffer);
				kernel.setArg(1, bBuffer);
				kernel.setArg(2, cBuffer);
				kernel.setArg(3, mat1.length, WebCL.type.UINT);
	
				// Create command queue
				queue = context.createCommandQueue($CL.devices[0], 0);
	
				// Execute the OpenCL kernel on the list
				var localWS = [5]; // process one list at a time
				var globalWS = [clu.roundUp(localWS, mat1.length)]; // process entire list
	
				// Do the work
				queue.enqueueWriteBuffer(aBuffer, false, 0, size, mat1.data);
				queue.enqueueWriteBuffer(bBuffer, false, 0, size, mat2.data);
	
				// Execute (enqueue) kernel
				queue.enqueueNDRangeKernel(kernel, null, globalWS, localWS);
	
				// get results and block while getting them
				var newM = new $M(mat1.rows, mat1.cols);
				newM.copyPropertyFrom(mat1);
				queue.enqueueReadBuffer(cBuffer, true, 0, size, newM.data);
				return newM;
			} else {
				var kernel_to_use = kernel2;
				if (mat1.row_wise !== true) {
					kernel_to_use = kernel3;
				}
				// Prepare buffer
				var size = mat1.length * Float32Array.BYTES_PER_ELEMENT;
				var aBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);
				var bBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);
				var cBuffer = context.createBuffer(WebCL.MEM_WRITE_ONLY, size);
				kernel_to_use.setArg(0, aBuffer);
				kernel_to_use.setArg(1, bBuffer);
				kernel_to_use.setArg(2, cBuffer);
				kernel_to_use.setArg(3, mat1.length, WebCL.type.UINT);
				kernel_to_use.setArg(4, mat1.rows, WebCL.type.UINT);
				kernel_to_use.setArg(5, mat1.cols, WebCL.type.UINT);
	
				// Create command queue
				queue = context.createCommandQueue($CL.devices[0], 0);
	
				// Execute the OpenCL kernel on the list
				var localWS = [5]; // process one list at a time
				var globalWS = [clu.roundUp(localWS, mat1.length)]; // process entire list
	
				// Do the work
				queue.enqueueWriteBuffer(aBuffer, false, 0, size, mat1.data);
				queue.enqueueWriteBuffer(bBuffer, false, 0, size, mat2.data);
	
				// Execute (enqueue) kernel
				queue.enqueueNDRangeKernel(kernel_to_use, null, globalWS, localWS);
	
				// get results and block while getting them
				var newM = new $M(mat1.rows, mat1.cols);
				queue.enqueueReadBuffer(cBuffer, true, 0, size, newM.data);
				return newM;
			}
		};
	};
	
	$CL.add = eachOperationGenerator('add', '+');
	
	$CL.sub = eachOperationGenerator('sub', '-');
	
	$CL.mulEach = eachOperationGenerator('mulEach', '*');
})(WebCL);