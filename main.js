import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';

class Game {
    constructor() {
        this.container = document.body;
        this.gameState = 'MENU'; // Starts in MENU as per your request

        // Core Three.js Setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // System Managers
        this.input = new InputManager();
        this.world = new World(this.scene);
        this.player = new Player(this.scene);
        this.cameraController = new CameraController();

        this.clock = new THREE.Clock();

        this.initUI();
        this.windowResize();
        this.animate();
    }

    initUI() {
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.gameState = 'PLAYING';
                // Hide menu overlay if it exists
                const menu = document.getElementById('menu-overlay');
                if (menu) menu.style.display = 'none';
                
                // Lock pointer for gameplay
                document.body.requestPointerLock();
            });
        }
    }

    windowResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (this.gameState === 'MENU') {
            // Menu Logic: Orbit the camera around the starting platform
            // This replicates the "cool" rotating menu look
            this.cameraController.cameraYaw += 0.2 * dt;
            const menuFocus = new THREE.Vector3(3.5, 1.5, 8);
            
            this.camera.position.set(
                menuFocus.x + Math.sin(this.cameraController.cameraYaw) * 20,
                menuFocus.y + 10,
                menuFocus.z + Math.cos(this.cameraController.cameraYaw) * 20
            );
            this.camera.lookAt(menuFocus);

        } else if (this.gameState === 'PLAYING') {
            // Gameplay Logic
            this.player.update(dt, this.input, this.world.collidables);
            this.world.update(dt);
            
            // Camera follows player
            this.cameraController.updatePlaying(dt, this.input, this.camera, this.player, this.world);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the application
new Game();
