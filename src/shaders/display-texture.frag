#version 300 es

precision highp float;

in vec2 v_Texcoord;

uniform sampler2D u_Texture;

out vec4 outColor;

void main() {
//    outColor = texture(u_Texture, v_Texcoord + 0.5);
    vec4 t = texture(u_Texture, v_Texcoord);
    outColor = vec4(t.rgb * t.a, 1.0);
//    outColor = vec4(1.,0.0,1.,1.0);
}
