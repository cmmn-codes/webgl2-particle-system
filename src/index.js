import renderVert from './shaders/render.vert';
import renderFrag from './shaders/render.frag';
import updateVert from './shaders/update.vert';
import updateFrag from './shaders/update.frag';
import displayVert from './shaders/display-texture.vert';
import displayFrag from './shaders/display-texture.frag';

import * as twgl from 'twgl.js';

function randomData(size_x, size_y) {
  const d = [];
  for (let i = 0; i < size_x * size_y; ++i) {
    d.push(Math.random());
  }
  return new Uint8Array(d);
}

function initialData(num) {
  const data = [];
  for (let i = 0; i < num; ++i) {
    // position
    data.push(0.5 + (Math.random() - 0.5) * 1.0);
    data.push(0.5 + (Math.random() - 0.5) * 1.0);
    // velocity
    data.push((Math.random() - 0.5) * 0.01);
    data.push((Math.random() - 0.5) * 0.01);
  }
  return data;
}

function setup(gl) {
  const particleCount = 65535 * 2;
  // create gl program for updating particle movement
  const updateProgram = twgl.createProgramInfo(gl, [updateVert, updateFrag], {
    transformFeedbackVaryings: ['v_Position', 'v_Velocity'],
    transformFeedbackMode: gl.INTERLEAVED_ATTRIBS,
  });
  console.log(updateProgram);
  // create gl program for drawing particle movement
  const renderProgram = twgl.createProgramInfo(gl, [renderVert, renderFrag]);
  console.log(renderProgram);

  // create initial particle data
  const data = new Float32Array(initialData(particleCount));
  const buffers = Array.from({ length: 2 }).map(() =>
    twgl.createBufferFromTypedArray(gl, data, gl.ARRAY_BUFFER, gl.STREAM_DRAW)
  );

  const randomTexture = twgl.createTexture(gl, {
    src: randomData,
    format: gl.R8,
    internalFormat: gl.R8,
    wrap: gl.MIRRORED_REPEAT,
    level: 0,
    min: gl.NEAREST,
  });

  const updateBufferInfos = buffers
    .map((buffer) => {
      return twgl.createBufferInfoFromArrays(gl, {
        i_Position: {
          numComponents: 2,
          buffer: buffer,
          type: gl.FLOAT,
          stride: 4 * 4,
        },
        i_Velocity: {
          numComponents: 2,
          buffer: buffer,
          type: gl.FLOAT,
          stride: 4 * 4,
          offset: 4 * 2,
        },
      });
    })
    .map((e) => {
      // hack to allow attributes to share buffer
      // twgl will calculate the number of elements as double.
      e.numElements = particleCount;
      return e;
    });

  const renderBufferInfos = buffers
    .map((buffer) => {
      return twgl.createBufferInfoFromArrays(gl, {
        i_Position: {
          numComponents: 2,
          buffer: buffer,
          type: gl.FLOAT,
          stride: 4 * 4,
        },
      });
    })
    .map((e) => {
      // hack to allow attributes to share buffer
      // twgl will calculate the number of elements as double.
      e.numElements = particleCount;
      return e;
    });
  console.log('updateBufferInfos');
  console.log(updateBufferInfos);
  console.log('renderBufferInfos');
  console.log(renderBufferInfos);

  // create vertex array objects for particle system
  const vaos = [
    twgl.createVertexArrayInfo(gl, updateProgram, updateBufferInfos[0]),
    twgl.createVertexArrayInfo(gl, updateProgram, updateBufferInfos[1]),
    twgl.createVertexArrayInfo(gl, renderProgram, renderBufferInfos[0]),
    twgl.createVertexArrayInfo(gl, renderProgram, renderBufferInfos[1]),
  ];
  // I am actually not sure why this is required.
  // Buffer from creating VertexArrayInfo is still bound which causes issues
  // with the transform feedback in the render cycle.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // create frame buffer for rendering particle indirect feedback
  const attachments = [
    {
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      min: gl.NEAREST,
      wrap: gl.CLAMP_TO_EDGE,
      level: 0,
    },
  ];
  const fbis = [
    twgl.createFramebufferInfo(gl, attachments),
    twgl.createFramebufferInfo(gl, attachments),
    twgl.createFramebufferInfo(gl, attachments),
  ];
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // create gl program for rendering a texture to the screen
  const displayTextureProgram = twgl.createProgramInfo(gl, [
    displayVert,
    displayFrag,
  ]);
  console.log(displayTextureProgram);
  const displayTextureBufferInfo = twgl.createBufferInfoFromArrays(gl, {
    i_Position: {
      numComponents: 2,
      data: [-1, 1, -1, -1, 1, -1, 1, 1],
    },
    indices: {
      numComponents: 2,
      data: [3, 2, 1, 3, 1, 0],
    },
  });
  const displayTextureVao = twgl.createVertexArrayInfo(
    gl,
    displayTextureProgram,
    displayTextureBufferInfo
  );

  // setup gl rendering
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return {
    num: particleCount,
    read: 0,
    write: 1,
    updateProgram,
    updateBufferInfos,
    renderProgram,
    renderBufferInfos,
    oldTime: 0,
    totalTime: 0,
    vaos,
    fbis,
    displayTextureProgram,
    displayTextureBufferInfo,
    displayTextureVao,
    randomTexture,
  };
}

function getTimeDelta(newTime, oldTime) {
  let timeDelta = 0.0;
  if (oldTime !== 0) {
    timeDelta = newTime - oldTime;
    if (timeDelta > 500.0) {
      /* If delta is too high, do nothing.
         Maybe tab was in background or something. */
      timeDelta = 0.0;
    }
  }
  return timeDelta;
}

function run(gl, state, time) {
  /* Calculate time delta. */
  let timeDelta = getTimeDelta(time, state.oldTime);
  /* Set the previous update timestamp for calculating time delta in the
       next frame. */
  state.oldTime = time;
  // clear buffer
  gl.clear(gl.COLOR_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Update particle system

  gl.useProgram(state.updateProgram.program);

  twgl.setBuffersAndAttributes(gl, state.updateProgram, state.vaos[state.read]);
  twgl.setUniforms(state.updateProgram, {
    u_Texture: state.fbis[state.write].attachments[0],
    u_Width: gl.canvas.width,
    u_Height: gl.canvas.height,
    u_TimeDelta: timeDelta / 1000,
    u_Random: state.randomTexture,
  });
  gl.enable(gl.BLEND);
  gl.enable(gl.RASTERIZER_DISCARD);
  const writeBuffer =
    state.updateBufferInfos[state.write].attribs['i_Velocity'].buffer;
  const offset = state.num < 65535 ? state.num : 65535;
  gl.bindBufferRange(
    gl.TRANSFORM_FEEDBACK_BUFFER,
    0,
    writeBuffer,
    4 * 4 * offset,
    4 * 4 * (state.num - offset)
  );
  gl.beginTransformFeedback(gl.POINTS);
  twgl.drawBufferInfo(
    gl,
    state.vaos[state.read],
    gl.POINTS,
    state.num - offset,
    offset
  );
  gl.endTransformFeedback();
  gl.bindBufferRange(
    gl.TRANSFORM_FEEDBACK_BUFFER,
    0,
    writeBuffer,
    0,
    4 * 4 * offset
  );
  gl.beginTransformFeedback(gl.POINTS);
  twgl.drawBufferInfo(gl, state.vaos[state.read], gl.POINTS, offset, 0);
  gl.endTransformFeedback();
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
  gl.disable(gl.RASTERIZER_DISCARD);

  // Render particle system
  gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbis[2].framebuffer);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(state.renderProgram.program);
  twgl.setBuffersAndAttributes(
    gl,
    state.renderProgram,
    state.vaos[state.read + 2]
  );
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  twgl.drawBufferInfo(gl, state.vaos[state.read + 2], gl.POINTS);
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(state.displayTextureProgram.program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbis[state.write].framebuffer);
  // diffuse texture and keep around
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  twgl.setBuffersAndAttributes(
    gl,
    state.displayTextureProgram,
    state.displayTextureBufferInfo
  );
  twgl.setUniforms(state.displayTextureProgram, {
    u_Texture: state.fbis[2].attachments[0],
    u_Previous: state.fbis[state.read].attachments[0],
    u_Width: gl.canvas.width,
    u_Height: gl.canvas.height,
  });
  gl.disable(gl.BLEND);
  twgl.drawBufferInfo(gl, state.displayTextureVao);
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // draw texture to the screen
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  twgl.setBuffersAndAttributes(
    gl,
    state.displayTextureProgram,
    state.displayTextureBufferInfo
  );
  twgl.setUniforms(state.displayTextureProgram, {
    u_Texture: state.fbis[2].attachments[0],
    u_Previous: state.fbis[2].attachments[0],
    // u_Previous: state.fbis[state.write].attachments[0],
    u_Width: gl.canvas.width,
    u_Height: gl.canvas.height,
  });
  gl.disable(gl.BLEND);
  twgl.drawBufferInfo(gl, state.displayTextureVao);
  gl.bindVertexArray(null);

  let tmp = state.read;
  state.read = state.write;
  state.write = tmp;
}

function main() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log(canvas.width, canvas.height);
  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    alpha: false,
  });
  console.log(gl.getParameter(gl.MAX_ELEMENT_INDEX));
  console.log(gl.getParameter(gl.MAX_ELEMENTS_VERTICES));
  console.log(gl.getParameter(gl.MAX_ELEMENTS_INDICES));
  console.log(
    gl.getParameter(gl.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS)
  );
  if (gl != null) {
    document.body.appendChild(canvas);
    const state = setup(gl);
    const loop = (ts) => {
      run(gl, state, ts);
      window.requestAnimationFrame(function (ts) {
        loop(ts);
      });
    };

    window.requestAnimationFrame(function (ts) {
      loop(ts);
    });
  } else {
    document.write('WebGL2 is not supported by your browser');
  }
}

window.onload = main;
