export const FILTERS = [
  { id: "normal", label: "Normal" },
  { id: "grayscale", label: "Grayscale" },
  { id: "sepia", label: "Sepia" },
  { id: "invert", label: "Invert" },
  { id: "vignette", label: "Vignette" },
  { id: "cold", label: "Cold" },
  { id: "warm", label: "Warm" },
];

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
  }
`;

export const FRAGMENT_SHADERS: Record<string, string> = {
  normal: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `,
  grayscale: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(gray, gray, gray, color.a);
    }
  `,
  sepia: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      float r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
      float g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
      float b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
      gl_FragColor = vec4(clamp(r,0.0,1.0), clamp(g,0.0,1.0), clamp(b,0.0,1.0), color.a);
    }
  `,
  invert: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      gl_FragColor = vec4(1.0 - color.rgb, color.a);
    }
  `,
  vignette: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      vec2 uv = v_texCoord - 0.5;
      float vignette = 1.0 - dot(uv * 1.8, uv * 1.8);
      vignette = clamp(vignette, 0.0, 1.0);
      vignette = pow(vignette, 0.8);
      gl_FragColor = vec4(color.rgb * vignette, color.a);
    }
  `,
  cold: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      gl_FragColor = vec4(color.r * 0.8, color.g * 0.95, min(color.b * 1.3, 1.0), color.a);
    }
  `,
  warm: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      gl_FragColor = vec4(min(color.r * 1.2, 1.0), color.g * 1.05, color.b * 0.75, color.a);
    }
  `,
};

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(gl: WebGLRenderingContext, fragSource: string) {
  const vert = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSource);
  if (!vert || !frag) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}
