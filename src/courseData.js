// src/courseData.js

export const globalCourseData = {
    hole1: {
        name: "The Opening Drive",
        teePosition: { x: 0, y: 0, z: 0 },
        holePosition: { x: 0, y: 0, z: 150 },
        
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
    }
};