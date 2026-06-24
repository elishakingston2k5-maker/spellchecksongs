const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./db');
const { User, Song, ErrorPinpoint } = require('./models');

const seedDB = async () => {
  try {
    // Connect to DB
    await connectDB();

    console.log('Clearing existing database collections...');
    await User.deleteMany({});
    await Song.deleteMany({});
    await ErrorPinpoint.deleteMany({});
    console.log('Database collections cleared.');

    // Seed Users
    console.log('Seeding default users...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const checkerPasswordHash = await bcrypt.hash('checker123', 10);

    const users = [
      {
        username: 'admin',
        password: adminPasswordHash,
        role: 'admin',
      },
      {
        username: 'checker',
        password: checkerPasswordHash,
        role: 'checker',
      }
    ];

    await User.insertMany(users);
    console.log('Default users seeded successfully.');

    // Seed Songs
    console.log('Reading song data files...');
    const pathA = '/Users/elishakingston/Desktop/songsdb/அ.json';
    const pathAA = '/Users/elishakingston/Desktop/songsdb/ஆ.json';

    let songsA = [];
    let songsAA = [];

    if (fs.existsSync(pathA)) {
      const dataA = fs.readFileSync(pathA, 'utf-8');
      songsA = JSON.parse(dataA);
      console.log(`Loaded ${songsA.length} songs from அ.json`);
    } else {
      console.warn(`Warning: அ.json not found at ${pathA}`);
    }

    if (fs.existsSync(pathAA)) {
      const dataAA = fs.readFileSync(pathAA, 'utf-8');
      songsAA = JSON.parse(dataAA);
      console.log(`Loaded ${songsAA.length} songs from ஆ.json`);
    } else {
      console.warn(`Warning: ஆ.json not found at ${pathAA}`);
    }

    // Format songs
    const formattedSongs = [];
    const seenIds = new Set();

    const addSong = (song, alphabet) => {
      let finalId = song.id;
      let counter = 1;
      while (seenIds.has(finalId)) {
        finalId = `${song.id}_${counter}`;
        counter++;
      }
      seenIds.add(finalId);

      formattedSongs.push({
        id: finalId,
        title: song.title,
        tanglishTitle: song.tanglishTitle,
        alphabet: alphabet,
        status: 'pending',
        slides: song.slides || [],
      });
    };

    songsA.forEach(song => addSong(song, 'அ'));
    songsAA.forEach(song => addSong(song, 'ஆ'));

    console.log(`Inserting ${formattedSongs.length} songs into MongoDB...`);
    
    // Batch insert in chunks of 500 to avoid memory issues or driver limit warnings
    const chunkSize = 500;
    for (let i = 0; i < formattedSongs.length; i += chunkSize) {
      const chunk = formattedSongs.slice(i, i + chunkSize);
      await Song.insertMany(chunk);
      console.log(`Inserted chunk ${i / chunkSize + 1} (${chunk.length} songs)`);
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
