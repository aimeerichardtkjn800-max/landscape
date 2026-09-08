/* Reflector.js · Three.js r160 平面镜反射（标准实现，兼容 r160 API） */
import {
  Color, Matrix4, Mesh, PerspectiveCamera, Plane, ShaderMaterial,
  UniformsUtils, Vector3, Vector4, WebGLRenderTarget,
  ClampToEdgeWrapping, LinearFilter,
} from "three";

class Reflector extends Mesh {
  constructor(geometry, options = {}) {
    super(geometry);
    this.type = "Reflector";
    const scope = this;
    const color = options.color !== undefined ? new Color(options.color) : new Color(0x333333);
    const textureWidth = options.textureWidth || 512;
    const textureHeight = options.textureHeight || 512;
    const clipBias = options.clipBias || 0;
    const shader = options.shader || Reflector.ReflectorShader;

    const reflectorPlane = new Plane();
    const normal = new Vector3();
    const reflectorWorldPosition = new Vector3();
    const cameraWorldPosition = new Vector3();
    const rotationMatrix = new Matrix4();
    const lookAtPosition = new Vector3(0, 0, -1);
    const clipPlane = new Vector4();
    const view = new Vector3();
    const target = new Vector3();
    const q = new Vector4();
    const textureMatrix = new Matrix4();
    const virtualCamera = new PerspectiveCamera();

    const params = { minFilter: LinearFilter, magFilter: LinearFilter };
    const renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, params);
    renderTarget.texture.wrapS = renderTarget.texture.wrapT = ClampToEdgeWrapping;

    const material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
    });
    material.uniforms.tDiffuse.value = renderTarget.texture;
    material.uniforms.color.value = color;
    material.uniforms.textureMatrix.value = textureMatrix;
    this.material = material;

    this.onBeforeRender = function (renderer, scene, camera) {
      reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
      rotationMatrix.extractRotation(scope.matrixWorld);
      normal.set(0, 0, 1).applyMatrix4(rotationMatrix).normalize();
      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      view.subVectors(reflectorWorldPosition, cameraWorldPosition);
      if (reflectorPlane.distanceToPoint(cameraWorldPosition) > 0) {
        scope.visible = false;
        return;
      }
      view.reflect(normal).negate().add(reflectorWorldPosition);
      target.subVectors(reflectorWorldPosition, view);
      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
      virtualCamera.lookAt(target);
      virtualCamera.far = camera.far;
      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      textureMatrix.set(0.5, 0.0, 0.0, 0.5,
                        0.0, 0.5, 0.0, 0.5,
                        0.0, 0.0, 0.5, 0.5,
                        0.0, 0.0, 0.0, 1.0);
      textureMatrix.multiply(virtualCamera.projectionMatrix);
      textureMatrix.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.multiply(scope.matrixWorld);

      scope.visible = false;
      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setTest(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, virtualCamera);
      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.setRenderTarget(currentRenderTarget);

      if (clipBias !== 0 && camera instanceof PerspectiveCamera) {
        const projectionMatrix = camera.projectionMatrix;
        const e = projectionMatrix.elements;
        q.x = (Math.sign(e[10] + e[8]) * (e[0] + e[8])) || 1;
        q.y = (Math.sign(e[10] + e[9]) * (e[5] + e[9])) || 1;
        q.z = -1.0;
        q.w = 1.0 + e[10];
        projectionMatrix.elements[2] = clipPlane.x * 2 * q.x;
        projectionMatrix.elements[6] = clipPlane.y * 2 * q.y;
        projectionMatrix.elements[10] = q.z * (clipPlane.w - clipPlane.z) / (clipPlane.w + clipPlane.z);
        projectionMatrix.elements[14] = -2 * clipPlane.w * q.w / (clipPlane.w + clipPlane.z);
      }

      scope.visible = true;
    };

    this.getRenderTarget = function () { return renderTarget; };
    this.dispose = function () {
      renderTarget.dispose();
      material.dispose();
    };
  }
}

Reflector.prototype.isReflector = true;

Reflector.ReflectorShader = {
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    float blendOverlay(float base, float blend) {
      return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
    }
    void main() {
      vec4 base = texture2DProj(tDiffuse, vUv);
      gl_FragColor = vec4(blendOverlay(base.r, color.r), blendOverlay(base.g, color.g), blendOverlay(base.b, color.b), 1.0);
    }`,
};

export { Reflector };
