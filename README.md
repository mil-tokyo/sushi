# Sushi JavaScript Library
The Fastest Matrix Library for JavaScript

Sushi is being developed to be the fastest matrix library for JavaScript. Tempura and Soba go well with Sushi.
- Tempura (Machine Learning Library) http://github.com/mil-tokyo/tempura
- Soba (Visualization Library) http://github.com/mil-tokyo/soba

Related papers are available ( http://mil-tokyo.github.io/miljs.html ).

## Technical Features

### Use of Typed Array
Faster than other matrix libraries which use javascript array.

### Support of WebCL
You can use WebCL and get at most 30 times faster calculation speed.
Three implementations

- Nokia WebCL for Firefox : http://webcl.nokiaresearch.com/
- Motorola-Mobility Node WebCL for node.js : https://github.com/mikeseven/node-webcl
- Chromium-WebCL : https://github.com/amd/Chromium-WebCL

are supported.

## How to Try

### node.js
	cd test
	node main
If you want to use WebCL, install node-webcl https://github.com/mikeseven/node-webcl

Currently, WebCL is supported by node v0.10.29, node-webcl v0.8.3 or v0.9.2

Try

	npm install node-webcl

However, current nvidia driver only supports OpenCL 1.1, which is not compatible with node-webcl 0.9.0 or later.
OpenCL 1.1 is supported by node-webcl v0.8.3, but unfortunately it has a small bug.
So we provide bugfix version here: https://github.com/mil-tokyo/node-webcl/tree/opencl11_fix

Simple installation:

	npm install https://github.com/mil-tokyo/node-webcl/archive/opencl11_fix.tar.gz

### Browsers
Open test/main.html with your browser. Chromium-WebCL supports WebCL without any plugins. Firefox requires Nokia WebCL ( http://webcl.nokiaresearch.com/ ) to use WebCL with it.

## Please Contribute to the Fastest Matrix Library
Contact me miljs@mi.t.u-tokyo.ac.jp
