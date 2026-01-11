import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import * as config from '../utils/config.js';
import path from 'path';

const API_URL = 'https://dockhosting.dev/api';

export const deploy = async (zipFilePath, projectId = null) => {
    const token = config.get('auth.token');

    if(!token){
        throw new Error('login first');
    }

    const form = new FormData();
    form.append('token', token);

    if (projectId) {
        form.append('project_id', projectId);
    } else {
        let projectName = path.basename(process.cwd());
        
        const dockConfigPath = path.join(process.cwd(), 'dock.json');
        if (fs.existsSync(dockConfigPath)) {
            try {
                const dockConfig = JSON.parse(fs.readFileSync(dockConfigPath, 'utf8'));
                if (dockConfig.name) {
                    projectName = dockConfig.name;
                }
            } catch (e) {
            }
        }

        form.append('project_name', projectName);
    }
    
    form.append('project_zip', fs.createReadStream(zipFilePath));


    try{
        const response = await axios.post(`${API_URL}/cli_deploy.php`,form,{
            headers: {
                ...form.getHeaders(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        let data = response.data;
        if (typeof data === 'string') {
            const jsonStart = data.indexOf('{');
            const jsonEnd = data.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                try {
                    const cleanJson = data.substring(jsonStart, jsonEnd + 1);
                    data = JSON.parse(cleanJson);
                } catch (e) {
                }
            }
        }

        return data;
    }catch(error){
        if(error.response){
            throw new Error(`server problem ${error.response.data.message}`);
        }
        throw error;
    }
}