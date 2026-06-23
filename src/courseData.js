// src/courseData.js

export const globalCourseData = {
    hole1: {
        name: "The Opening Drive",
        greenShape: 'kidney',
        teePosition: { x: 0, y: 0, z: 0 },
        holePosition: { x: 0, y: 0, z: 150 },
        waypoints: [{ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: -55 }],

        // Fairways define where the player can safely hit
        fairways: [
            {
                id: "main_fairway",
                // An array of points allows you to make ANY shape (squares, curves, long strips)
                points: [
                    { x: -15, z: 0 },
                    { x: 15, z: 0 },
                    { x: 20, z: 100 },
                    { x: -20, z: 100 }
                ]
            }
        ],

        // Hazards can be circles OR custom polygon shapes
        hazards: [
            {
                id: "winding_river",
                type: "water",
                shapeType: "polygon", // Allows for complex shapes like rivers
                points: [
                    { x: -50, z: 50 },
                    { x: 50, z: 55 },
                    { x: 50, z: 65 },
                    { x: -50, z: 60 }
                ]
            },
            {
                id: "green_side_bunker",
                type: "trap",
                shapeType: "circle", // Keeps simple shapes available too
                x: 10,
                z: 140,
                radius: 5
            }
        ],

        // Contours for slopes and hills (hills can have heights)
        contours: [
            {
                id: "hill_left",
                x: -25,
                z: 80,
                radius: 15,
                heightSlope: 2.5 // Positive for hill, negative for valley
            }
        ]
    },

    hole2: {
        name: "The Downhill Dogleg",
        par: 4,
        teePosition: { x: 0, y: 37.5, z: 10 }, // Modify this line: Match the new peak terrain height
        holePosition: { x: 11, y: 0, z: -139 },

        // Custom base sizes for this specific layout
        fairwayWidth: 9.5,
        greenRadius: 9.0,

        // The centerline track matching your 327yd + 87yd lines of sight
        waypoints: [
            { x: 0, y: 0, z: 10 },     // Flat Tee Box zone
            { x: 0, y: 0, z: -108 },   // 327 Yard Elbow (Ground flattens out here)
            { x: 11, y: 0, z: -139 }   // 87 Yard Approach Green
        ],

        // Place all 4 hazards matching the exact positions from the overhead layout view
        hazards: [
            { id: "front_right_bunker", type: "sand", shapeType: "circle", x: 22.5, z: -126.0, radius: 4.0, depth: 0.6 }, // Modify this line
            { id: "back_right_bunker", type: "sand", shapeType: "circle", x: 24.5, z: -146.0, radius: 3.5, depth: 0.6 },  // Modify this line
            { id: "back_left_bunker", type: "sand", shapeType: "circle", x: -1.0, z: -147.0, radius: 3.8, depth: 0.6 },   // Modify this line
            { id: "left_fairway_bunker", type: "sand", shapeType: "circle", x: -6.5, z: -124.0, radius: 4.2, depth: 0.5 } // Modify this line
        ],

        // Structural hills and slopes defined directly via properties
        contours: [
            {
                id: "fairway_descent_hill",
                type: "slope_descent",
                startZ: 0,
                endZ: -108,
                topElevation: 37.5,  // Modify this line: Match top height profile
                bottomElevation: 0.0 // Level height at the bottom
            },
            {
                id: "right_rough_mounds",
                type: "bumpy_rough",
                side: "right",       // Only shapes the rough on the right side
                startZ: 0,
                endZ: -124,          // Cuts off right before the sand trap
                intensity: 1.6       // Severe ridge height modifier
            }
        ]
    },
    hole3: {
        name: "Pebble Beach Hole 6",
        par: 5,
        teePosition: { x: 0, y: 0, z: 10 },
        holePosition: { x: -5.0, y: 8.5, z: -180 },
        fairwayWidth: 8.0,
        greenRadius: 8.5,
        waypoints: [
            { x: 0, y: 0, z: 10 },
            { x: -2.5, y: 0, z: -57.5 },
            { x: -5.0, y: 0.0, z: -125 },
            { x: -5.0, y: 8.5, z: -180 }
        ],
        // ADD THIS: Define your bunkers as polygons for total control
        hazards: [
            {
                type: 'sand',
                shape: 'polygon',
                points: [
                    { x: -16.5, z: -130.0 }, // Top right corner
                    { x: -19.0, z: -130.0 }, // Top left corner (2.5 units wide)
                    { x: -19.0, z: -160.0 }, // Bottom left corner (running down 30 units long)
                    { x: -16.5, z: -160.0 }  // Bottom right corner
                ],
                depth: 0.55
            }
        ]
    }
};