#version 300 es
precision highp float;

in vec2 v_TexCoord;
out vec4 o_FragColor;

void main() {

    float dist = 1.0 - clamp(distance(v_TexCoord, vec2(0.0, 0.0)), 0.0, 1.0);
    o_FragColor = vec4(1.0, 1.0, 1.0, dist * 0.5);
}