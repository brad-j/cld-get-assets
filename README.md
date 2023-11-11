# This package has been moved to @b-rad/cld-get-assets

# [Cloudinary](https://cloudinary.com) CLI Tool to Export Assets to CSV

A simple CLI tool to export assets from Cloudinary to a CSV file.

**NOTE:** This tool uses the Search method of the [Admin API](https://cloudinary.com/documentation/admin_api) which is rate limited to 5000 requests per hour.

**_This is very alpha and in active development. Use at your own risk._**

TODO:

- [ ] Refactor try catch blocks
- [ ] Mask Input
- [ ] Graceful Exit
- [ ] Allow users to choose which system fields to include in the CSV
- [x] Enable Search
- [x] Enable tags
- [x] Enable Metadata

_This package is not affiliated with Cloudinary._

**This package has been renamed from cld_get_assets to cld-get-asset**

## Features

- Fetch assets based on various parameters
- Save assets information to a CSV file
- Manage Cloudinary credentials
- Support for including tags and metadata in the CSV

## Installation

To install the CLI tool globally, run:

```bash
pnpm add -g cld-get-assets
```

(or npm, yarn, etc.)

## Usage

### Fetching Assets

To fetch assets, simply run:

```bash
cld-get-assets go
```

Follow the prompts to enter your Cloudinary credentials and other settings.

#### Step 1: Enter Cloudinary Credentials

You'll be prompted to enter your Cloudinary credentials:

- Cloudinary cloud name
- Cloudinary API key
- Cloudinary API secret

These credentials will be saved for future use.

#### Step 2: Choose Output Directory and Filename

Next, you'll be asked to specify:

- The output directory where the CSV will be saved. It's relative to your current working directory.
- The filename for the CSV

#### Step 3: Choose Additional Fields

You'll have the option to include additional fields in the CSV:

- Tags
- Metadata

Use the arrow keys to select which fields you want to include.

#### Step 4: Choose Metadata Fields (Optional)

If you chose to include metadata, you'll be prompted to select which metadata fields to include in the CSV. Again, use the arrow keys to make your selections.

#### Step 5: Fetching and Saving

After you've made all your selections, the tool will fetch the assets based on your criteria and save them to a CSV file in the specified directory.

## Configuration

The tool saves your Cloudinary credentials locally for future use. The config file is saved at:

:open_file_folder: ~/.cld_get_assets_config.json

To update saved Cloudinary credentials, run:

```bash
cld-get-assets config
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the ISC License.
