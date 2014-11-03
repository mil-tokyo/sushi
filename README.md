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
are supported.

## How to Try
### node.js
	cd test
	node main
if you want to use WebCL, install node-webcl https://github.com/Motorola-Mobility/node-webcl and set the path in agent_smith_cl.js
### browsers
	open sample/index.html with your browser
if you want to use WebCL, install Nokia WebCL http://webcl.nokiaresearch.com/ in Firefox and open with it

## Please Contribute the Fastest Matrix Library
Contact me via twitter.
