import Conf from 'conf';

const config = new Conf({
    projectName: 'dock-cli'
});


module.export = {
    set:(key,value) => {
        config.set(key,value);
    },

    get:(key) =>{
        config.get(key);
    },

    delete:(key) => {
        config.delete(key);
    },

    clear: () => {
        config.clear();
    }
};