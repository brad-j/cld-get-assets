import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import moment from 'moment';
import prompt from 'prompt';
import { v2 as cloudinary } from 'cloudinary';

program
  .command('get-assets')
  .description('Fetch assets from Cloudinary')
  .action(() => {
    prompt.start();

    prompt.get(
      [
        'cloud_name',
        'api_key',
        'api_secret',
        'output_directory',
        'output_filename',
      ],
      function (err: any, result: any) {
        if (err) {
          if (err.message === 'canceled') {
            console.log('Operation was canceled by the user. Exiting.');
            process.exit(0);
          } else {
            console.log(err);
            process.exit(1);
          }
        }

        cloudinary.config({
          cloud_name: result.cloud_name,
          api_key: result.api_key,
          api_secret: result.api_secret,
        });

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
              .sort_by('public_id', 'desc')
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