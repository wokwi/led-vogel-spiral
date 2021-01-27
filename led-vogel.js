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

const layouts = {
  // prettier-ignore
  splendida: [0, 98, 195, 49, 146, 243, 74, 171, 24, 122, 219, 50, 147, 244, 97, 194, 25, 123, 220, 73, 170, 1, 99, 196, 48, 145, 242, 75, 172, 23, 121, 218, 51, 148, 245, 96, 193, 26, 124, 221, 72, 169, 2, 100, 197, 47, 144, 241, 76, 173, 22, 120, 217, 52, 149, 246, 95, 192, 27, 125, 222, 71, 168, 3, 101, 198, 46, 143, 240, 77, 174, 21, 119, 216, 53, 150, 247, 94, 191, 28, 126, 223, 70, 167, 4, 102, 199, 45, 142, 239, 78, 175, 20, 118, 215, 54, 151, 248, 93, 190, 29, 127, 224, 69, 166, 5, 103, 200, 44, 141, 238, 79, 176, 19, 117, 214, 55, 152, 249, 92, 189, 30, 128, 225, 68, 165, 6, 104, 201, 43, 140, 237, 80, 177, 18, 116, 213, 56, 153, 250, 91, 188, 31, 129, 226, 67, 164, 7, 105, 202, 42, 139, 236, 81, 178, 17, 115, 212, 57, 154, 251, 90, 187, 32, 130, 227, 66, 163, 8, 106, 203, 41, 138, 235, 82, 179, 16, 114, 211, 58, 155, 252, 89, 186, 33, 131, 228, 65, 162, 9, 107, 204, 40, 137, 234, 83, 180, 15, 113, 210, 59, 156, 253, 88, 185, 34, 132, 229, 64, 161, 10, 108, 205, 39, 136, 233, 84, 181, 14, 112, 209, 60, 157, 254, 87, 184, 35, 133, 230, 63, 160, 11, 109, 206, 38, 135, 232, 85, 182, 13, 111, 208, 61, 158, 255, 86, 183, 36, 134, 231, 62, 159, 12, 110, 207, 37],
};

const urlParams = new URL(location.href).searchParams;
const layout = layouts[urlParams.get('layout')];

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
      float distance = length(polar + vec2(-r * cos(theta), r * sin(theta)));
      float pixelAlpha = clamp(1. - 40. * distance, 0., 1.);
      float row = float((n - 1) / 16);
      vec2 texturePos = vec2(float(n - 1) / 16., row / 16.);
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
    const newPixels = layout
      ? data.neopixels.map((_, i) => data.neopixels[layout[i]])
      : data.neopixels;
    pixels.set(newPixels);
    draw();
    if (listener) {
      clearInterval(listener);
      listener = null;
    }
  }
});
