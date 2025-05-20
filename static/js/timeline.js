// Timeline management functions with timestamp in formatted date

// Update timeline display with timestamp as formatted date
function updateTimeline() {
    const slider = document.getElementById('timeline-slider');
    currentTimestamp = parseInt(slider.value);
    
    // Calculate the absolute timestamp
    const absoluteTimestamp = scene.start_timestamp + currentTimestamp;
    
    // Format the relative time (HH:MM:SS)
    const hours = Math.floor(currentTimestamp / 3600);
    const minutes = Math.floor((currentTimestamp % 3600) / 60);
    const seconds = currentTimestamp % 60;
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Format the absolute timestamp as a regular date and time
    const date = new Date(absoluteTimestamp * 1000);
    const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Display both relative time and absolute date
    document.getElementById('current-time').textContent = `${formattedTime} [${formattedDate}]`;
    
    updateMapDisplay();
    updateFrameList();
}

// Skip timeline backward or forward by specified seconds
function skipTimeline(secondsToSkip) {
    const slider = document.getElementById('timeline-slider');
    const currentValue = parseInt(slider.value);
    const maxValue = parseInt(slider.max);

    // Calculate new value, ensuring it stays within range
    let newValue = currentValue + secondsToSkip;
    newValue = Math.max(0, Math.min(newValue, maxValue));

    // Update slider and timeline
    slider.value = newValue;
    updateTimeline();

    console.log(`Timeline skipped by ${secondsToSkip} seconds to ${newValue}s`);
}

// Play/pause timeline with corrected speed calculation
function playPause(e) {
    // If event is provided, prevent default (important for space key)
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    
    // Don't do anything if no scene exists
    if (!hasExistingScene) {
        console.log('No scene to play/pause');
        return;
    }
    
    // Stop any existing playback
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    
    // Get the play button (might be triggered from keyboard)
    const button = document.getElementById('play-pause-btn');
    
    if (isPlaying) {
        button.textContent = 'Play';
        isPlaying = false;
        console.log('Playback stopped');
    } else {
        const speed = parseInt(document.getElementById('playback-speed').value);
        button.textContent = 'Pause';
        isPlaying = true;
        
        // Calculate interval for proper speed
        // For 10x speed: we want to show 10 seconds in 1 real second
        // So we update every 1000ms/10 = 100ms
        const intervalMs = Math.max(10, Math.floor(1000 / speed)); // Min 10ms to prevent too fast updates
        
        console.log(`Starting playback: ${speed}x speed, interval: ${intervalMs}ms`);
        
        // Track start time for accurate timing
        let startTime = Date.now();
        let expectedTime = startTime;
        let frameCount = 0;
        
        playInterval = setInterval(() => {
            const slider = document.getElementById('timeline-slider');
            const currentValue = parseInt(slider.value);
            const maxValue = parseInt(slider.max);
            
            // Check if we've reached the end
            if (currentValue >= maxValue) {
                clearInterval(playInterval);
                playInterval = null;
                button.textContent = 'Play';
                isPlaying = false;
                console.log('Playback finished - reached end');
                return;
            }
            
            // Increment by 1 second
            const newValue = currentValue + 1;
            slider.value = newValue;
            updateTimeline();
            
            // Debug timing information
            frameCount++;
            expectedTime += intervalMs;
            const currentTime = Date.now();
            const timeDrift = currentTime - expectedTime;
            
            if (frameCount % 10 === 0) { // Log every 10 frames
                console.log(`Frame ${frameCount}: Timeline at ${newValue}s, Drift: ${timeDrift}ms`);
            }
        }, intervalMs);
    }
}

// Reset timeline to beginning
function resetTimeline() {
    // Stop playback first
    if (isPlaying) {
        const playButton = document.getElementById('play-pause-btn');
        if (playButton) {
            playButton.click(); // This will stop playback
        }
    }
    
    const slider = document.getElementById('timeline-slider');
    slider.value = 0;
    updateTimeline();
    console.log('Timeline reset to 0');
}

// Initialize keyboard event listener for space bar 
function initTimelineKeyboardControls() {
    // Add keyboard event listener to the document for space bar
    document.addEventListener('keydown', function(e) {
        // Check if space bar was pressed (key code 32)
        if (e.keyCode === 32 || e.key === ' ') {
            // Only trigger if we have a scene and not in a text input field
            if (hasExistingScene && 
                document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA' &&
                document.activeElement.tagName !== 'SELECT') {
                // Trigger play/pause with the event
                playPause(e);
            }
        }
    });
    
    console.log('Timeline keyboard controls initialized');
}