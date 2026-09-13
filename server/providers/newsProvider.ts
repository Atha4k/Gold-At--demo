import type { NewsSnapshot } from '../../shared/types.js';

export interface NewsProvider {readonly refreshInterval:number;getNews(force?:boolean):Promise<NewsSnapshot>;refresh(force?:boolean):Promise<NewsSnapshot>}
