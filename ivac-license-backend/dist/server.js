import { app } from './app.js';
import { ENV } from './config/env.js';
import { connectDatabase } from './config/database.js';
async function bootstrap() {
    await connectDatabase();
    app.listen(ENV.PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 IVAC License Management Backend is running!`);
        console.log(`📡 URL: http://localhost:${ENV.PORT}${ENV.API_PREFIX}`);
        console.log(`🔒 Health Check: http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
        console.log(`🛠️  Environment: ${ENV.NODE_ENV}`);
        console.log(`=======================================================`);
    });
}
bootstrap().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
});
