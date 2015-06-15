'use strict';

(function(Sushi) {
  if (!Sushi || !Sushi.Matrix) {
    throw new Error('Sushi.Matrix is not loaded');
    return;
  }

  var $M = Sushi.Matrix;
  if ($M.CL) {
    return;
  }

  var env = getEnvironement();
  var web_cl = createWebCLObject(env);
  if (!web_cl) {
    console.error('WebCL is not supported in this environment');
    return;
  }
  initWebCL(web_cl, env, $M);
  initUtilityMethods($M.CL.program, $M.CL.queue, $M.CL, $M.prototype);
  initMethods($M.CL, $M.prototype);
  initAliases($M, $M.CL, $M.prototype);

  function getEnvironement() {
    // check environment
    if (typeof window === 'undefined') {
      var env = 'node';
    } else if (typeof window !== 'undefined' && window.webcl !== void 0) {
      var env = 'ff';
    } else if (typeof WebCL === 'function') {
      var env = 'chromium';
    } else {
      var env = void 0;
    }
    return env;
  }

  function createWebCLObject(_env) {
    // create WebCL object
    var web_cl;
    switch (_env) {
      case 'node':
        try {
          web_cl = require('node-webcl');
          if (web_cl.type !== void 0) {
            // older version of node-webcl (0.8.3) have type object
            // some method is different from 0.9.2, so treat as different platform
            env = 'node083';
          }
          ('global', eval)('this').WebCL = web_cl;
        } catch (e) {
          web_cl = void 0;
        }
        break;
      case 'chromium':
        web_cl = new WebCL();
        break;
      case 'ff':
        web_cl = window.webcl;
        break;
      default:
        return false;
        break;
    }
    return web_cl;
  }

  function initWebCL(web_cl, env, $M) {
    $M.CL = { buffers: 0 };
    var $CL = $M.CL;

    // decide platform to use
    var platform_list = web_cl.getPlatforms();
    var platform_priority = ['CUDA', 'Apple', 'OpenCL'];
    var priority = platform_priority.length + 1;
    var includeIndexOf = function(array, search) {
      for (var i = 0; i < array.length; i++) {
        if (search.indexOf(array[i]) !== -1) {
          return i;
        }
      }
      return array.length;
    };
    for (var i = 0; i < platform_list.length; i++) {
      var platform_tmp = platform_list[i];
      var platform_info_tmp = platform_tmp.getInfo(web_cl.PLATFORM_NAME);
      var priority_tmp = includeIndexOf(platform_priority, platform_info_tmp);
      if (priority_tmp < priority) {
        priority = priority_tmp;
        $CL.platform = platform_tmp;
        $CL.platform_info = platform_info_tmp;
      }
    }
    var device_type = web_cl.DEVICE_TYPE_GPU;
    $CL.devices = $CL.platform.getDevices(web_cl.DEVICE_TYPE_GPU);
    if ($CL.devices.length === 0) {
      device_type = web_cl.DEVICE_TYPE_CPU;
      $CL.devices = $CL.platform.getDevices(web_cl.DEVICE_TYPE_CPU);
    }
    // device selector (experimental)
    if (env === 'node' || env === 'node083') {
      var device_index = 0;
      // Explicit setting by environment variable
      if ('WEBCL_DEVICE_INDEX' in process.env) {
        device_index = Number(process.env['WEBCL_DEVICE_INDEX']);
        if (device_index >= $CL.devices.length) {
          throw new Error('Invalid device index ' + device_index);
        }
      }
    } else {
      var url_vars = function() {
          var vars = {};
          var param = location.search.substring(1).split('&');
          for (var i = 0; i < param.length; i++) {
              var keySearch = param[i].search(/=/);
              var key = '';
              if (keySearch != -1) key = param[i].slice(0, keySearch);
              var val = param[i].slice(param[i].indexOf('=', 0) + 1);
              if (key != '') vars[key] = decodeURI(val);
          }
          return vars;
      }();
      var device_index =
            url_vars.device_index ?
            Math.min(url_vars.device_index, $CL.devices.length - 1) :
            0;
    }
    $CL.selected_device = $CL.devices[device_index];
    $CL.device_info = $CL.selected_device.getInfo(web_cl.DEVICE_NAME);
    $CL.device_max_work_group_size = $CL.selected_device.getInfo(web_cl.DEVICE_MAX_WORK_GROUP_SIZE);

    // initialize methods dependent on implementation
    switch (env) {
      case 'node083':
        $CL.context = web_cl.createContext({
          deviceType: device_type,
          platform: $CL.platform
        });
        $CL.kernelSetArg = function(kernel, idx, param, type) {
          kernel.setArg(idx, param, type);
        };
        break;
      case 'node':
      case 'ff':
        $CL.context = web_cl.createContext($CL.platform, device_type);
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
              default:
                throw new Error('Unsupported type');
            }
          }
          kernel.setArg(idx, param);
        };
        break;
      case 'chromium':
          var properties = new WebCLContextProperties();
          properties.platform = $CL.platform;
          properties.deviceType = device_type;
          properties.devices = $CL.devices;
          properties.shareGroup = 1;
          $CL.context = web_cl.createContext(properties);
          $CL.kernelSetArg = function(kernel, idx, param, type) {
          if (type !== void 0) {
            switch (type) {
              case WebCL.type.UINT:
                var type_tmp = web_cl.KERNEL_ARG_UINT;
                break;
              case WebCL.type.INT:
                var type_tmp = web_cl.KERNEL_ARG_INT;
                break;
              case WebCL.type.FLOAT:
                var type_tmp = web_cl.KERNEL_ARG_FLOAT;
                break;
            }
            kernel.setKernelArg(idx, param, type_tmp);
          } else {
            kernel.setKernelArgGlobal(idx, param);
          }
        };
        break;
    }
    switch (env) {
      case 'node':
      case 'ff':
      case 'chromium':
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
        break;
    }

    switch (env) {
      case 'node':
      case 'node083':
      case 'ff':
        $CL.queue =
          $CL.context.createCommandQueue($CL.selected_device, 0);
        break;
      case 'chromium':
        $CL.queue =
          $CL.context.createCommandQueue($CL.devices, null);
        break;
    }

    switch (env) {
      case 'node':
      case 'node083':
      case 'ff':
        $CL.releaseBuffer = function(buffer) {
          buffer.release();
        };
        break;
      case 'chromium':
        $CL.releaseBuffer = function(buffer) {
          buffer.releaseCL();
        };
        break;
    }
  }

  function initUtilityMethods(program, queue, $CL, $P) {
    $CL.createKernel = function(code) {
      var program = $CL.context.createProgram(code);
      switch (env) {
        case 'node':
        case 'node083':
        case 'ff':
          program.build($CL.devices);
          break;
        case 'chromium':
          program.buildProgram(null, null, null);
          break;
      }
      return program.createKernel('kernel_func');
    };

    $CL.executeKernel = function(kernel, params, parallelization, localWS) {
      for (var i = 0; i < params.length; i++) {
        if (params[i].type === void 0) {
          // matrix
          if (!params[i].datum.buffer) {
            params[i].datum.buffer =
              $CL.context.createBuffer(web_cl.MEM_READ_WRITE,
                                       params[i].datum.byte_length);
            $CL.buffers++;
            if (params[i].access !== web_cl.MEM_WRITE_ONLY) {
              if (params[i].datum.data) {
                queue.enqueueWriteBuffer(params[i].datum.buffer,
                                         env === 'chromium',
                                         0,
                                         params[i].datum.byte_length,
                                         params[i].datum.data);
                  // second parameter might have to be true for chromium
              }
            }
          }
          $CL.kernelSetArg(kernel, i, params[i].datum.buffer);
        } else {
          // native type
          $CL.kernelSetArg(kernel, i, params[i].datum, params[i].type);
        }
      }

      if (localWS == void 0) {
        if (parallelization.length === undefined) {
          //1-d parallelization
          var localWS = [64];
          var globalWS = [Math.ceil(parallelization / localWS) * localWS];
        } else {
          //n-d parallelization
          var localWS_each = [64, 8, 4][parallelization.length];
          var localWS = [];
          var globalWS = [];
          for (var i = 0; i < parallelization.length; i++) {
            localWS.push(localWS_each);
            globalWS.push(Math.ceil(parallelization[i] / localWS_each) * localWS_each);
          }
        }
      } else {
        var globalWS = [];
        for (var i = 0; i < parallelization.length; i++) {
          globalWS.push(Math.ceil(parallelization[i] / localWS[i]) * localWS[i]);
        }
      }
      // Execute kernel
      switch (env) {
        case 'node':
          queue.enqueueNDRangeKernel(kernel,
                                     globalWS.length,
                                     null,
                                     globalWS,
                                     localWS);
          break;
        case 'node083':
          queue.enqueueNDRangeKernel(kernel,
                                     null,
                                     globalWS,
                                     localWS);
          break;
        case 'ff':
          queue.enqueueNDRangeKernel(kernel,
                                     globalWS.length,
                                     null,
                                     globalWS,
                                     localWS);
          break;
        case 'chromium':
          globalWS = new Int32Array(globalWS);
          queue.enqueueNDRangeKernel(kernel,
                                     null,
                                     globalWS,
                                     localWS);
          queue.finish();
          break;
      }
      queue.flush();
    };

    $CL.flush = function() {
      queue.flush();
    };

    $CL.finish = function() {
      queue.finish();
    };

    $P.syncData = function() {
      // there being buffer means data is obsolete
      if (this.data === null) {
        this.data = new this.datum_type(this.length);
      }
      if (this.buffer) {
        // console.trace("Write Back!! This may cause the slower calculation.");
        queue.finish();
        queue.enqueueReadBuffer(this.buffer,
                                true,
                                0,
                                this.byte_length,
                                this.data);
        $CL.releaseBuffer(this.buffer);
        $CL.buffers--;
        this.buffer = null;
      }
    };

    $P.destruct = function() {
      this.data = void 0;
      if (this.buffer) {
        queue.finish();
        $CL.releaseBuffer(this.buffer);
        $CL.buffers--;
        this.buffer = void 0;
      }
    };
  }

  // Prepare WebCL and functions
  function initMethods($CL, $P) {
    $CL.eachOperationPGenerator = function(operator) {
      var createEachOperationPGeneratorKernel = function(a_i_to_idx, b_i_to_idx) {
        return $CL.createKernel([
          '#define OPERATOR ' + operator + '                                                                         ',
          '#define A_I_TO_IDX(i) (' + a_i_to_idx + ')                                                                ',
          '#define B_I_TO_IDX(i) (' + b_i_to_idx + ')                                                                ',
          '__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint rows, uint cols)  ',
          '{                                                                                                         ',
          '    size_t i =  get_global_id(0);                                                                         ',
          '    if(i >= iNumElements) return;                                                                         ',
          '    a[A_I_TO_IDX(i)] = a[A_I_TO_IDX(i)] OPERATOR b[B_I_TO_IDX(i)];                                        ',
          '}                                                                                                         '].join('\r\n')
        );
      };
      // (row-wiss - row-wise) or (col-wise - col-wise)
      var kernel1 = createEachOperationPGeneratorKernel('(i)', '(i)');
      // row-wise - col-wise
      var kernel2 = createEachOperationPGeneratorKernel('(i)', '((i) % cols) * rows + (i) / cols');
      // col-wise - row-wise
      var kernel3 = createEachOperationPGeneratorKernel('((i) % cols) * rows + (i) / cols', '(i)');

      // broadcast 1
      var kernel4 = $CL.createKernel([
        '#define OPERATOR ' + operator + '                                                                 ',
        '__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint b_length) ',
        '{                                                                                                 ',
        '    size_t i =  get_global_id(0);                                                                 ',
        '    if(i >= iNumElements) return;                                                                 ',
        '    a[i] = a[i] OPERATOR b[i % b_length];                                                 ',
        '}                                                                                                 '].join('\r\n')
      );

      // broadcast 2
      var kernel5 = $CL.createKernel([
        '#define OPERATOR ' + operator + '                                                               ',
        '__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements, uint b_skip) ',
        '{                                                                                               ',
        '    size_t i =  get_global_id(0);                                                               ',
        '    if(i >= iNumElements) return;                                                               ',
        '    a[i] = a[i] OPERATOR b[i / b_skip];                                                 ',
        '}                                                                                               '].join('\r\n')
      );

      return function(mat1, mat2) {
        if (!(
          (mat1.rows === mat2.rows && mat1.cols === mat2.cols) ||
          (mat1.rows === mat2.rows && mat2.cols === 1) ||
          (mat1.cols === mat2.cols && mat2.rows === 1))) {
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
        } else if ((mat1.row_wise && mat1.cols === mat2.cols) ||
                   (!mat1.row_wise && mat1.rows === mat2.rows)) {
          // broadcast 1
          kernel_to_use = kernel4;
        } else {
          // broadcast 2
          kernel_to_use = kernel5;
        }

        var params = [
          { access: web_cl.MEM_READ_WRITE, datum: mat1 },
          { access: web_cl.MEM_READ_ONLY, datum: mat2 },
          { datum: mat1.length, type: WebCL.type.UINT }
        ];
        if (kernel_to_use === kernel1 ||
            kernel_to_use === kernel2 ||
            kernel_to_use === kernel3) {
          params.push({ datum: mat1.rows, type: WebCL.type.UINT });
          params.push({ datum: mat1.cols, type: WebCL.type.UINT });
        } else if (kernel_to_use === kernel4) {
          params.push({ datum: mat2.length, type: WebCL.type.UINT });
        } else if (kernel_to_use === kernel5) {
          params.push({ datum: mat1.length / mat2.length,
                        type: WebCL.type.UINT });
        }

        $CL.executeKernel(kernel_to_use, params, mat1.length);
      };
    };

    $CL.eachOperationMGenerator = function(operator) {
      var createEachOperationMGeneratorKernel = function(a_i_to_idx, b_i_to_idx) {
        return $CL.createKernel([
          '#define OPERATOR ' + operator + '                                                                         ',
          '#define A_I_TO_IDX(i) (' + a_i_to_idx + ')                                                                ',
          '#define B_I_TO_IDX(i) (' + b_i_to_idx + ')                                                                ',
          '__kernel void kernel_func(__global float *output, __global float *a, __global float *b, uint iNumElements, uint rows, uint cols)  ',
          '{                                                                                                         ',
          '    size_t i =  get_global_id(0);                                                                         ',
          '    if(i >= iNumElements) return;                                                                         ',
          '    output[i] = a[A_I_TO_IDX(i)] OPERATOR b[B_I_TO_IDX(i)];                                               ',
          '}                                                                                                         '].join('\r\n')
        );
      };

      var createEachOperationMGeneratorBroadcastKernel1 = function(a_b_i_to_idx) {
        return $CL.createKernel([
          '#define OPERATOR ' + operator + '                                                                 ',
          '#define A_B_I_TO_IDX(i) (' + a_b_i_to_idx + ')                                                    ',
          '__kernel void kernel_func(__global float *output, __global float *a, __global float *b, uint iNumElements, uint rows, uint cols, uint b_length) ',
          '{                                                                                                 ',
          '    size_t i =  get_global_id(0);                                                                 ',
          '    if(i >= iNumElements) return;                                                                 ',
          '    output[i] = a[A_B_I_TO_IDX(i)] OPERATOR b[A_B_I_TO_IDX(i) % b_length];                        ',
          '}                                                                                                 '].join('\r\n')
        );
      };

      var createEachOperationMGeneratorBroadcastKernel2 = function(a_b_i_to_idx) {
        return $CL.createKernel([
          '#define OPERATOR ' + operator + '                                                                 ',
          '#define A_B_I_TO_IDX(i) (' + a_b_i_to_idx + ')                                                    ',
          '__kernel void kernel_func(__global float *output, __global float *a, __global float *b, uint iNumElements, uint rows, uint cols, uint b_skip) ',
          '{                                                                                                 ',
          '    size_t i =  get_global_id(0);                                                                 ',
          '    if(i >= iNumElements) return;                                                                 ',
          '    output[i] = a[A_B_I_TO_IDX(i)] OPERATOR b[A_B_I_TO_IDX(i) / b_skip];                           ',
          '}                                                                                                 '].join('\r\n')
        );
      };

      // row-wiss - row-wise
      var kernel1 = createEachOperationMGeneratorKernel('(i)', '(i)');
      // row-wise - col-wise
      var kernel2 = createEachOperationMGeneratorKernel('(i)', '((i) % cols) * rows + (i) / cols');
      // col-wise - row-wise
      var kernel3 = createEachOperationMGeneratorKernel('((i) % cols) * rows + (i) / cols', '(i)');
      // col-wise - col-wise
      var kernel4 = createEachOperationMGeneratorKernel('((i) % cols) * rows + (i) / cols', '((i) % cols) * rows + (i) / cols');

      // broadcast 1
      var kernel5 = createEachOperationMGeneratorBroadcastKernel1('(i)');
      var kernel6 = createEachOperationMGeneratorBroadcastKernel1('((i) % cols) * rows + (i) / cols');

      // broadcast 2
      var kernel7 = createEachOperationMGeneratorBroadcastKernel2('(i)');
      var kernel8 = createEachOperationMGeneratorBroadcastKernel2('((i) % cols) * rows + (i) / cols');

      return function(mat1, mat2, output) {
        if (!(
          (mat1.rows === mat2.rows && mat1.cols === mat2.cols) ||
          (mat1.rows === mat2.rows && mat2.cols === 1) ||
          (mat1.cols === mat2.cols && mat2.rows === 1))) {
            throw new Error('shape does not match');
        }
        var newM = $M.newMatOrReuseMat(mat1.rows, mat1.cols, output);
        var kernel_to_use = null;
        if (mat1.rows === mat2.rows && mat1.cols === mat2.cols) {
          if (mat1.row_wise && mat2.row_wise) {
            kernel_to_use = kernel1;
          } else if (mat1.row_wise && !mat2.row_wise) {
            kernel_to_use = kernel2;
          } else if (!mat1.row_wise && mat2.row_wise) {
            kernel_to_use = kernel3;
          } else {
            kernel_to_use = kernel4;
          }
        } else if ((mat1.row_wise && mat1.cols === mat2.cols) ||
                   (!mat1.row_wise && mat1.rows === mat2.rows)) {
          // broadcast 1
          kernel_to_use = mat1.row_wise ? kernel5 : kernel6;
        } else {
          // broadcast 2
          kernel_to_use = mat1.row_wise ? kernel7 : kernel8;
        }

        var params = [
          { access: web_cl.MEM_WRITE_ONLY, datum: newM },
          { access: web_cl.MEM_READ_WRITE, datum: mat1 },
          { access: web_cl.MEM_READ_ONLY, datum: mat2 },
          { datum: mat1.length, type: WebCL.type.UINT },
          { datum: mat1.rows, type: WebCL.type.UINT },
          { datum: mat1.cols, type: WebCL.type.UINT }
        ];

        if (kernel_to_use === kernel5 || kernel_to_use === kernel6) {
          params.push({ datum: mat2.length, type: WebCL.type.UINT });
        } else if (kernel_to_use === kernel7 || kernel_to_use === kernel8) {
          params.push({ datum: mat1.length / mat2.length,
                        type: WebCL.type.UINT });
        }

        $CL.executeKernel(kernel_to_use, params, mat1.length);

        return newM;
      };
    };

    $CL.mapGenerator = function(expression_ai) {
      // if the wises are same
      var kernel = $CL.createKernel([
        '__kernel void kernel_func(__global float *a, uint iNumElements) ',
        '{                                                                           ',
        '    size_t i =  get_global_id(0);                                           ',
        '    if(i >= iNumElements) return;                                           ',
        '    a[i] = ' + expression_ai + ';                                            ',
        '}                                                                           '].join('\r\n')
      );

      return function(mat) {
        var params = [
          { access: web_cl.MEM_READ_WRITE, datum: mat },
          { datum: mat.length, type: WebCL.type.UINT }
        ];
        $CL.executeKernel(kernel, params, mat.length);
      };
    };

    $CL.addP = $CL.eachOperationPGenerator('+');

    $CL.subP = $CL.eachOperationPGenerator('-');

    $CL.mulEachP = $CL.eachOperationPGenerator('*');

    $CL.divEachP = $CL.eachOperationPGenerator('/');

    $CL.addM = $CL.eachOperationMGenerator('+');

    $CL.subM = $CL.eachOperationMGenerator('-');

    $CL.mulEachM = $CL.eachOperationMGenerator('*');

    $CL.divEachM = $CL.eachOperationMGenerator('/');

    $CL.mul = function() {
      var block_size = 1;
      // simultanously compute NxN grid
      if ($CL.device_max_work_group_size >= 1024) {
        block_size = 32;
      } else if ($CL.device_max_work_group_size >= 256) {
        block_size = 16;
      }

      var createMulBlockKernel = function(a_row_col_to_idx, b_row_col_to_idx) {
        return $CL.createKernel([
          '#define A_ROW_COL_TO_IDX(row, col) (' + a_row_col_to_idx + ')               ',
          '#define B_ROW_COL_TO_IDX(row, col) (' + b_row_col_to_idx + ')               ',
          '#define BLOCK_SIZE ' + block_size,
          '__kernel void kernel_func(__global float *a, __global float *b, __global float *c, __local float* acache, __local float* bcache, uint rows, uint cols, uint width) ',
          '{                                                                           ',
          '    size_t row =  get_global_id(1);                                           ',
          '    size_t col =  get_global_id(0);                                           ',
          'uint lx = get_local_id(0);',
          'uint ly = get_local_id(1);',
          ' float tmp = 0.0F;',
          'uint atop = get_group_id(1) * BLOCK_SIZE;',
          'uint bleft = get_group_id(0) * BLOCK_SIZE;',
          'uint block_count = width / BLOCK_SIZE;',//floor
          'uint cache_local_idx = ly * BLOCK_SIZE + lx;',
          'uint a_idx = A_ROW_COL_TO_IDX(atop + ly, lx);',
          'uint a_stride = A_ROW_COL_TO_IDX(atop + ly, lx + BLOCK_SIZE) - a_idx;',
          'uint b_idx = B_ROW_COL_TO_IDX(ly, bleft + lx);',
          'uint b_stride = B_ROW_COL_TO_IDX(ly + BLOCK_SIZE, bleft + lx) - b_idx;',
          'for (uint block = 0; block < block_count; block++) {',
          'acache[cache_local_idx] = a[a_idx];',
          'bcache[cache_local_idx] = b[b_idx];',
          'a_idx += a_stride;',
          'b_idx += b_stride;',
          'barrier(CLK_LOCAL_MEM_FENCE);',
          '#pragma unroll',
          '    for (uint j = 0; j < BLOCK_SIZE; j++) {                                      ',
          '        tmp += acache[ly * BLOCK_SIZE + j] * bcache[j * BLOCK_SIZE + lx];  ',
          '    }                                                                       ',
          'barrier(CLK_LOCAL_MEM_FENCE);',
          '}',
          '    c[row * cols + col] = tmp;                                                             ',
          '}                                                                           '].join('\r\n')
        );
      };

      var createMulRemainderKernel = function(a_row_col_to_idx, b_row_col_to_idx) {
        return $CL.createKernel([
          '#define A_ROW_COL_TO_IDX(row, col) (' + a_row_col_to_idx + ')               ',
          '#define B_ROW_COL_TO_IDX(row, col) (' + b_row_col_to_idx + ')               ',
          '#define BLOCK_SIZE ' + block_size,
          '__kernel void kernel_func(__global float *a, __global float *b, __global float *c, uint iNumElements, uint rows, uint cols, uint width) ',
          '{                                                                           ',
          '    size_t i =  get_global_id(0);                                           ',
          '    if(i >= iNumElements) return;                                           ',
          '    uint row = i / cols;                                                    ',
          '    uint col = i % cols;                                                    ',
          '    float tmp = 0.0F;',
          '  if ((row >= rows / BLOCK_SIZE * BLOCK_SIZE) || (col >= cols / BLOCK_SIZE * BLOCK_SIZE) || (width < BLOCK_SIZE)) {',
          '    for (uint j = 0; j < width; j++) {                                      ',
          '        tmp += a[A_ROW_COL_TO_IDX(row, j)] * b[B_ROW_COL_TO_IDX(j, col)];  ',
          '    }                                                                       ',
          '    c[i] = tmp;                                                             ',
          '  } else {',
          '    for (uint j = (width / BLOCK_SIZE * BLOCK_SIZE); j < width; j++) {',
          '        tmp += a[A_ROW_COL_TO_IDX(row, j)] * b[B_ROW_COL_TO_IDX(j, col)];  ',
          '    }                                                                       ',
          '    c[i] += tmp;                                                             ',
          '  }',
          '}                                                                           '].join('\r\n')
        );
      };

      var createMulKernels = function(a_row_col_to_idx, b_row_col_to_idx) {
        return [createMulBlockKernel(a_row_col_to_idx, b_row_col_to_idx),
                createMulRemainderKernel(a_row_col_to_idx, b_row_col_to_idx)];
      };

      var kernel1 = createMulKernels('(row) * width + (col)', '(row) * cols + (col)');
      var kernel2 = createMulKernels('(row) * width + (col)', '(row) + (col) * width');
      var kernel3 = createMulKernels('(row) + (col) * rows', '(row) * cols + (col)');
      var kernel4 = createMulKernels('(row) + (col) * rows', '(row) + (col) * width');
      var kernels = [kernel1, kernel2, kernel3, kernel4];

      return function(mat1, mat2, output) {
        if (mat1.cols !== mat2.rows) {
          throw new Error('shape does not match');
        }
        var kernel_to_use;
        if (mat1.row_wise === true && mat2.row_wise === true) {
          kernel_to_use = kernels[0];
        } else if (mat1.row_wise === true && mat2.row_wise === false) {
          kernel_to_use = kernels[1];
        } else if (mat1.row_wise === false && mat2.row_wise === true) {
          kernel_to_use = kernels[2];
        } else {
          kernel_to_use = kernels[3];
        }

        var newM = $M.newMatOrReuseMat(mat1.rows, mat2.cols, output);
        var rangerows = Math.floor(mat1.rows / block_size) * block_size;
        var rangecols = Math.floor(mat2.cols / block_size) * block_size;
        var rangewidth = Math.floor(mat1.cols / block_size) * block_size;

        if (mat1.rows >= block_size && mat1.cols >= block_size && mat2.cols >= block_size) {
          //process block
          $CL.executeKernel(
            kernel_to_use[0],
            [
              { access: web_cl.MEM_READ_ONLY, datum: mat1 },
              { access: web_cl.MEM_READ_ONLY, datum: mat2 },
              { access: web_cl.MEM_WRITE_ONLY, datum: newM },
              { datum: block_size * block_size, type: WebCL.type.LOCAL_MEMORY_SIZE },//acache
              { datum: block_size * block_size, type: WebCL.type.LOCAL_MEMORY_SIZE },//bcache
              { datum: newM.rows, type: WebCL.type.UINT },
              { datum: newM.cols, type: WebCL.type.UINT },
              { datum: mat1.cols, type: WebCL.type.UINT },
            ],
            [rangecols, rangerows],
            [block_size, block_size]
          );
        }

        if (rangerows != mat1.rows || rangecols != mat2.cols || rangewidth != mat1.cols) {
          //process remainder
          $CL.executeKernel(
            kernel_to_use[1],
            [
              { access: web_cl.MEM_READ_ONLY, datum: mat1 },
              { access: web_cl.MEM_READ_ONLY, datum: mat2 },
              { access: web_cl.MEM_READ_WRITE, datum: newM },
              { datum: newM.length, type: WebCL.type.UINT},
              { datum: newM.rows, type: WebCL.type.UINT},
              { datum: newM.cols, type: WebCL.type.UINT},
              { datum: mat1.cols, type: WebCL.type.UINT }
            ],
            newM.length
          );
        }

        return newM;
      };
    }();

    $CL.convolve = function() {
      var createConvolveKernel = function(mat1_row_col_to_idx, mat2_row_col_to_idx) {
        return $CL.createKernel([
            '#define MAT1_ROW_COL_TO_IDX(row, col) (' + mat1_row_col_to_idx + ')            ',
            '#define MAT2_ROW_COL_TO_IDX(row, col) (' + mat2_row_col_to_idx + ')            ',
            '__kernel void kernel_func(__global float *mat1, __global float *mat2, __global float *output, uint cols, uint mat1_rows, uint mat1_cols, uint mat2_rows, uint mat2_cols, uint offset_row, uint offset_col, uint iNumElements) ',
            '{                                                                              ',
            '    size_t i =  get_global_id(0);                                              ',
            '    if(i >= iNumElements) return;                                              ',
            '    uint row = i / cols;                                                       ',
            '    uint col = i % cols;                                                       ',
            '    int tmp_row;                                                               ',
            '    int tmp_col;                                                               ',
            '    output[i] = 0.0;                                                           ',
            '    for (uint d_row = 0; d_row < mat2_rows; d_row++) {                         ',
            '        for (uint d_col = 0; d_col < mat2_cols; d_col++) {                     ',
            '            tmp_row = row + d_row - offset_row;                                ',
            '            tmp_col = col + d_col - offset_col;                                ',
            '            if (tmp_row < 0 || tmp_row >= mat1_rows ||                         ',
            '                tmp_col < 0 || tmp_col >= mat1_cols ) {                        ',
            '                continue;                                                      ',
            '            }                                                                  ',
            '            output[i] += mat1[MAT1_ROW_COL_TO_IDX(tmp_row, tmp_col)] *         ',
            '                    mat2[MAT2_ROW_COL_TO_IDX(d_row, d_col)];                   ',
            '        }                                                                      ',
            '    }                                                                          ',
            '}                                                                              '].join('\r\n')
          );
      };
      var kernel1 = createConvolveKernel('mat1_cols * (row) + (col)', 'mat2_cols * (row) + (col)');
      var kernel2 = createConvolveKernel('mat1_cols * (row) + (col)', 'mat2_rows * (col) + (row)');
      var kernel3 = createConvolveKernel('mat1_rows * (col) + (row)', 'mat2_cols * (row) + (col)');
      var kernel4 = createConvolveKernel('mat1_rows * (col) + (row)', 'mat2_rows * (col) + (row)');

      return function(mat1, mat2, mode, output) {
        if (mode === 'valid' &&
            (mat1.cols < mat2.cols || mat1.rows < mat2.rows)) {
          throw new Error('the size of the second matrix must be ' +
                          'smaller than that of the first one');
        }
        var kernel_to_use;
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
          var newM = $M.newMatOrReuseMat(mat1.rows - mat2.rows + 1,
                                         mat1.cols - mat2.cols + 1, output);
          var offset_row = 0;
          var offset_col = 0;
        } else if (mode === 'full') {
          var newM = $M.newMatOrReuseMat(mat1.rows + mat2.rows - 1,
                                         mat1.cols + mat2.cols - 1, output);
          var offset_row = mat2.rows - 1;
          var offset_col = mat2.cols - 1;
        } else if (mode === 'same') {
          var newM = $M.newMatOrReuseMat(mat1.rows, mat1.cols, output);
          var offset_row = Math.floor((mat2.rows - 1) / 2);
          var offset_col = Math.floor((mat2.cols - 1) / 2);
        } else {
          throw new Error('the mode is not supported');
        }
        $CL.executeKernel(
          kernel_to_use,
          [
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { access: web_cl.MEM_READ_ONLY, datum: mat2 },
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { datum: newM.cols, type: WebCL.type.UINT},
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: mat2.rows, type: WebCL.type.UINT},
            { datum: mat2.cols, type: WebCL.type.UINT},
            { datum: offset_row, type: WebCL.type.UINT},
            { datum: offset_col, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT}
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.times = function() {
      var kernel_to_use = $CL.createKernel([
          '__kernel void kernel_func(__global float *a, float b, uint iNumElements)    ',
          '{                                                                           ',
          '    size_t i =  get_global_id(0);                                           ',
          '    if(i >= iNumElements) return;                                           ',
          '    a[i] *= b;                                                              ',
          '}                                                                           '].join('\r\n')
        );
      return function(mat1, times) {
        $CL.executeKernel(
          kernel_to_use,
          [
            { access: web_cl.MEM_READ_WRITE, datum: mat1 },
            { datum: times, type: WebCL.type.FLOAT},
            { datum: mat1.length, type: WebCL.type.UINT }
          ],
          mat1.length
        );
        return mat1;
      };
    }();

    $CL.zeros = function() {
      var kernel_to_use = $CL.createKernel([
          '__kernel void kernel_func(__global float *a, float b, uint iNumElements)    ',
          '{                                                                           ',
          '    size_t i =  get_global_id(0);                                           ',
          '    if(i >= iNumElements) return;                                           ',
          '    a[i] = b;                                                               ',
          '}                                                                           '].join('\r\n')
        );
      return function(mat1, num) {
        if (!num) { var num = 0; }
        $CL.executeKernel(
          kernel_to_use,
          [
            { access: web_cl.MEM_READ_WRITE, datum: mat1 },
            { datum: num, type: WebCL.type.FLOAT},
            { datum: mat1.length, type: WebCL.type.UINT }
          ],
          mat1.length
        );
        return mat1;
      };
    }();

    $CL.sumEachRow = function() {
      var createSumEachRowKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                                                 ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements) ',
            '{                                                                                                        ',
            '    size_t i =  get_global_id(0);                                                                        ',
            '    if(i >= iNumElements) return;                                                                        ',
            '    a[i] = 0;                                                                                            ',
            '    for (uint j = 0; j < cols; j++) {                                                                    ',
            '        a[i] += b[ROW_COL_TO_IDX(i, j)];                                                                 ',
            '    }                                                                                                    ',
            '}                                                                                                        '].join('\r\n')
          );
      };
      var kernel1 = createSumEachRowKernel('(row) * cols + (col)');
      var kernel2 = createSumEachRowKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(mat1.rows, 1, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.sumEachCol = function() {
      var createSumEachColKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                                                 ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements) ',
            '{                                                                                                        ',
            '    size_t i =  get_global_id(0);                                                                        ',
            '    if(i >= iNumElements) return;                                                                        ',
            '    a[i] = 0;                                                                                            ',
            '    for (uint j = 0; j < rows; j++) {                                                                    ',
            '        a[i] += b[ROW_COL_TO_IDX(j, i)];                                                                 ',
            '    }                                                                                                    ',
            '}                                                                                                        '].join('\r\n')
          );
      };
      var kernel1 = createSumEachColKernel('(row) * cols + (col)');
      var kernel2 = createSumEachColKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(1, mat1.cols, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.maxEachRow = function() {
      var createMaxEachRowKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                                                 ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements) ',
            '{                                                                                                        ',
            '    size_t i =  get_global_id(0);                                                                        ',
            '    if(i >= iNumElements) return;                                                                        ',
            '    a[i] = b[ROW_COL_TO_IDX(i, 0)];                                                                      ',
            '    for (uint j = 0; j < cols; j++) {                                                                    ',
            '        a[i] = max(a[i], b[ROW_COL_TO_IDX(i, j)]);                                                       ',
            '    }                                                                                                    ',
            '}                                                                                                        '].join('\r\n')
          );
      };
      var kernel1 = createMaxEachRowKernel('(row) * cols + (col)');
      var kernel2 = createMaxEachRowKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(mat1.rows, 1, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.argmaxEachRow = function() {
      var createArgmaxEachRowKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                          ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements)  ',
            '{                                                      ',
            '  size_t i =  get_global_id(0);                                      ',
            '  if(i >= iNumElements) return;                                      ',
            '  float max_val = b[ROW_COL_TO_IDX(i, 0)];                                 ',
            '  a[i] = 0;                                                ',
            '  for (uint j = 0; j < cols; j++) {                                    ',
            '    float tmp = b[ROW_COL_TO_IDX(i, j)];                                ',
            '    if (tmp > max_val) {                                        ',
            '      a[i] = j;                                            ',
            '      max_val = tmp;                                          ',
            '    }                                                  ',
            '  }                                                    ',
            '}                                                      '].join('\r\n')
          );
      };
      var kernel1 = createArgmaxEachRowKernel('(row) * cols + (col)');
      var kernel2 = createArgmaxEachRowKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(mat1.rows, 1, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.argminEachRow = function() {
      var createArgminEachRowKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                          ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements)  ',
            '{                                                      ',
            '  size_t i =  get_global_id(0);                                      ',
            '  if(i >= iNumElements) return;                                      ',
            '  float min_val = b[ROW_COL_TO_IDX(i, 0)];                                 ',
            '  a[i] = 0;                                                ',
            '  for (uint j = 0; j < cols; j++) {                                    ',
            '    float tmp = b[ROW_COL_TO_IDX(i, j)];                                ',
            '    if (tmp < min_val) {                                        ',
            '      a[i] = j;                                            ',
            '      min_val = tmp;                                          ',
            '    }                                                  ',
            '  }                                                    ',
            '}                                                      '].join('\r\n')
          );
      };
      var kernel1 = createArgminEachRowKernel('(row) * cols + (col)');
      var kernel2 = createArgminEachRowKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(mat1.rows, 1, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.maxEachCol = function() {
      var createMaxEachColKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                                                 ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements) ',
            '{                                                                                                        ',
            '    size_t i =  get_global_id(0);                                                                        ',
            '    if(i >= iNumElements) return;                                                                        ',
            '    a[i] = b[ROW_COL_TO_IDX(0, i)];                                                                      ',
            '    for (uint j = 0; j < rows; j++) {                                                                    ',
            '        a[i] = max(a[i], b[ROW_COL_TO_IDX(j, i)]);                                                       ',
            '    }                                                                                                    ',
            '}                                                                                                        '].join('\r\n')
          );
      };
      var kernel1 = createMaxEachColKernel('(row) * cols + (col)');
      var kernel2 = createMaxEachColKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(1, mat1.cols, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.argmaxEachCol = function() {
      var createArgmaxEachColKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                          ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements)  ',
            '{                                                      ',
            '  size_t i =  get_global_id(0);                                      ',
            '  if(i >= iNumElements) return;                                      ',
            '  float max_val = b[ROW_COL_TO_IDX(0, i)];                                ',
            '  a[i] = 0;                                                ',
            '  for (uint j = 0; j < rows; j++) {                                    ',
            '    float tmp = b[ROW_COL_TO_IDX(j, i)];                                ',
            '    if (tmp > max_val) {                                        ',
            '      a[i] = j;                                            ',
            '      max_val = tmp;                                          ',
            '    }                                                  ',
            '  }                                                    ',
            '}                                                      '].join('\r\n')
          );
      };
      var kernel1 = createArgmaxEachColKernel('(row) * cols + (col)');
      var kernel2 = createArgmaxEachColKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(1, mat1.cols, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
        return newM;
      };
    }();

    $CL.argminEachCol = function() {
      var createArgminEachColKernel = function(row_col_to_idx) {
        return $CL.createKernel([
          '#define ROW_COL_TO_IDX(row, col) (' + row_col_to_idx + ')                          ',
            '__kernel void kernel_func(__global float *a, __global float *b, uint rows, uint cols, uint iNumElements)  ',
            '{                                                      ',
            '  size_t i =  get_global_id(0);                                      ',
            '  if(i >= iNumElements) return;                                      ',
            '  float min_val = b[ROW_COL_TO_IDX(0, i)];                                ',
            '  a[i] = 0;                                                ',
            '  for (uint j = 0; j < rows; j++) {                                    ',
            '    float tmp = b[ROW_COL_TO_IDX(j, i)];                                ',
            '    if (tmp < min_val) {                                        ',
            '      a[i] = j;                                            ',
            '      min_val = tmp;                                          ',
            '    }                                                  ',
            '  }                                                    ',
            '}                                                      '].join('\r\n')
          );
      };
      var kernel1 = createArgminEachColKernel('(row) * cols + (col)');
      var kernel2 = createArgminEachColKernel('(col) * rows + (row)');

      return function(mat1, output) {
        var newM = $M.newMatOrReuseMat(1, mat1.cols, output);
        $CL.executeKernel(
          mat1.row_wise ? kernel1 : kernel2,
          [
            { access: web_cl.MEM_WRITE_ONLY, datum: newM },
            { access: web_cl.MEM_READ_ONLY, datum: mat1 },
            { datum: mat1.rows, type: WebCL.type.UINT},
            { datum: mat1.cols, type: WebCL.type.UINT},
            { datum: newM.length, type: WebCL.type.UINT }
          ],
          newM.length
        );
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
          '__kernel void kernel_func(__global float *a, __global float *b, uint iNumElements)   ',
          '{                                                                           ',
          '    size_t i =  get_global_id(0);                                           ',
          '    if(i >= iNumElements) return;                                           ',
          '    a[i] = b[i];                                                            ',
          '}                                                                           '].join('\r\n')
        );
      return function(mat, output) {
        var newM = $M.newMatOrReuseMat(mat.rows, mat.cols, output);
        newM.copyPropertyFrom(mat);
        $CL.executeKernel(
            kernel,
            [
              { access: web_cl.MEM_WRITE_ONLY, datum: newM },
              { access: web_cl.MEM_READ_ONLY, datum: mat },
              { datum: newM.length, type: WebCL.type.UINT }
            ],
            newM.length
          );
        return newM;
      };
    }();

    $CL.extract = function() {
      var createExtractKernel = function(input_row_col_to_idx) {
        return $CL.createKernel([
          '#define INPUT_ROW_COL_TO_INDEX(row, col) (' + input_row_col_to_idx + ')',
          '__kernel void kernel_func(__global float *output, __global float *input, uint offset_row, uint offset_col, uint input_rows, uint input_cols, uint cols, uint iNumElements)   ',
          '{                                                                           ',
          '    size_t i =  get_global_id(0);                                           ',
          '    if(i >= iNumElements) return;                                           ',
          '    uint row = offset_row + i / cols;                                       ',
          '    uint col = offset_col + i % cols;                                       ',
          '    output[i] = input[INPUT_ROW_COL_TO_INDEX(row, col)];                    ',
          '}                                                                           '].join('\r\n')
        );
      };
      var kernel1 = createExtractKernel('input_cols * (row) + (col)');
      var kernel2 = createExtractKernel('input_rows * (col) + (row)');

      return function(mat, offset_row, offset_col, rows, cols, output) {
        if ((mat.rows < rows + offset_row) || (mat.cols < cols + offset_col)) {
          throw new Error('out of bounds');
        }
        var newM = $M.newMatOrReuseMat(rows, cols, output);
        if (mat.row_wise) {
          var kernel_to_use = kernel1;
        } else {
          var kernel_to_use = kernel2;
        }
        $CL.executeKernel(
            kernel_to_use,
            [
              { access: web_cl.MEM_WRITE_ONLY, datum: newM },
              { access: web_cl.MEM_READ_ONLY, datum: mat },
              { datum: offset_row, type: WebCL.type.UINT },
              { datum: offset_col, type: WebCL.type.UINT },
              { datum: mat.rows, type: WebCL.type.UINT },
              { datum: mat.cols, type: WebCL.type.UINT },
              { datum: cols, type: WebCL.type.UINT },
              { datum: newM.length, type: WebCL.type.UINT }
            ],
            newM.length
          );
        return newM;
      };
    }();
  }

  function initAliases($M, $CL, $P) {
    // alter large matrix calculation
    $P.largeAdd = function(mat) { $CL.addP(this, mat); return this; };
    $P.largeSub = function(mat) { $CL.subP(this, mat); return this; };
    $P.largeMulEach = function(mat) { $CL.mulEachP(this, mat); return this; };
    $P.largeDivEach = function(mat) { $CL.divEachP(this, mat); return this; };
    $P.largeMul = function(mat, output) { return $CL.mul(this, mat, output); };
    $P.largeTimes = function(times) { return $CL.times(this, times); };
    $P.largeClone = function(output) { return $CL.clone(this, output); };
    $P.largeZeros = function(num) { return $CL.zeros(this, num); };

    $M.largeAdd = $CL.addM;
    $M.largeSub = $CL.subM;
    $M.largeMulEach = $CL.mulEachM;
    $M.largeDivEach = $CL.divEachM;
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
    $M.largeMaxEachRow = $CL.maxEachRow;
    $M.largeMaxEachCol = $CL.maxEachCol;
    $M.largeArgmaxEachRow = $CL.argmaxEachRow;
    $M.largeArgmaxEachCol = $CL.argmaxEachCol;
    $M.largeArgminEachRow = $CL.argminEachRow;
    $M.largeArgminEachCol = $CL.argminEachCol;
    $M.largeConvolve = $CL.convolve;
    $M.largeExtract = $CL.extract;
  }
})(Sushi);
