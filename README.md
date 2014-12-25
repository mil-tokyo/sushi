# AgentSmith
The Fastest Matrix Library for JavaScript

AgentSmith is being developed to be the fastest matrix library for JavaScript, which is named after one of the fastest characters in the movie Matrix.

## Technical Features

### Use of Typed Array
Faster than other matrix libraries which uses javascript array.

### Support of WebCL
You can use WebCL and get at most 30 times faster calculation speed.
Two implementations

- Nokia WebCL for Firefox : http://webcl.nokiaresearch.com/
- Motorola-Mobility Node WebCL for node.js : https://github.com/Motorola-Mobility/node-webcl
- Chromium-WebCL : https://github.com/amd/Chromium-WebCL

are supported.

## How to Try

### node.js
	cd test
	node main
if you want to use WebCL, install node-webcl https://github.com/Motorola-Mobility/node-webcl and set the path in agent_smith_cl.js

### browsers
open test/main.html with your browser. Chromium-WebCL supports WebCL without any plugins. Firefox requires Nokia WebCL ( http://webcl.nokiaresearch.com/ ) to use WebCL with it.

## Please Contribute the Fastest Matrix Library
Contact me miura@mi.t.u-tokyo.ac.jp
