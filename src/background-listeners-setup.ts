import { idempotentMigrations } from './storage/migrations';
import { browser } from 'webextension-polyfill-ts';

browser.runtime.onInstalled.addListener(idempotentMigrations);
