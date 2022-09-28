#version 300 es

precision highp float;

in vec2 v_Texcoord;

uniform sampler2D u_Texture;
uniform sampler2D u_Previous;
uniform sampler2D u_Extra;
uniform float u_Width;
uniform float u_Height;
uniform float u_Decay;

out vec4 outColor;

void main() {
    ivec2 p = ivec2(v_Texcoord.x * u_Width, v_Texcoord.y * u_Height);
    int w = int(u_Width);
    int h = int(u_Height);
    float t = 0.1;
    for (int i = -1; i < 2; i++) {
        for (int j = -1; j < 2; j++) {
            int x = (w + p.x + i) % w;
            int y = (h + p.y + j) % h;
            t += texelFetch(u_Previous, ivec2(x, y), 0).r;
        }
    }
    t = clamp((t / 9.0) - u_Decay, 0., 1.);

    float c = texelFetch(u_Texture, p, 0).r;
    if (u_Decay > 0.0) {
        // get the texture
        float ratio = u_Width / u_Height;
        vec2 translate = vec2(0., -0.5 + (0.5 * ratio));
        vec2 scale = vec2(1., ratio);

        if (ratio > 1.0) {
            translate = vec2(-0.5 + (0.5 * (1. / ratio)), 0.);;
            scale = vec2(1. / scale.y, scale.x);
        }

        float v = texture(u_Extra, (v_Texcoord + translate) / scale).r;
        if (v > 0.0) {
            outColor = vec4(0.7);
            return;
        }

    }
    outColor = vec4(t + c, t + c, t + c, 1.0);
}
