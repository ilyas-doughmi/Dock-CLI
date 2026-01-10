import * as config from '../utils/config.js';
import * as logger from '../utils/logger.js';

export default async function logoutCommand() {
    const token = config.get('auth.token');

    if (!token) {
        logger.warning('You are not currently logged in.');
        return;
    }

    config.clear();
    
    logger.success('Logged out successfully. See you next time!');
}