import app from './app.js';
import { env } from '#config/env.js';
import { getConfig } from '#services/gymCheckIn.service.js';

const { PORT } = env;

getConfig()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FitCore API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize gym check-in config:', err);
    process.exit(1);
  });
