#version 300 es
precision mediump float;


/* Where the particle is. */
layout (location = 1) in vec2 i_Position;
layout (location = 2) in vec2 i_Velocity;

/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float u_TimeDelta;
uniform float u_Width;
uniform float u_Height;
uniform sampler2D u_Random;
uniform sampler2D u_Texture;

/* Outputs. These mirror the inputs. These values will be captured
   into our transform feedback buffer! */
out vec2 v_Position;
out vec2 v_Velocity;

vec2 rotate(vec2 v, float theta) {
    float s = sin(theta);
    float c = cos(-theta);
    return vec2(
        v.x * c + (v.y * s * -1.),
        v.x * s + v.y * c);
}

vec2 sense(vec2 p, vec2 v, float dist, float theta) {
    vec2 c = normalize(v) * dist;
    vec2 r = rotate(c, -theta);
    vec2 l = rotate(c, theta);
    vec2 wp = vec2(mod(p.x, 1.0), mod(p.y, 1.0));
    float ct = texture(u_Texture, wp + c).r;
    float rt = texture(u_Texture, wp + r).r;
    float lt = texture(u_Texture, wp + l).r;

    // detech any obstruction ahead
    float front = texture(u_Texture, wp + c * 2.0).r;
    if (front > 0.99) {
        ivec2 p = ivec2(i_Position.x * 255.0, i_Position.y * 255.0);
        float rand = texelFetch(u_Random, p, 0).r;
        return rand > 0.5 ? l : r;// l * length(v);
    }

    if (ct >= lt && ct >= rt) {
        // keep going straight
        return c;
    }
    if (ct < lt && ct < rt) {
        // random direction change
        ivec2 p = ivec2(i_Position.x * 255.0, i_Position.y * 255.0);
        float rand = texelFetch(u_Random, p, 0).r;
        return rand > 0.5 ? l : r;// l * length(v);
    }
    if (lt < rt) {
        // turn right
        return r;
    }
    if (lt > rt) {
        return l;
    }
    return c;
}

void main() {
    vec2 newDir = sense(i_Position, i_Velocity, 0.01, 0.7);
    vec2 updated = i_Position + newDir * u_TimeDelta;// * u_TimeDelta * 2.);
    v_Position = vec2(mod(updated.x, 1.0), mod(updated.y, 1.0));//cur.r > 0.3 ? i_Position : vec2(mod(updated.x, 1.0), mod(updated.y, 1.0));
    v_Velocity = newDir;// cur.r > 0.3 ? i_Velocity * -1. : i_Velocity;
}
