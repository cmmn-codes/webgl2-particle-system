#version 300 es
precision mediump float;

/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float u_TimeDelta;
/* Where the particle is. */
layout (location = 1) in vec2 i_Position;
layout (location = 2) in vec2 i_Velocity;

uniform float u_Width;
uniform float u_Height;
uniform sampler2D u_Texture;

/* Outputs. These mirror the inputs. These values will be captured
   into our transform feedback buffer! */
out vec2 v_Position;
out vec2 v_Velocity;

void main() {
/* Update parameters according to our simple rules.*/
    vec2 updated = i_Position + normalize(i_Velocity) * 0.1 * u_TimeDelta;// * u_TimeDelta * 2.);
    vec4 cur = texelFetch(u_Texture, ivec2(mod(updated.x, 1.0) * u_Width, mod(updated.y, 1.0) * u_Height), 0);
    v_Position = cur.r > 0.0 ? i_Position : vec2(mod(updated.x, 1.0), mod(updated.y, 1.0));
    v_Velocity = i_Velocity;
}
