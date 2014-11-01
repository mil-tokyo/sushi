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
	
	// Pick platform
	var platformList = WebCL.getPlatforms();
	var platform = platformList[0];
	console.log('using platform: ' + platform.getInfo(WebCL.PLATFORM_NAME));

	// Query the set of devices on this platform
	var devices = platform.getDevices(WebCL.DEVICE_TYPE_DEFAULT);
	console.log('using device: ' + devices[0].getInfo(WebCL.DEVICE_NAME));

	// create GPU context for this platform
	var context = WebCL.createContext({
		deviceType : WebCL.DEVICE_TYPE_DEFAULT,
		platform : platform
	});

	$CL.add = function(mat1, mat2) {
		if (mat1.rows !== mat2.rows || mat1.cols !== mat2.cols) {
			throw new Error('shape does not match');
		}
		if (mat1.row_wise == mat2.row_wise) {
			var kernelSourceCode = [
					"__kernel void vadd(__global float *a, __global float *b, __global float *c, uint iNumElements) ",
					"{                                                                           ",
					"    size_t i =  get_global_id(0);                                           ",
					"    if(i >= iNumElements) return;                                           ",
					"    c[i] = a[i] + b[i];                                                     ",
					"}                                                                           " ]
					.join("\n");

			// Create and program from source
			var program = context.createProgram(kernelSourceCode);

			// Build program
			program.build(devices);

			var size = mat1.length * Float32Array.BYTES_PER_ELEMENT;

			// Create buffer for A and B and copy host contents
			var aBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);
			var bBuffer = context.createBuffer(WebCL.MEM_READ_ONLY, size);

			// Create buffer for C to read results
			var cBuffer = context.createBuffer(WebCL.MEM_WRITE_ONLY, size);

			// Create kernel object
			try {
				kernel = program.createKernel("vadd");
			} catch (err) {
				console.log(program.getBuildInfo(devices[0],
						WebCL.PROGRAM_BUILD_LOG));
			}

			// Set kernel args
			kernel.setArg(0, aBuffer);
			kernel.setArg(1, bBuffer);
			kernel.setArg(2, cBuffer);
			kernel.setArg(3, mat1.length, WebCL.type.FLOAT);

			// Create command queue
			queue = context.createCommandQueue(devices[0], 0);

			// Execute the OpenCL kernel on the list
			var localWS = [ 5 ]; // process one list at a time
			var globalWS = [ clu.roundUp(localWS, mat1.length) ]; // process
																	// entire
																	// list

			// Do the work
			queue.enqueueWriteBuffer(aBuffer, false, 0, mat1.length
					* Float32Array.BYTES_PER_ELEMENT, mat1.data);
			queue.enqueueWriteBuffer(bBuffer, false, 0, mat2.length
					* Float32Array.BYTES_PER_ELEMENT, mat2.data);

			// Execute (enqueue) kernel
			queue.enqueueNDRangeKernel(kernel, null, globalWS, localWS);

			// get results and block while getting them
			var newM = new $M(mat1.rows, mat1.cols);
			queue.enqueueReadBuffer(cBuffer, true, 0, newM.length
					* Float32Array.BYTES_PER_ELEMENT, newM.data);
			return newM;
		} else {
			throw new Error('CL methods require the same wise(row or col)');
		}
	};
})(WebCL);