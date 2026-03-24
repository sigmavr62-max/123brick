import * as THREE from 'three';
import { boxUnwrapUVs, surfaceManager, createExplosion } from './utils.js';
import { Vehicle } from './Vehicle.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);
        
        this.items = [];
        this.killBricks = [];
        this.collidables = [];
        this.launchPads = [];
        this.teleporters = [];
        
        this.vehicles = [];
        this.animated = [];

        this.skyboxMesh = null;
        this.setupSkybox();
        this.loadMap('platform');
    }

    setupSkybox() {
        const loader = new THREE.TextureLoader();
        
        const loadSide = (path) => {
            const tex = loader.load(path);
            tex.colorSpace = THREE.SRGBColorSpace;
            return new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false });
        };

        const matDN = loadSide('/null_plainsky512_dn.jpg');
        // Fix orientation of bottom face - User requested rotation
        if (matDN.map) {
            matDN.map.center.set(0.5, 0.5);
            matDN.map.rotation = Math.PI; // Rotated 180 degrees
        }

        const materials = [
            loadSide('/null_plainsky512_rt.jpg'), // px
            loadSide('/null_plainsky512_lf.jpg'), // nx
            loadSide('/null_plainsky512_up.jpg'), // py
            matDN,                                  // ny
            loadSide('/null_plainsky512_bk.jpg'), // pz
            loadSide('/null_plainsky512_ft.jpg')  // nz
        ];

        const geo = new THREE.BoxGeometry(400, 400, 400);
        this.skyboxMesh = new THREE.Mesh(geo, materials);
        this.skyboxMesh.renderOrder = -Infinity;
        this.scene.add(this.skyboxMesh);
    }

    clear() {
        this.items.forEach(mesh => {
            this.mapGroup.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            // dispose material(s) if possible
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => { try{ m.dispose(); }catch(e){} });
                } else {
                    try{ mesh.material.dispose(); }catch(e){}
                }
            }
        });
        
        // Clear Vehicles
        this.vehicles.forEach(v => {
            if (v.mesh) this.scene.remove(v.mesh);
            if (v.dispose) try { v.dispose(); } catch (e) {}
        });
        this.vehicles = [];
        this.animated = [];

        this.items = [];
        this.collidables = [];
        this.killBricks = [];
        this.launchPads = [];
        this.teleporters = [];
    }

    loadMap(name) {
        this.clear();
        switch(name) {
            case 'obby': this.setupObby(); break;
            case 'space': this.setupSpace(); break;
            default: this.setupPlatform(); break;
        }
    }

    addToWorld(mesh, types = ['static']) {
        this.mapGroup.add(mesh);
        this.items.push(mesh);
        if (types.includes('static')) this.collidables.push(mesh);
        if (types.includes('kill')) this.killBricks.push(mesh);
        if (types.includes('launch')) this.launchPads.push(mesh);
        if (types.includes('teleport')) this.teleporters.push(mesh);
    }

    createBlock(x, y, z, w, h, d, color, types = ['static']) {
        const geo = new THREE.BoxGeometry(w, h, d);
        boxUnwrapUVs(geo);
        
        const col = new THREE.Color(color);

        const studMat = new THREE.MeshStandardMaterial({ map: surfaceManager.textures.studs, color: col });
        const inletMat = new THREE.MeshStandardMaterial({ map: surfaceManager.textures.inlet, color: col });
        const sideMat = new THREE.MeshStandardMaterial({ color: col });
        
        // Top=Studs, Bottom=Inlet
        const mats = [sideMat, sideMat, studMat, inletMat, sideMat, sideMat];
        const mesh = new THREE.Mesh(geo, mats);
        mesh.position.set(x, y, z);
        this.addToWorld(mesh, types);
        return mesh;
    }

    setupPlatform() {
        // Platform Config
        const centerSize = 200; // Studs (expanded)
        const height = 2;      // Studs

        // Materials
        const centerColor = new THREE.Color(0x666666); // Dark-ish Grey
        const centerMat = new THREE.MeshStandardMaterial({
            map: surfaceManager.textures.studs,
            color: centerColor, 
            roughness: 0.6, metalness: 0.1
        });
        const inletMat = new THREE.MeshStandardMaterial({
            map: surfaceManager.textures.inlet,
            color: centerColor, 
            roughness: 0.6, metalness: 0.1
        });
        const centerMats = [centerMat, centerMat, centerMat, inletMat, centerMat, centerMat];

        const rimColor = new THREE.Color(0x333333); // Darker Grey

        const rimMat = new THREE.MeshStandardMaterial({
            map: surfaceManager.textures.studs,
            color: rimColor, roughness: 0.8
        });
        const rimInletMat = new THREE.MeshStandardMaterial({
            map: surfaceManager.textures.inlet,
            color: rimColor, roughness: 0.8
        });
        const rimMats = [rimMat, rimMat, rimMat, rimInletMat, rimMat, rimMat];

        // 1. Center Mesh
        const centerGeo = new THREE.BoxGeometry(centerSize, height, centerSize);
        boxUnwrapUVs(centerGeo);
        const centerMesh = new THREE.Mesh(centerGeo, centerMats);
        centerMesh.position.set(0, height/2, 0);
        this.addToWorld(centerMesh);

        // 2. Rim Meshes Helper
        const addRim = (w, h, d, x, y, z) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            boxUnwrapUVs(geo);
            const mesh = new THREE.Mesh(geo, rimMats);
            mesh.position.set(x, y, z);
            this.addToWorld(mesh);
        };

        // Rims
        addRim(50, height, 1, 0, height/2, -(centerSize+1)/2);
        addRim(50, height, 1, 0, height/2, (centerSize+1)/2);
        addRim(1, height, 48, -(centerSize+1)/2, height/2, 0);
        addRim(1, height, 48, (centerSize+1)/2, height/2, 0);

        // Kill Part
        const kSize = 4;
        this.createBlock(10, 2 + kSize/2, 10, kSize, kSize, kSize, 0xff0000, ['static', 'kill']);

        // Test Primitives
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.7 }));
        sphere.position.set(-5, 4, 10);
        this.addToWorld(sphere);

        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 16), new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.7 }));
        cylinder.position.set(-11, 4, 10);
        this.addToWorld(cylinder);

        const cone = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 16), new THREE.MeshStandardMaterial({ color: 0xaa00ff, roughness: 0.7 }));
        cone.position.set(-17, 4, 10);
        this.addToWorld(cone);

        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(4, 0); shape.lineTo(0, 4); shape.lineTo(0, 0);
        const wedgeGeo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false });
        wedgeGeo.center();
        const wedge = new THREE.Mesh(wedgeGeo, new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.7 }));
        wedge.position.set(-23, 4, 10);
        this.addToWorld(wedge);

        // --- NEW CONTENT ---

        // Teleporter to Mega Platform
        const tp = this.createBlock(-15, 2.1, 0, 6, 0.2, 6, 0x00ff00, ['static', 'teleport']);
        tp.userData = { destination: new THREE.Vector3(1000, 5, 0), name: "Mega Platform" };

        // MEGA PLATFORM (Offset 1000)
        const ox = 1000;
        const oz = 0;

        // Main Floor (200x200)
        this.createBlock(ox, 0, oz, 200, 2, 200, 0x808080);

        // 1. CARS
        const car1 = new Vehicle(this.scene, ox + 20, 5, oz - 20, 0xff0000);
        this.vehicles.push(car1);
        
        const car2 = new Vehicle(this.scene, ox + 30, 5, oz - 20, 0x0055ff);
        this.vehicles.push(car2);

        // 2. CRUSHER
        // Base
        this.createBlock(ox - 40, 1, oz + 40, 20, 2, 20, 0x808080);
        // Crusher Head
        const crusher = this.createBlock(ox - 40, 15, oz + 40, 18, 10, 18, 0x808080, ['static', 'kill']);
        this.animated.push({
            mesh: crusher,
            time: 0,
            update: (dt, obj) => {
                obj.time += dt * 1.5;
                // Move between y=3 and y=25
                obj.mesh.position.y = 14 + Math.sin(obj.time) * 11;
            }
        });

        // 3. OBBY
        for(let i=0; i<8; i++) {
            const h = 2 + i * 4;
            const z = oz - 50 - i * 12;
            const size = 6 + (i%2)*2;
            this.createBlock(ox - 60, h, z, size, 1, size, 0xffaa00);
        }
        // Obby Prize
        this.createBlock(ox - 60, 34, oz - 50 - 8 * 12, 10, 1, 10, 0x00ff00);

        // 4. RAMP (Using steps for collision stability, as simple box collision is AABB)
        const rx = ox + 50;
        const rz = oz + 50;
        for(let i=0; i<20; i++) {
            // Ramp going up
            this.createBlock(rx, i, rz + i*2, 20, 1, 2, 0x808080);
        }
        // Jump pad at end of ramp
        this.createBlock(rx, 20, rz + 42, 20, 1, 6, 0xff00ff, ['static', 'launch']);

        // 5. SWINGSET
        const sx = ox + 20;
        const sz = oz + 60;
        // Frame
        this.createBlock(sx - 10, 15, sz, 1, 30, 1, 0x4e342e);
        this.createBlock(sx + 10, 15, sz, 1, 30, 1, 0x4e342e);
        this.createBlock(sx, 30, sz, 22, 1, 1, 0x4e342e);
        // Swing Seat
        const seat = this.createBlock(sx, 10, sz, 6, 0.5, 4, 0xff0000);
        this.animated.push({
            mesh: seat,
            time: 0,
            update: (dt, obj) => {
                obj.time += dt * 2.5;
                const angle = Math.sin(obj.time) * 0.8;
                // Pivot is at (sx, 30, sz)
                const len = 20;
                obj.mesh.position.x = sx + Math.sin(angle) * len;
                obj.mesh.position.y = 30 - Math.cos(angle) * len;
                obj.mesh.rotation.z = -angle;
            }
        });

        // 6. FLOAT ERROR TELEPORTER
        // Far out on the platform
        const fpTp = this.createBlock(ox + 90, 1.1, oz + 90, 8, 0.2, 8, 0xff00ff, ['static', 'teleport']);
        fpTp.userData = { destination: new THREE.Vector3(ox, 1000000, oz), name: "Far Lands" };
        
        // Floating Point Platform
        const fpx = ox;
        const fpy = 1000000;
        // Need to add this to world, but createBlock adds to group. 
        // Note: Rendering at 1,000,000 might cause jitter (z-fighting/precision), which is the intended effect!
        const fpGeo = new THREE.BoxGeometry(50, 2, 50);
        boxUnwrapUVs(fpGeo);
        const fpMesh = new THREE.Mesh(fpGeo, new THREE.MeshStandardMaterial({color: 0x808080, map: surfaceManager.textures.studs}));
        fpMesh.position.set(fpx, fpy - 5, oz);
        this.addToWorld(fpMesh);
    }

    setupObby() {
        // Start
        this.createBlock(0, 0, 0, 14, 1, 14, 0x00cc00);

        // Step 1
        this.createBlock(0, 0, -15, 8, 1, 8, 0x808080);

        // Step 2
        this.createBlock(0, 2, -25, 6, 1, 6, 0x808080);

        // Step 3 (Gap)
        this.createBlock(0, 4, -36, 4, 1, 4, 0x808080);

        // Step 4 (Wall Jump / High)
        this.createBlock(0, 6, -45, 4, 1, 4, 0x808080);

        // Truss/Beam
        this.createBlock(0, 6, -55, 2, 1, 10, 0x808080);
        
        // Kill obstacle on beam
        this.createBlock(0, 6.75, -55, 2, 0.5, 2, 0xff0000, ['static', 'kill']);

        // End
        this.createBlock(0, 8, -70, 15, 1, 15, 0xffff00);
        // Winner pillar
        this.createBlock(0, 12, -70, 2, 8, 2, 0xffaa00);
    }

    setupSpace() {
        // Baseplate
        this.createBlock(0, 0, 0, 80, 2, 80, 0x808080);

        // Launcher
        this.createBlock(0, 1.25, 0, 8, 0.5, 8, 0xff00ff, ['static', 'launch']);

        // High Platform
        this.createBlock(0, 400, 0, 40, 1, 40, 0xffffff);
        this.createBlock(0, 405, 0, 4, 8, 4, 0xffff00);
    }

    update(dt) {
        for (let i = this.animated.length - 1; i >= 0; i--) {
            const anim = this.animated[i];
            anim.update(dt, anim);
            if (anim.dead) {
                this.animated.splice(i, 1);
                if (anim.mesh) {
                    this.scene.remove(anim.mesh);
                    if (anim.mesh.geometry) anim.mesh.geometry.dispose();
                    if (anim.mesh.material) {
                        if (Array.isArray(anim.mesh.material)) {
                            anim.mesh.material.forEach(m => { try{ m.dispose(); }catch(e){} });
                        } else {
                            try{ anim.mesh.material.dispose(); }catch(e){}
                        }
                    }
                }
            }
        }
        this.vehicles.forEach(v => v.update(dt, this.collidables));
    }

    triggerExplosion(pos) {
        const mesh = createExplosion(this.scene, pos);
        this.animated.push({
            mesh: mesh,
            time: 0,
            update: (dt, obj) => {
                obj.time += dt;
                const scale = 2 + obj.time * 40;
                obj.mesh.scale.set(scale, scale, scale);
                if (obj.mesh.material) obj.mesh.material.opacity = Math.max(0, 1 - (obj.time / 0.4));
                if (obj.time >= 0.4) obj.dead = true;
            }
        });
    }
}