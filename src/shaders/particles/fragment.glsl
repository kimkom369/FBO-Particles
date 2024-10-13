uniform sampler2D uPositions;
varying vec2 vUv;
varying vec4 vColor;

void main() {
    vec4 pos = texture2D(uPositions, vUv);
    //gl_FragColor = pos;
   // gl_FragColor = vec4(vUv, 1.0, 1.0);
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    gl_FragColor = vColor;
}