#version 300 es
precision highp float;

in vec2 v_TexCoord;
out vec4 o_FragColor;

void main() {
//    o_FragColor = vec4(c.rgb + 0.01, 1.0);
    o_FragColor = vec4(1.0, v_TexCoord.xy, 1.0);
//    o_FragColor = vec4(u_Texture, 1.0);
}
