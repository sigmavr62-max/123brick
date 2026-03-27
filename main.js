import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';

class Game {
    constructor() {
        // 1. Setup Three.js Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // 2. Initialize your Classes
        this.input = new InputManager();
        this.world = new World(this.scene);
        this.player = new Player(this.scene);
        this.cameraController = new CameraController();

        this.gameState = 'MENU'; // Matches your Scratch logic
        this.clock = new THREE.Clock();

        this.initUI();
        this.animate();
    }

    initUI() {
        // Look for the play button in your index.html
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.onclick = () => {
                this.gameState = 'PLAYING';
                document.body.requestPointerLock(); // Lock mouse for movement
            };
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (this.gameState === 'MENU') {
            // Menu: Orbit camera slowly
            this.cameraController.cameraYaw += 0.5 * dt;
            const focus = new THREE.Vector3(0, 5, 0);
            this.camera.position.set(
                focus.x + Math.sin(this.cameraController.cameraYaw) * 30,
                focus.y + 10,
                focus.z + Math.cos(this.cameraController.cameraYaw) * 30
            );
            this.camera.lookAt(focus);

        } else if (this.gameState === 'PLAYING') {
            // Gameplay: Update physics and camera
            this.player.update(dt, this.input, this.world.collidables);
            this.cameraController.updatePlaying(dt, this.input, this.camera, this.player, this.world);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
