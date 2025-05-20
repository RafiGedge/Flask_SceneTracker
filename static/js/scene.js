// Scene management functions

// Create new scene
function createNewScene() {
    if (hasExistingScene) {
        if (confirm('Creating a new scene will clear all current data. Are you sure you want to continue?')) {
            clearExistingScene();
            setupDateTimePickers();
            document.getElementById('setup-modal').classList.remove('hidden');
        }
    } else {
        setupDateTimePickers();
        document.getElementById('setup-modal').classList.remove('hidden');
    }
}

// Set up date and time pickers with current date and time
function setupDateTimePickers() {
    const now = new Date();

    // Format date as YYYY-MM-DD for the date input
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Format time as HH:MM for the time input
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    // Set the values
    document.getElementById('start-date').value = formattedDate;
    document.getElementById('start-time').value = formattedTime;
}

// Clear existing scene
function clearExistingScene() {
    scene = {};
    initializeObjects();
    buildings = [];
    roads = [];
    currentTimestamp = 0;
    selectedObject = null;
    addingObject = false;
    hasExistingScene = false;
    undoStack = [];
    frameHistory = {};

    if (map) {
        map.remove();
        map = null;
    }

    document.getElementById('scene-info').textContent = 'Create a new scene to get started';
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('frame-management').style.display = 'none';
    document.getElementById('edit-scene-btn').style.display = 'none';
    updateObjectsList();
}

// Setup map and scene
function setupMapAndScene(centerLat, centerLon, radius, duration) {
    try {
        if (map) map.remove();

        // Validate inputs
        if (!centerLat || !centerLon || !radius || !duration) {
            console.error("Invalid parameters for setupMapAndScene:", {centerLat, centerLon, radius, duration});
            return;
        }

        map = L.map('map').setView([centerLat, centerLon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add scene boundary circle
        L.circle([centerLat, centerLon], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.1,
            radius: radius
        }).addTo(map);

        const timelineSlider = document.getElementById('timeline-slider');
        timelineSlider.min = 0;
        timelineSlider.max = duration * 60;
        timelineSlider.value = 0;
        currentTimestamp = 0;

        document.getElementById('scene-info').textContent = `Scene: ${scene.scene_name} | Duration: ${duration} min`;
        document.getElementById('edit-scene-btn').style.display = 'inline-block';

        hasExistingScene = true;
        map.on('click', handleMapClick);
        updateMapDisplay();
        updateObjectsList();

        console.log("Map and scene setup complete");
    } catch (error) {
        console.error("Error in setupMapAndScene:", error);
    }
}

// Initialize scene
async function initializeScene() {
    const statusDiv = document.getElementById('init-status');
    statusDiv.innerHTML = '<div class="loading">Initializing scene...</div>';

    try {
        const sceneName = document.getElementById('scene-name').value;
        const centerLat = parseFloat(document.getElementById('center-lat').value);
        const centerLon = parseFloat(document.getElementById('center-lon').value);
        const radius = parseInt(document.getElementById('radius').value);
        const duration = parseInt(document.getElementById('duration').value);

        // Get selected date and time
        const startDate = document.getElementById('start-date').value;
        const startTime = document.getElementById('start-time').value;

        // Convert to timestamp
        let startTimestamp;
        if (startDate && startTime) {
            // Create a Date object from the selected date and time
            const dateTimeString = `${startDate}T${startTime}:00`;
            const selectedDateTime = new Date(dateTimeString);
            startTimestamp = Math.floor(selectedDateTime.getTime() / 1000);
            console.log(`Using selected date/time: ${selectedDateTime.toString()}, timestamp: ${startTimestamp}`);
        } else {
            // Fallback to current time if date/time not selected
            startTimestamp = Math.floor(Date.now() / 1000);
            console.log(`Using current time as timestamp: ${startTimestamp}`);
        }

        const utmCoords = latLonToUTM(centerLat, centerLon);

        scene = {
            scene_name: sceneName,
            center_lat: centerLat,
            center_lon: centerLon,
            center_x: utmCoords.x,
            center_y: utmCoords.y,
            utm_zone: utmCoords.zone,
            radius_meters: radius,
            start_timestamp: startTimestamp,
            end_timestamp: startTimestamp + (duration * 60),
            created_at: new Date().toISOString()
        };

        statusDiv.innerHTML = '<div class="loading">Fetching map data...</div>';
        await fetchMapData(centerLat, centerLon, radius);

        setupMapAndScene(centerLat, centerLon, radius, duration);
        statusDiv.innerHTML = '<div class="success-message">Scene initialized successfully!</div>';

        setTimeout(() => {
            document.getElementById('setup-modal').classList.add('hidden');
        }, 1500);

    } catch (error) {
        statusDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// Show edit scene modal
function showEditSceneModal() {
    if (!hasExistingScene) {
        alert('No scene to edit. Please create or load a scene first.');
        return;
    }

    // Populate the form with current scene values
    document.getElementById('edit-scene-name').value = scene.scene_name || '';
    document.getElementById('edit-radius').value = scene.radius_meters || 200;

    // Calculate duration in minutes
    const durationMinutes = scene.end_timestamp && scene.start_timestamp ? 
        Math.floor((scene.end_timestamp - scene.start_timestamp) / 60) : 60;
    document.getElementById('edit-duration').value = durationMinutes;

    // Convert timestamp to date and time for the date/time pickers
    if (scene.start_timestamp) {
        const startDate = new Date(scene.start_timestamp * 1000);
        
        // Format date as YYYY-MM-DD
        const year = startDate.getFullYear();
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        // Format time as HH:MM
        const hours = startDate.getHours().toString().padStart(2, '0');
        const minutes = startDate.getMinutes().toString().padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;
        
        document.getElementById('edit-start-date').value = formattedDate;
        document.getElementById('edit-start-time').value = formattedTime;
    }

    // Show the modal
    document.getElementById('edit-scene-modal').classList.remove('hidden');
}

// Close edit scene modal
function closeEditSceneModal() {
    document.getElementById('edit-scene-modal').classList.add('hidden');
    document.getElementById('edit-scene-status').innerHTML = '';
}

// Update scene details
function updateSceneDetails() {
    if (!hasExistingScene) {
        alert('No scene to update. Please create or load a scene first.');
        return;
    }
    
    const statusDiv = document.getElementById('edit-scene-status');
    statusDiv.innerHTML = '<div class="loading">Updating scene...</div>';
    
    try {
        // Get values from form
        const newSceneName = document.getElementById('edit-scene-name').value;
        const newRadius = parseInt(document.getElementById('edit-radius').value);
        const newDuration = parseInt(document.getElementById('edit-duration').value);
        const newStartDate = document.getElementById('edit-start-date').value;
        const newStartTime = document.getElementById('edit-start-time').value;
        
        // Validate inputs
        if (!newSceneName || !newRadius || !newDuration) {
            throw new Error('Please fill in all required fields');
        }
        
        if (newRadius <= 0) {
            throw new Error('Radius must be greater than 0');
        }
        
        if (newDuration <= 0) {
            throw new Error('Duration must be greater than 0');
        }
        
        // Calculate new start timestamp
        let newStartTimestamp;
        if (newStartDate && newStartTime) {
            const dateTimeString = `${newStartDate}T${newStartTime}:00`;
            const selectedDateTime = new Date(dateTimeString);
            if (isNaN(selectedDateTime.getTime())) {
                throw new Error('Invalid date or time format');
            }
            newStartTimestamp = Math.floor(selectedDateTime.getTime() / 1000);
        } else {
            // Keep current timestamp if date/time not provided
            newStartTimestamp = scene.start_timestamp;
        }
        
        // Calculate time difference between old and new start time
        const timeShift = newStartTimestamp - scene.start_timestamp;
        
        // Update scene properties
        scene.scene_name = newSceneName;
        scene.radius_meters = newRadius;
        scene.start_timestamp = newStartTimestamp;
        scene.end_timestamp = newStartTimestamp + (newDuration * 60);
        
        // Adjust all timestamps in objects if start time changed
        if (timeShift !== 0) {
            // Adjust all object timestamps
            for (const objectType in objects) {
                for (const objectId in objects[objectType]) {
                    const obj = objects[objectType][objectId];
                    
                    // Adjust timestamp property if it exists
                    if (obj.timestamp) {
                        obj.timestamp += timeShift;
                    }
                    
                    // Adjust creation_time for Targets
                    if (objectType === 'Targets' && obj.creation_time) {
                        obj.creation_time += timeShift;
                    }
                    
                    // Adjust frames if they exist
                    if (obj.frames) {
                        obj.frames.forEach(frame => {
                            if (frame.timestamp) {
                                frame.timestamp += timeShift;
                            }
                        });
                    }
                }
            }
        }
        
        // Update map and timeline
        setupMapAndScene(scene.center_lat, scene.center_lon, newRadius, newDuration);
        
        statusDiv.innerHTML = '<div class="success-message">Scene updated successfully!</div>';
        
        setTimeout(() => {
            closeEditSceneModal();
        }, 1500);
        
    } catch (error) {
        statusDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// Fetch building and road data from OpenStreetMap
// This data is saved to CSV files but NOT rendered on the map
async function fetchMapData(centerLat, centerLon, radius) {
    try {
        const overpassQuery = `
            [out:json][timeout:25];
            (
                way["building"](around:${radius},${centerLat},${centerLon});
                way["highway"](around:${radius},${centerLat},${centerLon});
            );
            (._;>;);
            out geom;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(overpassQuery)
        });

        if (!response.ok) {
            throw new Error('Failed to fetch map data');
        }

        const data = await response.json();

        // Process buildings and roads for CSV export only
        buildings = [];
        roads = [];

        data.elements.forEach(element => {
            if (element.type === 'way' && element.geometry && element.geometry.length > 1) {
                const utmPoints = element.geometry.map(point => {
                    const utm = latLonToUTM(point.lat, point.lon);
                    return {x: utm.x, y: utm.y};
                });

                if (element.tags && element.tags.building) {
                    buildings.push({
                        id: generateUUID(),
                        type: element.tags.building || 'building',
                        points: utmPoints,
                        tags: element.tags
                    });
                } else if (element.tags && element.tags.highway) {
                    roads.push({
                        id: generateUUID(),
                        type: element.tags.highway || 'road',
                        points: utmPoints,
                        tags: element.tags
                    });
                }
            }
        });

        console.log(`Fetched ${buildings.length} buildings and ${roads.length} roads (for CSV export only)`);

    } catch (error) {
        console.error('Error fetching map data:', error);
        showStatus('init-status', 'Warning: Could not fetch map data. Continuing without external data.', 'error');
        // Continue without external map data
    }
}