import express from 'express';
import open from 'open';
import * as config from '../utils/config.js';

export const login = () => {
    return new Promise((resolve,reject) => {
        const app = express();
        app.get('/callback', (req,res) => {
            const {token,username} = req.query;

            if(token){
                config.set('auth.token',token);
                config.set('auth.username',username);

                res.send(`<h1>login succ</h1>`);
                server.close();
                resolve(username)
            }else{
                res.send(`<h1>not connected</h1>`);
                server.close()
                reject(new Error('not logged'));
            }

        })

        const server = app.listen(0,async()=>{
            const port = server.address().port;

            const loginUrl = `https://localhost/dock-hosting/pages/cli_login.php?port=${port}`;

            console.log(`open ${loginUrl}`);
            await open(loginUrl);
        })
    })
}