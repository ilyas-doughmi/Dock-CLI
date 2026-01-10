import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import * as config from '../utils/config.js';
import path from 'path';

const API_URL = 'http://localhost/dock-hosting/api';

export const deploy = async (zipFilePath) => {
    const token = config.get('auth.token');

    if(!token){
        throw new Error('login first');
    }

    const form = new FormData();
    form.append('token', token);

    const projectName = path.basename(process.cwd());
    form.append('project_name', projectName);
    
    form.append('project_zip', fs.createReadStream(zipFilePath));


    try{
        const response = await axios.post(`${API_URL}/cli_deploy.php`,form,{
            headers: {
                ...form.getHeaders(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        return response.data;
    }catch(error){
        if(error.response){
            throw new Error(`server problem ${error.message}`);
        }
        throw error;
    }
}