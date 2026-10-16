export const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.032 }, // 小噪点强度，推荐 0.02 ~ 0.04
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;

    varying vec2 vUv;

    float random(vec2 p) {
      return fract(
        sin(
          dot(p, vec2(12.9898, 78.233))
        ) * 43758.5453123
      );
    }

    void main() {
      vec4 baseColor = texture2D(tDiffuse, vUv);

      float noise = random(vUv * vec2(1920.0, 1080.0) + time * 0.25);

      noise = (noise - 0.5) * 2.0;

      baseColor.rgb += noise * amount;

      gl_FragColor = baseColor;
    }
  `,
};