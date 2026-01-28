import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import publicFormRoutes from './src/routes/publicForm.js';
import internalTicketingRoutes from './src/routes/internalTicketing.js';
import commonRoutes from './src/routes/commonRoute.route.js';

const app = express();
const PORT = process.env.PORT || 5000;
const ALTERNATIVE_PORT = 5001; 

// CORS configuration
app.use(cors({
  origin: '*', 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/public', publicFormRoutes);
app.use('/api/internal', internalTicketingRoutes)
app.use('/api', commonRoutes)

app.use('/health', (req, res) => {
  res.send('Server is running');
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use, trying port ${ALTERNATIVE_PORT}...`);
    app.listen(ALTERNATIVE_PORT, () => {
      console.log(`Server is running on port ${ALTERNATIVE_PORT}`);
    });
  }
});