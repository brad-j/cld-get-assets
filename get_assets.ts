import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import moment from 'moment';
import prompt from 'prompt';
import { v2 as cloudinary } from 'cloudinary';

prompt.start();

prompt.get(
  [
    'cloud_name',
    'api_key',
    'api_secret',
    'output_filename',
    'output_directory',
  ],
  function (err: any, result: any) {
    if (err) {
      return console.log(err);
    }

    cloudinary.config({
      cloud_name: result.cloud_name,
      api_key: result.api_key,
      api_secret: result.api_secret,
    });

    const output_filename = result.output_file || 'assets.csv';
    const outputDirectory = result.output_directory || '.';
    console.log(`Writing to output file: ${output_filename}`);

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const fullOutputPath = path.join(outputDirectory, output_filename);
    console.log(`Writing to output file: ${fullOutputPath}`);

    const csvStream = csv.format({ headers: true });
    const writableStream = fs.createWriteStream(output_filename);

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
          const formatted_date = moment(asset.created_at).format('DD-MM-YYYY');
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
