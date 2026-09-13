import dotenv from 'dotenv';
import { resolve } from 'node:path';

export const envFilePath=resolve(process.cwd(),'.env');
dotenv.config({path:envFilePath,quiet:true});
export const newsDataProvider=(process.env.NEWS_DATA_PROVIDER??'marketaux').trim().toLowerCase();
