#version 300 es
precision highp float;

in vec2 i_Position;
in vec2 i_Coord;

out vec2 v_TexCoord;

void main() {
    v_TexCoord = i_Coord;
    vec2 vert_coord = (i_Position * 2.0 - 1.0) + (0.2 * i_Coord);
    gl_Position = vec4(vert_coord, 0.0, 1.0);
}
