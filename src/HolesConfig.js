// Add this block: Centralized Modular Hole & Waypoint Blueprint Definition
export const HOLES_CONFIG = {
    1: { // 475 Yard Straight Par 4 with Water Crossing
        par: 4,
        //horizonTheme: 'forest',
        //horizonTheme: 'estate',
        horizonTheme: 'mountains',
        theme: 'standard',
        fairwayWidth: 16.00, // 45 yards wide adjusted to game scale units
        greenShape: 'kidney', // Changes the circle to the custom organic bean shape
        greenRadius: 10.5,    // Tightly matches the proportions of the photo

        // 6-Zone Slope Profile with Center Collection Bowl & Back Ridge
        slopeProfile: {
            backLeft: { rx: -0.020, rz: 0.025 },
            backRight: { rx: 0.025, rz: 0.020 },
            midLeft: { rx: -0.010, rz: -0.005 },
            midRight: { rx: 0.015, rz: -0.010 },
            frontLeft: { rx: 0.015, rz: -0.025 },
            frontRight: { rx: -0.020, rz: -0.030 },

            features: [
                // Soft collection bowl in the middle-left landing area
                { type: 'bowl', x: -3.0, z: 0.0, radius: 4.5, depth: 0.08 },
                // Transverse ridge separating the back shelf from the mid-green
                { type: 'ridge', p1: { x: -6.0, z: -3.0 }, p2: { x: 6.0, z: -3.0 }, width: 3.0, height: 0.10 }
            ]
        },
        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(0, 0, -70.25),
            new THREE.Vector3(0, 0, -150.5) // Total length of 475 yards from the tee
        ],
        hazards: [

            {
                type: 'lake',
                x: 0,
                z: -82.5,
                radiusX: 24.0, // Keeps original width
                radiusZ: 10.0   // Shortens length down the fairway
            },
            //  twin traps by green
            { type: 'sand', x: -9, z: -135, radius: 5.8, depth: 1.35 },
            { type: 'sand', x: 10, z: -135, radius: 5.8, depth: 1.35 }
        ],
        customOOB: {
            type: 'stepped',
            narrowMinX: -26,
            narrowMaxX: 26,
            splitZ: -118,
            wideMinX: -50,
            wideMaxX: 50,
            minZ: -210,
            maxZ: 35,
            stakesPerSide: 8,
            stakesPerRow: 5
        }
    },
    2: { // 327 Yard Downhill Drive + 87 Yard Approach Dogleg Right
        par: 4,
        theme: 'standard',
        treeScale: 5.5,
        fairwayWidth: 9.5,
        greenRadius: 9.0,

        // 6-Zone Slope Profile with Left-to-Right Downhill Funnel
        slopeProfile: {
            backLeft: { rx: -0.035, rz: 0.015 },
            backRight: { rx: -0.015, rz: 0.025 },
            midLeft: { rx: -0.030, rz: -0.010 },
            midRight: { rx: -0.010, rz: -0.015 },
            frontLeft: { rx: -0.020, rz: -0.035 },
            frontRight: { rx: -0.010, rz: -0.040 },

            features: [
                // Protective mound guarding the back-right pin location
                { type: 'mound', x: 3.5, z: -4.0, radius: 3.5, height: 0.12 }
            ]
        },

        waypoints: [
            new THREE.Vector3(0, 0, 10),       // Flat Tee Box zone
            new THREE.Vector3(0, 0, -108),     // 327 Yard Elbow (Hill descent ends here)
            new THREE.Vector3(20, 0, -139)     // 87 Yard Approach Green
        ],
        hazards: [
            { type: 'sand', x: -14.5, z: -110.0, radius: 5.2, depth: 1.5 },
            { type: 'sand', x: 26.5, z: -125.5, radius: 5.0, depth: 1.6 },
            { type: 'sand', shape: 'snake', depth: 0.3, radius: 2.2, path: [{ x: 18, z: -152 }, { x: 25, z: -152 }] },
            { type: 'sand', x: 33.5, z: -146.0, radius: 4.5, depth: 1.6 }
        ],

        customOOB: {
            type: 'rectangle',
            minX: -60,         // Left wall line bounding the rough
            maxX: 65,          // Right wall line extended to clear the right hazards
            minZ: -185,        // Front wall line positioned safely past the green complex
            maxZ: 35,          // Back wall line behind the tee box
            stakesPerSide: 8,  // Spacing density down the long sides
            stakesPerRow: 3    // Spacing density across the narrow front/back walls
        },
        customTrees: [
            // --- LEFT SIDE (Outside Left Bunkers) ---

         { x: -32, z: 10 }, { x: -52, z: -5 }, { x: -47, z: -13 }, { x: -56, z: -20 }, { x: -72, z: -35 }, { x: -65, z: -43 }, { x: -60, z: -50 }, { x: -67, z: -57 }, { x: -68, z: -65 }, { x: -60, z: -72 }, { x: -45, z: -80 }, { x: -51, z: -87 }, { x: -32, z: -95 }, { x: -40, z: -102 }, { x: -34, z: -110 }, { x: -40, z: -125 }, { x: -55, z: -140 },

            // --- RIGHT SIDE (Far Right Hillside) ---

            { x: 48, z: -5 }, { x: 48, z: -15 }, { x: 48, z: -25 }, { x: 48, z: -35 }, { x: 48, z: -45 }, { x: 48, z: -55 }, { x: 48, z: -65 }, { x: 48, z: -75 }, { x: 48, z: -85 }, { x: 48, z: -95 }, { x: 48, z: -105 }, { x: 48, z: -115 },

            // --- BACK OF GREEN ---
            { x: -10, z: -175 }, { x: 6, z: -185 }, { x: 22, z: -180 }, { x: 38, z: -183 },
        ]
    },

    3: { // Pebble Beach Hole 6 Replica - Chasm Cliff Par 5
        par: 5,
        fairwayWidth: 8.0,
        greenRadius: 8.5,
        horizonTheme: 'estate',

        // Wavy & Bumpy Slope Profile with Ridges, Mounds, and Collection Swales
        slopeProfile: {
            // Opposing sector tilts create natural twisting & side breaks
            backLeft: { rx: -0.025, rz: 0.020 },
            backRight: { rx: -0.018, rz: -0.015 },
            midLeft: { rx: 0.015, rz: -0.022 },
            midRight: { rx: -0.020, rz: 0.018 },
            frontLeft: { rx: -0.030, rz: 0.015 },
            frontRight: { rx: 0.012, rz: -0.025 },

            features: [
                // 1. Diagonal crowning spine running across the center of the green
                { type: 'ridge', p1: { x: -5.0, z: -2.0 }, p2: { x: 4.0, z: 2.0 }, width: 3.2, height: 0.14 },

                // 2. Humps & Mounds scattered across different quadrants
                { type: 'mound', x: 3.5, z: -3.5, radius: 3.0, height: 0.15 },  // Back-right high hump
                { type: 'mound', x: -2.8, z: 3.2, radius: 2.8, height: 0.12 },  // Front-left entry bump
                { type: 'mound', x: 2.5, z: 4.8, radius: 2.2, height: 0.10 },   // Front-right runoff mound

                // 3. Collection Bowls & Swales
                { type: 'bowl', x: -3.5, z: -3.5, radius: 3.5, depth: 0.12 },   // Deep back-left catchment bowl
                { type: 'bowl', x: 1.5, z: -0.5, radius: 2.8, depth: 0.09 },    // Center-right swale

                // 4. Stepped Elevation Tiers
                { type: 'tier', axis: 'z', position: 3.8, width: 2.2, height: 0.11 },
                { type: 'tier', axis: 'z', position: -0.5, width: 2.5, height: 0.10 },
                { type: 'tier', axis: 'z', position: -4.2, width: 2.2, height: 0.12 }
            ]
        },

        waypoints: [
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(0, 0, -65),
            new THREE.Vector3(-14, 0, -125), // CHANGED: Shifted from 0 to -14 to curve the end of the 1st fairway out to the left
            new THREE.Vector3(-3, 0, -180)
        ],
        // Define path points along the left side following the Google Earth terrain

        hazards: [
            // Bunkers on the left (Shifted back to flank the lower driver landing zone precisely)
            { type: 'sand', x: -27.5, z: -85.0, radius: 3.8, depth: 0.55 },
            { type: 'sand', x: -38.5, z: -100.0, radius: 2.9, depth: 0.50 },  //left bunker
            { type: 'sand', x: -45.5, z: -101.5, radius: 1.4, depth: 0.45 },
            { type: 'sand', x: -32.5, z: -104.0, radius: 3.8, depth: 0.60 },
            { type: 'sand', x: -31.5, z: -112.0, radius: 3.0, depth: 0.60 },
            // Lower driving zone bunker cluster converted into a single long, wide polygon with rounded caps
            {
                type: 'sand',
                shape: 'polygon',
                depth: 0.6,
                points: [
                    // Top straight boundary line
                    { x: -34.5, z: -89.5 },  // Top-Left straight edge
                    { x: -29.5, z: -89.5 },  // Top-Right straight edge

                    // Right rounded cap (Shifted far left to clear the wide 18-unit fairway edge)
                    { x: -27.5, z: -91.0 },  // Right upper turn point
                    { x: -27.0, z: -92.5 },  // Right Apex Center (Safely in the rough)
                    { x: -29.0, z: -94.5 },  // Right lower turn point

                    // Bottom straight boundary line
                    { x: -39.5, z: -96.5 },  // Bottom-Right straight edge
                    { x: -44.5, z: -96.5 },  // Bottom-Left straight edge

                    // Left rounded cap (facing deep out into the left rough)
                    { x: -46.5, z: -95.0 },  // Left lower turn point
                    { x: -47.0, z: -93.5 },  // Left Apex Center
                    { x: -45.0, z: -91.5 }   // Left upper turn point
                ]
            },
            // 2. The single intermediate bunker in the left rough before the green
            { type: 'sand', shape: 'snake', depth: 0.60, radius: 3.0, path: [{ x: -30.5, z: -130.0 }, { x: -30.5, z: -150.0 }] },
            { type: 'sand', x: -25.5, z: -159.0, radius: 2.2, depth: 0.60 },

            // 3. The green-side bunker positioned tightly to the left of your x: -3 green
            { type: 'sand', x: -15.5, z: -183.0, radius: 2.5, depth: 0.60 },

            // Exactly 2 right-side bunkers adjusted to perfectly hug your new x: -3 green edge
            { type: 'sand', x: 8.3, z: -174.0, radius: 2.1, depth: 0.60 },
            { type: 'sand', x: 9.8, z: -181.5, radius: 2.0, depth: 0.60 },

            { type: 'ocean', x: 60.0, z: -153.5, width: 130.0, length: 150.0 }
        ],
        cartPath: [
            { x: -22, z: 20 },
            { x: -24, z: -10 },
            { x: -28, z: -50 },
            { x: -52, z: -95 },
            { x: -44, z: -135 },
            { x: -32, z: -165 },
            { x: -22, z: -182 },
            { x: -16, z: -192 }
        ]
    },
    4: { // Sharp 90-Degree Dogleg Right Hole
        par: 4,
        treeScale: 5.5, // Adjust this number to change tree height for Hole 4
        treeHeightScale: 2.0,
        fairwayWidth: 18.5,
        greenRadius: 11.0,
        greenShape: 'circle',
        theme: 'standard',

        // 6-Zone Slope Profile with Diagonal Ridge Break
        slopeProfile: {
            backLeft: { rx: -0.030, rz: 0.035 },
            backRight: { rx: 0.020, rz: 0.030 },
            midLeft: { rx: 0.040, rz: -0.035 },
            midRight: { rx: 0.035, rz: -0.045 },
            frontLeft: { rx: -0.015, rz: 0.025 },
            frontRight: { rx: 0.010, rz: 0.030 },

            features: [
                // Diagonal spine running across the middle of the green
                { type: 'ridge', p1: { x: -5.0, z: -3.0 }, p2: { x: 5.0, z: 3.0 }, width: 4.0, height: 0.14 }
            ]
        },
        waypoints: [
            new THREE.Vector3(0, 0, 10),    // Tee Box
            new THREE.Vector3(0, 0, -85),   // Elbow Turn
            new THREE.Vector3(45, 0, -85),  // Approach Fairway
            new THREE.Vector3(85, 0, -85)   // Green Location (~355 yards total)
        ],
        hazards: [
            // 1. Water at the elbow of the dogleg (inside corner)
            { type: 'lake', x: 12, z: -73, radiusX: 9.5, radiusZ: 8.5 },

            // 2. Bunker straight out off the tee in the left rough at the turn
            { type: 'sand', x: -25, z: -110, radius: 10.5, depth: 0.75 },

            // 3. Bunker to the right of the green
            { type: 'sand', x: 83, z: -65, radius: 6.5, depth: 0.7 },

            // 4. Bunker to the left of the green
            { type: 'sand', x: 83, z: -105, radius: 6.5, depth: 0.7 }
        ],
        customTrees: [
            // --- LEFT SIDE OF TEE (Single clean row) ---
            { x: -25, z: 25 },
            { x: -25, z: 10 },
            { x: -25, z: -5 },
            { x: -25, z: -20 },
            { x: -25, z: -35 },
            { x: -25, z: -50 },
            { x: -25, z: -65 },

            // --- RIGHT SIDE OF TEE (7-Layer Dense Forest filling the open field) ---
            // Row 1 (X = 20)
            { x: 23, z: 25 }, { x: 23, z: 10 }, { x: 23, z: -5 }, { x: 23, z: -20 }, { x: 23, z: -35 }, { x: 23, z: -50 }, { x: 23, z: -62 },
            // Row 2 (X = 26)
            { x: 26, z: 20 }, { x: 26, z: 5 }, { x: 26, z: -10 }, { x: 26, z: -25 }, { x: 26, z: -40 }, { x: 26, z: -55 },
            // Row 3 (X = 32)
            { x: 32, z: 25 }, { x: 32, z: 10 }, { x: 32, z: -5 }, { x: 32, z: -20 }, { x: 32, z: -35 }, { x: 32, z: -50 }, { x: 32, z: -62 },
            // Row 4 (X = 38)
            { x: 38, z: 20 }, { x: 38, z: 5 }, { x: 38, z: -10 }, { x: 38, z: -25 }, { x: 38, z: -40 }, { x: 38, z: -55 },
            // Row 5 (X = 44)
            { x: 44, z: 25 }, { x: 44, z: 10 }, { x: 44, z: -5 }, { x: 44, z: -20 }, { x: 44, z: -35 }, { x: 44, z: -50 }, { x: 44, z: -62 },
            // Row 6 (X = 50)
            { x: 50, z: 20 }, { x: 50, z: 5 }, { x: 50, z: -10 }, { x: 50, z: -25 }, { x: 50, z: -40 }, { x: 50, z: -55 },
            // Row 7 (X = 56)
            { x: 56, z: 25 }, { x: 56, z: 10 }, { x: 56, z: -5 }, { x: 56, z: -20 }, { x: 56, z: -35 }, { x: 56, z: -50 }, { x: 56, z: -62 },

            // --- RIGHT SIDE OF DOGLEG / APPROACH (Z: -98 to -108, ending before Green) ---
            { x: -40, z: -140 }, { x: -35, z: -134 },
            { x: -25, z: -140 }, { x: -20, z: -134 },
            { x: -10, z: -140 }, { x: -5, z: -134 },
            { x: 5, z: -140 }, { x: 10, z: -134 },
            { x: 20, z: -140 }, { x: 25, z: -134 },
            { x: 35, z: -140 }, { x: 40, z: -134 },
            { x: 50, z: -140 }, { x: 55, z: -134 },


        ],
        customOOB: {
            type: 'l_shape',
            leg1: { minX: -44, maxX: 60, minZ: -145, maxZ: 30 },
            leg2: { minX: -44, maxX: 115, minZ: -145, maxZ: -30 }
        }
    },
    5: { // 185-Yard Par 3 Island Green
        par: 3,
        fairwayWidth: 10,
        greenRadius: 17.0,
        greenShape: 'wavy',
        theme: 'standard',
        treeScale: 1.5,
        treeHeightScale: 1.2,

        // 6-Zone Slope Profile with Central Crown Mound
        slopeProfile: {
            backLeft: { rx: -0.020, rz: 0.025 },
            backRight: { rx: 0.025, rz: 0.020 },
            midLeft: { rx: 0.020, rz: -0.015 },
            midRight: { rx: -0.020, rz: -0.015 },
            frontLeft: { rx: 0.015, rz: -0.020 },
            frontRight: { rx: -0.015, rz: -0.025 },

            features: [
                // Crown mound in the center that repels offline shots toward the water
                { type: 'mound', x: 0.0, z: 0.0, radius: 6.0, height: 0.15 }
            ]
        },
        waypoints: [
            new THREE.Vector3(0, 0, 10),     // Tee Box
            new THREE.Vector3(0, 0, -56.8)   // 185 Yards to Green Center
        ],
        hazards: [
            // Expanded Island Lake (Wider water hazard extending closer to tee)
            { type: 'lake', x: 0, z: -56.8, radiusX: 55.0, radiusZ: 49.0 },


        ],
        customTrees: [
            // Left Outer Shoreline (Outside Water)
            { x: -60, z: -10, scale: 1.8 },
            { x: -62, z: -30, scale: 4.0 },
            { x: -59, z: -45, scale: 1.6 },
            { x: -60, z: -70, scale: 4.2 },
            { x: -63, z: -85, scale: 1.8 },
            { x: -58, z: -100, scale: 3.8 },

            // Right Outer Shoreline (Outside Water)
            { x: 60, z: -10, scale: 4.0 },
            { x: 62, z: -28, scale: 1.7 },
            { x: 59, z: -45, scale: 4.2 },
            { x: 63, z: -60, scale: 1.8 },
            { x: 60, z: -75, scale: 4.0 },
            { x: 62, z: -90, scale: 1.6 },
            { x: 58, z: -100, scale: 3.8 },

            // Back Shoreline (Behind Green)
            { x: -40, z: -110, scale: 1.7 },
            { x: -20, z: -112, scale: 4.2 },
            { x: 0, z: -114, scale: 1.8 },
            { x: 20, z: -112, scale: 4.0 },
            { x: 40, z: -110, scale: 1.6 },

            // Front / Tee Shore Framing
            { x: -32, z: 5, scale: 3.8 },
            { x: -20, z: 12, scale: 1.7 },
            { x: 20, z: 12, scale: 1.8 },
            { x: 32, z: 5, scale: 4.0 }
        ],
        customOOB: {
            type: 'rectangle',
            minX: -50,
            maxX: 50,
            minZ: -105,
            maxZ: 30,
            stakesPerSide: 6,
            stakesPerRow: 3
        }
    },
    6: { // Oakmont Country Club #18 - 496-Yard Championship Par 4
        par: 4,
        fairwayWidth: 11.5,     // Tightened width so rough grass wraps around all bunker lips
        greenRadius: 11.0,
        greenShape: 'oval',
        horizonTheme: 'estate', // Renders Oakmont's historic clubhouse behind the green
        theme: 'standard',
        treeScale: 4.8,
        treeHeightScale: 1.8,   // Spawns realistic spreading oak trees

        // Oakmont's Fast Back-to-Front Sloped Green
        slopeProfile: {
            backLeft: { rx: -0.025, rz: -0.045 },
            backRight: { rx: 0.020, rz: -0.045 },
            midLeft: { rx: -0.020, rz: -0.048 },
            midRight: { rx: 0.015, rz: -0.048 },
            frontLeft: { rx: -0.015, rz: -0.052 },
            frontRight: { rx: 0.010, rz: -0.052 },

            features: [
                // False front slope at the entrance to the green
                { type: 'tier', axis: 'z', position: 4.0, width: 3.0, height: -0.15 }
            ]
        },

        // S-CURVE FAIRWAY WAYPOINTS
        waypoints: [
            new THREE.Vector3(0, 0, 10),       // 1. Tee Box (0 yards)
            new THREE.Vector3(0, 0, -35),      // 2. Chute exit off tee
            new THREE.Vector3(-7.0, 0, -75),   // 3. Sweeps LEFT around 260yd right bunker
            new THREE.Vector3(6.0, 0, -102),   // 4. Sweeps RIGHT around 304yd left bunkers
            new THREE.Vector3(8.0, 0, -135),   // 5. Sweeps RIGHT around 90yd left bunker
            new THREE.Vector3(0, 0, -168)      // 6. Sweeps back into Green Center (493 yards total)
        ],

        // HORIZONTAL X-AXIS ELONGATED BUNKERS EMBEDDED IN ROUGH
        hazards: [
            // 1. Right Rough Horizontal Elongated Bunker (260 yd from tee / Z = -83.9)
            {
                type: 'sand',
                shape: 'snake',
                radius: 3.2,
                depth: 1.2,
                path: [
                    { x: 14.5, z: -83.9 },
                    { x: 7.5, z: -83.9 }
                ]
            },

            // 2. Left Rough 2 Bunkers (304 yd from tee / Z = -94 & -104)
            { type: 'sand', x: -9.0, z: -94.0, radius: 4.5, depth: 1.2 },
            { type: 'sand', x: -5.0, z: -104.0, radius: 4.8, depth: 1.2 },

            // 3. Right Rough 2 Bunkers (243 yd from hole / Z = -99.5 & -109.5)
            { type: 'sand', x: 16.5, z: -99.5, radius: 4.2, depth: 1.2 },
            { type: 'sand', x: 18.0, z: -109.5, radius: 4.0, depth: 1.2 },

            // 4. Left Rough Approach Horizontal Elongated Bunker (90 yd from green / Z = -135.5)
            {
                type: 'sand',
                shape: 'snake',
                radius: 3.0,
                depth: 1.2,
                path: [
                    { x: -5.5, z: -135.5 },
                    { x: 3.5, z: -135.5 }
                ]
            },

            // 5. Greenside Bunkers (Buffered clear of the oval green)
            { type: 'sand', x: -18.5, z: -158.0, radius: 3.6, depth: 1.3 },
            { type: 'sand', x: -20.5, z: -168.0, radius: 3.8, depth: 1.3 },
            { type: 'sand', x: 18.5, z: -159.0, radius: 3.8, depth: 1.3 },
            { type: 'sand', x: 20.5, z: -168.0, radius: 4.0, depth: 1.3 }
        ],

        // Oak trees framing outer rough following curved fairway contours
        customTrees: [
            // Left Tree Line
            { x: -32, z: 20 }, { x: -32, z: 0 }, { x: -32, z: -20 }, { x: -30, z: -40 },
            { x: -28, z: -60 }, { x: -30, z: -80 }, { x: -32, z: -100 }, { x: -36, z: -120 },
            { x: -36, z: -140 }, { x: -32, z: -160 }, { x: -30, z: -180 },

            // Right Tree Line
            { x: 32, z: 20 }, { x: 32, z: 0 }, { x: 32, z: -20 }, { x: 36, z: -40 },
            { x: 38, z: -60 }, { x: 36, z: -80 }, { x: 34, z: -100 }, { x: 30, z: -120 },
            { x: 28, z: -140 }, { x: 30, z: -160 }, { x: 30, z: -180 }
        ],

        customOOB: {
            type: 'rectangle',
            minX: -55,
            maxX: 55,
            minZ: -198,
            maxZ: 30,
            stakesPerSide: 10,
            stakesPerRow: 4
        }
    },
    7: { // Ballyneal Hole #8 Replica - 515-Yard Championship Par 5 Dunes
        par: 5,
        fairwayWidth: 15.0,
        greenRadius: 10.5,
        greenShape: 'kidney',
        horizonTheme: 'mountains', // Open rolling dunes/prairie horizon
        theme: 'open',
        treeScale: 1.0,

        // Ballyneal's Undulating Amphitheater Green Profile
        slopeProfile: {
            backLeft: { rx: -0.025, rz: 0.020 },
            backRight: { rx: 0.030, rz: 0.015 },
            midLeft: { rx: -0.020, rz: -0.025 },
            midRight: { rx: 0.015, rz: -0.020 },
            frontLeft: { rx: -0.035, rz: -0.045 }, // Severe false front
            frontRight: { rx: 0.020, rz: -0.040 },

            features: [
                // False front rejecting short wedge approaches
                { type: 'tier', axis: 'z', position: 3.5, width: 3.2, height: -0.18 },
                // Ridge separating back tier from middle green
                { type: 'ridge', p1: { x: -6.0, z: -2.0 }, p2: { x: 5.0, z: 1.0 }, width: 3.0, height: 0.12 },
                // Back-right elevation shelf stop
                { type: 'mound', x: 4.0, z: -4.0, radius: 4.0, height: 0.16 }
            ]
        },

        // 515-YARD PAR 5 WAYPOINTS (Tee at z=10, Green at z=-176)
        waypoints: [
            new THREE.Vector3(0, 0, 10),        // 1. Perched Tee Box (0 yds)
            new THREE.Vector3(-4.0, 0, -88),    // 2. Landing Zone 1 (270 yds)
            new THREE.Vector3(2.0, 0, -127),    // 3. Transition Layup (380 yds)
            new THREE.Vector3(-6.0, 0, -176)    // 4. Green Center (515 yds total)
        ],

        // BALLYNEAL DUNE BLOWOUT BUNKERS
        hazards: [
            // 1. Left Dune Waste / Blowout at 245 yds (z = -78)
            { type: 'sand', x: -22.0, z: -78.0, radius: 6.5, depth: 1.1 },

            // 2. Main Center-Right Split Hazard at 325 yds (z = -102 to -118)
            {
                type: 'sand',
                shape: 'snake',
                radius: 5.0,
                depth: 1.8,
                path: [
                    { x: 8.0, z: -102.0 },
                    { x: 18.0, z: -115.0 }
                ]
            },
            {
                type: 'sand',
                shape: 'snake',
                radius: 4.8,
                depth: 1.8,
                path: [
                    { x: 15.0, z: -111.0 },
                    { x: 9.0, z: -117.0 }
                ]
            },
            { type: 'sand', x: 10.0, z: -118.0, radius: 4.8, depth: 1.7 },

            // 3. Left Layup Pot / Blowout at 430 yds (z = -145)
            { type: 'sand', x: -25.0, z: -145.0, radius: 7.2, depth: 1.8 },

            // 4. Greenside Left Blowout Bunker at 502 yds (z = -172)
            { type: 'sand', x: -27.0, z: -172.0, radius: 5.5, depth: 1.8 },

            // 5. Greenside Right Guard Pot Bunker at 520 yds (z = -178)
            { type: 'sand', x: 15.0, z: -178.0, radius: 6.5, depth: 1.8 },
            // 6. Water Hazard directly before the Green (Approach Carry at z = -161)
            { type: 'lake', x: 5.0, z: -153.0, radiusX: 14.0, radiusZ: 13.5 },
            // 6. Water Hazard directly before the Green (Approach Carry at z = -161)
            { type: 'lake', x: 3.0, z: -67.0, radiusX: 14.5, radiusZ: 23.5 }
        ],

        // Treeless open links dunes (No trees on fairway)
        customTrees: [],

customOOB: {
            type: 'rectangle',
            minX: -65,
            maxX: 65,
            minZ: -205,
            maxZ: 30,
            stakesPerSide: 11,
            stakesPerRow: 4
        }
    },
  8: { // Pine Valley Hole #2 - 428-Yard Championship Par 4
        par: 4,
        fairwayWidth: 13.0,
        greenRadius: 8.5,
        greenShape: 'oval',        // Wide horizontally across the bluff face
        horizonTheme: 'forest',    // Heavy Pine Valley forest canopy
        theme: 'forest',
        treeScale: 4.8,
        treeHeightScale: 1.6,

        // Back-to-Front Slope with Right Collection Swale & False Front
        slopeProfile: {
            backLeft: { rx: -0.020, rz: -0.035 },
            backRight: { rx: 0.015, rz: -0.035 },
            midLeft: { rx: -0.015, rz: -0.040 },
            midRight: { rx: 0.020, rz: -0.040 },
            frontLeft: { rx: -0.010, rz: -0.045 },
            frontRight: { rx: 0.015, rz: -0.045 },

            features: [
                // False front rejecting weak approaches back down the hill
                { type: 'tier', axis: 'z', position: 2.5, width: 2.8, height: -0.14 },
                // Ridge separating back tier from center collection area
                { type: 'ridge', p1: { x: -5.0, z: -2.5 }, p2: { x: 4.0, z: 1.0 }, width: 3.0, height: 0.10 },
                // Right collection swale above the deep pot bunker
                { type: 'bowl', x: 3.5, z: -0.5, radius: 3.2, depth: 0.08 }
            ]
        },

        // EXACT YARDAGE WAYPOINTS (Tee: z=10, Fairway: z=-51.4 to -89.3, Steps to -131.3, Green: z=-144.5)
   waypoints: [
            new THREE.Vector3(0, 0, 10),       // 1. Perched Tee Box (0 yds)
            new THREE.Vector3(0, 0, -51.4),    // 2. Fairway Start (170 yds)
            new THREE.Vector3(0, 0, -70.0),    // 3. Fairway Landing Target (222 yds)
            new THREE.Vector3(0, 0, -89.5),    // 4. Base of Hill / 275-yd Fairway 1 End
            new THREE.Vector3(0, 0, -161.2)    // 5. Elevated Green Center (474 yds total)
        ],

        // CALIBRATED HAZARDS: Forced Carry, Flanks, 4-Tier Staircase & Greenside
        hazards: [
          // --- 1. PINE VALLEY NATIVE WASTE AREA & CHANNELS (70 to 160 yds / z = -18.0 to -48.0) ---
            // Left Major Waste Wash
            { type: 'sand', shape: 'snake', path: [{ x: -18.0, z: -19.0 }, { x: -14.0, z: -28.0 }, { x: -18.0, z: -38.0 }, { x: -12.0, z: -47.0 }], radius: 4.5, depth: 0.50 },

            // Right Major Waste Wash
            { type: 'sand', shape: 'snake', path: [{ x: 16.0, z: -20.0 }, { x: 12.0, z: -30.0 }, { x: 18.0, z: -40.0 }, { x: 13.0, z: -48.0 }], radius: 4.5, depth: 0.50 },

            // Lower Central Crossing Wash (in front of the tee)
            { type: 'sand', shape: 'snake', path: [{ x: -12.0, z: -21.0 }, { x: -2.0, z: -19.5 }, { x: 10.0, z: -21.5 }], radius: 4.0, depth: 0.45 },

            // Mid Central Channel (creates grass islands)
            { type: 'sand', shape: 'snake', path: [{ x: -8.0, z: -33.0 }, { x: 2.0, z: -30.0 }, { x: 11.0, z: -32.0 }], radius: 3.8, depth: 0.45 },

            // Upper Approach Crossing Wash (before the island fairway at z = -51.4)
            { type: 'sand', shape: 'snake', path: [{ x: -14.0, z: -45.0 }, { x: -1.0, z: -46.5 }, { x: 12.0, z: -44.5 }], radius: 4.2, depth: 0.45 },

            // Organic Sand Blowout Pockets
            { type: 'sand', x: -7.0, z: -26.0, radius: 3.5, depth: 0.40 },
            { type: 'sand', x: 8.0, z: -25.0, radius: 3.5, depth: 0.40 },
            { type: 'sand', x: -5.0, z: -40.0, radius: 3.5, depth: 0.40 },
            { type: 'sand', x: 6.0, z: -40.0, radius: 3.5, depth: 0.40 },

            // --- 2. ISLAND FAIRWAY SIDE BUNKERS (170 to 260 yds / z = -51.4 to -84.0) ---
            // Left Scalloped Fingers
            { type: 'sand', x: -16.3, z: -58.0, radius: 2.5, depth: 0.55 },
            { type: 'sand', x: -18.5, z: -68.0, radius: 3.8, depth: 0.55 },
            { type: 'sand', x: -20.0, z: -78.0, radius: 5.8, depth: 0.55 },
            { type: 'sand', x: -19.2, z: -84.0, radius: 4.2, depth: 0.55 },
            // Right Side Waste Bunkers
            { type: 'sand', x: 19.6, z: -60.0, radius: 5.0, depth: 0.50 },
            { type: 'sand', x: 19.5, z: -70.0, radius: 4.2, depth: 0.50 },
            { type: 'sand', x: 20.5, z: -78.0, radius: 5.8, depth: 0.50 },
            { type: 'sand', x: 19.2, z: -84.0, radius: 3.8, depth: 0.50 },

           // --- 3. STEPPED UPHILL BLOWOUT STAIRS (Separated by 40-yd flat fairways) ---
            // Tier 1: Bunker 1 (z = -92.0) -> Flat Fairway 1 (z = -94.5 to -108.9, 40 yds)
            { type: 'sand', shape: 'snake', path: [{ x: -13.0, z: -92.0 }, { x: 0.0, z: -92.0 }, { x: 13.0, z: -92.0 }], radius: 2.0, depth: 0.45 },


            // Tier 2: Bunker 2 (z = -111.4) -> Flat Fairway 2 (z = -113.9 to -128.3, 40 yds)
            { type: 'sand', shape: 'snake', path: [{ x: -12.0, z: -111.4 }, { x: 0.0, z: -111.4 }, { x: 12.0, z: -111.4 }], radius: 2.0, depth: 0.45 },


            // Tier 3: Bunker 3 (z = -130.8) -> Flat Fairway 3 (z = -133.3 to -147.7, 40 yds)
            { type: 'sand', shape: 'snake', path: [{ x: -11.0, z: -130.8 }, { x: 0.0, z: -130.8 }, { x: 11.0, z: -130.8 }], radius: 2.0, depth: 0.45 },


            // Tier 4: Bunker 4 (z = -150.2) -> Green Plateau (z = -152.7 to -172.0, Green at z = -161.2)
            { type: 'sand', shape: 'snake', path: [{ x: -9.5, z: -150.2 }, { x: 0.0, z: -150.2 }, { x: 9.5, z: -150.2 }], radius: 2.0, depth: 0.45 },

            // --- 4. GREENSIDE HAZARDS (z = -160 to -167) ---
            { type: 'sand', x: 13.8, z: -160.7, radius: 2.6, depth: 0.85 }, // Deep Right Pot Bunker
            { type: 'sand', x: -14.5, z: -160.2, radius: 2.8, depth: 0.65 }, // Left Greenside Bunker
            { type: 'sand', x: 14.5, z: -166.7, radius: 2.8, depth: 0.50 }  // Back-Right Crater
        ],

        // DENSE SURROUNDING PINE FOREST
        customTrees: [
           // Left Tree Line
            { x: -26, z: 20 }, { x: -26, z: 0 }, { x: -28, z: -20 }, { x: -30, z: -40 },
            { x: -28, z: -60 }, { x: -26, z: -80 }, { x: -28, z: -100 }, { x: -30, z: -120 },
            { x: -30, z: -145 }, { x: -32, z: -170 }, { x: -26, z: -186 }, { x: -18, z: -191 },

            // Right Tree Line
            { x: 26, z: 20 }, { x: 26, z: 0 }, { x: 28, z: -20 }, { x: 30, z: -40 },
            { x: 30, z: -60 }, { x: 28, z: -80 }, { x: 30, z: -100 }, { x: 30, z: -120 },
            { x: 30, z: -145 }, { x: 28, z: -170 }, { x: 24, z: -186 }, { x: 16, z: -191 },

           // Back of Green Canopy Frame
            { x: -10, z: -186 }, { x: -2, z: -189 }, { x: 6, z: -189 }, { x: 12, z: -186 },

            // --- NATIVE SCRUB BUSHES & GRASS ISLAND VEGETATION ---
            // Grass Island 1 (Center-Left near z = -26):
            { x: -1.5, z: -25.5, type: 'bush', radius: 1.4 },
            { x: 1.0, z: -26.5, type: 'bush', radius: 1.2 },

            // Grass Island 2 (Center-Right near z = -36):
            { x: -2.5, z: -36.0, type: 'bush', radius: 1.5 },
            { x: 1.5, z: -36.5, type: 'bush', radius: 1.3 },
            { x: 4.5, z: -35.5, type: 'bush', radius: 1.1 },

            // Left Sand Rim Scrub:
            { x: -22.0, z: -22.0, type: 'bush', radius: 1.6 },
            { x: -21.0, z: -32.0, type: 'bush', radius: 1.4 },
            { x: -20.0, z: -42.0, type: 'bush', radius: 1.5 },

            // Right Sand Rim Scrub:
            { x: 21.0, z: -24.0, type: 'bush', radius: 1.5 },
            { x: 20.0, z: -34.0, type: 'bush', radius: 1.4 },
            { x: 21.5, z: -44.0, type: 'bush', radius: 1.6 },

            // Front of Tee Scrub:
            { x: -6.0, z: -14.0, type: 'bush', radius: 1.2 },
            { x: 5.0, z: -14.0, type: 'bush', radius: 1.3 }
        ],

        customOOB: {
            type: 'rectangle',
            minX: -46,
            maxX: 46,
           minZ: -201,
            maxZ: 30,
            stakesPerSide: 12,
            stakesPerRow: 4
        }
    },
    9: { // 220-Yard Elevated Downhill Par 3 (Tree Chute to Valley Green)
        par: 3,
        fairwayWidth: 12.0,
        greenRadius: 8.5,
        greenShape: 'oval',
        horizonTheme: 'forest',
        theme: 'forest',
        treeScale: 4.8,
        treeHeightScale: 1.6,

        // Back-to-Front Slope with Soft Center Collection Bowl
        slopeProfile: {
            backLeft: { rx: -0.020, rz: -0.035 },
            backRight: { rx: 0.020, rz: -0.035 },
            midLeft: { rx: -0.015, rz: -0.030 },
            midRight: { rx: 0.015, rz: -0.030 },
            frontLeft: { rx: -0.010, rz: -0.035 },
            frontRight: { rx: 0.015, rz: -0.035 },

            features: [
                // Subtle tier separating back third of green
                { type: 'tier', axis: 'z', position: -2.0, width: 3.0, height: 0.12 },
                // Soft collection bowl in center
                { type: 'bowl', x: 0.0, z: 1.0, radius: 3.5, depth: 0.08 }
            ]
        },

        // EXACT 220 YARD WAYPOINTS (Tee at z=10, Green Center at z=-69.45)
        waypoints: [
            new THREE.Vector3(0, 0, 10),       // 1. Elevated Tee Box (0 yds)
            new THREE.Vector3(0, 0, -69.45)    // 2. Valley Green Center (220 yds total)
        ],

        // BUNKERS: Wrapping Front-Right Trap, Left-Side Trap, and Front-Left Pot
        hazards: [
            // 1. Scalloped Front-Right Wrapping Bunker (protecting right and front-right of green)
            {
                type: 'sand',
                shape: 'snake',
                radius: 3.8,
                depth: 1.1,
                path: [
                    { x: 9.0, z: -58.0 },
                    { x: 14.5, z: -60.5 },
                    { x: 18.0, z: -66.0 }
                ]
            },

            // 2. Left-Side Greenside Bunker
            { type: 'sand', x: -18.0, z: -71.0, radius: 3.5, depth: 1.0 },

            // 3. Front-Left Approach Pot Bunker
            { type: 'sand', x: -6.5, z: -58.0, radius: 2.8, depth: 1.4 }
        ],

        // DENSE TREE CHUTE & SURROUNDING PERMANENT WOODS
        customTrees: [
            // --- LEFT TREE WALL (Inner row creating narrow chute) ---
            { x: -14, z: 20 }, { x: -14, z: 10 }, { x: -15, z: 0 }, { x: -15, z: -10 },
            { x: -16, z: -20 }, { x: -17, z: -30 }, { x: -18, z: -40 }, { x: -19, z: -50 },
            

            // --- LEFT TREE WALL (Outer row for dense forest depth) ---
            { x: -22, z: 18 }, { x: -24, z: 8 }, { x: -25, z: -2 }, { x: -26, z: -12 },
            { x: -28, z: -22 }, { x: -29, z: -32 }, { x: -30, z: -42 }, { x: -31, z: -52 },
            { x: -32, z: -62 }, { x: -30, z: -72 }, { x: -28, z: -82 },

            // --- RIGHT TREE WALL (Inner row creating narrow chute) ---
            { x: 14, z: 20 }, { x: 14, z: 10 }, { x: 15, z: 0 }, { x: 15, z: -10 },
            { x: 16, z: -20 }, { x: 17, z: -30 }, { x: 18, z: -40 }, { x: 19, z: -50 },
            { x: 20, z: -60 }, { x: 21, z: -70 }, { x: 20, z: -80 },

            // --- RIGHT TREE WALL (Outer row for dense forest depth) ---
            { x: 22, z: 18 }, { x: 24, z: 8 }, { x: 25, z: -2 }, { x: 26, z: -12 },
            { x: 28, z: -22 }, { x: 29, z: -32 }, { x: 30, z: -42 }, { x: 31, z: -52 },
            { x: 32, z: -62 }, { x: 30, z: -72 }, { x: 28, z: -82 },

           

            // --- BACK OF GREEN DROP-OFF CANOPY FRAME ---
            { x: -14, z: -86 }, { x: -7, z: -89 }, { x: 0, z: -90 }, { x: 7, z: -89 }, { x: 14, z: -86 }
        ],

        customOOB: {
            type: 'rectangle',
            minX: -45,
            maxX: 45,
            minZ: -100,
            maxZ: 30,
            stakesPerSide: 10,
            stakesPerRow: 4
        }
    }
};