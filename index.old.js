const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Load JSON data
const dataPath = path.join(__dirname, 'data', 'datos_topologico.json');
let jsonData;

try {
    jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
    console.error("Error parsing JSON data:", error);
    process.exit(1);
}

// Helper function to find the closest value
const findClosest = (array, key, value) => {
    return array.reduce((prev, curr) => {
        return (Math.abs(curr[key] - value) < Math.abs(prev[key] - value) ? curr : prev);
    });
};

// Validate and clean JSON data
const validateAndCleanData = (data) => {
    data.forEach(item => {
        item.records.forEach(record => {
            record['Station Location'] = parseFloat(record['Station Location']) || 0;
            record['Odometro'] = parseFloat(record['Odometro']) || 0;
            record['Latitud'] = parseFloat(record['Latitud']) || 0;
            record['Longitud'] = parseFloat(record['Longitud']) || 0;
            record['Elevacion'] = parseFloat(record['Elevacion']) || 0;
        });
    });
};

validateAndCleanData(jsonData);

// Endpoint to search by Station Location
app.get('/search/station', (req, res) => {
    const { component, km } = req.query;

    if (!component || !km) {
        return res.status(400).send({ error: 'Please provide both component and km parameters' });
    }

    const componentData = jsonData.find(item => item.component === component);

    if (!componentData) {
        return res.status(404).send({ error: 'Component not found' });
    }

    const closestRecord = findClosest(componentData.records, 'Station Location', parseFloat(km));
    res.json(closestRecord);
});

// Endpoint to search by Odómetro
app.get('/search/odometro', (req, res) => {
    const { component, km } = req.query;

    if (!component || !km) {
        return res.status(400).send({ error: 'Please provide component and km parameters' });
    }

    const componentData = jsonData.find(item => item.component === component);

    if (!componentData) {
        return res.status(404).send({ error: 'Component not found' });
    }

    const closestRecord = findClosest(componentData.records, 'Odometro', parseFloat(km));
    res.json(closestRecord);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
