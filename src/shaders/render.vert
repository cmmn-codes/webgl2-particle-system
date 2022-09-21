#version 300 es
precision highp float;

layout (location = 1) in vec2 i_Position;
layout (location = 2) in vec2 i_Velocity;
//in vec2 i_Coord;

out vec2 v_TexCoord;

void main() {
    gl_PointSize = 1.;
//    v_TexCoord = i_Coord;
//    vec2 vert_coord = (i_Position * 2.0 - 1.0) + (0.025 * i_Coord);
//    gl_Position = vec4(vert_coord, 0.0, 1.0);
    gl_Position = vec4(i_Position * 2.0 - 1.0, 0.0, 1.0);
}
