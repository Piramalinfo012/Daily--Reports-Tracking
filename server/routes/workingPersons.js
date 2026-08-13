const express = require('express');
const router = express.Router();
const WorkingPerson = require('../models/WorkingPerson');

// GET all working persons
router.get('/', async (req, res) => {
  try {
    const persons = await WorkingPerson.find().sort({ name: 1 });
    res.json(persons);
  } catch (err) {
    console.error('Error fetching working persons:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new working person
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required and must be a string' });
    }

    // Check if it already exists to prevent duplicates (though schema unique handles it, this gives a better error)
    const existing = await WorkingPerson.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Working person already exists' });
    }

    const newPerson = new WorkingPerson({ name: name.trim() });
    await newPerson.save();
    
    res.status(201).json(newPerson);
  } catch (err) {
    console.error('Error adding working person:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
