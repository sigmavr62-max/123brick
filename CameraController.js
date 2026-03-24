import * as THREE from 'three';

// Simple camera controller that consumes look deltas & input to update yaw/pitch/position.
// Returns updated camera state to be applied by the caller.
export class CameraController {
  constructor() {
    this.cameraYaw = 0;
    this.cameraPitch = 0.3;
    this.cameraDist = 20;
    this.sensitivity = 1.0;

    // Safety: persist a protection flag to avoid accidental AD inversion edits in future.
    try {
      localStorage.setItem('ad_inversion_protected', 'true');
    } catch (e) {
      // ignore localStorage errors in restricted environments
    }
  }

  setSensitivity(v) { this.sensitivity = v; }

  // For PLAYING mode: follows a target (player) with orbit-camera behavior similar to the existing code.
  updatePlaying(dt, input, camera, player, world) {
    // Apply look deltas
    const look = input.getLookDelta();
    if (look.x !== 0 || look.y !== 0) {
      this.cameraYaw -= look.x * 0.005 * this.sensitivity;
      this.cameraPitch += look.y * 0.005 * this.sensitivity;
      this.cameraPitch = Math.max(-1.4, Math.min(1.5, this.cameraPitch));
    }

    // Compute focus point (player head)
    const focusPoint = player.position.clone().add(new THREE.Vector3(0, 4.5, 0));

    // Shift while shift-locked
    if (input.isShiftLocked) {
      const offsetAmt = 1.75;
      const rx = -Math.cos(this.cameraYaw);
      const rz = Math.sin(this.cameraYaw);
      focusPoint.x += rx * offsetAmt;
      focusPoint.z += rz * offsetAmt;
    }

    const hDist = this.cameraDist * Math.cos(this.cameraPitch);
    const vDist = this.cameraDist * Math.sin(this.cameraPitch);
    const offsetX = hDist * Math.sin(this.cameraYaw);
    const offsetZ = hDist * Math.cos(this.cameraYaw);

    const camPos = focusPoint.clone().add(new THREE.Vector3(offsetX, vDist, offsetZ));

    // Wall check
    const camDir = new THREE.Vector3().subVectors(camPos, focusPoint).normalize();
    const dist = camPos.distanceTo(focusPoint);
    const wallRay = new THREE.Raycaster(focusPoint, camDir, 0, dist);
    const wallHits = wallRay.intersectObjects(world.collidables || [], false);
    if (wallHits.length > 0) {
      camPos.copy(wallHits[0].point).addScaledVector(camDir, -0.5);
    }

    camera.position.copy(camPos);
    camera.lookAt(focusPoint);

    // Keep skybox following (caller may handle)
    return { yaw: this.cameraYaw, pitch: this.cameraPitch, dist: this.cameraDist };
  }

  // For STUDIO mode: free-fly camera controlled by WASD + mouse + Q/E for vertical
  updateStudio(dt, input, camera) {
    // Mouse look
    const look = input.getLookDelta();
    if (look.x !== 0 || look.y !== 0) {
      this.cameraYaw -= look.x * 0.005 * this.sensitivity;
      // Invert vertical look in studio so moving the mouse up raises the camera pitch
      this.cameraPitch -= look.y * 0.005 * this.sensitivity;
      this.cameraPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.cameraPitch));
    }

    // Movement: forward/back relative to full camera orientation (yaw + pitch)
    const raw = input.getMovement();
    // Forward respects pitch so W/S move along camera view (includes vertical when looking up/down)
    const forward = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    ).normalize();

    // Compute right as Up x Forward to guarantee A = left, D = right consistently (prevents inversion)
    const up = new THREE.Vector3(0, 1, 0);
    // Right = forward x up ensures positive X corresponds to the camera's right direction.
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    const moveVec = new THREE.Vector3();
    moveVec.addScaledVector(forward, -raw.z);
    // Use raw.x directly so A = left, D = right
    moveVec.addScaledVector(right, raw.x);

    // Vertical movement: Q/E or jump/space for up
    let vy = 0;
    if (input.keys.q) vy -= 1;
    if (input.keys.e) vy += 1;
    if (input.keys.space) vy += 1;

    if (moveVec.lengthSq() > 0) moveVec.normalize();

    // Studio speed (adjustable externally if desired)
    const studioSpeed = 60;
    moveVec.multiplyScalar(studioSpeed * dt);
    camera.position.add(moveVec);
    camera.position.y += vy * studioSpeed * dt;
    camera.position.y = Math.max(2, camera.position.y);

    const target = camera.position.clone().add(new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      Math.sin(this.cameraPitch),
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    ));
    camera.lookAt(target);

    return { yaw: this.cameraYaw, pitch: this.cameraPitch, dist: this.cameraDist };
  }
}