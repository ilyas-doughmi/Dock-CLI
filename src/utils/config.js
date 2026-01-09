import Conf from 'conf';

const config = new Conf({
    projectName: 'dock-cli'
});


module.exports = {
    set:(key,value) => {
        config.set(key,value);
    },

    get:(key) =>{
        return config.get(key);
    },

    delete:(key) => {
        config.delete(key);
    },

    clear: () => {
        config.clear();
    }
};