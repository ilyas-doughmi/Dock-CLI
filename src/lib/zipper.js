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

        archive.glob('**/*', {
            cwd: process.cwd(),
            ignore: ['node_modules/**','.git/**', 'project.zip', '.env']
        })

        archive.finalize();
    })
}