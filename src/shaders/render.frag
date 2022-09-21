#version 300 es
precision highp float;

in vec2 v_TexCoord;
uniform vec3 u_Color;
out vec4 o_FragColor;

void main() {
//    float dist = 1.0 - clamp(distance(vec2(0.0, 0.0), v_TexCoord), 0.0, 1.0);
//    o_FragColor = vec4(u_Color.rg, 1.0, dist > 0.2 ? dist : 0.0);
    o_FragColor = vec4(u_Color, 1.0);
}
