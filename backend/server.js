require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { serveImages } = require('./middleware/upload'); // photos: S3 on the server, backend/uploads locally
const itemRoutes = require('./routes/items'); // NEW
const adminRoutes = require('./routes/admin'); // NEW
const notificationRoutes = require('./routes/notifications'); // NEW

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes); 
app.use('/uploads', serveImages);
app.use('/api/items', itemRoutes); // NEW
app.use('/api/admin', adminRoutes); // NEW
app.use('/api/notifications', notificationRoutes); // NEW

app.get('/api/ping', (req, res) => {
  res.json({ message: 'Backend is alive' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});