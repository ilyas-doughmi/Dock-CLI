import fs from 'fs';
import path from 'path';
import * as logger from '../utils/logger.js';
import ora from 'ora';

export default async function initCommand() {
    const spinner = ora('Creating your starter project...').start();

    const files = {
        'index.php': `<?php
echo "<h1>Hello from Dock Hosting!</h1>";
echo "<p>This app was deployed via the CLI.</p>";
?>`,
        'README.md': `# My Dock App
This is a simple PHP application ready for deployment.

## How to deploy
Run \`dock deploy\` in this terminal.
`
    };

    try {
        let createdCount = 0;

        for (const [filename, content] of Object.entries(files)) {
            const filePath = path.join(process.cwd(), filename);

            if (fs.existsSync(filePath)) {
                logger.warning(`Skipped ${filename} (already exists)`);
                continue;
            }

            fs.writeFileSync(filePath, content);
            createdCount++;
        }

        if (createdCount > 0) {
            spinner.succeed('Project initialized!');
            logger.success(`Created ${createdCount} files. You are ready to launch!`);
            logger.info('Try running: dock deploy');
        } else {
            spinner.stop();
            logger.info('Your folder already looks ready. No new files were created.');
        }

    } catch (error) {
        spinner.fail('Failed to initialize project');
        logger.error(error.message);
    }
}