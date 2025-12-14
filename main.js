// main.js

let videoElement, hands;
let particleSystem;
let scene, camera, renderer, particlesGeometry, particlesMaterial;

// --- ৩.২: কণার সংখ্যা ---
const PARTICLE_COUNT = 10000; // মোবাইলের জন্য সংখ্যা কমানো হলো

// --- ধাপ ২: হ্যান্ড ট্র্যাকিং এবং ক্যামেরা ইনিশিয়ালাইজেশন ---
async function initHandTracking() {
    videoElement = document.getElementById('video');
    
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve();
        };
    });

    hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
    }});
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // মোবাইলের জন্য Lite Mode
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 480, // মোবাইলের জন্য রেজোলিউশন কমানো
        height: 360
    });
    camera.start();

    initThreeJS(); 
}

function onResults(results) {
    if (results.multiHandLandmarks && particleSystem) {
        const handLandmarks = results.multiHandLandmarks[0];
        particleSystem.updateFromHand(handLandmarks); 
    }
}

// --- ধাপ ৩: Three.js সেটআপ ---
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio > 1.5 ? 1.5 : window.devicePixelRatio); // অপটিমাইজেশন
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    createParticleSystem();

    window.addEventListener('resize', onWindowResize);
    animate();
}

// --- ধাপ ৩.২: কণা তৈরি ---
function createParticleSystem() {
    particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const initialColors = new Float32Array(PARTICLE_COUNT * 3);
    const templateIDs = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Initial random positions and colors
        positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        initialColors[i * 3 + 0] = 1.0; initialColors[i * 3 + 1] = 1.0; initialColors[i * 3 + 2] = 1.0;
        templateIDs[i] = Math.floor(Math.random() * 4); // ৪টি টেমপ্লেট
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('aColor', new THREE.BufferAttribute(initialColors, 3));
    particlesGeometry.setAttribute('aTemplateID', new THREE.BufferAttribute(templateIDs, 1));
    
    particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uExpansionFactor: { value: 1.0 },
            uBaseColor: { value: new THREE.Color(0xffffff) },
            uTemplateSwitch: { value: 0 },
            uSize: { value: 0.025 }, // মোবাইলের জন্য কণার আকার ছোট করা হলো
        },
        vertexShader: getVertexShader(),
        fragmentShader: getFragmentShader(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false
    });

    particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleMesh);
    
    particleSystem = { 
        mesh: particleMesh,
        material: particlesMaterial,
        updateFromHand: handleHandGesture, // ধাপ ৫ এর ফাংশন
    };
}

// --- ধাপ ৫: অঙ্গভঙ্গি ম্যাপিং লজিক ---
function handleHandGesture(landmarks) {
    if (!landmarks || landmarks.length === 0) return;

    // ১. প্রসারণ (Expansion) - বুড়ো আঙুল (4) এবং তর্জনীর (8) দূরত্ব 
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const pinchDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2) + 
        Math.pow(thumbTip.z - indexTip.z, 2) 
    );

    const minPinch = 0.05;
    const maxPinch = 0.4;
    let factor = THREE.MathUtils.mapLinear(pinchDistance, minPinch, maxPinch, 1.0, 3.0);
    factor = THREE.MathUtils.clamp(factor, 1.0, 3.0);
    particleSystem.material.uniforms.uExpansionFactor.value = factor;
    
    // ২. রঙ (Color) - কব্জির X-অবস্থান (0)
    const baseHue = landmarks[0].x; 
    const newColor = new THREE.Color();
    newColor.setHSL(baseHue, 1.0, 0.5); 
    particleSystem.material.uniforms.uBaseColor.value = newColor;

    // ৩. টেমপ্লেট পরিবর্তন (Template Switch) - হাত দূরে সরিয়ে wave করা
    const isWaving = Math.abs(landmarks[0].x - 0.5) > 0.4;
    particleSystem.material.uniforms.uTemplateSwitch.value = isWaving ? 1 : 0;
}

// --- ধাপ ৬: অ্যানিমেশন লুপ ---
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;
    particleSystem.material.uniforms.uTime.value = time;

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// সব শুরু করুন
initHandTracking();