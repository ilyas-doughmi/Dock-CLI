const axios = require('axios');
const config = require('../lib/config');
const { API_URL } = require('../lib/constants');

function createApiClient() {
    const token = config.get('token');
    return axios.create({
        baseURL: API_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
}

function isLoggedIn() {
    return !!config.get('token');
}

function getCurrentUser() {
    return config.get('user');
}

module.exports = {
    createApiClient,
    isLoggedIn,
    getCurrentUser
};
