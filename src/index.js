import renderVert from './shaders/render.vert';
import renderFrag from './shaders/render.frag';
import updateVert from './shaders/update.vert';
import updateFrag from './shaders/update.frag';
import displayVert from './shaders/display-texture.vert';
import displayFrag from './shaders/display-texture.frag';

import * as twgl from 'twgl.js';

function initialData(num) {
  const data = [];
  for (let i = 0; i < num; ++i) {
    // position
    data.push(Math.random());
    data.push(Math.random());
    // velocity
    data.push((Math.random() - 0.5) * 0.1);
    data.push((Math.random() - 0.5) * 0.1);
  }
  return data;
}

function setup(gl) {
  const particleCount = (65537 * 6) + 20;
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
          // divisor: 1,
          buffer: buffer,
          type: gl.FLOAT,
          stride: 4 * 4,
          // stride: 4 * 2,
        },
        // i_Coord: {
        // data: [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1],
        // numComponents: 2,
        // },
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
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      level: 0,
    },
  ];
  const fbi = twgl.createFramebufferInfo(gl, attachments);
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
  // gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
    fbi,
    displayTextureProgram,
    displayTextureBufferInfo,
    displayTextureVao,
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
    u_TimeDelta: timeDelta / 1000,
  });
  const writeBuffer =
    state.updateBufferInfos[state.write].attribs['i_Position'].buffer;
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuffer);
  gl.beginTransformFeedback(gl.POINTS);
  gl.enable(gl.RASTERIZER_DISCARD);
  twgl.drawBufferInfo(gl, state.vaos[state.read], gl.POINTS);

  gl.disable(gl.RASTERIZER_DISCARD);
  gl.endTransformFeedback();

  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  gl.bindVertexArray(null);

  // Render particle system
  gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbi.framebuffer);
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(state.renderProgram.program);
  twgl.setBuffersAndAttributes(
    gl,
    state.renderProgram,
    state.vaos[state.read + 2]
  );
  gl.clearColor(1, 1, 1, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  twgl.setUniforms(state.renderProgram, {
    u_Color: [1, 1, 1], //Math.random(), Math.random(), Math.random()],
  });
  gl.enable(gl.BLEND);
  twgl.drawBufferInfo(gl, state.vaos[state.read + 2], gl.POINTS);
  // 6,
  // 0,
  // state.num
  // );
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(state.displayTextureProgram.program);
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
    u_Texture: state.fbi.attachments[0],
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
