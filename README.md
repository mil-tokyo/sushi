# Sushi JavaScript Library
The Fastest Matrix Library for JavaScript

Sushi is being developed to be the fastest matrix library for JavaScript. Tempura and Soba go well with Sushi.
- Tempura (Machine Learning Library) http://github.com/mil-tokyo/tempura
- Soba (Visualization Library) http://github.com/mil-tokyo/soba

Related papers may be available ( http://mil-tokyo.github.io/miljs.html ).

## Technical Features

### Use of Typed Array
Faster than other matrix libraries which uses javascript array.

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

try npm install node-webcl

### browsers
open test/main.html with your browser. Chromium-WebCL supports WebCL without any plugins. Firefox requires Nokia WebCL ( http://webcl.nokiaresearch.com/ ) to use WebCL with it.

## Please Contribute the Fastest Matrix Library
Contact me miljs@mi.t.u-tokyo.ac.jp
