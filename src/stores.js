import { writable, derived } from 'svelte/store';
import { getData } from './DataTransformer.js';

export const fullDataset = writable([]);

export const dataset = writable([]);

export const filters = writable([]);

export const selectedFeatures = writable([]);

export const metadata = writable(null);

export const data = derived(
  [metadata, selectedFeatures, dataset],
  ([$metadata, $selectedFeatures, $dataset]) => getData($metadata, $selectedFeatures, $dataset)
);

function createLog() {
  const { subscribe, update } = writable([]);

  return {
    subscribe,
    add: message => {
      message.time = Date.now();
      return update(logs => {
        logs.push(JSON.stringify(message));
        return logs;
      });
    }
  }
}

export const logs = createLog();