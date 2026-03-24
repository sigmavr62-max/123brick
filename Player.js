import * as THREE from 'three';
import { createTorsoTexture, boxUnwrapUVs, surfaceManager } from './utils.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();
        this.onGround = false;

        // Configuration
        this.speed = 10;
        this.jumpForce = 35;
        this.gravity = -100;
        this.flyMode = false;
        this.godMode = false;

        // Coyote Time
        this.coyoteTimer = 0;
        this.coyoteMaxTime = 0.3; // Extended forgiveness window

        // Ground detection
        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);
        this.tempRayOrigin = new THREE.Vector3();

        // Animation State
        this.animTime = 0;

        // Death / Debris State
        this.isDead = false;
        this.debris = [];
        this.respawnTimer = 0;

        // Debug/Dev
        this.forcedAnim = null;

        // Customization
        this.materials = {}; // Stores arrays of materials for each part

        // Audio
        this.setupAudio();

        this.mesh = this.createMesh();
        this.scene.add(this.mesh);

        this.currentBubble = null;
        this.bubbleTimer = null;
        
        // Vehicle State
        this.vehicle = null;

        // Overhead username tag
        this._username = 'Player';
        this._overheadSprite = null;
        this._createOverheadTag(this._username);
    }

    setupAudio() {
        // WebAudio API directly as per guidelines.
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Bitcrush Effect
        const bufferSize = 4096;
        this.crusher = this.audioCtx.createScriptProcessor(bufferSize, 2, 2);
        this.crusher.bits = 6; 
        this.crusher.normfreq = 0.2; 

        let phaser = 0;
        let lastL = 0;
        let lastR = 0;

        this.crusher.onaudioprocess = (e) => {
            const inputL = e.inputBuffer.getChannelData(0);
            const inputR = e.inputBuffer.getChannelData(1);
            const outputL = e.outputBuffer.getChannelData(0);
            const outputR = e.outputBuffer.getChannelData(1);
            
            const step = Math.pow(0.5, this.crusher.bits);
            
            for (let i = 0; i < inputL.length; i++) {
                phaser += this.crusher.normfreq;
                if (phaser >= 1.0) {
                    phaser -= 1.0;
                    lastL = step * Math.floor(inputL[i] / step + 0.5);
                    lastR = step * Math.floor(inputR[i] / step + 0.5);
                }
                outputL[i] = lastL;
                outputR[i] = lastR;
            }
        };

        this.mixNode = this.audioCtx.createGain();
        this.mixNode.connect(this.crusher);
        this.crusher.connect(this.audioCtx.destination);

        this.loadSound('/walk.mp3').then(buf => this.walkBuffer = buf);
        this.loadSound('/roblox-classic-jump.mp3').then(buf => this.jumpBuffer = buf);
        this.loadSound('/roblox-death-sound_1.mp3').then(buf => this.breakBuffer = buf);

        this.walkSource = null;
    }

    async loadSound(url) {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        return await this.audioCtx.decodeAudioData(arr);
    }

    playSound(buffer, loop = false, rate = 1.0) {
        if (!buffer) return;
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = rate;
        source.connect(this.mixNode);
        source.start(0);
        return source;
    }

    createMesh() {
        const group = new THREE.Group();

        // Helper to create independent material set for a part
        const createPartMats = (partName, colorHex, frontMat = null) => {
            const col = new THREE.Color(colorHex);
            
            const sideMat = new THREE.MeshStandardMaterial({ color: col });
            const studMat = new THREE.MeshStandardMaterial({ map: surfaceManager.textures.studs, color: col });
            const inletMat = new THREE.MeshStandardMaterial({ map: surfaceManager.textures.inlet, color: col });
            
            // [Right, Left, Top, Bottom, Front, Back]
            // Ensure Front is unique if not provided
            const front = frontMat ? frontMat : sideMat.clone();
            const mats = [sideMat, sideMat, studMat, inletMat, front, sideMat];
            
            this.materials[partName] = mats;
            return mats;
        };

        // Torso
        // Default color blue-ish grey
        const torsoFrontMat = new THREE.MeshStandardMaterial({ map: createTorsoTexture(), color: 0x808080 });
        const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
        boxUnwrapUVs(torsoGeo);
        this.torso = new THREE.Mesh(torsoGeo, createPartMats('torso', 0x808080, torsoFrontMat));
        this.torso.position.set(0, 3, 0);
        group.add(this.torso);

        // Head
        const headGeo = new THREE.BoxGeometry(1, 1, 1);
        boxUnwrapUVs(headGeo);
        
        // Fix UVs for Head Front (Face 4) to map texture 0..1
        const uvs = headGeo.attributes.uv;
        // Indices for face 4 (Front +Z): 16, 17, 18, 19
        // Map to (0,1), (1,1), (0,0), (1,0) to cover full face
        uvs.setXY(16, 0, 1);
        uvs.setXY(17, 1, 1);
        uvs.setXY(18, 0, 0);
        uvs.setXY(19, 1, 0);
        uvs.needsUpdate = true;

        this.head = new THREE.Mesh(headGeo, createPartMats('head', 0xF2F3F3));
        this.head.position.set(0, 4.5, 0); 
        group.add(this.head);

        // Helper for limbs
        const createLimb = (x, name, color) => {
            const g = new THREE.Group();
            g.position.set(x, 4, 0); 
            const geo = new THREE.BoxGeometry(1, 2, 1);
            boxUnwrapUVs(geo);
            const m = new THREE.Mesh(geo, createPartMats(name, color));
            m.position.y = -1; 
            g.add(m);
            return g;
        };

        // Arms
        this.leftArm = createLimb(-1.5, 'leftArm', 0xF2F3F3);
        group.add(this.leftArm);

        this.rightArm = createLimb(1.5, 'rightArm', 0xF2F3F3);
        group.add(this.rightArm);

        // Legs helper
        const createLeg = (x, name, color) => {
            const g = new THREE.Group();
            g.position.set(x, 2, 0); 
            const geo = new THREE.BoxGeometry(1, 2, 1);
            boxUnwrapUVs(geo);
            const m = new THREE.Mesh(geo, createPartMats(name, color));
            m.position.y = -1;
            g.add(m);
            return g;
        };

        this.leftLeg = createLeg(-0.5, 'leftLeg', 0x808080);
        group.add(this.leftLeg);

        this.rightLeg = createLeg(0.5, 'rightLeg', 0x808080);
        group.add(this.rightLeg);

        return group;
    }

    setPartColor(part, colorHex) {
        if (!this.materials[part]) return;
        const col = new THREE.Color(colorHex);

        this.materials[part].forEach((mat) => {
            mat.color = col; // Inherit properties for ALL faces including textured ones
        });
    }

    setFaceTexture(image) {
        const tex = new THREE.Texture(image);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        
        // Head is index 4 (Front)
        const mats = this.materials.head;
        if (mats && mats[4]) {
            const mat = mats[4];
            mat.map = tex;
            mat.needsUpdate = true;
        }
    }

    setShirtTexture(image) {
        const tex = new THREE.Texture(image);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        
        // Torso is index 4 (Front)
        const mats = this.materials.torso;
        if (mats && mats[4]) {
            mats[4].map = tex;
            mats[4].needsUpdate = true;
        }
    }

    // Overhead username tag creation & update
    _createOverheadTag(name) {
        // Remove existing
        if (this._overheadSprite) {
            this.head.remove(this._overheadSprite);
            if (this._overheadSprite.material.map) this._overheadSprite.material.map.dispose();
            this._overheadSprite.material.dispose();
            this._overheadSprite = null;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 48;
        const padding = 16;

        // Draw twice: username then add gold [Admin]
        ctx.font = `bold ${fontSize}px "Comic Sans Custom", "Comic Sans MS", "Comic Sans", cursive`;
        const baseText = name || 'Player';
        const adminText = ' [Admin]';
        // measure widths
        const baseW = ctx.measureText(baseText).width;
        const adminW = ctx.measureText(adminText).width;
        const w = Math.ceil(baseW + adminW + padding * 2);
        const h = Math.ceil(fontSize + padding * 2);

        canvas.width = w;
        canvas.height = h;
        // Redraw with proper sizes
        ctx.font = `bold ${fontSize}px "Comic Sans Custom", "Comic Sans MS", "Comic Sans", cursive`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Transparent background with subtle stroke for readability
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, w, h);

        // Draw base name in white
        ctx.fillStyle = 'white';
        ctx.fillText(baseText, padding, h/2);

        // Draw admin tag in gold
        ctx.fillStyle = '#D4AF37'; // gold
        ctx.fillText(adminText, padding + baseW, h/2);

        // Outline for readability
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(baseText + adminText, padding, h/2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        const pixelScale = 0.02;
        sprite.scale.set(w * pixelScale, h * pixelScale, 1);
        sprite.position.set(0, 6.5, 0); // slightly above head
        sprite.renderOrder = 9999;

        this.head.add(sprite);
        this._overheadSprite = sprite;
    }

    setUsername(name) {
        this._username = name || 'Player';
        this._createOverheadTag(this._username);
    }

    chat(message) {
        if (!message) return;
        
        // Remove existing bubble
        if (this.currentBubble) {
            this.head.remove(this.currentBubble);
            if (this.currentBubble.material.map) this.currentBubble.material.map.dispose();
            this.currentBubble.material.dispose();
            this.currentBubble = null;
        }

        // Create Canvas for texture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 24;
        ctx.font = `bold ${fontSize}px "Comic Sans Custom", "Comic Sans MS", "Comic Sans", cursive`;
        
        const textMetrics = ctx.measureText(message);
        const textWidth = textMetrics.width;
        
        // Bubble dimensions
        const p = 15; 
        const w = Math.max(64, textWidth + p * 2);
        const h = fontSize + p * 2 + 15; // +15 for tail height
        
        canvas.width = w;
        canvas.height = h;

        // Draw
        ctx.font = `bold ${fontSize}px "Comic Sans Custom", "Comic Sans MS", "Comic Sans", cursive`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // Background (Rounded Rect with tail)
        const r = 10;
        const bh = h - 15;
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(r, 2);
        ctx.lineTo(w - r, 2);
        ctx.quadraticCurveTo(w, 2, w - 2, r);
        ctx.lineTo(w - 2, bh - r);
        ctx.quadraticCurveTo(w - 2, bh, w - r, bh);
        
        // Tail
        ctx.lineTo(w / 2 + 8, bh);
        ctx.lineTo(w / 2, h - 2);
        ctx.lineTo(w / 2 - 8, bh);
        
        ctx.lineTo(r, bh);
        ctx.quadraticCurveTo(2, bh, 2, bh - r);
        ctx.lineTo(2, r);
        ctx.quadraticCurveTo(2, 2, r, 2);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = 'black';
        ctx.fillText(message, w / 2, bh / 2 + 2);

        // Sprite
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;

        const mat = new THREE.SpriteMaterial({ 
            map: tex, 
            depthTest: false,
            transparent: true 
        });

        const sprite = new THREE.Sprite(mat);
        sprite.renderOrder = 9999;
        const pixelScale = 0.025;
        sprite.scale.set(w * pixelScale, h * pixelScale, 1);
        sprite.position.set(0, 2.5, 0); 

        this.head.add(sprite);
        this.currentBubble = sprite;

        // Auto remove
        if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => {
            if (this.currentBubble === sprite) {
                this.head.remove(sprite);
                this.currentBubble.material.map.dispose();
                this.currentBubble.material.dispose();
                this.currentBubble = null;
            }
        }, 6000);
    }

    fallApart() {
        if (this.isDead || this.godMode) return;
        this.isDead = true;
        this.mesh.visible = false;
        
        // Stop walk sound if playing
        if (this.walkSource) {
            this.walkSource.stop();
            this.walkSource = null;
        }

        this.playSound(this.breakBuffer);

        // Spawn debris parts
        const parts = [this.head, this.torso, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg];
        
        parts.forEach(part => {
            // Find the actual mesh (handle Groups for limbs)
            let sourceMesh = part;
            if (part.type === 'Group' && part.children.length > 0) sourceMesh = part.children[0];

            const worldPos = new THREE.Vector3();
            sourceMesh.getWorldPosition(worldPos);
            const worldQuat = new THREE.Quaternion();
            sourceMesh.getWorldQuaternion(worldQuat);

            const debrisMesh = new THREE.Mesh(sourceMesh.geometry.clone(), sourceMesh.material);
            debrisMesh.position.copy(worldPos);
            debrisMesh.quaternion.copy(worldQuat);
            
            this.scene.add(debrisMesh);

            // Add physics state
            const vel = this.velocity.clone().multiplyScalar(0.5); // Inherit some velocity
            // Explode outwards
            vel.x += (Math.random() - 0.5) * 20;
            vel.y += Math.random() * 15; 
            vel.z += (Math.random() - 0.5) * 20;

            const angVel = new THREE.Vector3(
                Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
            ).multiplyScalar(10);

            this.debris.push({ mesh: debrisMesh, velocity: vel, angularVelocity: angVel });
        });

        this.respawnTimer = 4.0; // Seconds until respawn
    }

    respawn() {
        this.isDead = false;
        this.mesh.visible = true;
        this.position.set(0, 10, 0);
        this.velocity.set(0, 0, 0);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.set(0,0,0);

        // Cleanup debris
        this.debris.forEach(d => {
            this.scene.remove(d.mesh);
            d.mesh.geometry.dispose();
        });
        this.debris = [];
    }

    update(dt, input, world) {
        // Resume audio context if needed
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        // Handle Vehicle
        if (this.vehicle) {
            this.mesh.visible = true; // Show player on car
            this.onGround = false; // Disable foot physics
            
            // Pass input to vehicle
            this.vehicle.drive(input, dt);

            // Stick player to vehicle
            const seatPos = this.vehicle.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0));
            // Rotate player with vehicle
            this.position.copy(seatPos);
            this.mesh.position.copy(seatPos);
            this.mesh.rotation.y = this.vehicle.mesh.rotation.y;
            this.mesh.rotation.x = 0;
            this.mesh.rotation.z = 0;

            // Update animations
            this.leftArm.rotation.x = -0.5;
            this.rightArm.rotation.x = -0.5;
            this.leftLeg.rotation.x = -1.5; // Sitting
            this.rightLeg.rotation.x = -1.5;

            // Dismount
            if (input.jump) {
                this.vehicle.driver = null;
                this.vehicle = null;
                this.velocity.set(0, 20, 0); // Jump off
                this.position.y += 2;
                this.playSound(this.jumpBuffer);
            }
            return;
        }

        const killBricks = world && world.killBricks ? world.killBricks : [];
        const collidables = world && world.collidables ? world.collidables : [];

        // Handle Death State
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            } else {
                // Update Debris
                const up = new THREE.Vector3(0, 1, 0);

                for (const d of this.debris) {
                    d.velocity.y += this.gravity * dt;
                    d.mesh.position.addScaledVector(d.velocity, dt);
                    
                    // Quaternion Rotation Integration
                    const rotMag = d.angularVelocity.length();
                    if (rotMag > 0.0001) {
                        const axis = d.angularVelocity.clone().normalize();
                        const angle = rotMag * dt;
                        const deltaRot = new THREE.Quaternion().setFromAxisAngle(axis, angle);
                        d.mesh.quaternion.premultiply(deltaRot);
                    }

                    // Dampen rotation to prevent endless spinning
                    d.angularVelocity.multiplyScalar(0.98);
                    d.velocity.multiplyScalar(0.995); // Air resistance

                    // Sleep check
                    if (d.velocity.lengthSq() < 0.5 && d.angularVelocity.lengthSq() < 0.5 && d.mesh.position.y < 5) {
                        // Just stop if moving very slowly near ground
                        d.velocity.set(0,0,0);
                        d.angularVelocity.set(0,0,0);
                    }

                    // Debris Collision
                    const dBox = new THREE.Box3().setFromObject(d.mesh);
                    for (const col of collidables) {
                        const cBox = new THREE.Box3().setFromObject(col);
                        if (dBox.intersectsBox(cBox)) {
                            // Find intersection
                            const inter = dBox.clone().intersect(cBox);
                            const w = inter.max.x - inter.min.x;
                            const h = inter.max.y - inter.min.y;
                            const dep = inter.max.z - inter.min.z;
                            
                            // Find min axis to resolve
                            if (w < h && w < dep) {
                                // X collision
                                const sign = d.mesh.position.x > col.position.x ? 1 : -1;
                                d.mesh.position.x += sign * w;
                                d.velocity.x *= -0.5;
                            } else if (h < w && h < dep) {
                                // Y collision
                                const sign = d.mesh.position.y > col.position.y ? 1 : -1;
                                
                                // Center of Mass Check: Only rest on top if center is within horizontal bounds
                                if (d.mesh.position.x >= cBox.min.x && d.mesh.position.x <= cBox.max.x &&
                                    d.mesh.position.z >= cBox.min.z && d.mesh.position.z <= cBox.max.z) {
                                    
                                    d.mesh.position.y += sign * h;
                                    d.velocity.y *= -0.5;
                                    d.velocity.x *= 0.8; // Friction
                                    d.velocity.z *= 0.8;
                                    d.angularVelocity.multiplyScalar(0.6); // Ground friction for rotation

                                    // Flatten logic: Snap to nearest axis-aligned rotation when on ground
                                    if (sign > 0) {
                                        const up = new THREE.Vector3(0, 1, 0);
                                        const q = d.mesh.quaternion;
                                        
                                        // Check axes
                                        const axes = [
                                            new THREE.Vector3(1, 0, 0).applyQuaternion(q),
                                            new THREE.Vector3(0, 1, 0).applyQuaternion(q),
                                            new THREE.Vector3(0, 0, 1).applyQuaternion(q)
                                        ];
                                        
                                        // Find most vertical axis
                                        let bestAxis = axes[0];
                                        let maxDot = Math.abs(bestAxis.dot(up));
                                        
                                        for (let i = 1; i < 3; i++) {
                                            const dot = Math.abs(axes[i].dot(up));
                                            if (dot > maxDot) {
                                                maxDot = dot;
                                                bestAxis = axes[i];
                                            }
                                        }

                                        // If not flat, push towards flat
                                        if (maxDot < 0.995) {
                                            // Target direction: closest world up/down
                                            const targetDir = up.clone().multiplyScalar(Math.sign(bestAxis.dot(up)));
                                            const correction = new THREE.Quaternion().setFromUnitVectors(bestAxis, targetDir);
                                            
                                            // Slap rotation instantly
                                            const targetQ = correction.multiply(q);
                                            d.mesh.quaternion.copy(targetQ);
                                            
                                            // Stabilize
                                            d.angularVelocity.multiplyScalar(0.5);
                                        }
                                    }
                                }
                            } else {
                                // Z collision
                                const sign = d.mesh.position.z > col.position.z ? 1 : -1;
                                d.mesh.position.z += sign * dep;
                                d.velocity.z *= -0.5;
                            }
                        }
                    }
                    
                    // Kill below world
                    if (d.mesh.position.y < -50) {
                        // let it fall
                    }
                }
            }
            return; // Skip normal update
        }

        const move = input;

        if (this.flyMode) {
            this.velocity.set(0, 0, 0);
            this.onGround = false;
            
            const speed = this.speed * 4;
            // Face away from camera (camera looks AT player, so player must look same direction as camera view)
            // CameraYaw is orbit angle. Look direction is opposite to position.
            const yaw = (input.camYaw !== undefined) ? input.camYaw + Math.PI : this.mesh.rotation.y;
            const pitch = input.camPitch || 0;

            // Update Mesh Rotation (Exact match)
            this.mesh.rotation.order = 'YXZ';
            this.mesh.rotation.y = yaw;
            this.mesh.rotation.x = pitch; // Positive pitch = Looking Down
            this.mesh.rotation.z = 0;

            // Direction Vectors (Local Space based on rotation)
            // Face is +Z
            const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
            const right = new THREE.Vector3(-1, 0, 0).applyEuler(this.mesh.rotation); // Right of +Z is -X
            const up = new THREE.Vector3(0, 1, 0).applyEuler(this.mesh.rotation);

            const flyVec = new THREE.Vector3();

            // W/S - Forward/Back (Mesh Face Direction)
            if (input.w) flyVec.add(forward);
            if (input.s) flyVec.sub(forward);

            // A/D - Left/Right (Mesh Side Direction)
            if (input.d) flyVec.add(right);
            if (input.a) flyVec.sub(right);
            
            // Q/E - Vertical relative to Mesh
            if (input.e) flyVec.add(up);
            if (input.q) flyVec.sub(up);

            if (flyVec.lengthSq() > 0) {
                flyVec.normalize().multiplyScalar(speed * dt);
                this.position.add(flyVec);
            }
            
            this.mesh.position.copy(this.position);
            return;
        }

        // Reset rotation x/z from potential fly mode
        this.mesh.rotation.x = 0;
        this.mesh.rotation.z = 0;

        // Physics
        this.velocity.y += this.gravity * dt;

        // Horizontal Movement
        const moveVec = new THREE.Vector3(move.x, 0, move.z);
        // Only normalize & scale when there is input; avoid normalizing a zero vector which can produce NaNs
        if (moveVec.lengthSq() > 0) {
            moveVec.normalize().multiplyScalar(this.speed);
        } else {
            moveVec.set(0, 0, 0);
        }

        // Apply horizontal movement
        this.position.x += moveVec.x * dt;
        this.position.z += moveVec.z * dt;

        // Horizontal Collision Resolution
        if (collidables && collidables.length > 0) {
            // Calculate collider based off of the model
            const playerBox = new THREE.Box3().setFromObject(this.mesh);
            
            // Adjust bottom for step height to smoothly climb curved spaces shorter than 2 units
            const stepHeight = 2.0;
            playerBox.min.y = this.position.y + stepHeight;
            // Shave a tiny bit off the sides so we don't catch edges unnecessarily
            playerBox.expandByVector(new THREE.Vector3(-0.1, 0, -0.1));

            const center = new THREE.Vector3();
            for (const col of collidables) {
                const cBox = new THREE.Box3().setFromObject(col);
                if (playerBox.intersectsBox(cBox)) {
                    const intersect = playerBox.clone().intersect(cBox);
                    const dx = intersect.max.x - intersect.min.x;
                    const dz = intersect.max.z - intersect.min.z;
                    
                    cBox.getCenter(center);
                    // Push out in the direction of least penetration
                    if (dx < dz) {
                        const sign = this.position.x > center.x ? 1 : -1;
                        this.position.x += sign * dx;
                    } else {
                        const sign = this.position.z > center.z ? 1 : -1;
                        this.position.z += sign * dz;
                    }
                    
                    // Update AABB for next collidable
                    this.mesh.position.copy(this.position); // Ensure mesh is updated before recalc
                    playerBox.setFromObject(this.mesh);
                    playerBox.min.y = this.position.y + stepHeight;
                    playerBox.expandByVector(new THREE.Vector3(-0.1, 0, -0.1));
                }
            }
        }

        // Apply vertical movement
        this.position.y += this.velocity.y * dt;

        // Vehicle Mounting Interaction
        // Check if close to a vehicle and press E (or just collide for now?) 
        // Let's use E key if InputManager supports it, otherwise bump mount is annoying.
        // User didn't specify interaction method, but "working car" usually implies driving.
        if (input.e && world && world.vehicles) {
            for (const v of world.vehicles) {
                if (v.driver) continue;
                const d = this.position.distanceTo(v.mesh.position);
                if (d < 8) {
                    this.vehicle = v;
                    v.driver = this;
                    this.velocity.set(0,0,0);
                    break;
                }
            }
        }

        // Ground and Ceiling Collision
        let foundGround = false;

        if (this.velocity.y <= 0) {
            // Raycast from above step height (y+3.0) downwards to allow stepping up
            this.tempRayOrigin.copy(this.position);
            this.tempRayOrigin.y -= this.velocity.y * dt; // Start from previous Y essentially
            this.tempRayOrigin.y += 3.0; 
            
            this.raycaster.set(this.tempRayOrigin, this.downVector);
            const intersects = this.raycaster.intersectObjects(collidables, false);

            if (intersects.length > 0) {
                const hit = intersects[0];
                const distToFeet = hit.distance - 3.0;

                const fallDist = Math.max(0.5, -this.velocity.y * dt + 0.1);

                // Snap if close enough to ground (or penetrated from stepping)
                if (distToFeet <= fallDist && distToFeet >= -2.0) {
                    if (hit.point.y > this.position.y) {
                        this.position.y += (hit.point.y - this.position.y) * 20 * dt; // Smooth curve/step up
                        if (hit.point.y - this.position.y < 0.05) this.position.y = hit.point.y;
                    } else {
                        this.position.y = hit.point.y;
                    }
                    this.velocity.y = 0;
                    this.onGround = true;
                    foundGround = true;
                    this.coyoteTimer = this.coyoteMaxTime;
                }
            }
        } else if (this.velocity.y > 0) {
            // Ceiling check
            this.tempRayOrigin.copy(this.position);
            this.tempRayOrigin.y -= this.velocity.y * dt;
            this.tempRayOrigin.y += 3; // Middle of body
            this.raycaster.set(this.tempRayOrigin, new THREE.Vector3(0, 1, 0));
            const ceilingHits = this.raycaster.intersectObjects(collidables, false);
            
            if (ceilingHits.length > 0) {
                const hit = ceilingHits[0];
                const distToHead = hit.distance - 2; // Head is 5 units tall, origin is at +3. 3+2 = 5.
                if (distToHead <= this.velocity.y * dt + 0.1) {
                    this.position.y = hit.point.y - 5;
                    this.velocity.y = 0; // Bonk!
                }
            }
        }

        if (!foundGround) {
            this.onGround = false;
        }

        // Coyote Timer decay
        if (this.coyoteTimer > 0) {
            this.coyoteTimer -= dt;
        }

        // Death Check (Void)
        if (this.position.y < -20) {
            this.fallApart();
            return;
        }

        // Jump
        if (this.coyoteTimer > 0 && move.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
            this.coyoteTimer = 0; // Prevent multi-jump
            this.playSound(this.jumpBuffer);
        }

        // Visuals
        this.mesh.position.copy(this.position);

        // Hazard Check
        if (killBricks.length > 0) {
            const pBox = new THREE.Box3().setFromObject(this.mesh);
            pBox.expandByScalar(-0.5); // Forgive slightly

            for (const brick of killBricks) {
                const bBox = new THREE.Box3().setFromObject(brick);
                if (pBox.intersectsBox(bBox)) {
                    // If we're currently play-testing inside Studio, don't permanently fall apart:
                    // just respawn in place so testing isn't interrupted. Otherwise fall apart as normal.
                    try {
                        if (window && window._studioSpawned && typeof window._studioSpawned !== 'undefined') {
                            this.respawn();
                        } else {
                            this.fallApart();
                        }
                    } catch (e) {
                        this.fallApart();
                    }
                    return;
                }
            }
        }

        // Launch Pad Check
        const launchPads = world && world.launchPads ? world.launchPads : [];
        if (launchPads.length > 0) {
            const pBox = new THREE.Box3().setFromObject(this.mesh);
            pBox.expandByScalar(-0.1); 

            for (const pad of launchPads) {
                const bBox = new THREE.Box3().setFromObject(pad);
                if (pBox.intersectsBox(bBox)) {
                    this.velocity.y = 800;
                    this.onGround = false;
                    this.playSound(this.jumpBuffer, false, 0.6);
                }
            }
        }

        // Teleporter Check
        if (world && world.teleporters) {
             const pBox = new THREE.Box3().setFromObject(this.mesh);
             for(const tp of world.teleporters) {
                 const tBox = new THREE.Box3().setFromObject(tp);
                 tBox.expandByScalar(0.5); // Ensure trigger detection when standing on it
                 if (pBox.intersectsBox(tBox)) {
                     if (tp.userData.destination) {
                         this.teleport(tp.userData.destination);
                     }
                 }
             }
        }

        const isMoving = moveVec.lengthSq() > 0.1;

        // Rotation & Animation
        if (input.lookAngle !== undefined) {
            this.mesh.rotation.y = input.lookAngle;
        } else if (isMoving) {
            const angle = Math.atan2(moveVec.x, moveVec.z);
            // Instant turn (Roblox 2006 style)
            this.mesh.rotation.y = angle;
        }

        // Determine Animation State
        let animState = 'idle';
        if (!this.onGround) animState = 'fall';
        else if (isMoving) animState = 'walk';

        // Developer Override
        if (this.forcedAnim) animState = this.forcedAnim;

        if (animState === 'fall') {
            // Jump/Fall Animation - Arms up, Legs Still
            this.leftArm.rotation.x = Math.PI;
            this.rightArm.rotation.x = Math.PI;
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            
            // If we were walking, reset animTime? Not strictly necessary for fall but keeps it clean
            // Keeping animTime creates smooth transitions if we used them, but we use instant logic.

        } else if (animState === 'walk' && isMoving) {
            // Walk Animation - Sine Wave (only when actually moving)
            this.animTime += dt;
            const walkSpeed = 8; // Slower speed
            const amp = 1.0;
            const sinVal = Math.sin(this.animTime * walkSpeed);

            this.leftArm.rotation.x = sinVal * amp;
            this.rightArm.rotation.x = -sinVal * amp;
            this.leftLeg.rotation.x = -sinVal * amp;
            this.rightLeg.rotation.x = sinVal * amp;

        } else {
            // Idle - Instant reset
            this.animTime = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
        }

        // Walk Sound Logic (Looping)
        // Sound should only play if actually moving on ground, regardless of forced animation visual
        if (this.onGround && isMoving) {
            if (!this.walkSource && this.walkBuffer) {
                this.walkSource = this.playSound(this.walkBuffer, true);
            }
        } else {
            if (this.walkSource) {
                this.walkSource.stop();
                this.walkSource = null;
            }
        }
    }

    teleport(pos) {
        // Prevent rapid repeated teleports (e.g. standing inside a teleporter trigger)
        const now = performance.now();
        if (this._lastTeleportAt && (now - this._lastTeleportAt) < 750) {
            return;
        }
        this._lastTeleportAt = now;

        // Defensive clamp for absurd destinations (prevents floating-point/precision issues)
        const safePos = pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z);
        const MAX_SAFE_Y = 10000; // keep world positions within a sane range
        if (safePos.y > MAX_SAFE_Y) safePos.y = MAX_SAFE_Y;

        this.position.copy(safePos);
        this.mesh.position.copy(safePos);
        this.velocity.set(0, 0, 0);
        this.onGround = false;

        // Ensure the player mesh is visible after teleport unless intentionally hidden
        if (this.mesh) this.mesh.visible = true;

        // Play a short teleport sound (higher pitch so it's audible)
        try {
            this.playSound(this.jumpBuffer, false, 1.5);
        } catch (err) {
            // ignore audio failures
        }
    }

    mount(vehicle) {
        if (this.vehicle) return;
        this.vehicle = vehicle;
        this.onGround = false;
    }
}