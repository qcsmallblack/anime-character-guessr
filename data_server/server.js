require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB when the server starts
db.connect().catch(console.error);

// Basic health check route
app.get('/health', async (req, res) => {
  try {
    const client = db.getClient();
    await client.db("admin").command({ ping: 1 });
    res.json({ status: 'ok', mongodb: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'MongoDB connection failed' });
  }
});

// Example route using MongoDB
app.get('/sample-data', async (req, res) => {
  try {
    const client = db.getClient();
    const database = client.db('sample_mflix');
    const movies = database.collection('movies');
    
    // Get first 10 movies as an example
    const result = await movies.find({}).limit(10).toArray();
    res.json(result);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 