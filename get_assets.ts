import cloudinary from './client';
import * as fs from 'fs';
import * as csv from 'fast-csv';
import moment from 'moment';

const csvStream = csv.format({ headers: true });
const writableStream = fs.createWriteStream('assets.csv');

csvStream.pipe(writableStream);

async function get_assets(next_cursor: string | null = null): Promise<void> {
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
}

get_assets();
