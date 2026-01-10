import fs from 'fs';
import path from 'path';
import archiver from 'archiver';


export const zipDirectory = () =>{
    return new Promise((resolve,reject) => {
        const outputPath = path.join(process.cwd(), 'project.zip');
        const output = fs.createWriteStream(outputPath);

    })
}