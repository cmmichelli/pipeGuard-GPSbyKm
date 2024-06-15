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

// Helper function to find the closest value within a range
const findClosestWithinRange = (array, key, value, range) => {
    let closestRecord = null;
    let minDifference = range;

    array.forEach(record => {
        const difference = Math.abs(record[key] - value);
        if (difference <= range && difference < minDifference) {
            closestRecord = record;
            minDifference = difference;
        }
    });

    return closestRecord;
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
    const { component, km, range } = req.query;

    if (!component || !km || !range) {
        return res.status(400).send({ error: 'Please provide component, km, and range parameters' });
    }

    if (!component || !km) {
        return res.status(400).send({ error: 'Please provide both component and km parameters' });
    }

    const componentData = jsonData.find(item => item.component === component);

    if (!componentData) {
        return res.status(404).send({ error: 'Component not found' });
    }

    //const closestRecord = findClosest(componentData.records, 'Station Location', parseFloat(km));
    const closestRecord = findClosestWithinRange(componentData.records, 'Station Location', parseFloat(km), parseFloat(range));
    if (closestRecord) {
        res.json(closestRecord);
    } else {
        res.json({});
    }    
    res.json(closestRecord);
});

// Endpoint to search by Odómetro
app.get('/search/odometro', (req, res) => {
    const { component, km, range } = req.query;

    if (!component || !km || !range) {
        return res.status(400).send({ error: 'Please provide component, km, and range parameters' });
    }

    const componentData = jsonData.find(item => item.component === component);

    if (!componentData) {
        return res.status(404).send({ error: 'Component not found' });
    }

    //const closestRecord = findClosest(componentData.records, 'Odometro', parseFloat(km));
    const closestRecord = findClosestWithinRange(componentData.records, 'Station Location', parseFloat(km), parseFloat(range));
    if (closestRecord) {
        res.json(closestRecord);
    } else {
        res.json({});
    }     
    res.json(closestRecord);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
