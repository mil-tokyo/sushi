Sushi is a matrix library designed to be fastest among JavaScript environment.

Here is an example of how to use Sushi.

## Setup
Sushi runs on most modern web browsers which supports TypedArray.
Also, it works with server-side node.js environment.

To load Sushi in the html, simply put script tag as follows:

    <script src="sushi.js"></script>

`sushi.js` puts global object `{@link Sushi}`. Then, this is the "hello world" example:

    <html>
      <head>
        <meta charset="utf-8">
        <title>Sushi example</title>
        <script src="../../src/sushi.js"></script>
      </head>
      <body>
        <script>
          var $M = Sushi.Matrix;
          var x = $M.fromArray([[1,2],
                                [3,4]]);//constructs matrix from JavaScript Array
          var y = $M.eye(2);//2x2 identity matrix
          var z = $M.add(x, y);//add two matrices
          var disp = function (mat) {//helper function
            var mat_str = mat.toString();
            document.write(mat_str.replace(/\n/g, "<br>"));
          };
          disp(x);
          document.write("<br>+<br>");
          disp(y);
          document.write("<br>=<br>");
          disp(z);
        </script>
      </body>
    </html>

By opening this html file by a web browser, the following text  will be displayed.

    -- Matrix (2 x 2) --
    1 2
    3 4
    +
    -- Matrix (2 x 2) --
    1 0
    0 1
    =
    -- Matrix (2 x 2) --
    2 2
    3 5 

This example shows how to construct and use matrices.

    var $M = Sushi.Matrix;

The matrix class provided by Sushi can be accessed by `{@link Sushi.Matrix}`. For keeping the code short, it is suggested to bind the variable to `$M`.

    var x = $M.fromArray([[1,2],
                          [3,4]]);//constructs matrix from JavaScript Array

One way to construct matrix. `{@link Sushi.Matrix.fromArray $M.fromArray}` constructs a matrix from elements given as JavaScript Array (Array of Array of number).
The shape of the matrix is determined by the length of Array. In this case, 2x2 matrix is constructed.
In Sushi, the number of rows and columns can be arbitrary positive integer value.
The elements are stored to Float32Array internally, which means elements are represented by 32bit floating-point value.

    var y = $M.eye(2);//2x2 identity matrix

This is another way to construct matrix. `{@link Sushi.Matrix.eye $M.eye}` gives identity matrix (e.g. diagonal elements are 1 and others are 0) of specified rows and columns.

    var z = $M.add(x, y);//add two matrices

`{@link Sushi.Matrix.add $M.add}` adds two matrices and gives new matrix as the result.

## Accessing elements of matrix
Users can access to elements of matrix by various ways.

`{@link Sushi.Matrix#get m.get(row, col)}` is the simplest way of getting one element of matrix `m`. Please note that Sushi currently supports only two-dimensional matrices (e.g. no tensor support).
`{@link Sushi.Matrix.getRow $M.getRow} {@link Sushi.Matrix.getCol $M.getCol}` extracts one row or column from an matrix.
`{@link Sushi.Matrix#set m.set}`, `{@link Sushi.Matrix#setRow m.setRow}`, `{@link Sushi.Matrix#setCol m.setCol}` is the setter corresponding methods above.

## Use of WebCL
Users can gain much faster matrix calculation speed by using WebCL.
WebCL is a wrapper for OpenCL framework to use GPU from JavaScript. (To be precise, multi core CPU with OpenCL driver can also be used.)
Users may have to install OpenCL onto the operating system and WebCL onto the web browser.
Currently WebCL is not installed on web browsers as default, but Firefox plugin is provided.
Please visit https://github.com/toaarnio/webcl-firefox to install it.

On WebCL-enabled web browser, loading `sushi_cl.js` in addition to `sushi.js` enables fast computation.

    <script src="sushi.js"></script>
    <script src="sushi_cl.js"></script>

`sushi_cl.js` provides `largeX` (such as {@link Sushi.Matrix.largeAdd}, {@link Sushi.Matrix.largeMaxEachRow}) methods which works on GPU.
On web browser which not supports WebCL, `sushi_cl.js` does nothing and methods of `largeX()` is an alias of `X()`.

Hello world example is almost same as non-WebCL version.

    <html>
      <head>
        <meta charset="utf-8">
        <title>Sushi example</title>
        <script src="sushi.js"></script>
        <script src="sushi_cl.js"></script>
      </head>
      <body>
        <script>
          var $M = Sushi.Matrix;
          var x = $M.fromArray([[1,2],
                                [3,4]]);//constructs matrix from JavaScript Array
          var y = $M.eye(2);//2x2 identity matrix
          var z = $M.largeAdd(x, y);//add two matrices on GPU
          var disp = function (mat) {//helper function
            var mat_str = mat.toString();
            document.write(mat_str.replace(/\n/g, "<br>"));
          };
          disp(x);
          document.write("<br>+<br>");
          disp(y);
          document.write("<br>=<br>");
          disp(z);
          // User has to manually release GPU memory
          x.destruct();
          y.destruct();
          z.destruct();
        </script>
      </body>
    </html>

By using `largeAdd` method, matrix addition is performed on GPU.
The memory transfer between main memory and GPU memory is performed automatically.
One thing should be noted is that allocated memory on GPU is not the target of garbage-collection (GC).
User has to call destruct method manually to release memory.
It is safe to call destruct method of a matrix whose elements are stored in main memory.
