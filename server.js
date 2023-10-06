const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'job_portal',
});

const secretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXIxIiwiaWF0IjoxNjk2NTU2MzMyLCJleHAiOjE2OTY1NTk5MzJ9.jZ0cBoawYLva_LrfdP-ZEaACcXEJyp7CYhdxGjBlhHY';

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(req)

  db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
    res.json({ token });
  });
});

app.get('/job/:id', verifyToken, async (req, res) => {
    try {
      const jobId = req.params.id;
      const apiUrl = `https://dev6.dansmultipro.com/api/recruitment/positions/${jobId}.json`;
      const response = await axios.get(apiUrl);
      const jobDetail = response.data;
  
      res.json(jobDetail);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/jobs', verifyToken, async (req, res) => {
    try {
      // Extract search parameters (description, location, full_time) and pagination parameters (page, limit)
      const { description, location, full_time, page, limit } = req.query;
      let apiUrl = 'https://dev6.dansmultipro.com/api/recruitment/positions.json';
      const queryParams = [];
      if (description) {
        queryParams.push(`description=${encodeURIComponent(description)}`);
      }
      if (location) {
        queryParams.push(`location=${encodeURIComponent(location)}`);
      }
      if (full_time === 'true') {
        queryParams.push(`full_time=true`);
      }
      if (queryParams.length > 0) {
        apiUrl += `?${queryParams.join('&')}`;
      }

      const pageNumber = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 10; 
      const startIndex = (pageNumber - 1) * pageSize;
  
      const response = await axios.get(apiUrl);
      const jobs = response.data;
  
      const paginatedJobs = jobs.slice(startIndex, startIndex + pageSize);
  
      res.json(paginatedJobs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = decoded;
    next();
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
