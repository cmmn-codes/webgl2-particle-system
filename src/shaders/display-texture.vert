#version 300 es
precision highp float;

in vec2 i_Position;
// a varying to pass the texture coordinates to the fragment shader
out vec2 v_Texcoord;

void main() {
    gl_Position = vec4(i_Position, 0, 1);
    v_Texcoord = (i_Position + 1.0) / 2.;
}
