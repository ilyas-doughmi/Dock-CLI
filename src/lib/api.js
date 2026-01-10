import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import config from '../utils/config.js';
import path from 'path';

const API_URL = 'http://localhost/dock-hosting/api';

export const deploy = async (zipFilePath) => {
    const token = config.get('auth_token');

    if(!token){
        throw new Error('login first');
    }
}