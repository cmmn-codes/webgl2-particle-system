#version 300 es
precision highp float;

layout (location = 1) in vec2 i_Position;
layout (location = 2) in vec2 i_Velocity;

uniform float width;
uniform float height;

out vec2 v_TexCoord;

void main() {
    gl_PointSize = 1.;
    v_TexCoord = i_Position;
    gl_Position = vec4(i_Position * 2.0 - 1.0, 0.0, 1.0);
}
