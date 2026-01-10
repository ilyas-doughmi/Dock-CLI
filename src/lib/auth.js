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
                const uiTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOCK-HOSTING :: Authentication Success</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Space Grotesk', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        bg: '#000000',
                        panel: '#0a0a0a',
                        border: '#1f1f1f',
                        brand: {
                            DEFAULT: '#2dd4bf', 
                            hover: '#14b8a6',
                            dim: '#115e59',
                            glow: 'rgba(45, 212, 191, 0.5)'
                        }
                    },
                    backgroundImage: {
                        'grid-pattern': "linear-gradient(#1f1f1f 1px, transparent 1px), linear-gradient(90deg, #1f1f1f 1px, transparent 1px)",
                    },
                    animation: {
                        'scale-in': 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        'fade-up': 'fadeUp 0.8s ease-out forwards',
                    },
                    keyframes: {
                        scaleIn: {
                            '0%': { transform: 'scale(0.5)', opacity: '0' },
                            '100%': { transform: 'scale(1)', opacity: '1' },
                        },
                        fadeUp: {
                            '0%': { transform: 'translateY(20px)', opacity: '0' },
                            '100%': { transform: 'translateY(0)', opacity: '1' },
                        }
                    }
                }
            }
        }
    </script>
    
    <style>
        body { background-color: #000; color: #fff; }
        
        .glass-panel {
            background: rgba(10, 10, 10, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .success-ring {
            box-shadow: 0 0 30px rgba(45, 212, 191, 0.2);
            animation: pulse-ring 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 30px rgba(45, 212, 191, 0.2); }
            50% { box-shadow: 0 0 50px rgba(45, 212, 191, 0.4); }
        }
    </style>
</head>
<body class="h-screen w-full flex items-center justify-center relative overflow-hidden font-sans selection:bg-brand selection:text-black">

    <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 opacity-20 bg-grid-pattern bg-[length:40px_40px]"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
    </div>

    <main class="relative z-10 w-full max-w-md p-6">
        <div class="glass-panel rounded-2xl p-10 text-center animate-fade-up">
            
            <div class="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-scale-in success-ring border border-brand/20">
                <i class="fas fa-check text-4xl text-brand drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]"></i>
            </div>

            <h1 class="text-3xl font-bold mb-3 tracking-tight">Login Successful!</h1>
            <p class="text-gray-400 text-lg mb-8 leading-relaxed font-light">
                You have successfully authenticated. <br>
                You can now close this tab safely.
            </p>


        </div>
        
        <div class="text-center mt-8 opacity-40 hover:opacity-100 transition-opacity">
            <div class="flex items-center justify-center gap-2 text-xs font-mono text-gray-500">
                <i class="fas fa-cubes"></i>
                <span class="tracking-widest uppercase">Dock-Hosting</span>
            </div>
        </div>
    </main>

</body>
</html>`;
                res.send(uiTemplate);
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

            const loginUrl = `https://dockhosting.dev/pages/cli_login.php?port=${port}`;

            console.log(`open ${loginUrl}`);
            await open(loginUrl);
        })
    })
}