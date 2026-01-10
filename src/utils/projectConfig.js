import fs from 'fs';
import path from 'path';

const configDir = path.join(process.cwd(), '.dock');
const configPath = path.join(configDir, 'config.json');

export const getProjectConfig = () => {
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (e) {
            return null;
        }
    }
    return null;
};

export const saveProjectConfig = (projectId, projectName) => {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir);
    }
    
    const data = JSON.stringify({ projectId, projectName }, null, 2);
    fs.writeFileSync(configPath, data);
};