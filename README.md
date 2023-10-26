# Cloudinary CLI Tool to Export Assets to CSV

A simple CLI tool to export assets from Cloudinary to a CSV file.

**NOTE:** This tool uses the Search method of the [Admin API](https://cloudinary.com/documentation/admin_api) which is rate limited to 5000 requests per hour.

**_This is very alpha and in active development. Use at your own risk._**

TODO:

- [ ] Mask Input
- [ ] Enable Search
- [x] Enable tags
- [ ] Enable Metadata

_This package is not affiliated with Cloudinary._

**This package has been renamed from cld_get_assets to cld-get-asset**

## Features

- Fetch assets based on various parameters
- Save assets information to a CSV file
- Manage Cloudinary credentials

## Installation

To install the CLI tool globally, run:

```bash
pnpm install -g cld-get-assets
```

## Usage

### Fetching Assets

To fetch assets, simply run:

```bash
cld-get-assets go
```

Follow the prompts to enter your Cloudinary credentials and other settings.

### Updating Credentials

To update saved Cloudinary credentials, run:

```bash
cld-get-assets config
```

## Configuration

The tool saves your Cloudinary credentials locally for future use. The config file is saved at `~/.cld_get_assets_config.json`.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the ISC License.
