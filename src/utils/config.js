import Conf from 'conf';

const config = new Conf({
    projectName: 'dock-cli'
});



export const set = (key, value) => config.set(key, value);

export const get = (key) => config.get(key);

export const del = (key) => config.delete(key);

export const clear = () => config.clear();