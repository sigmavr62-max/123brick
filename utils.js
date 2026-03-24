import * as THREE from 'three';

// Adjust UVs of a BoxGeometry to match world dimensions relative to a texture map
// Default scales assume a 2x4 unit texture block (e.g. from SurfaceManager)
export function boxUnwrapUVs(geometry, scaleU = 0.5, scaleV = 0.25) {
    if (!geometry || !geometry.attributes || geometry.attributes.position.count !== 24) return;

    const params = geometry.parameters || {};
    const w = params.width || 1;
    const h = params.height || 1;
    const d = params.depth || 1;
    const uv = geometry.attributes.uv;
    
    const updateFace = (faceIndex, dimU, dimV) => {
        const start = faceIndex * 4;
        for (let i = 0; i < 4; i++) {
            const u = uv.getX(start + i);
            const v = uv.getY(start + i);
            uv.setXY(start + i, u * dimU * scaleU, v * dimV * scaleV);
        }
    };

    // BoxGeometry face order: px, nx, py, ny, pz, nz
    updateFace(0, d, h); // px (Right) - Depth x Height
    updateFace(1, d, h); // nx (Left)
    updateFace(2, w, d); // py (Top) - Width x Depth
    updateFace(3, w, d); // ny (Bottom)
    updateFace(4, w, h); // pz (Front) - Width x Height
    updateFace(5, w, h); // nz (Back)

    uv.needsUpdate = true;
}

export function createTorsoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    // Text "?"
    ctx.fillStyle = 'white';
    ctx.font = 'bold 100px "Comic Sans Custom", "Comic Sans MS", "Comic Sans", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 128, 100);

    // Text "PLACEHOLDER"
    ctx.font = 'bold 24px "Comic Sans Custom", "Comic Sans MS", "Comic Sans", cursive';
    ctx.fillText('PLACEHOLDER', 128, 180);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Fix for new UV scale (V goes 0..0.5 for 2 units height, we need 0..1 to show full image)
    tex.repeat.set(1, 2);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
}

export class SurfaceManager {
    constructor() {
        this.textures = {
            studs: new THREE.Texture(),
            inlet: new THREE.Texture()
        };
        
        const loader = new THREE.ImageLoader();
        loader.load('/Surfaces.png', (image) => {
            if (!image) return;
            const unitH = image.height / 16;
            const w = image.width;
            
            // Studs: Units 1-4 (Top 4)
            this._extract(this.textures.studs, image, 0, 0, w, Math.floor(unitH * 4));
            
            // Inlets: Units 5-8 (Next 4)
            this._extract(this.textures.inlet, image, 0, Math.floor(unitH * 4), w, Math.floor(unitH * 4));
        }, undefined, (err) => {
            console.warn('SurfaceManager: failed to load Surfaces.png', err);
        });
    }

    _extract(target, image, x, y, w, h) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
        
        // Brighten the texture to ensure correct tinting
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.min(255, d[i] * 2);
            d[i+1] = Math.min(255, d[i+1] * 2);
            d[i+2] = Math.min(255, d[i+2] * 2);
        }
        ctx.putImageData(id, 0, 0);

        target.image = canvas;
        target.wrapS = THREE.RepeatWrapping;
        target.wrapT = THREE.RepeatWrapping;
        target.minFilter = THREE.LinearFilter;
        target.magFilter = THREE.NearestFilter;
        target.colorSpace = THREE.SRGBColorSpace;
        target.needsUpdate = true;
    }
}

export const surfaceManager = new SurfaceManager();

export function createExplosion(scene, position) {
    const color = 0xffaa00;
    const geo = new THREE.SphereGeometry(1, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position || new THREE.Vector3());
    scene.add(mesh);
    return mesh;
}