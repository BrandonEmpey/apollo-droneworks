import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModelViewerProps {
  fileUrl: string;
  fileName: string;
  format: "gltf" | "glb" | "obj" | "fbx";
}

export default function ModelViewer({ fileUrl, fileName, format }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 1, 3);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
  };

  const zoomIn = () => {
    if (!controlsRef.current) return;
    controlsRef.current.dollyIn(1.2);
    controlsRef.current.update();
  };

  const zoomOut = () => {
    if (!controlsRef.current) return;
    controlsRef.current.dollyOut(1.2);
    controlsRef.current.update();
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b111f);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.1;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 10, 5);
    dirLight1.castShadow = true;
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffd700, 0.3);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);
    const hemiLight = new THREE.HemisphereLight(0x1a2a4a, 0x080d17, 0.4);
    scene.add(hemiLight);

    const gridHelper = new THREE.GridHelper(10, 20, 0x1c304d, 0x0e1a2e);
    scene.add(gridHelper);

    mixerRef.current = null;
    clockRef.current = new THREE.Clock();

    const onProgress = (event: ProgressEvent) => {
      if (event.lengthComputable) {
        setLoadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    const onError = (err: unknown) => {
      console.error("Model load error:", err);
      setError(
        "Failed to load this model file. The file may be corrupted or an unsupported variant."
      );
      setLoading(false);
    };

    const fitModelInView = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2;

      object.position.sub(center);
      gridHelper.position.y = -box.min.y + center.y - size.y / 2;
      camera.position.set(0, size.y * 0.5, cameraDistance);
      camera.near = cameraDistance / 100;
      camera.far = cameraDistance * 100;
      camera.updateProjectionMatrix();
      controls.maxDistance = cameraDistance * 5;
      controls.target.set(0, 0, 0);
      controls.update();

      scene.add(object);
      setLoading(false);
    };

    setLoading(true);
    setError(null);
    setLoadProgress(0);

    if (format === "gltf" || format === "glb") {
      const loader = new GLTFLoader();
      loader.load(
        fileUrl,
        (gltf) => {
          fitModelInView(gltf.scene);
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
            mixerRef.current = mixer;
          }
        },
        onProgress,
        onError
      );
    } else if (format === "obj") {
      const loader = new OBJLoader();
      loader.load(
        fileUrl,
        (object) => {
          const mat = new THREE.MeshStandardMaterial({
            color: 0x8899aa,
            roughness: 0.7,
            metalness: 0.2,
          });
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = mat;
            }
          });
          fitModelInView(object);
        },
        onProgress,
        onError
      );
    } else if (format === "fbx") {
      const loader = new FBXLoader();
      loader.load(
        fileUrl,
        (object) => {
          fitModelInView(object);
          if (object.animations && object.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(object);
            object.animations.forEach((clip) => mixer.clipAction(clip).play());
            mixerRef.current = mixer;
          }
        },
        onProgress,
        onError
      );
    }

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [fileUrl, format]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-md overflow-hidden bg-[#0b111f]">
      <div ref={mountRef} className="w-full h-full min-h-[400px]" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b111f]/90">
          <Loader2 className="h-10 w-10 text-gold animate-spin mb-3" />
          <p className="text-offwhite text-sm">
            {loadProgress > 0
              ? `Loading model... ${loadProgress}%`
              : "Preparing model viewer..."}
          </p>
          {loadProgress > 0 && (
            <div className="mt-2 w-48 h-1.5 bg-[#1c304d] rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-200"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b111f]/90 p-6">
          <p className="text-red-400 text-center mb-2 font-medium">Error Loading Model</p>
          <p className="text-offwhite/60 text-sm text-center">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            title="Reset camera"
            onClick={resetCamera}
            className="h-8 w-8 bg-[#0b111f]/80 hover:bg-[#1c304d] text-offwhite/70 hover:text-offwhite border border-gold-dark/20"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Zoom in"
            onClick={zoomIn}
            className="h-8 w-8 bg-[#0b111f]/80 hover:bg-[#1c304d] text-offwhite/70 hover:text-offwhite border border-gold-dark/20"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Zoom out"
            onClick={zoomOut}
            className="h-8 w-8 bg-[#0b111f]/80 hover:bg-[#1c304d] text-offwhite/70 hover:text-offwhite border border-gold-dark/20"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-3 left-3 text-xs text-offwhite/40 bg-[#0b111f]/60 px-2 py-1 rounded">
          Drag to rotate · Scroll to zoom · Right-drag to pan
        </div>
      )}
    </div>
  );
}
