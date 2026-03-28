let lastData = null;

// The "Turbo-Poll" Loop
async function fastUpdate() {
    try {
        const res = await fetch('/api', { cache: 'no-store' }); // bypass cache
        if (res.ok) {
            const data = await res.text();
            if (data !== lastData) {
                lastData = data;
                document.getElementById('display').innerText = data;
            }
        }
    } catch (err) {
        // Silently ignore errors (including 404s) as requested
    }
}

// Function to push new text to the Vercel API
async function sendData() {
    const text = document.getElementById('textInput').value;
    try {
        await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
    } catch (err) {
        // Silent error
    }
}

// Run the update check at "Max FPS" (approx every 16ms/60fps)
setInterval(fastUpdate, 16);
