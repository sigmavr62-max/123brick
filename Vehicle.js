/*
 Minimal Vehicle stub so World.js import works.
 Provides a simple drive/update API and a visible mesh.
*/
import * as THREE from 'three';

export class Vehicle {
  constructor(scene, x = 0, y = 2, z = 0, color = 0xff0000) {
    this.scene = scene;
    this.mesh = this._createMesh(color);
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);

    this.driver = null;
    this.verticalVel = 0;
    this._velocity = new THREE.Vector3();
  }

  _createMesh(color) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.5, 2.5),
      new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.75;
    group.add(body);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12);
    const addWheel = (x, z) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.3, z);
      group.add(w);
    };

    addWheel(-1.4, 1);
    addWheel(1.4, 1);
    addWheel(-1.4, -1);
    addWheel(1.4, -1);

    // simple forward vector helper
    group.userData = { speed: 0, steer: 0 };
    return group;
  }

  drive(input, dt) {
    // Very simple drive: W forward, S backward, A/D rotate
    const forward = (input.w ? 1 : 0) - (input.s ? 1 : 0);
    const turn = (input.d ? 1 : 0) - (input.a ? 1 : 0);

    // Update speed and rotation
    this.mesh.rotation.y -= turn * 1.5 * dt;
    const dir = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
    this.mesh.position.addScaledVector(dir, forward * 10 * dt);

    // Basic gravity/vertical behavior (keeps it on ground)
    this.verticalVel -= 30 * dt;
    this.mesh.position.y += this.verticalVel * dt;
    if (this.mesh.position.y < 1.0) {
      this.mesh.position.y = 1.0;
      this.verticalVel = 0;
    }
  }

  update(dt, collidables = []) {
    // Very lightweight: if verticalVel set externally (explosion), apply it
    if (this.verticalVel !== 0) {
      this.mesh.position.y += this.verticalVel * dt;
      this.verticalVel -= 20 * dt;
      if (this.mesh.position.y < 1.0) {
        this.mesh.position.y = 1.0;
        this.verticalVel = 0;
      }
    }
  }

  dispose() {
    // Dispose geometry/materials where possible
    this.mesh.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}