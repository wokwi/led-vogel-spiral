/**
 * LED Vogel's Spiral
 *
 * Check it out on https://wokwi.com/arduino/projects/287434389653029384
 *
 * Copyright (c) 2021 Uri Shaked
 *
 * Released under the MIT license.
 */

const canvas = document.getElementById('pixels');
const gl = canvas.getContext('webgl');

gl.clearColor(1, 1, 1, 1);
const sourceV = `
  attribute vec3 position;

  void main() {
    gl_Position = vec4(position, 1);
  }
`;

const shaderV = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(shaderV, sourceV);
gl.compileShader(shaderV);

if (!gl.getShaderParameter(shaderV, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(shaderV));
  throw new Error('Failed to compile vertex shader');
}

const sourceF = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform sampler2D u_pixels;

  const float pi = 3.141592;

  void main() {
    vec2 polar = gl_FragCoord.xy / u_resolution.xy - 0.5;
    float r = length(polar);
    float alpha = smoothstep(0., 0.02, 0.5 - r) * 34.;
    vec4 color = vec4(0., 0., 0., 0.);
    for (int n = 1; n <= 256; n++) {
      float r = sqrt(float(n)) / 34.;
      float theta = 137.508 / 180. * pi * float(n);
      float distance = length(polar - vec2(r * cos(theta), r * sin(theta)));
      float pixelAlpha = clamp(1. - 40. * distance, 0., 1.);
      float row = float((n - 1) / 16);
      vec2 texturePos = vec2(float(n - 1) / 16. - row / 16., row / 16.);
      vec4 textureColor = texture2D(u_pixels, texturePos);
      // colors are actually encoded in GBR format
      color.xyz += pixelAlpha * vec3(textureColor.g, textureColor.b, textureColor.r);
      color.a += pixelAlpha;
    }
  	gl_FragColor = vec4(color.xyz, alpha);
  }
`;

const shaderF = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(shaderF, sourceF);
gl.compileShader(shaderF);

if (!gl.getShaderParameter(shaderF, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(shaderF));
  throw new Error('Failed to compile fragment shader');
}

const program = gl.createProgram();
gl.attachShader(program, shaderV);
gl.attachShader(program, shaderF);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error(gl.getProgramInfoLog(program));
  throw new Error('Failed to link program');
}

gl.useProgram(program);

function getUniformLocation(program, name) {
  var uniformLocation = gl.getUniformLocation(program, name);
  if (uniformLocation === null) {
    console.warn('Cannot find uniform', name);
  }
  return uniformLocation;
}

// prettier-ignore
const positionsData = new Float32Array([
  -1, -1, -1,
  1, -1, -1,
  -1, 1, -1,
  1, -1, -1,
  -1, 1, -1,
  1, 1, -1,
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, positionsData, gl.STATIC_DRAW);
const attribute = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(attribute);
gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);

const resHandle = getUniformLocation(program, 'u_resolution');
const pixelsHandle = getUniformLocation(program, 'u_pixels');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
gl.viewport(0, 0, canvas.width, canvas.height);
gl.uniform2f(resHandle, canvas.width, canvas.height);

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
const level = 0;
const internalFormat = gl.RGBA;
const width = 16;
const height = 16;
const border = 0;
const srcFormat = gl.RGBA;
const srcType = gl.UNSIGNED_BYTE;
const pixels = new Uint32Array(height * width);

gl.texImage2D(
  gl.TEXTURE_2D,
  level,
  internalFormat,
  width,
  height,
  border,
  srcFormat,
  srcType,
  new Uint8Array(pixels.buffer),
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

function draw() {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    new Uint8Array(pixels.buffer),
  );

  gl.uniform1i(pixelsHandle, texture);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

draw();

// Workaround for a Wokwi sometimes missing the first message
let listener = setInterval(() => {
  parent.postMessage({ app: 'wokwi', command: 'listen', version: 1 }, 'https://wokwi.com');
}, 200);

window.addEventListener('message', ({ data }) => {
  if (data.neopixels) {
    pixels.set(data.neopixels);
    draw();
    if (listener) {
      clearInterval(listener);
      listener = null;
    }
  }
});
