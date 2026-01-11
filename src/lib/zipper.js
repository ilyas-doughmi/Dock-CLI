import fs from 'fs';
import path from 'path';
import archiver from 'archiver';


export const zipDirectory = () =>{
    return new Promise((resolve,reject) => {
        const outputPath = path.join(process.cwd(), 'project.zip');
        const output = fs.createWriteStream(outputPath);

        const archive = archiver('zip', {zlib: {level: 9} });

        output.on('close', () => {
            resolve(outputPath);
        })

        archive.on('error',(err)=>{
            reject(err);
        })

        archive.pipe(output);

        const defaultIgnore = ['node_modules/**', '.git/**', 'project.zip', '.env'];
        let ignoreList = [...defaultIgnore];

        const dockIgnorePath = path.join(process.cwd(), '.dockignore');
        if (fs.existsSync(dockIgnorePath)) {
            const dockIgnoreContent = fs.readFileSync(dockIgnorePath, 'utf-8');
            const userIgnores = dockIgnoreContent.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'));
            
            ignoreList = [...ignoreList, ...userIgnores];
        }

        archive.glob('**/*', {
            cwd: process.cwd(),
            ignore: ignoreList
        })

        archive.finalize();
    })
}