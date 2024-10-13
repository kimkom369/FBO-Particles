uniform vec2 resolution;
uniform float uSize;
uniform sampler2D uPositions;
uniform float time;

varying vec4 vColor;
varying vec2 vUv;

void main() {
    vUv = uv;
    vec4 pos = texture2D(uPositions, vUv);

    float angle = atan(pos.y, pos.x);

    vColor = 0.8 * vec4(0.5 + 0.3 * sin(angle + time * 0.4));

    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);

    gl_PointSize = 10.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}