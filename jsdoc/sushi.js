/**
 * Global object set by Sushi library.
 * @namespace Sushi
 * 
 */
var Sushi = {};

/**
 * @classdesc Initialize a matrix with shape of (rows, cols). If array is given, set the member variable data with given array, otherwise data is not created untill Sushi.Matrix.prototype.syncData is called.
 * @constructor
 * @param {int} rows The number of rows.
 * @param {int} cols The number of cols.
 * @param {Float32Array} [data] Values.
*/
Sushi.Matrix = function (rows, cols, data) {
  /**
   * The number of rows.
   * @type {int}
   */
  this.rows = 0;
  /**
   * The number of cols.
   * @type {int}
   */
  this.cols = 0;
  /**
   * Whether data is stored row-wise or not.
   * @type {bool}
   */
  this.row_wise = true;
  /**
   * Values. Since this may occasionally be not allocated, it is necessary to call Sushi.Matrix.prototype.syncData beforehand.
   * @type {Float32Array}
   */
  this.data = new Float32Array(1);
  /**
   * If the member variable data is not allocated, prepare it. If WebCL is loaded, transport data from WebCL buffer to the member variable data.
   */
  this.syncData = function () { };
  /**
   * If WebCL is loaded, discard WebCL buffer.
   * Note: WebCL buffer is not garbage-collected.
   */
  this.destruct = function () { };
  /**
   * Copy properties from the original but not its member variable data.
   * @param {Sushi.Matrix} original
   */
  this.copyPropertyFrom = function (original) { };
  /**
   * Check whether all elements are completely equal to those of mat or not.
   * @param {Sushi.Matrix} mat
   * @return {bool}
   */
  this.equals = function (mat) { };
  /**
   * Check whether all element-wise absolute differences between stored values and mat's values are within epsilon or not. 
   * @param {Sushi.Matrix} mat
   * @param {float} [epsilon=0.01] Allowed absolute difference of each element
   * @return {bool}
   */
  this.nearlyEquals = function (mat, epsilon) { };
  /**
   * Display elements on console.
   */
  this.print = function () { };
  /**
   * Create readable string of elements.
   * @return {string}
   */
  this.toString = function () { };
  /**
   * If the member variable row_wise is false, transpose its own elements in order to make row_wise true. Return self.
   * @return {Sushi.Matrix}
   */
  this.toRowWise = function () { };
  /**
   * Construct a copy of self. If output is given, reuse it for output.
   * @param {Sushi.Matrix} [output]
   * @return {Sushi.Matrix}
   */
  this.clone = function (output) { };
  /**
   * Create an alias of matrix which shares the member variable data.
   * @return {Sushi.Matrix}
   */
  this.alias = function () { };
  /**
   * Fill all elements with num. Return self.
   * @param {float} [num=0.0]
   * @return {Sushi.Matrix}
   */
  this.zeros = function (num) { };
  /**
   * Fill all elements with random values between min and max. Return self.
   * @param {float} [min=0.0]
   * @param {float} [max=1.0]
   * @return {Sushi.Matrix}
   */
  this.random = function (min, max) { };
  /**
   * Fill all elements with random values generated from gaussian ( mean:mu, standard deviation:std ). Return self.
   * @param {float} mu
   * @param {float} std
   * @return {Sushi.Matrix}
   */
  this.gaussRandom = function (mu, std) { };
  /**
   * Fill each element with its index number. Return self.
   * @return {Sushi.Matrix}
   */
  this.range = function () { };
  /**
   * Dump to CSV string.
   * @return {string}
   */
  this.toCSV = function () { };
  /**
   * Set elements with given two-dimensional jagged array. Return self.
   * @param {Array} original_array
   * @return {Sushi.Matrix}
   */
  this.setArray = function (original_array) { };
  /**
   * Overwrite row'th row with row-wise vector mat. Return self.
   * @param {int} row
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.setRow = function (row, mat) { };
  /**
   * Overwrite col'th column with column-wise vector mat. Return self.
   * @param {int} col
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.setCol = function (col, mat) { };
  /**
   * Dump to Object
   * @return {Object}
   */
  this.toJSON = function () { };
  /**
   * Get the element of (row, col).
   * @param {int} row
   * @param {int} col
   * @return {float}
   */
  this.get = function (row, col) { };
  /**
   * Set datum to the element of (row, col). Return self.
   * @param {int} row
   * @param {int} col
   * @param {float} datum
   * @return {Sushi.Matrix}
   */
  this.set = function (row, col, datum) { };
  /**
   * Set each element with a return value of callback function which takes original element as its argument. Return self.
   * @param {Sushi.Matrix~MapCallback} func Callback function to calculate element value
   * @return {Sushi.Matrix}
   */
  this.map = function (func) { };
  /**
   * @callback Sushi.Matrix~MapCallback
   * @param {float} datum current value
   * @return {float} value to write
   */
  /**
   * Set each element with a return value of callback function which takes the number of row and column as its argument. Return self.
   * @param {Sushi.Matrix~SetEachCallback} func Callback function to calculate element value
   * @return {Sushi.Matrix}
   */
  this.setEach = function (func) { };
  /**
   * @callback Sushi.Matrix~SetEachCallback
   * @param {int} row
   * @param {int} col
   * @return {float} value to write
   */
  /**
   * Execute callback function with each row and column number. Return self.
   * @param {Sushi.Matrix~ForEachCallback} func
   * @return {Sushi.Matrix}
   */
  this.forEach = function (func) { };
  /**
   * @callback Sushi.Matrix~ForEachCallback
   * @param {int} row
   * @param {int} col
   */
  /**
   * Change shape of the matrix. An exception is thrown if the number of elements does not match current value. Return self.
   * @param {int} rows
   * @param {int} cols
   */
  this.reshape = function (rows, cols) { };
  /**
   * Transpose matrix. Create new alias which share the member variable data and invert the member variable row_wise.
   * @return {Sushi.Matrix}
   */
  this.t = function () { };
  /**
   * Get the number of rows and the number of columns.
   * @return {Sushi.Matrix.Shape}
   */
  this.getShape = function () { };
  /**
   * Represents shape of a matrix.
   * @typedef {Object} Sushi.Matrix.Shape
   * @prop {int} rows
   * @prop {int} cols
   */
  /**
   * Multiply num times element-wise. Change self and return self.
   * @param {float} times
   * @return {Sushi.Matrix}
   */
  this.times = function (times) { };
  /**
   * Add mat to self. Update and return self.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.add = function (mat) { };
  /**
   * Subtract mat from self. Update and return self.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.sub = function (mat) { };
  /**
   * Mutiply mat to self element-wise. Update and return self.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.mulEach = function (mat) { };
  /**
   * Divide self by mat element-wise. Update and return self.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.divEach = function (mat) { };
  /**
   * Dot product with mat.
   * @param {Sushi.Matrix} mat
   * @return {float}
   */
  this.dot = function (mat) { };
  /**
   * Marix multiplication with mat.
   * @param {Sushi.Matrix} mat
   * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
   * @return {Sushi.Matrix}
   */
  this.mul = function (mat, output) { };
  /**
   * Determinant.
   * @return {float}
   */
  this.det = function () { };
  /**
   * Inverse matrix.
   * @return {Sushi.Matrix}
   */
  this.inverse = function () { };
  
  /**
   * WebCL version of function {@link Sushi.Matrix#add}. If WebCL is not loaded, {@link Sushi.Matrix#add} is called instead.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.largeAdd = function (mat) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#sub}. If WebCL is not loaded, {@link Sushi.Matrix#sub} is called instead.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.largeSub = function (mat) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#mulEach}. If WebCL is not loaded, {@link Sushi.Matrix#mulEach} is called instead.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.largeMulEach = function (mat) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#divEach}. If WebCL is not loaded, {@link Sushi.Matrix#divEach} is called instead.
   * @param {Sushi.Matrix} mat
   * @return {Sushi.Matrix}
   */
  this.largeDivEach = function (mat) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#mul}. If WebCL is not loaded, {@link Sushi.Matrix#mul} is called instead.
   * @param {Sushi.Matrix} mat
   * @param {Sushi.Matrix} [output]
   * @return {Sushi.Matrix}
   */
  this.largeMul = function (mat, output) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#times}. If WebCL is not loaded, {@link Sushi.Matrix#times} is called instead.
   * @param {float} times
   * @return {Sushi.Matrix}
   */
  this.largeTimes = function (times) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#clone}. If WebCL is not loaded, {@link Sushi.Matrix#clone} is called instead.
   * @param {Sushi.Matrix} [output]
   * @return {Sushi.Matrix}
   */
  this.largeClone = function (output) { };
  /**
   * WebCL version of function {@link Sushi.Matrix#zeros}. If WebCL is not loaded, {@link Sushi.Matrix#zeros} is called instead.
   * @param {float} num
   * @return {Sushi.Matrix}
   */
  this.largeZeros = function (num) { };

};

/**
 * If mat is not given, return new (rows, cols) array. If mat is given, check the size of mat at first, then if it is consistent with given parameters, the original mat returns, otherwise raise exception.
 * @param {int} rows
 * @param {int} cols
 * @param {Sushi.Matrix} [mat]
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.newMatOrReuseMat = function (rows, cols, mat) { };
/**
 * Check if the mat has at least one NaN value or not.
 * @param {Sushi.Matrix} mat
 * @return {bool}
 */
Sushi.Matrix.hasNaN = function (mat) { };
/**
 * Convert mat to a two-dimensional jagged array.
 * @param {Sushi.Matrix} mat
 * @return {Array}
 */
Sushi.Matrix.toArray = function (mat) { };
/**
 * Convert two-dimensional jagged array to an instance of Matrix.
 * @param {Array.<Array.<float>>} original_array
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.fromArray = function (original_array) { };
/**
 * Convert csv string to an instance of Matrix.
 * @param {string} csv_string
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.fromCSV = function (csv_string) { };
/**
 * Construct an instance of Matrix with ones on the diagonal and zeros elsewhere.
 * @param {int} size The number of rows and columns
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.eye = function (size, output) { };
/**
 * Construct an instance of Matrix with its diagonals being taken from diag.
 * @param {Sushi.Matrix|Array.<float>} diag
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.diag = function (diag) { };
/**
 * Construct an instance of Matrix with shape [rows, cols] filled with a small part of mat where offset_row and offset_col are the starting indices.
 * @param {Sushi.Matrix} mat
 * @param {int} offset_row
 * @param {int} offset_col
 * @param {int} rows
 * @param {int} cols
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.extract = function (mat, offset_row, offset_col, rows, cols, output) { };
/**
 * Construct an instance of Matrix with values extracted from specified row of mat.
 * @param {Sushi.Matrix} mat
 * @param {int} row
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.getRow = function (mat, row, output) { };
/**
 * Construct an instance of Matrix with values extracted from specified col of mat.
 * @param {Sushi.Matrix} mat
 * @param {int} col
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.getCol = function (mat, col, output) { };
/**
 * Stack a sequence of Matrices vetrically (row wise) to make a single Matrix.
 * @param {Array.<Sushi.Matrix>} mats Array of matrices
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.vstack = function (mats, output) { };
/**
 * Stack a sequence of Matrices horizontally (column wise) to make a single Matrix.
 * @param {Array.<Sushi.Matrix>} mats Array of matrices
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.hstack = function (mats, output) { };
/**
 * Construct an instance of Matrix from dumped JSON object.
 * @param {Object} data
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.fromJSON = function (data) { };
/**
 * Get a value from specified index by each row or column.
 * If indices are row-wise vector, construct row-wise vector where i-th element is set to mat[indices[i], i].
 * If indices are column-wise vector, construct column-wise vector where i-th element is set to mat[i, indices[i]].
 * @param {Sushi.Matrix} original
 * @param {Sushi.Matrix} indices
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.getEach = function (original, indexes) { };
/**
 * Get the element-wise maximum of mat.
 * @param {Sushi.Matrix} mat
 * @return {float}
 */
Sushi.Matrix.max = function (mat) { };
/**
 * Get the element-wise minimum of mat.
 * @param {Sushi.Matrix} mat
 * @return {float}
 */
Sushi.Matrix.min = function (mat) { }
/**
 * Get index of the maximum values in mat.
 * @param {Sushi.Matrix} mat
 * @return {Sushi.Matrix.Position}
 */
Sushi.Matrix.argmax = function (mat) { };
/**
 * Represents position in a matrix.
 * @typedef {Object} Sushi.Matrix.Position
 * @prop {int} row
 * @prop {int} col
 */
/**
 * Sum of all elements in mat.
 * @param {Sushi.Matrix} mat
 * @return {float}
 */
Sushi.Matrix.sum = function (mat) { };
/**
 * Sum of elements over each row.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.sumEachRow = function (mat, output) { };
/**
 * Sum of elements over each column.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.sumEachCol = function (mat, output) { };
/**
 * Get the maximum values from each row.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.maxEachRow = function (mat, output) { };
/**
 * Get the maximum values from each column.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.maxEachCol = function (mat, output) { };
/**
 * Get column indices of the maximum value for each row.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.argmaxEachRow = function (mat, output) { };
/**
 * Get row indices of the maximum value for each column.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.argmaxEachCol = function (mat, output) { };
/**
 * Get column indices of the minimum value for each row.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.argminEachRow = function (mat, output) { };
/**
 * Get row indices of the minimum value for each column.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.argminEachCol = function (mat, output) { };
/**
 * Add arguments element-wise.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix} mat1 + mat2
 */
Sushi.Matrix.add = function (mat1, mat2, output) { };
/**
 * Subtract arguments element-wise.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix} mat1 - mat2
 */
Sushi.Matrix.sub = function (mat1, mat2, output) { };
/**
 * Mutiply arguments element-wise.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix} mat1 * mat2 (element-wise)
 */
Sushi.Matrix.mulEach = function (mat1, mat2, output) { };
/**
 * Divide arguments element-wise.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix} mat1 / mat2 (element-wise)
 */
Sushi.Matrix.divEach = function (mat1, mat2, output) { };
/**
 * Dot product of inputs.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @return {float}
 */
Sushi.Matrix.dot = function (mat1, mat2) { };
/**
 * Matrix multiplication of inputs.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.mul = function (mat1, mat2, output) { };
/**
 * Convolve mat1 and mat2 with output size determined by mode.
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {string} mode 'full': The output is the full discrete linear convolution of the inputs.
 * 'valid': The output consists only of those elements that do not rely on the zero-padding.
 * 'same': The output is the same size as mat1, centered with respect to the full output. 
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.convolve = function (mat1, mat2, mode, output) { };
/**
 * Convert matrix to upper triangle by Gaussian elimination.
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.upperTriangular = function (mat, output) { };
/**
 * Compute the qr factorization of mat, where one output Q is orthonormal and the other output R is upper-triangular.
 * @param {Sushi.Matrix} A
 * @return {Sushi.Matrix.QRResult}
 */
Sushi.Matrix.qr = function (A) { };
/**
 * Resulting object of {@link Sushi.Matrix.qr}.
 * @typedef {Object} Sushi.Matrix.QRResult
 * @prop {Sushi.Matrix} Q orthonormal
 * @prop {Sushi.Matrix} R upper-triangular
 */

/**
 * Compute the singular value decomposition of mat. Factors mat as U * diag(S) * V.T, where U and V are unitary and S is mat's singular values.
 * @param {Sushi.Matrix} A
 * @return {Sushi.Matrix.SVDResult}
 */
Sushi.Matrix.svd = function (A) { };
/**
 * Resulting object of {@link Sushi.Matrix.svd}.
 * @typedef {Object} Sushi.Matrix.SVDResult
 * @prop {Sushi.Matrix} U
 * @prop {Sushi.Matrix} S
 * @prop {Sushi.Matrix} V
 */

/**
 * WebCL version of function {@link Sushi.Matrix.add}. If WebCL is not loaded, {@link Sushi.Matrix.add} is called instead. 
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeAdd = function (mat1, mat2, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.sub}. If WebCL is not loaded, {@link Sushi.Matrix.sub} is called instead. 
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeSub = function (mat1, mat2, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.mulEach}. If WebCL is not loaded, {@link Sushi.Matrix.mulEach} is called instead. 
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeMulEach = function (mat1, mat2, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.divEach}. If WebCL is not loaded, {@link Sushi.Matrix.divEach} is called instead. 
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeDivEach = function (mat1, mat2, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.mul}. If WebCL is not loaded, {@link Sushi.Matrix.mul} is called instead. 
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeMul = function (mat1, mat2, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.sum}. If WebCL is not loaded, {@link Sushi.Matrix.sum} is called instead. 
 * @param {Sushi.Matrix} mat
 * @return {float}
 */
Sushi.Matrix.largeSum = function (mat) { };
/**
 * WebCL version of function {@link Sushi.Matrix.sumEachRow}. If WebCL is not loaded, {@link Sushi.Matrix.sumEachRow} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeSumEachRow = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.sumEachCol}. If WebCL is not loaded, {@link Sushi.Matrix.sumEachCol} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeSumEachCol = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.maxEachRow}. If WebCL is not loaded, {@link Sushi.Matrix.maxEachRow} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeMaxEachRow = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.maxEachCol}. If WebCL is not loaded, {@link Sushi.Matrix.maxEachCol} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeMaxEachCol = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.argmaxEachRow}. If WebCL is not loaded, {@link Sushi.Matrix.argmaxEachRow} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeArgmaxEachRow = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.argmaxEachCol}. If WebCL is not loaded, {@link Sushi.Matrix.argmaxEachCol} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeArgmaxEachCol = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.argminEachRow}. If WebCL is not loaded, {@link Sushi.Matrix.argminEachRow} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeArgminEachRow = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.argminEachCol}. If WebCL is not loaded, {@link Sushi.Matrix.argminEachCol} is called instead. 
 * @param {Sushi.Matrix} mat
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeArgminEachCol = function (mat, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.convolve}. If WebCL is not loaded, {@link Sushi.Matrix.convolve} is called instead. 
 * @param {Sushi.Matrix} mat1
 * @param {Sushi.Matrix} mat2
 * @param {string} mode
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeConvolve = function (mat1, mat2, mode, output) { };
/**
 * WebCL version of function {@link Sushi.Matrix.extract}. If WebCL is not loaded, {@link Sushi.Matrix.extract} is called instead.
 * @param {Sushi.Matrix} mat
 * @param {int} offset_row
 * @param {int} offset_col
 * @param {int} rows
 * @param {int} cols
 * @param {Sushi.Matrix} [output] If output is given, reuse it for output.
 * @return {Sushi.Matrix}
 */
Sushi.Matrix.largeExtract = function (mat, offset_row, offset_col, rows, cols, output) { };

/**
 * Sushi CL Member variables
 * @prop {int} buffers The number of buffers allocated by WebCL.
 * @prop {string} platform_info The platform information of WebCL.
 * @prop {string} device_info The device information of WebCL.
 */
Sushi.Matrix.CL = { buffers: 0, platform_info: '', device_info: '' };
