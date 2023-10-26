"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv = __importStar(require("fast-csv"));
const moment_1 = __importDefault(require("moment"));
const prompt_1 = __importDefault(require("prompt"));
const cloudinary_1 = require("cloudinary");
commander_1.program
    .command('get-assets')
    .description('Fetch assets from Cloudinary')
    .action(() => {
    prompt_1.default.start();
    prompt_1.default.get([
        'cloud_name',
        'api_key',
        'api_secret',
        'output_directory',
        'output_filename',
    ], function (err, result) {
        if (err) {
            if (err.message === 'canceled') {
                console.log('Operation was canceled by the user. Exiting.');
                process.exit(0);
            }
            else {
                console.log(err);
                process.exit(1);
            }
        }
        cloudinary_1.v2.config({
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
        async function get_assets(next_cursor = null) {
            try {
                const search_params = cloudinary_1.v2.search
                    .expression('')
                    .sort_by('public_id', 'desc')
                    .max_results(500);
                if (next_cursor) {
                    search_params.next_cursor(next_cursor);
                }
                const search = await search_params.execute();
                const assets = search.resources;
                assets.forEach((asset) => {
                    const formatted_date = (0, moment_1.default)(asset.created_at).format('MM-DD-YYYY');
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
                }
                else {
                    csvStream.end();
                }
            }
            catch (error) {
                console.error('An error occurred:', error);
            }
        }
        get_assets().catch(error => {
            console.error('An error occurred:', error.error);
        });
    });
});
commander_1.program.parse(process.argv);
