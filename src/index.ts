import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as csv from 'fast-csv';
import moment from 'moment';
import { v2 as cloudinary } from 'cloudinary';
import { input, checkbox, password } from '@inquirer/prompts';

interface CloudinaryConfig {
  cloud_name?: string;
  api_key?: string;
  api_secret?: string;
}

interface MetadataField {
  label: string;
  external_id: string;
  type: 'string' | 'integer' | 'date' | 'enum' | 'set';
  datasource?: {
    values: Array<{ external_id: string; label: string; value: string }>;
  };
}

const config_path = path.join(os.homedir(), '.cld_get_assets_config.json');

let saved_config: CloudinaryConfig;
if (fs.existsSync(config_path)) {
  saved_config = JSON.parse(fs.readFileSync(config_path, 'utf8'));
}

program
  .command('config')
  .description('Update Cloudinary credentials')
  .action(async () => {
    const cloud_name_answer = await input({
      message: 'Enter your Cloudinary cloud name',
      default: saved_config?.cloud_name,
    });
    const api_key_answer = await input({
      message: 'Enter your Cloudinary API key',
      default: saved_config?.api_key,
    });
    const api_secret_answer = await password({
      message: 'Enter your Cloudinary API secret.',
      mask: '*',
    });

    const new_config = {
      cloud_name: cloud_name_answer,
      api_key: api_key_answer,
      api_secret: api_secret_answer,
    };
    fs.writeFileSync(config_path, JSON.stringify(new_config));
    console.log('Credentials updated successfully.');
  });

async function fetch_metadata_fields(): Promise<MetadataField[]> {
  try {
    const result = await cloudinary.api.list_metadata_fields();

    return result.metadata_fields.map((field: any) => ({
      label: field.label,
      external_id: field.external_id,
      type: field.type,
      datasource: field.datasource,
    }));
  } catch (err) {
    console.error('Failed to fetch metadata fields:', err);
    return [];
  }
}

program
  .command('go')
  .description('Fetch assets from Cloudinary')
  .action(async () => {
    const cloud_name = await input({
      message: 'Enter your Cloudinary cloud name',
      default: saved_config?.cloud_name,
    });
    const api_key = await input({
      message: 'Enter your Cloudinary API key',
      default: saved_config?.api_key,
    });
    const api_secret = await password({
      message: 'Enter your Cloudinary API secret. Press enter to skip.',
      mask: '*',
    });
    const output_directory = await input({
      message: 'Enter the output directory',
      default: '.',
    });
    const output_filename = await input({
      message: 'Enter the output filename',
      default: 'assets.csv',
    });

    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
    });

    const include_fields = await checkbox({
      message: 'Which additional fields do you want?',
      choices: ['tags', 'metadata'].map(field => ({
        name: field,
        value: field,
      })),
    });

    let metadata_fields: any[] = [];

    const datasourceMap: Record<string, Record<string, string>> = {};

    if (include_fields.includes('metadata')) {
      const available_metadata_fields = await fetch_metadata_fields();
      metadata_fields = await checkbox({
        message: 'Choose metadata fields to include',
        choices: available_metadata_fields.map(field => ({
          name: field.label,
          value: field,
        })),
      });

      metadata_fields.forEach((field: MetadataField) => {
        const { external_id, type, datasource } = field;
        if (type === 'enum' || type === 'set') {
          const valueMap: Record<string, string> = {};
          datasource?.values.forEach(({ external_id, value }) => {
            valueMap[external_id] = value;
          });
          datasourceMap[external_id] = valueMap;
        }
      });
    }

    const search_expression = await input({
      message: 'Enter a search expression',
      default: '',
    });

    const new_config = {
      cloud_name,
      api_key,
      api_secret,
    };
    fs.writeFileSync(config_path, JSON.stringify(new_config));
    console.log('Credentials updated successfully.');

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
          .expression(search_expression)
          .with_field('tags')
          .with_field('metadata')
          .sort_by('created_at', 'desc')
          .max_results(500);

        if (include_fields.includes('tags')) {
          search_params.with_field('tags');
        }
        if (include_fields.includes('metadata')) {
          search_params.with_field('metadata');
        }

        if (next_cursor) {
          search_params.next_cursor(next_cursor);
        }

        const search = await search_params.execute();
        const assets = search.resources;

        console.log(`Writing ${assets.length} assets to CSV.`);
        console.log(`Rate Limit Remaining: ${search.rate_limit_remaining}`);

        assets.forEach((asset: any) => {
          const formatted_date = moment(asset.created_at).format('MM-DD-YYYY');
          const base_data = {
            public_id: asset.public_id,
            folder: asset.folder,
            format: asset.format,
            version: asset.version,
            created_at: formatted_date,
            bytes: asset.bytes,
            width: asset.width,
            height: asset.height,
            secure_url: asset.secure_url,
          };

          const additional_data: any = {};

          const filtered_metadata: { [key: string]: any } = Object.fromEntries(
            Object.entries(asset.metadata || {}).filter(
              ([key]) => !key.startsWith('deleted--')
            )
          );

          if (include_fields.includes('tags')) {
            additional_data.tags = asset.tags.join(',');
          }

          if (include_fields.includes('metadata')) {
            metadata_fields.forEach((field: MetadataField) => {
              const { external_id, type } = field;
              let value = filtered_metadata[external_id];
              if (value !== undefined) {
                if (type === 'enum' || type === 'set') {
                  value = Array.isArray(value)
                    ? value.map(id => datasourceMap[external_id][id]).join(', ')
                    : datasourceMap[external_id][value];
                }
              }
              additional_data[external_id] = value || '';
            });
          }

          const final_data = { ...base_data, ...additional_data };
          csvStream.write(final_data);
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
  });

program.parse(process.argv);
