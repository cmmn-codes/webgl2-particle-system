#version 300 es

precision highp float;

in vec2 v_Texcoord;

uniform sampler2D u_Texture;
uniform sampler2D u_Previous;
uniform float u_Width;
uniform float u_Height;
uniform float u_Decay;

out vec4 outColor;

void main() {
    //    outColor = texture(u_Texture, v_Texcoord + 0.5);
    ivec2 p = ivec2(v_Texcoord.x * u_Width, v_Texcoord.y * u_Height);
    int w = int(u_Width);
    int h = int(u_Height);
    vec3 t = vec3(0., 0., 0.);
    for (int i = -1; i < 2; i++) {
        for (int j = -1; j < 2; j++) {
            int x = (w + p.x + i) % w;
            int y = (h + p.y + j) % h;
            t += texelFetch(u_Previous, ivec2(x, y), 0).rgb;
        }
    }
    t = abs((t / 9.0) - u_Decay);

    vec3 c = texelFetch(u_Texture, p, 0).rgb;
    outColor = vec4(t + c.rgb, 1.0);
    //    outColor = vec4(1.,0.0,1.,1.0);
}
