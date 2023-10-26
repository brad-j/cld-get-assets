import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as csv from 'fast-csv';
import moment from 'moment';
import prompt from 'prompt';
import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryConfig {
  cloud_name?: string;
  api_key?: string;
  api_secret?: string;
}

const config_path = path.join(os.homedir(), '.cld_get_assets_config.json');

let saved_config: CloudinaryConfig;
if (fs.existsSync(config_path)) {
  saved_config = JSON.parse(fs.readFileSync(config_path, 'utf8'));
}

program
  .command('config')
  .description('Update Cloudinary credentials')
  .action(() => {
    prompt.start();
    prompt.get(
      ['cloud_name', 'api_key', 'api_secret'],
      function (err: any, result: any) {
        if (err) {
          console.log(err);
          process.exit(1);
        }
        const new_config = {
          cloud_name: result.cloud_name,
          api_key: result.api_key,
          api_secret: result.api_secret,
        };
        fs.writeFileSync(config_path, JSON.stringify(new_config));
        console.log('Credentials updated successfully.');
      }
    );
  });

program
  .command('go')
  .description('Fetch assets from Cloudinary')
  .action(() => {
    prompt.start();
    prompt.get(
      {
        properties: {
          cloud_name: { default: saved_config?.cloud_name },
          api_key: { default: saved_config?.api_key },
          api_secret: { default: saved_config?.api_secret },
          output_directory: { default: '.' },
          output_filename: { default: 'assets.csv' },
        },
      },
      function (err: any, result: any) {
        if (err) {
          console.log(err);
          process.exit(1);
        }

        cloudinary.config({
          cloud_name: result.cloud_name,
          api_key: result.api_key,
          api_secret: result.api_secret,
        });

        const new_config = {
          cloud_name: result.cloud_name,
          api_key: result.api_key,
          api_secret: result.api_secret,
        };
        fs.writeFileSync(config_path, JSON.stringify(new_config));

        const output_filename = result.output_file || 'assets.csv';
        const output_directory = result.output_directory || '.';

        if (!fs.existsSync(output_directory)) {
          fs.mkdirSync(output_directory, { recursive: true });
        }

        const full_output_path = path.join(output_directory, output_filename);
        console.log(`Saving output to: ${full_output_path}`);

        const csvStream = csv.format({ headers: true });
        const writableStream = fs.createWriteStream(full_output_path);

        csvStream.pipe(writableStream);

        async function get_assets(
          next_cursor: string | null = null
        ): Promise<void> {
          try {
            const search_params = cloudinary.search
              .expression('')
              .with_field('tags')
              .sort_by('created_at', 'desc')
              .max_results(500);

            if (next_cursor) {
              search_params.next_cursor(next_cursor);
            }

            const search = await search_params.execute();
            const assets = search.resources;

            assets.forEach((asset: any) => {
              const formatted_date = moment(asset.created_at).format(
                'MM-DD-YYYY'
              );
              csvStream.write({
                public_id: asset.public_id,
                format: asset.format,
                version: asset.version,
                created_at: formatted_date,
                bytes: asset.bytes,
                width: asset.width,
                height: asset.height,
                secure_url: asset.secure_url,
                tags: asset.tags.join(','),
              });
            });

            if (search.next_cursor) {
              await get_assets(search.next_cursor);
            } else {
              csvStream.end();
            }
          } catch (error) {
            console.error('An error occurred:', error);
          }
        }

        get_assets().catch(error => {
          console.error('An error occurred:', error.error);
        });
      }
    );
  });

program.parse(process.argv);
